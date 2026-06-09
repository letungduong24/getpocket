"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Check,
  X,
  ShoppingBag,
  Clock,
  Eye,
  TrendingUp,
  Activity,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SidebarLayout from "@/components/sidebar-layout";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { SectionHeader } from "@/components/system/primitives";
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
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  COMPLETED: { label: "Đã hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã hủy", tone: "danger" },
  PENDING: { label: "Chờ giao", tone: "warning" },
};

const toneClass: Record<"success" | "warning" | "danger", string> = {
  success: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  warning: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  danger: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

function pokemonSpriteUrl(speciesId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
}

import { AdminGuard } from "@/components/auth-provider";

function AdminPageContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Chưa đăng nhập.");
      const res = await fetch(`${API_BASE}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng.");
      return res.json();
    },
  });

  const { data: notesData = [] } = useQuery<any[]>({
    queryKey: ["admin-notes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/notes`);
      if (!res.ok) throw new Error("Không thể tải ghi chú.");
      return res.json();
    },
  });

  useEffect(() => {
    setNotes(notesData);
  }, [notesData]);

  const statusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: number;
      status: string;
    }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại.");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({
        title: "Cập nhật thành công",
        description: `Đơn hàng #${variables.orderId} đã chuyển sang trạng thái ${variables.status === "COMPLETED" ? "Đã hoàn thành" : variables.status === "CANCELLED" ? "Đã hủy" : "Chờ giao"}.`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Cập nhật thất bại",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Thêm thông báo thất bại.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewNoteContent("");
      toast({
        title: "Thêm thành công",
        description: "Đã thêm dòng thông báo mới.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Thêm thất bại",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Cập nhật thông báo thất bại.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({
        title: "Cập nhật thành công",
        description: "Nội dung thông báo đã được lưu lại.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Cập nhật thất bại",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xoá thông báo thất bại.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({
        title: "Xoá thành công",
        description: "Đã xoá dòng thông báo.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Xoá thất bại",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    createNoteMutation.mutate(newNoteContent.trim());
  };

  const handleUpdateNote = (id: number, content: string) => {
    updateNoteMutation.mutate({ id, content });
  };

  const handleDeleteNote = (id: number) => {
    deleteNoteMutation.mutate(id);
  };

  /* ---- derived ---- */
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const completionRate = orders.length
    ? Math.round((completedOrders / orders.length) * 100)
    : 0;

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Title block */}
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-accent" />
            <h1 className="font-display text-2xl font-bold text-white">
              Trang quản trị Admin
            </h1>
          </div>
          <p className="text-sm text-white/50">
            Quản lý đơn hàng và nội dung thông báo trên shop.
          </p>
        </header>

        {/* Stat tiles */}
        <div className="">
          <div className="space-y-4">
            <SectionHeader title="Tổng quan" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <AdminStatTile
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Tổng đơn"
                value={orders.length}
                tone="accent"
              />
              <AdminStatTile
                icon={<Clock className="h-4 w-4" />}
                label="Chờ xử lý"
                value={pendingOrders}
                tone="warning"
              />
              <AdminStatTile
                icon={<TrendingUp className="h-4 w-4" />}
                label="Hoàn tất"
                value={`${completionRate}%`}
                tone="info"
              />
            </div>

            {/* Notes config card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" />
                  Cấu hình Thông báo
                </CardTitle>
                <CardDescription>
                  Quản lý nội dung thông báo hiển thị trên shop
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Input
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Nhập nội dung thông báo mới..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={createNoteMutation.isPending || !newNoteContent.trim()}>
                    Thêm
                  </Button>
                </form>

                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-xs text-white/45 py-2">Chưa có thông báo nào.</p>
                  ) : (
                    notes.map((note) => (
                      <NoteLine
                        key={note.id}
                        note={note}
                        onSave={handleUpdateNote}
                        onDelete={handleDeleteNote}
                        isSaving={updateNoteMutation.isPending}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Orders queue */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách đơn hàng</CardTitle>
            <CardDescription>
              Kiểm duyệt và cập nhật trạng thái đơn hàng
            </CardDescription>
          </CardHeader>
          <CardContent className={orders.length > 0 ? "p-0" : "p-6 pt-0"}>
            {isLoadingOrders ? (
              <div className="flex h-32 items-center justify-center text-white/40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-white/45 bg-black/10 rounded-xl border border-white/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.02] ring-1 ring-white/10">
                  <ShoppingBag className="h-5 w-5 text-accent/80" />
                </div>
                <p className="text-sm font-medium">Hệ thống chưa ghi nhận đơn đặt hàng nào.</p>
              </div>
            ) : (
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
                    const tone = statusTone[order.status];
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
                              toneClass[tone.tone]
                            )}
                          >
                            {tone.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-white/60" suppressHydrationWarning>
                          {new Date(order.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setSelectedOrder(order)}
                              aria-label="Xem"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === "PENDING" && (
                              <>
                                <Button
                                  size="icon-sm"
                                  variant="secondary"
                                  onClick={() =>
                                    statusMutation.mutate({
                                      orderId: order.id,
                                      status: "COMPLETED",
                                    })
                                  }
                                  className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                  aria-label="Hoàn thành"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="destructive"
                                  onClick={() =>
                                    statusMutation.mutate({
                                      orderId: order.id,
                                      status: "CANCELLED",
                                    })
                                  }
                                  aria-label="Hủy"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Detail dialog */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(o) => !o && setSelectedOrder(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  Đơn hàng #{selectedOrder.id}
                </DialogTitle>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                    toneClass[statusTone[selectedOrder.status].tone]
                  )}
                >
                  {statusTone[selectedOrder.status].label}
                </span>
              </div>
              <DialogDescription>
                Thông tin chi tiết đơn hàng
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
                <p className="mt-1 font-mono font-bold text-white">
                  {selectedOrder.contactInfo}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
              {selectedOrder.status === "PENDING"
                ? "Đơn hàng đang chờ xử lý."
                : selectedOrder.status === "COMPLETED"
                ? "Đơn hàng đã hoàn thành."
                : "Đơn hàng đã bị hủy."}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  );
}

/* ------------------------------------------------------------------ */
/* Admin-specific helpers                                              */
/* ------------------------------------------------------------------ */
function AdminStatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "accent" | "warning" | "info" | "success";
}) {
  return (
    <StatTile icon={icon} label={label} value={value} tone={tone} />
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-white/80">{value}</p>
    </div>
  );
}

function NoteLine({
  note,
  onSave,
  onDelete,
  isSaving,
}: {
  note: any;
  onSave: (id: number, content: string) => void;
  onDelete: (id: number) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note.content);

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(note.id, value.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(note.content);
    setEditing(false);
  };

  return (
    <div className="group flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/20">
      {editing ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-sm text-white outline-none focus-visible:border-white/30 resize-none"
          />
          <div className="flex shrink-0 flex-col gap-1 pt-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={isSaving || !value.trim()}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p
            className="min-w-0 flex-1 cursor-pointer py-1 text-sm text-white/70 transition-colors hover:text-white"
            onClick={() => setEditing(true)}
          >
            {note.content}
          </p>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(note.id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
