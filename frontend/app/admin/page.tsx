"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ShieldAlert,
  Download,
  Check,
  X,
  ShoppingBag,
  Clock,
  Settings,
  HelpCircle,
  Eye,
  TrendingUp,
  Activity,
  Users,
  DollarSign,
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
import { Combobox } from "@/components/ui/combobox";
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
  sectionName?: string | null;
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

interface PricingConfig {
  retailPrice: number;
  wholesalePrice: number;
  wholesaleThreshold: number;
}

const pricingSchema = z.object({
  retailPrice: z.number().min(0, "Giá lẻ không được âm"),
  wholesalePrice: z.number().min(0, "Giá sỉ không được âm"),
  wholesaleThreshold: z.number().min(1, "Ngưỡng sỉ tối thiểu là 1 Pokémon"),
});

type PricingFormData = z.infer<typeof pricingSchema>;

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
  const [pricingForm, setPricingForm] = useState<PricingFormData>({
    retailPrice: 15000,
    wholesalePrice: 10000,
    wholesaleThreshold: 5,
  });
  const [pricingErrors, setPricingErrors] = useState<Partial<Record<keyof PricingFormData, string>>>({});
  const [pricingSuccess, setPricingSuccess] = useState(false);

  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [packPrice, setPackPrice] = useState<number>(0);
  const [packDescription, setPackDescription] = useState<string>("");
  const [packSuccess, setPackSuccess] = useState(false);
  const [packError, setPackError] = useState("");

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

  const { data: pricingData } = useQuery<PricingConfig>({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/pricing`);
      if (!res.ok) throw new Error("Không thể tải cấu hình giá.");
      return res.json();
    },
  });

  useEffect(() => {
    if (pricingData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form to fetched data
      setPricingForm({
        retailPrice: pricingData.retailPrice,
        wholesalePrice: pricingData.wholesalePrice,
        wholesaleThreshold: pricingData.wholesaleThreshold,
      });
    }
  }, [pricingData]);

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

  const pricingMutation = useMutation({
    mutationFn: async (data: PricingFormData) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/pricing`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Cập nhật giá bán sỉ/lẻ thất bại.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
      setPricingSuccess(true);
      setTimeout(() => setPricingSuccess(false), 3000);
      toast({
        title: "Cập nhật thành công",
        description: "Bảng cấu hình giá đã được lưu lại thành công.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Cập nhật giá thất bại",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const { data: packs = [] } = useQuery<any[]>({
    queryKey: ["admin-packs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/packs`);
      if (!res.ok) throw new Error("Không thể tải danh sách gói.");
      return res.json();
    },
  });

  useEffect(() => {
    if (packs.length > 0 && !selectedPackId) {
      const first = packs[0];
      setSelectedPackId(String(first.id));
      setPackPrice(Number(first.price));
      setPackDescription(first.description || "");
    }
  }, [packs, selectedPackId]);

  const handlePackSelectChange = (idStr: string) => {
    setSelectedPackId(idStr);
    const found = packs.find((p) => String(p.id) === idStr);
    if (found) {
      setPackPrice(Number(found.price));
      setPackDescription(found.description || "");
    }
  };

  const packMutation = useMutation({
    mutationFn: async ({ id, price, description }: { id: number; price: number; description: string }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/packs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ price, description }),
      });
      if (!res.ok) throw new Error("Cập nhật cấu hình gói thất bại.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packs"] });
      queryClient.invalidateQueries({ queryKey: ["packs"] });
      setPackSuccess(true);
      setPackError("");
      setTimeout(() => setPackSuccess(false), 3000);
      toast({
        title: "Cập nhật thành công",
        description: "Cấu hình gói Pokémon đã được lưu thành công.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      setPackError(err.message);
      toast({
        title: "Cập nhật gói thất bại",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  const handlePackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPackSuccess(false);
    setPackError("");

    if (!selectedPackId) {
      setPackError("Vui lòng chọn một gói để cập nhật.");
      return;
    }
    if (packPrice < 0) {
      setPackError("Giá gói không được âm.");
      return;
    }

    packMutation.mutate({
      id: parseInt(selectedPackId),
      price: packPrice,
      description: packDescription,
    });
  };

  const handlePricingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPricingErrors({});
    setPricingSuccess(false);

    const validation = pricingSchema.safeParse(pricingForm);
    if (!validation.success) {
      const errorsMap: Partial<Record<keyof PricingFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errorsMap[issue.path[0] as keyof PricingFormData] = issue.message;
        }
      });
      setPricingErrors(errorsMap);
      return;
    }

    pricingMutation.mutate(pricingForm);
  };

  /* ---- derived ---- */
  const totalRevenue = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + parseFloat(o.totalPrice), 0);
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const completionRate = orders.length
    ? Math.round((completedOrders / orders.length) * 100)
    : 0;

  const handleDownloadZip = (order: Order) => {
    const token = localStorage.getItem("token");
    const downloadUrl = `${API_BASE}/api/admin/orders/${order.id}/download`;

    fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải file zip.");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order_${order.id}_${order.customerName.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((e) => alert(e.message));
  };

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
            Điều phối đơn hàng, cấu hình giá, xuất file và duyệt chuyển Pokémon
            lên hệ thống 3DS / HOME.
          </p>
        </header>

        {/* Stat tiles + Stat block */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionHeader title="Overview" action={<SeeMoreLink />} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
                icon={<DollarSign className="h-4 w-4" />}
                label="Doanh thu"
                value={`${totalRevenue.toLocaleString()}đ`}
                tone="success"
              />
              <AdminStatTile
                icon={<TrendingUp className="h-4 w-4" />}
                label="Hoàn tất"
                value={`${completionRate}%`}
                tone="info"
              />
            </div>

             {/* Configurations */}
            <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
              {/* Pricing card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-accent" />
                    Cấu hình giá bán
                  </CardTitle>
                  <CardDescription>
                    Cập nhật quy định áp dụng giá bán sỉ/lẻ trên shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePricingSubmit} className="space-y-3">
                    {pricingSuccess && (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs font-semibold text-emerald-300">
                        ✓ Cấu hình giá đã cập nhật thành công!
                      </div>
                    )}
                    <ConfigField label="Giá bán lẻ (đ/con)" error={pricingErrors.retailPrice}>
                      <Input
                        type="number"
                        value={pricingForm.retailPrice}
                        onChange={(e) =>
                          setPricingForm((p) => ({
                            ...p,
                            retailPrice: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </ConfigField>
                    <ConfigField label="Giá bán sỉ (đ/con)" error={pricingErrors.wholesalePrice}>
                      <Input
                        type="number"
                        value={pricingForm.wholesalePrice}
                        onChange={(e) =>
                          setPricingForm((p) => ({
                            ...p,
                            wholesalePrice: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </ConfigField>
                    <ConfigField label="Ngưỡng sỉ (số lượng con)" error={pricingErrors.wholesaleThreshold}>
                      <Input
                        type="number"
                        value={pricingForm.wholesaleThreshold}
                        onChange={(e) =>
                          setPricingForm((p) => ({
                            ...p,
                            wholesaleThreshold: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </ConfigField>
                    <Button type="submit" className="w-full" disabled={pricingMutation.isPending}>
                      Cập nhật giá
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Pack config card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-accent" />
                    Cấu hình Gói Pokémon
                  </CardTitle>
                  <CardDescription>
                    Cập nhật giá và mô tả của các gói Pokémon hiện có trên shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePackSubmit} className="space-y-3">
                    {packSuccess && (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs font-semibold text-emerald-300">
                        ✓ Đã cập nhật gói thành công!
                      </div>
                    )}
                    {packError && (
                      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                        Lỗi: {packError}
                      </div>
                    )}
                    {packs.length === 0 ? (
                      <p className="text-xs text-white/45 py-2">Không tìm thấy gói nào.</p>
                    ) : (
                      <>
                        <ConfigField label="Chọn gói Pokémon">
                          <Combobox
                            options={packs.map((p) => ({
                              value: String(p.id),
                              label: p.name,
                            }))}
                            value={selectedPackId}
                            onChange={(v) => handlePackSelectChange(String(v))}
                            placeholder="Chọn gói Pokémon..."
                            searchPlaceholder="Tìm gói..."
                          />
                        </ConfigField>
                        <ConfigField label="Giá trọn gói (VND)">
                          <Input
                            type="number"
                            value={packPrice}
                            onChange={(e) => setPackPrice(parseInt(e.target.value) || 0)}
                          />
                        </ConfigField>
                        <ConfigField label="Mô tả chi tiết gói">
                          <textarea
                            value={packDescription}
                            onChange={(e) => setPackDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white outline-none transition-colors focus-visible:border-white/30 focus-visible:ring-2 focus-visible:ring-white/15 resize-none"
                            placeholder="Nhập mô tả cho gói..."
                          />
                        </ConfigField>
                        <Button type="submit" className="w-full" disabled={packMutation.isPending}>
                          {packMutation.isPending ? "Đang cập nhật..." : "Cập nhật gói"}
                        </Button>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stat block — visual chart */}
          <div className="space-y-4">
            <SectionHeader title="Doanh thu" action={<Pill tone="soft">30 ngày</Pill>} />
            <StatBlock totalLabel="Tổng doanh thu" totalValue={`${totalRevenue.toLocaleString()}đ`}>
              <div className="grid grid-cols-2 gap-2">
                <AdminStatTile
                  icon={<Users className="h-4 w-4" />}
                  label="Khách"
                  value={new Set(orders.map((o) => o.customerName)).size}
                  tone="info"
                />
                <AdminStatTile
                  icon={<Activity className="h-4 w-4" />}
                  label="Tỉ lệ"
                  value={`${completionRate}%`}
                  tone="accent"
                />
              </div>
            </StatBlock>

            {/* Guide card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-accent" />
                  Hướng dẫn nghiệp vụ
                </CardTitle>
                <CardDescription>
                  Quy trình Inject file và chuyển Pokémon bằng Pokémon Bank
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/70">
                <div className="space-y-2 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.04]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
                    Phần 1 · Chuẩn bị Save
                  </h4>
                  <ol className="list-decimal space-y-1 pl-4 text-xs text-white/60">
                    <li>Vào đơn hàng bên dưới, tìm đơn <strong className="text-white">đang chờ giao</strong>.</li>
                    <li>Nhấn nút <strong className="text-white">Tải File .pk7 (ZIP)</strong>.</li>
                    <li>
                      Giải nén vào thư mục{" "}
                      <code className="text-white">/3ds/PKSM/inject/</code>.
                    </li>
                    <li>Mở 3DS, chạy <strong className="text-white">PKSM</strong> để inject vào save game.</li>
                  </ol>
                </div>
                <div className="space-y-2 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.04]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
                    Phần 2 · Transfer HOME
                  </h4>
                  <ol className="list-decimal space-y-1 pl-4 text-xs text-white/60">
                    <li>Mở game trên 3DS kiểm tra Pokémon trong Box.</li>
                    <li>Mở <strong className="text-white">Pokémon Bank</strong>, chuyển sang HOME.</li>
                    <li>Yêu cầu khách gửi <strong className="text-white">Moving Key (16 ký tự)</strong>.</li>
                    <li>Nhập Moving Key vào Bank, ấn <strong className="text-white">Hoàn thành</strong> trên Dashboard.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Orders queue */}
        <Card>
          <CardHeader>
            <CardTitle>Hàng chờ đơn hàng</CardTitle>
            <CardDescription>
              Kiểm duyệt thông tin, tải file cấu hình và cập nhật trạng thái đơn
              hàng
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
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Tổng tiền</TableHead>
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
                          <Pill tone="soft">{order.items?.length || 0} Pokémon</Pill>
                        </TableCell>
                        <TableCell className="font-bold text-white">
                          {parseFloat(order.totalPrice).toLocaleString()} đ
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
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDownloadZip(order)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              ZIP
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
                Cấu hình chi tiết các Pokémon trong đơn hàng
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

            <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
              {Object.entries(
                (selectedOrder.items || []).reduce<Record<string, typeof selectedOrder.items>>((acc, item) => {
                  const section = item.sectionName || "Custom Pokémon";
                  if (!acc[section]) acc[section] = [];
                  acc[section].push(item);
                  return acc;
                }, {})
              ).map(([sectionName, items]) => (
                <div key={sectionName} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-1 mt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                      {sectionName}
                    </span>
                    <span className="text-[10px] text-white/40">({items.length} Pokémon)</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
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
                            <Field label="Held Item" value={item.heldItem} />
                            <Field
                              label="Trainer"
                              value={`${item.trainerName} (${item.trainerTid}/${item.trainerSid})`}
                            />
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
                            <Field
                              label="IVs"
                              value={`H:${item.ivs.hp} A:${item.ivs.atk} D:${item.ivs.def} SA:${item.ivs.spa} SD:${item.ivs.spd} S:${item.ivs.spe}`}
                            />
                            <Field
                              label="EVs"
                              value={`H:${item.evs.hp} A:${item.evs.atk} D:${item.evs.def} SA:${item.evs.spa} SD:${item.evs.spd} S:${item.evs.spe}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadZip(selectedOrder)}
              >
                <Download className="h-4 w-4" />
                Tải file .PK7 (ZIP)
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">Giá trị đơn:</span>
                <span className="font-display text-xl font-bold text-accent">
                  {parseFloat(selectedOrder.totalPrice).toLocaleString()} đ
                </span>
              </div>
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

function ConfigField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold tracking-wider text-white/60 uppercase">
        {label}
      </label>
      {children}
      {error ? (
        <span className="block text-[11px] text-destructive">{error}</span>
      ) : null}
    </div>
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
