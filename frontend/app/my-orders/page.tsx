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
import { StatTile } from "@/components/system/dashboard";

interface Order {
  id: number;
  customerName: string;
  contactInfo: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
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
        <div className="">
          <div className="space-y-4">
            <SectionHeader title="Tổng quan" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
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

            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
              {selectedOrder.status === "PENDING" ? (
                <>Đơn hàng đang ở trạng thái <strong className="text-white">Đang chờ giao</strong>. Admin sẽ liên hệ sớm nhất với bạn qua Zalo/Facebook/SĐT để tiến hành giao dịch.</>
              ) : selectedOrder.status === "COMPLETED" ? (
                <>Đơn hàng đã <strong className="text-white">hoàn thành</strong>.</>
              ) : (
                <>Đơn hàng đã bị <strong className="text-white">hủy</strong>.</>
              )}
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
