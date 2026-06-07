"use client";

import * as React from "react";
import { useState } from "react";
import { Trash2, ShoppingBag, ChevronRight } from "lucide-react";

import SidebarLayout from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader, Pill } from "@/components/system/primitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

import { AuthGuard } from "@/components/auth-provider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PricingConfig {
  retailPrice: number;
  wholesalePrice: number;
  wholesaleThreshold: number;
}

function validateCheckout(name: string, contact: string) {
  const errors: Partial<Record<"customerName" | "contactInfo", string>> = {};
  if (!name.trim()) errors.customerName = "Vui lòng nhập tên người nhận";
  if (!contact.trim())
    errors.contactInfo = "Vui lòng nhập phương thức liên hệ (Zalo, Facebook, SĐT)";
  return errors;
}

function CartPageContent() {
  const { cart, removeFromCart, clearCart } = useCart();
  const { toast } = useToast();
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<"customerName" | "contactInfo", string>>
  >({});
  const [success, setSuccess] = useState<{ id: number; totalPrice: number } | null>(
    null,
  );

  const { data: pricing = { retailPrice: 15000, wholesalePrice: 10000, wholesaleThreshold: 5 } } =
    useQuery<PricingConfig>({
      queryKey: ["pricing"],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/admin/pricing`);
        if (!res.ok) throw new Error("Không thể tải cấu hình giá.");
        return res.json();
      },
    });

  // Detail modal state
  const [viewingDetailItem, setViewingDetailItem] = useState<any | null>(null);

  const handleRemoveItem = async (id: number, name: string) => {
    await removeFromCart(id);
    toast({
      title: "Đã xóa Pokémon",
      description: `Đã xóa ${name} khỏi giỏ hàng.`,
      variant: "info",
    });
  };

  const handleClearCart = async () => {
    await clearCart();
    toast({
      title: "Đã dọn dẹp giỏ hàng",
      description: "Đã xóa toàn bộ Pokémon khỏi giỏ hàng.",
      variant: "info",
    });
  };

  const cartInfo = React.useMemo(() => {
    let total = 0;
    let customCount = 0;
    let packCount = 0;

    cart.forEach((item) => {
      if (item.config?.isPack) {
        total += Number(item.config.price || 0);
        packCount++;
      } else {
        customCount++;
      }
    });

    const isWholesale = customCount >= pricing.wholesaleThreshold;
    const unitPrice = isWholesale ? pricing.wholesalePrice : pricing.retailPrice;
    total += customCount * unitPrice;

    return {
      count: customCount + packCount,
      customCount,
      packCount,
      isWholesale,
      unitPrice,
      total
    };
  }, [cart, pricing]);

  const count = cartInfo.count;
  const total = cartInfo.total;

  const checkoutMutation = useMutation<
    { orderId: number; totalPrice: number },
    Error,
    Record<string, unknown>
  >({
    mutationFn: async (payload) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đặt hàng thất bại.");
      return data;
    },
    onSuccess: (data) => {
      setSuccess({ id: data.orderId, totalPrice: data.totalPrice });
      void clearCart();
      setShowCheckout(false);
      setCustomerName("");
      setContactInfo("");
      setErrors({});
      toast({
        title: "Đặt hàng thành công",
        description: `Đơn hàng #${data.orderId} của bạn đã được gửi đi thành công.`,
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Lỗi gửi đơn hàng",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateCheckout(customerName, contactInfo);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const sections: any[] = [];

    // Group custom pokemons into a single section
    const customPokemons = cart
      .filter((item) => !item.config.isPack)
      .map((item) => ({
        speciesId: item.config.speciesId,
        speciesName: item.config.speciesName,
        shiny: item.config.shiny,
        level: item.config.level,
        ability: item.config.ability,
        nature: item.config.nature,
        heldItem: item.config.heldItem,
        moves: item.config.moves.filter((m) => m.trim() !== ""),
        ivs: item.config.ivs,
        evs: item.config.evs,
        trainerName: item.config.trainerName,
        trainerTid: item.config.trainerTid,
        trainerSid: item.config.trainerSid,
      }));

    if (customPokemons.length > 0) {
      sections.push({
        isPack: false,
        sectionName: "Custom Pokémon",
        pokemons: customPokemons,
      });
    }

    // Add each pack as its own section
    cart
      .filter((item) => item.config.isPack)
      .forEach((item) => {
        sections.push({
          isPack: true,
          sectionName: item.config.speciesName,
          shiny: item.config.shiny || false,
        });
      });

    checkoutMutation.mutate({
      customerName,
      contactInfo,
      sections,
    });
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-accent" />
            <h1 className="font-display text-2xl font-bold text-white">
              Giỏ hàng của tôi
            </h1>
          </div>
          <p className="text-sm text-white/50">
            Các Pokémon đang chờ thanh toán. Giỏ hàng được lưu theo tài khoản
            khi bạn đã đăng nhập.
          </p>
        </header>

        {/* Pricing strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.04]">
          <Pill tone="soft">
            Giá lẻ: <strong className="text-white">{pricing.retailPrice.toLocaleString()}đ</strong>
          </Pill>
          <Pill tone="soft">
            Giá sỉ (≥ {pricing.wholesaleThreshold} con):{" "}
            <strong className="text-white">{pricing.wholesalePrice.toLocaleString()}đ</strong>
          </Pill>
          <Pill tone="accent">
            Tạm tính: <strong>{count}</strong> con ·{" "}
            <strong>{total.toLocaleString()}đ</strong>
          </Pill>
        </div>

        {success ? (
          <SuccessCard
            order={success}
            onContinue={() => setSuccess(null)}
          />
        ) : cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/[0.04] p-12 text-center text-white/50 ring-1 ring-white/[0.04]">
            <ShoppingBag className="h-10 w-10" />
            <p className="text-sm">Giỏ hàng trống.</p>
            <Button onClick={() => (window.location.href = "/")}>
              <ChevronRight className="h-4 w-4" />
              Đặt mua Pokémon ngay
            </Button>
          </div>
        ) : (
          <>
            <SectionHeader
              title="Danh sách chờ thanh toán"
              description="Bạn có thể xóa từng Pokémon hoặc xóa toàn bộ giỏ hàng"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearCart}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa toàn bộ
                  </Button>
                  <Button size="sm" onClick={() => setShowCheckout(true)}>
                    Thanh toán ({count})
                  </Button>
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {cart.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={() => handleRemoveItem(item.id, item.config.speciesName)}
                  onClick={() => setViewingDetailItem(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showCheckout && (
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hoàn tất đơn hàng</DialogTitle>
              <DialogDescription>
                {count} Pokémon ·{" "}
                <span className="font-semibold text-white">
                  {total.toLocaleString()} đ
                </span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                  Tên người nhận
                </label>
                <Input
                  placeholder="Nhập họ và tên..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={cn(
                    errors.customerName &&
                      "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {errors.customerName && (
                  <span className="text-xs text-destructive">
                    {errors.customerName}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                  Liên hệ (Zalo / Facebook / SĐT)
                </label>
                <Input
                  placeholder="Link Facebook hoặc SĐT Zalo..."
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className={cn(
                    errors.contactInfo &&
                      "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                {errors.contactInfo && (
                  <span className="text-xs text-destructive">
                    {errors.contactInfo}
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-white/[0.04] p-4 text-xs text-white/60">
                <p className="font-semibold text-white">Hướng dẫn:</p>
                <p className="mt-1">
                  Sau khi gửi đơn hàng, Admin sẽ liên hệ sớm nhất để tiến hành giao dịch và hỗ trợ bạn nhận Pokémon qua phương thức liên hệ bạn đã cung cấp.
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? "Đang gửi..." : "Gửi đơn hàng"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ---------------- Item Details Dialog ---------------- */}
      {viewingDetailItem && (
        <Dialog open={!!viewingDetailItem} onOpenChange={(o) => !o && setViewingDetailItem(null)}>
          <DialogContent className={cn("overflow-hidden flex flex-col", viewingDetailItem.config.isPack ? "max-w-4xl max-h-[85vh]" : "max-w-xl max-h-[75vh]")}>
            <DialogHeader className="border-b border-white/5 pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight text-white">
                {viewingDetailItem.config.isPack ? "Chi tiết Gói Pokémon" : "Chi tiết Pokémon Tùy Chỉnh"}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {viewingDetailItem.config.isPack ? viewingDetailItem.config.speciesName : `Dex #${viewingDetailItem.config.speciesId}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 scrollbar-thin">
              {viewingDetailItem.config.isPack ? (
                /* Pack Render */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {viewingDetailItem.config.items?.map((pk: any, idx: number) => (
                    <div
                      key={idx}
                      className="relative overflow-hidden rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] flex flex-col justify-between"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/35 border border-white/5">
                          <img
                            src={
                              viewingDetailItem.config.shiny
                                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pk.speciesId}.png`
                                : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pk.speciesId}.png`
                            }
                            alt={pk.speciesName}
                            className="h-12 w-12 object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-display text-base font-bold text-white leading-tight">
                              {pk.speciesName}
                            </h4>
                            {viewingDetailItem.config.shiny && (
                              <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 ring-1 ring-amber-400/20">
                                Shiny
                              </span>
                            )}
                            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-white/50">
                              Lv.{pk.level}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-white/50 space-y-0.5">
                            <p>Đặc tính: <strong className="text-white">{pk.ability}</strong></p>
                            <p>Tính cách: <strong className="text-white">{pk.nature}</strong></p>
                            <p>Vật phẩm: <strong className="text-white">{pk.heldItem || "None"}</strong></p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-[10px] font-bold uppercase text-white/40 mb-1.5 tracking-wider">Chiêu thức</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {pk.moves.map((move: string, mIdx: number) => (
                            <div
                              key={mIdx}
                              className="rounded-lg bg-black/20 px-2 py-1 text-center text-[11px] font-medium text-white/70 truncate border border-white/5"
                            >
                              {move || "—"}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <span className="block text-white/40">Người nhận (OT)</span>
                          <strong className="text-white/80">{pk.trainerName}</strong>
                        </div>
                        <div>
                          <span className="block text-white/40">TID</span>
                          <strong className="text-white/80">{pk.trainerTid}</strong>
                        </div>
                        <div>
                          <span className="block text-white/40">SID</span>
                          <strong className="text-white/80">{pk.trainerSid}</strong>
                        </div>
                      </div>

                      {/* IVs & EVs */}
                      <div className="mt-2.5 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">Chỉ số IVs:</span>
                          <div className="flex gap-1 text-[10px] mt-0.5">
                            {Object.entries(pk.ivs || {}).map(([stat, val]: any) => (
                              <div key={stat} className="flex-1 text-center bg-white/5 rounded py-0.5">
                                <span className="block text-[8px] uppercase text-white/40">{stat}</span>
                                <span className="font-bold text-white">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">Chỉ số EVs:</span>
                          <div className="flex gap-1 text-[10px] mt-0.5">
                            {Object.entries(pk.evs || {}).map(([stat, val]: any) => (
                              <div key={stat} className="flex-1 text-center bg-white/5 rounded py-0.5">
                                <span className="block text-[8px] uppercase text-white/40">{stat}</span>
                                <span className="font-bold text-white">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Custom Pokemon Render */
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.04]">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-black/45 ring-1 ring-white/10">
                      <img
                        src={viewingDetailItem.config.speciesSpriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${viewingDetailItem.config.speciesId}.png`}
                        alt={viewingDetailItem.config.speciesName}
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-white">
                        {viewingDetailItem.config.speciesName}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        {viewingDetailItem.config.shiny && (
                          <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 ring-1 ring-amber-400/20">
                            Shiny
                          </span>
                        )}
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-white/50">
                          Lv.{viewingDetailItem.config.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                      <span className="block text-[10px] uppercase text-white/40">Đặc tính (Ability)</span>
                      <strong className="text-white">{viewingDetailItem.config.ability}</strong>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                      <span className="block text-[10px] uppercase text-white/40">Tính cách (Nature)</span>
                      <strong className="text-white">{viewingDetailItem.config.nature}</strong>
                    </div>
                    <div className="col-span-2 rounded-xl bg-white/[0.02] p-3 border border-white/5">
                      <span className="block text-[10px] uppercase text-white/40">Vật phẩm (Held Item)</span>
                      <strong className="text-white">{viewingDetailItem.config.heldItem || "None"}</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-white/40 tracking-wider">Chiêu thức</label>
                    <div className="grid grid-cols-2 gap-2">
                      {viewingDetailItem.config.moves?.map((move: string, i: number) => (
                        <div key={i} className="rounded-xl bg-black/25 p-2.5 text-center text-xs font-semibold text-white/80 border border-white/5">
                          {move || "—"}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-white/40">Trainer OT</span>
                      <strong className="text-white">{viewingDetailItem.config.trainerName}</strong>
                    </div>
                    <div>
                      <span className="block text-white/40">OT TID</span>
                      <strong className="text-white">{viewingDetailItem.config.trainerTid}</strong>
                    </div>
                    <div>
                      <span className="block text-white/40">OT SID</span>
                      <strong className="text-white">{viewingDetailItem.config.trainerSid}</strong>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-white/40 tracking-wider mb-1">Chỉ số IVs</span>
                      <div className="space-y-1">
                        {Object.entries(viewingDetailItem.config.ivs || {}).map(([stat, val]: any) => (
                          <div key={stat} className="flex justify-between text-xs bg-white/[0.02] px-2 py-0.5 rounded border border-white/5">
                            <span className="uppercase text-white/55 font-bold text-[9px]">{stat}</span>
                            <span className="font-semibold text-white">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-white/40 tracking-wider mb-1">Chỉ số EVs</span>
                      <div className="space-y-1">
                        {Object.entries(viewingDetailItem.config.evs || {}).map(([stat, val]: any) => (
                          <div key={stat} className="flex justify-between text-xs bg-white/[0.02] px-2 py-0.5 rounded border border-white/5">
                            <span className="uppercase text-white/55 font-bold text-[9px]">{stat}</span>
                            <span className="font-semibold text-white">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4">
              <Button
                className="w-full"
                type="button"
                onClick={() => setViewingDetailItem(null)}
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
  );
}

export default function CartPage() {
  return (
    <AuthGuard>
      <CartPageContent />
    </AuthGuard>
  );
}

function CartItemRow({
  item,
  onRemove,
  onClick,
}: {
  item: ReturnType<typeof useCart>["cart"][number];
  onRemove: () => void;
  onClick: () => void;
}) {
  const isPack = item.config.isPack;
  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-4 rounded-2xl bg-gradient-to-r from-accent/10 to-[#1c0a0e]/50 p-3 ring-1 ring-white/[0.06] hover:ring-white/15 transition-all cursor-pointer"
    >
      <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            isPack
              ? (item.config.shiny
                  ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${item.config.items?.[0]?.speciesId || 1}.png`
                  : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.config.items?.[0]?.speciesId || 1}.png`)
              : (item.config.speciesSpriteUrl ?? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.config.speciesId}.png`)
          }
          alt={item.config.speciesName}
          className="h-12 w-12 object-contain"
        />
      </div>

      <div className="relative z-10 min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="truncate font-display text-base font-semibold text-white group-hover:text-accent transition-colors">
            {item.config.speciesName}
          </span>
          {isPack ? (
            <>
              <span className="rounded bg-[#ff4655]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#ff4655] ring-1 ring-[#ff4655]/20">
                Event Pack
              </span>
              {item.config.shiny && (
                <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 ring-1 ring-amber-400/20">
                  Shiny
                </span>
              )}
            </>
          ) : (
            <>
              {item.config.shiny ? <Pill tone="accent">Shiny</Pill> : null}
              <Pill tone="soft">{item.config.nature}</Pill>
            </>
          )}
        </div>
        <div className="mt-1 text-xs text-white/60">
          {isPack ? (
            <span>Gói {item.config.items?.length || 10} Pokémon · {Number(item.config.price).toLocaleString()}đ</span>
          ) : (
            <span>Cấp {item.config.level} · {item.config.ability} · {item.config.heldItem}</span>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Xóa khỏi giỏ"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SuccessCard({
  order,
  onContinue,
}: {
  order: { id: number; totalPrice: number };
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/[0.04] p-12 text-center ring-1 ring-white/[0.06] surface-ring">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
        ✓
      </div>
      <h2 className="font-display text-3xl font-bold text-white">
        Đơn hàng #{order.id} ghi nhận thành công!
      </h2>
      <p className="max-w-lg text-sm text-white/60">
        Tổng thanh toán{" "}
        <strong className="text-white">{order.totalPrice.toLocaleString()} đ</strong>.
        Admin sẽ liên hệ với bạn trong thời gian sớm nhất qua Zalo/Facebook/SĐT để tiến hành giao dịch.
      </p>
      <Button size="lg" onClick={onContinue}>
        Tiếp tục mua Pokémon
      </Button>
    </div>
  );
}
