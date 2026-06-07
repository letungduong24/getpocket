"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Store,
  ShoppingCart,
  History,
  ShieldAlert,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";

import {
  AppShell,
  DashboardFrame,
  LeftRail,
  NavIcon,
} from "@/components/system/app-shell";
import { Avatar } from "@/components/system/primitives";

interface User {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
}

type NavItem = {
  id: string; // added unique id to distinguish items
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badgeKey?: "cart";
};

const NAV_ITEMS: NavItem[] = [
  { id: "store", href: "/", label: "Cửa hàng Pokémon", icon: Store },
  { id: "cart", href: "/cart", label: "Giỏ hàng", icon: ShoppingCart, badgeKey: "cart" },
  { id: "orders", href: "/my-orders", label: "Đơn hàng của tôi", icon: History },
  { id: "admin", href: "/admin", label: "Quản trị (Admin)", icon: ShieldAlert, adminOnly: true },
];

import { useAuth } from "@/components/auth-provider";

export interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { cart } = useCart();

  const handleLogout = () => {
    logout();
  };

  if (!user) return null;

  const leftRail = (
    <LeftRail
      brand={
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-purple-500 text-white ring-2 ring-white/15 lg:h-12 lg:w-12">
          <Avatar name={user.username} size="sm" />
        </div>
      }
      top={
        <>
          {NAV_ITEMS.filter((i) => !i.adminOnly || user.role === "ADMIN").map(
            (item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const badge =
                item.badgeKey === "cart" && cart.length > 0
                  ? cart.length
                  : undefined;
              return (
                <NavIcon
                  key={item.id}
                  href={item.href}
                  active={active}
                  label={item.label}
                  icon={<Icon className="h-5 w-5" />}
                  badge={badge}
                />
              );
            }
          )}
        </>
      }
      bottom={
        <>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            className="mt-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white/50 transition-all hover:bg-white/[0.06] hover:text-white lg:mt-2 lg:h-12 lg:w-12"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </>
      }
    />
  );

  return (
    <AppShell>
      <DashboardFrame
        leftRail={leftRail}
        main={<div data-slot="dashboard-content">{children}</div>}
      />
    </AppShell>
  );
}
