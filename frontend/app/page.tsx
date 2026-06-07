import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import ShopClient from "@/components/shop-client";
import { AuthGuard } from "@/components/auth-provider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const revalidate = 0; // Disable server caching for this page to fetch fresh db items

export default async function HomePage() {
  const queryClient = new QueryClient();

  try {
    // Prefetch the initial (unfiltered) pokedex
    await queryClient.prefetchQuery({
      queryKey: ["pokedex", "", "All"],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/pokemon`);
        if (!res.ok) throw new Error("Failed to fetch pokedex");
        return res.json();
      },
    });
  } catch (e) {
    console.error("Prefetch Pokedex error:", e instanceof Error ? e.message : e);
  }

  try {
    // Prefetch pricing
    await queryClient.prefetchQuery({
      queryKey: ["pricing"],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/admin/pricing`);
        if (!res.ok) throw new Error("Failed to fetch pricing");
        return res.json();
      },
    });
  } catch (e) {
    console.error("Prefetch pricing error:", e instanceof Error ? e.message : e);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuthGuard>
        <ShopClient />
      </AuthGuard>
    </HydrationBoundary>
  );
}
