"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Store,
  History,
  ShieldAlert,
  LogOut,
  LogIn,
  type LucideIcon,
} from "lucide-react";

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
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "store", href: "/", label: "Cửa hàng Pokémon", icon: Store },
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

  const handleLogout = () => {
    logout();
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return user?.role === "ADMIN";
    if (item.id === "orders") return !!user;
    return true;
  });

  const leftRail = (
    <LeftRail
      brand={
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-purple-500 text-white ring-2 ring-white/15 lg:h-12 lg:w-12">
          <Avatar name={user ? user.username : "Guest"} size="sm" />
        </div>
      }
      top={
        <>
          {visibleNavItems.map(
            (item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <NavIcon
                  key={item.id}
                  href={item.href}
                  active={active}
                  label={item.label}
                  icon={<Icon className="h-5 w-5" />}
                />
              );
            }
          )}
        </>
      }
      bottom={
        user ? (
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            className="mt-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white/50 transition-all hover:bg-white/[0.06] hover:text-white lg:mt-2 lg:h-12 lg:w-12"
          >
            <LogOut className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (window.location.href = "/login")}
            aria-label="Đăng nhập"
            className="mt-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#ff4655] hover:text-[#e03e4c] ring-1 ring-[#ff4655]/20 hover:ring-[#ff4655]/40 transition-all hover:bg-white/[0.06] lg:mt-2 lg:h-12 lg:w-12"
          >
            <LogIn className="h-5 w-5" />
          </button>
        )
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
