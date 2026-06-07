"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const STORAGE_KEY = "cart";

export interface CartConfig {
  speciesId: number;
  speciesName: string;
  speciesSpriteUrl?: string | null;
  shiny: boolean;
  level: number;
  gender: string;
  ability: string;
  nature: string;
  heldItem: string;
  moves: string[];
  ivs: Record<string, number>;
  evs: Record<string, number>;
  trainerName: string;
  trainerTid: number;
  trainerSid: number;
  isPack?: boolean;
  packId?: number;
  price?: number;
  items?: any[];
  description?: string;
}

export interface CartItem {
  id: number;
  config: CartConfig;
}

interface ServerCartItem {
  id: number;
  userId: number;
  config: CartConfig;
  createdAt: string;
  updatedAt: string;
}

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("token"));
}

function readLocalCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is { id: number; config: CartConfig } =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as { id?: unknown }).id === "number" &&
          typeof (x as { config?: unknown }).config === "object",
      )
      .map((x) => ({ id: x.id, config: x.config }));
  } catch {
    return [];
  }
}

const CART_UPDATE_EVENT = "cart-update";

function broadcastCartUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATE_EVENT));
  }
}

function writeLocalCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    broadcastCartUpdate();
  } catch {
    /* ignore quota errors */
  }
}

function nextLocalId(items: CartItem[]): number {
  return items.reduce((max, item) => (item.id > max ? item.id : max), 0) + 1;
}

function fromServer(serverItems: ServerCartItem[]): CartItem[] {
  return serverItems.map((row) => ({ id: row.id, config: row.config }));
}

/**
 * Cart store. Persists to the backend when the user is logged in; falls
 * back to `localStorage` so a guest can still build a cart on a single
 * device. The full cart is mirrored to the backend as a single source of
 * truth when authenticated, so the local copy is just an offline cache.
 */
export function useCart() {
  const queryClient = useQueryClient();
  // Lazy init from localStorage — no effect needed, hydration happens
  // synchronously on the client's first render.
  const [localCart, setLocalCart] = useState<CartItem[]>(() => readLocalCart());
  const [authEpoch] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUpdate = () => {
      setLocalCart(readLocalCart());
    };
    window.addEventListener(CART_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CART_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Fetch server cart when logged in.
  const serverQuery = useQuery<ServerCartItem[]>({
    queryKey: ["cart", authEpoch],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải giỏ hàng từ máy chủ.");
      return res.json();
    },
    enabled: false, // we trigger manually after mount based on login state
  });

  // Initial server sync (post-mount only). We use an effect to keep the
  // cart in sync with the auth state, but every setState is guarded by a
  // condition so it never triggers a cascading render.
  useEffect(() => {
    if (isLoggedIn()) {
      void serverQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authEpoch]);

  // Mirror server cart into local when the query updates.
  useEffect(() => {
    if (!serverQuery.data) return;
    const items = fromServer(serverQuery.data);
    queueMicrotask(() => {
      setLocalCart(items);
      writeLocalCart(items);
    });
  }, [serverQuery.data]);

  const addMutation = useMutation<
    ServerCartItem,
    Error,
    CartConfig
  >({
    mutationFn: async (config) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Không thể thêm vào giỏ hàng.");
      return res.json();
    },
    onSuccess: (row) => {
      const next = [...localCart, { id: row.id, config: row.config }];
      setLocalCart(next);
      writeLocalCart(next);
    },
  });

  const removeMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/cart/items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể xóa món khỏi giỏ hàng.");
    },
    onSuccess: (_, id) => {
      const next = localCart.filter((c) => c.id !== id);
      setLocalCart(next);
      writeLocalCart(next);
    },
  });

  const clearMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể xóa giỏ hàng.");
    },
    onSuccess: () => {
      setLocalCart([]);
      writeLocalCart([]);
    },
  });

  const saveCart = useCallback(
    async (next: CartItem[]) => {
      if (isLoggedIn()) {
        // When logged in, treat `next` as the new authoritative list: clear
        // remote then re-insert every item. (We do this synchronously on the
        // caller's await to keep the local UI in lockstep with the server.)
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE}/api/cart`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
        for (const item of next) {
          await fetch(`${API_BASE}/api/cart/items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(item.config),
          }).catch(() => undefined);
        }
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
      } else {
        setLocalCart(next);
        writeLocalCart(next);
      }
    },
    [queryClient],
  );

  const addToCart = useCallback(
    async (config: CartConfig) => {
      if (isLoggedIn()) {
        await addMutation.mutateAsync(config);
      } else {
        const next = [
          ...localCart,
          { id: nextLocalId(localCart), config },
        ];
        setLocalCart(next);
        writeLocalCart(next);
      }
    },
    [addMutation, localCart],
  );

  const removeFromCart = useCallback(
    async (id: number) => {
      if (isLoggedIn()) {
        await removeMutation.mutateAsync(id);
      } else {
        const next = localCart.filter((c) => c.id !== id);
        setLocalCart(next);
        writeLocalCart(next);
      }
    },
    [removeMutation, localCart],
  );

  const clearCart = useCallback(async () => {
    if (isLoggedIn()) {
      await clearMutation.mutateAsync();
    } else {
      setLocalCart([]);
      writeLocalCart([]);
    }
  }, [clearMutation]);

  return {
    cart: localCart,
    isSaving: addMutation.isPending || removeMutation.isPending || clearMutation.isPending,
    addToCart,
    saveCart,
    removeFromCart,
    clearCart,
  };
}
