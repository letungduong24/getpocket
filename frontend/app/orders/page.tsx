"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Clock,
  TrendingUp,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ShieldAlert,
  X,
  Check,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SidebarLayout from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { SectionHeader, Pill, SearchBar } from "@/components/system/primitives";
import { StatTile } from "@/components/system/dashboard";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/components/ui/toast";

interface Order {
  id: number;
  customerName: string;
  contactInfo: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

interface OrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STATUS_FILTERS = ["All", "PENDING", "COMPLETED", "CANCELLED"];
const STATUS_LABEL: Record<string, string> = {
  All: "Tất cả", PENDING: "Chờ xử lý", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy",
};

const statusTone: Record<Order["status"], { label: string; tone: "success" | "warning" | "danger"; icon: LucideIcon }> = {
  COMPLETED: { label: "Hoàn thành", tone: "success", icon: CheckCircle },
  CANCELLED: { label: "Đã hủy", tone: "danger", icon: XCircle },
  PENDING: { label: "Chờ xử lý", tone: "warning", icon: Clock },
};

const toneClass: Record<"success" | "warning" | "danger", string> = {
  success: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  warning: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  danger: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

import { AdminGuard } from "@/components/auth-provider";

function OrdersPageContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ["admin-orders", page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Chưa đăng nhập.");
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`${API_BASE}/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng.");
      return res.json();
    },
  });

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại.");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({
        title: "Cập nhật thành công",
        description: `Đơn hàng #${variables.orderId} đã chuyển sang ${STATUS_LABEL[variables.status]}.`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({ title: "Cập nhật thất bại", description: err.message, variant: "destructive" });
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;

  return (
    <SidebarLayout>
      <div className="space-y-8">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-accent" />
            <h1 className="font-display text-2xl font-bold text-white">
              Quản lý đơn hàng
            </h1>
          </div>
          <p className="text-sm text-white/50">
            Toàn bộ đơn hàng trên hệ thống — tìm kiếm, lọc, cập nhật trạng thái
          </p>
        </header>

        <div className="">
          <div className="space-y-4">
            <SectionHeader title="Tổng quan" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatTile icon={<ShoppingBag className="h-4 w-4" />} label="Tổng đơn" value={total} tone="accent" />
              <StatTile icon={<Clock className="h-4 w-4" />} label="Chờ xử lý" value={pendingOrders} tone="warning" />
              <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Trang hiện tại" value={orders.length} tone="info" />
            </div>

            <div className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách đơn hàng</CardTitle>
                  <CardDescription>Sắp xếp theo đơn mới nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex-1 min-w-[200px]">
                      <SearchBar
                        icon={<Search className="h-4 w-4" />}
                        placeholder="Tìm theo tên hoặc liên hệ..."
                        value={search}
                        onChange={handleSearchChange}
                      />
                    </div>
                    <div className="flex gap-1">
                      {STATUS_FILTERS.map((s) => (
                        <Pill
                          key={s}
                          tone={statusFilter === s ? "accent" : "soft"}
                          onClick={() => { setStatusFilter(s); setPage(1); }}
                          className="cursor-pointer"
                        >
                          {STATUS_LABEL[s]}
                        </Pill>
                      ))}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex h-32 items-center justify-center text-white/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
                    </div>
                  ) : error ? (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                      Có lỗi xảy ra khi lấy danh sách đơn hàng. Vui lòng thử lại.
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-12 text-white/50">
                      <ShoppingBag className="h-10 w-10" />
                      <p className="text-sm">Không tìm thấy đơn hàng nào.</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã đơn</TableHead>
                            <TableHead>Khách hàng</TableHead>
                            <TableHead>Liên hệ</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order) => {
                            const meta = statusTone[order.status];
                            const Icon = meta.icon;
                            return (
                              <TableRow key={order.id}>
                                <TableCell className="font-bold text-accent">#{order.id}</TableCell>
                                <TableCell className="font-semibold text-white">{order.customerName}</TableCell>
                                <TableCell className="font-mono text-xs text-white/60">{order.contactInfo}</TableCell>
                                <TableCell>
                                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", toneClass[meta.tone])}>
                                    <Icon className="h-3 w-3" />
                                    {meta.label}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-white/60" suppressHydrationWarning>
                                  {new Date(order.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {order.status === "PENDING" && (
                                      <>
                                        <Button variant="ghost" size="icon-sm" onClick={() => statusMutation.mutate({ orderId: order.id, status: "COMPLETED" })} title="Hoàn thành">
                                          <Check className="h-4 w-4 text-emerald-400" />
                                        </Button>
                                        <Button variant="ghost" size="icon-sm" onClick={() => statusMutation.mutate({ orderId: order.id, status: "CANCELLED" })} title="Hủy">
                                          <X className="h-4 w-4 text-rose-400" />
                                        </Button>
                                      </>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                        <span className="text-xs text-white/40">{total} đơn hàng</span>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-xs text-white/60 px-2">{page} / {totalPages}</span>
                          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Đơn hàng #{selectedOrder.id}</DialogTitle>
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", toneClass[statusTone[selectedOrder.status].tone])}>
                  {statusTone[selectedOrder.status].label}
                </span>
              </div>
              <DialogDescription suppressHydrationWarning>
                Tạo ngày {new Date(selectedOrder.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/[0.04] p-4 text-sm ring-1 ring-white/[0.04]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Người nhận</p>
                <p className="mt-1 font-bold text-white">{selectedOrder.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Liên hệ</p>
                <p className="mt-1 font-bold text-white text-wrap break-all">{selectedOrder.contactInfo}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
              {selectedOrder.status === "PENDING" ? (
                <>Đơn hàng đang chờ xử lý.</>
              ) : selectedOrder.status === "COMPLETED" ? (
                <>Đơn hàng đã hoàn thành.</>
              ) : (
                <>Đơn hàng đã bị hủy.</>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
  );
}

export default function OrdersPage() {
  return (
    <AdminGuard>
      <OrdersPageContent />
    </AdminGuard>
  );
}
