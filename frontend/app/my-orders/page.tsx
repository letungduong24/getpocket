"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SidebarLayout from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SectionHeader, Pill } from "@/components/system/primitives";
import { StatBlock, StatTile, SeeMoreLink } from "@/components/system/dashboard";

interface OrderItem {
  id: number;
  speciesId: number;
  speciesName: string;
  shiny: boolean;
  level: number;
  ability: string;
  nature: string;
  heldItem: string;
  moves: string[];
  ivs: Record<string, number>;
  evs: Record<string, number>;
  trainerName: string;
  trainerTid: number;
  trainerSid: number;
}

interface Order {
  id: number;
  customerName: string;
  contactInfo: string;
  totalPrice: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  items: OrderItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const statusTone: Record<
  Order["status"],
  { label: string; tone: "success" | "warning" | "danger"; icon: LucideIcon }
> = {
  COMPLETED: { label: "Hoàn thành", tone: "success", icon: CheckCircle },
  CANCELLED: { label: "Đã hủy", tone: "danger", icon: XCircle },
  PENDING: { label: "Đang chờ giao", tone: "warning", icon: Clock },
};

const toneClass: Record<"success" | "warning" | "danger", string> = {
  success: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  warning: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  danger: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

import { AuthGuard } from "@/components/auth-provider";

function pokemonSpriteUrl(speciesId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
}

function MyOrdersPageContent() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Chưa đăng nhập.");
      const res = await fetch(`${API_BASE}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng.");
      return res.json();
    },
  });

  const totalSpent = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + parseFloat(o.totalPrice), 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Title */}
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-accent" />
            <h1 className="font-display text-2xl font-bold text-white">
              Lịch sử đơn hàng
            </h1>
          </div>
          <p className="text-sm text-white/50">
            Xem, theo dõi trạng thái các đơn nặn Pokémon của bạn.
          </p>
        </header>

        {/* Stat tiles + stat block */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionHeader title="Tổng quan" action={<SeeMoreLink />} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatTile
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Tổng đơn"
                value={orders.length}
                tone="accent"
              />
              <StatTile
                icon={<Clock className="h-4 w-4" />}
                label="Đang chờ"
                value={pendingCount}
                tone="warning"
              />
              <StatTile
                icon={<DollarSign className="h-4 w-4" />}
                label="Đã chi"
                value={`${totalSpent.toLocaleString()}đ`}
                tone="success"
              />
            </div>

            {/* Orders table */}
            <div className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách đơn hàng</CardTitle>
                  <CardDescription>
                    Sắp xếp theo đơn mới nhất
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex h-32 items-center justify-center text-white/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
                    </div>
                  ) : error ? (
                    <div className="m-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                      Có lỗi xảy ra khi lấy danh sách đơn hàng. Vui lòng thử
                      lại.
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-12 text-white/50">
                      <ShoppingBag className="h-10 w-10" />
                      <p className="text-sm">
                        Bạn chưa có đơn đặt hàng nào.
                      </p>
                      <Button onClick={() => (window.location.href = "/")}>
                        Đặt mua Pokémon ngay
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã đơn</TableHead>
                          <TableHead>Người nhận</TableHead>
                          <TableHead>Liên hệ</TableHead>
                          <TableHead>Số lượng</TableHead>
                          <TableHead>Tổng tiền</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Ngày tạo</TableHead>
                          <TableHead className="text-right">Chi tiết</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const meta = statusTone[order.status];
                          const Icon = meta.icon;
                          return (
                            <TableRow key={order.id}>
                              <TableCell className="font-bold text-accent">
                                #{order.id}
                              </TableCell>
                              <TableCell className="font-semibold text-white">
                                {order.customerName}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-white/60">
                                {order.contactInfo}
                              </TableCell>
                              <TableCell>
                                <Pill tone="soft">
                                  {order.items?.length || 0} Pokémon
                                </Pill>
                              </TableCell>
                              <TableCell className="font-bold text-white">
                                {parseFloat(order.totalPrice).toLocaleString()} đ
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                    toneClass[meta.tone]
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  {meta.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-white/60" suppressHydrationWarning>
                                {new Date(order.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Xem
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stat block */}
          <div className="space-y-4">
            <SectionHeader
              title="Hoạt động"
              action={<Pill tone="soft">Mới</Pill>}
            />
            <StatBlock totalLabel="Hoàn thành" totalValue={completedCount}>
              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Tỉ lệ"
                  value={`${
                    orders.length
                      ? Math.round((completedCount / orders.length) * 100)
                      : 0
                  }%`}
                  tone="accent"
                />
                <StatTile
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Đơn tốt"
                  value={completedCount}
                  tone="success"
                />
              </div>
            </StatBlock>
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(o) => !o && setSelectedOrder(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Đơn hàng #{selectedOrder.id}</DialogTitle>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                    toneClass[statusTone[selectedOrder.status].tone]
                  )}
                >
                  {statusTone[selectedOrder.status].label}
                </span>
              </div>
              <DialogDescription suppressHydrationWarning>
                Tạo ngày{" "}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/[0.04] p-4 text-sm ring-1 ring-white/[0.04]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Người nhận
                </p>
                <p className="mt-1 font-bold text-white">
                  {selectedOrder.customerName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Liên hệ
                </p>
                <p className="mt-1 font-bold text-white text-wrap break-all">
                  {selectedOrder.contactInfo}
                </p>
              </div>
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {selectedOrder.items?.map((item) => (
                <Card key={item.id} size="sm">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pokemonSpriteUrl(item.speciesId)}
                            alt={item.speciesName}
                            className="h-10 w-10 object-contain"
                          />
                        </div>
                        <div>
                          <h4 className="font-display text-base font-semibold text-white">
                            {item.shiny ? "⭐ " : ""}
                            {item.speciesName}{" "}
                            <span className="text-xs text-white/40">
                              Lv.{item.level}
                            </span>
                          </h4>
                          <p className="text-[11px] uppercase tracking-wider text-white/40">
                            {item.ability} · {item.nature}
                          </p>
                        </div>
                      </div>
                      <Pill tone="soft">#{item.speciesId}</Pill>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Held Item
                        </p>
                        <p className="mt-0.5 font-mono text-white/80">
                          {item.heldItem}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Trainer
                        </p>
                        <p className="mt-0.5 font-mono text-white/80">
                          {item.trainerName} ({item.trainerTid}/{item.trainerSid})
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.03] p-2 ring-1 ring-white/[0.04]">
                      {item.moves.map((move, mIdx) => (
                        <div
                          key={mIdx}
                          className="flex items-center gap-1.5 text-xs text-white/70"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                          {move || "---"}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-2 text-[10px] font-mono">
                      <div>
                        <p className="font-bold uppercase tracking-wider text-white/40">
                          IVs
                        </p>
                        <p className="text-white/80">
                          H:{item.ivs.hp} A:{item.ivs.atk} D:{item.ivs.def} SA:
                          {item.ivs.spa} SD:{item.ivs.spd} S:{item.ivs.spe}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-wider text-white/40">
                          EVs
                        </p>
                        <p className="text-white/80">
                          H:{item.evs.hp} A:{item.evs.atk} D:{item.evs.def} SA:
                          {item.evs.spa} SD:{item.evs.spd} S:{item.evs.spe}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedOrder.status === "PENDING" && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                Đơn hàng đang ở trạng thái{" "}
                <strong className="text-white">Đang chờ giao</strong>. Admin sẽ liên hệ sớm nhất với bạn qua Zalo/Facebook/SĐT để tiến hành giao dịch.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <span className="text-sm text-white/60">Tổng thanh toán:</span>
              <span className="font-display text-xl font-bold text-accent">
                {parseFloat(selectedOrder.totalPrice).toLocaleString()} đ
              </span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
  );
}

export default function MyOrdersPage() {
  return (
    <AuthGuard>
      <MyOrdersPageContent />
    </AuthGuard>
  );
}
