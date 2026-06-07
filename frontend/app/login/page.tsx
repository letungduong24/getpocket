"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Sparkles, Zap, Flame, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/system/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/system/primitives";
import { useToast } from "@/components/ui/toast";

const authSchema = z.object({
  username: z.string().min(1, "Tên đăng nhập không được để trống"),
  password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
});

type AuthFormData = z.infer<typeof authSchema>;

import { GuestGuard, useAuth } from "@/components/auth-provider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function LoginPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState<AuthFormData>({ username: "", password: "" });
  const [errors, setErrors] = useState<Partial<AuthFormData>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authMutation = useMutation({
    mutationFn: async (payload: AuthFormData) => {
      const path = isRegister ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Xác thực thất bại.");
      return body;
    },
    onSuccess: (body) => {
      setErrorMsg(null);
      if (isRegister) {
        setSuccessMsg("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
        setIsRegister(false);
        setFormData({ username: "", password: "" });
        toast({
          title: "Đăng ký thành công",
          description: "Tài khoản của bạn đã được tạo. Hãy đăng nhập!",
          variant: "success",
        });
      } else {
        login(body.access_token, body.user);
        toast({
          title: "Đăng nhập thành công",
          description: `Chào mừng bạn quay lại, ${body.user.username}!`,
          variant: "success",
        });
        router.push("/");
      }
    },
    onError: (err) => {
      setErrorMsg(err.message);
      setSuccessMsg(null);
      toast({
        title: "Xác thực thất bại",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof AuthFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = authSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<AuthFormData> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as keyof AuthFormData] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    authMutation.mutate(formData);
  };

  return (
    <AppShell className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Background Image overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 scale-105 filter blur-[4px]" 
        style={{ backgroundImage: "url('/login.webp')" }} 
      />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-8 overflow-hidden rounded-[2.5rem] bg-frame/95 backdrop-blur-md p-4 ring-1 ring-white/[0.06] surface-ring lg:grid-cols-2">
        {/* Brand panel */}
        <div 
          className="relative hidden flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white lg:flex bg-cover bg-center bg-no-repeat ring-1 ring-white/10"
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(26, 7, 11, 0.3), rgba(26, 7, 11, 0.8)), url('/login.webp')" }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
                  Getpocket
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-4xl font-bold leading-tight">
              Sở hữu trọn bộ<br />154 Pokémon Champions từ<br />Gen 1 - 7.
            </h2>
          </div>
          {/* Decorative blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
          />
        </div>

        {/* Form panel */}
        <Card className="rounded-[2rem] bg-frame ring-1 ring-white/[0.06]">
          <CardHeader className="space-y-2 border-b border-white/5 pb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-white/10 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <CardTitle className="mt-2 text-2xl font-bold uppercase tracking-wider text-white">
              {isRegister ? "Đăng ký tài khoản" : "Đăng nhập hệ thống"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Tạo tài khoản mới để sở hữu bộ sưu tập Pokémon"
                : "Đăng nhập để sở hữu bộ sưu tập Pokémon"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8 pb-8">
              {errorMsg && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-300">
                  {successMsg}
                </div>
              )}

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold tracking-widest text-white/60 uppercase pb-1">
                  Tên đăng nhập
                </label>
                <Input
                  name="username"
                  placeholder="Nhập tên đăng nhập..."
                  value={formData.username}
                  onChange={handleChange}
                  disabled={authMutation.isPending}
                  className={cn(
                    "h-12",
                    errors.username &&
                      "border-destructive focus-visible:ring-destructive/30"
                  )}
                />
                {errors.username && (
                  <span className="text-xs font-semibold text-destructive">
                    {errors.username}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold tracking-widest text-white/60 uppercase pb-1">
                  Mật khẩu (tối thiểu 6 kí tự)
                </label>
                <Input
                  type="password"
                  name="password"
                  placeholder="Nhập mật khẩu..."
                  value={formData.password}
                  onChange={handleChange}
                  disabled={authMutation.isPending}
                  className={cn(
                    "h-12",
                    errors.password &&
                      "border-destructive focus-visible:ring-destructive/30"
                  )}
                />
                {errors.password && (
                  <span className="text-xs font-semibold text-destructive">
                    {errors.password}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={authMutation.isPending}
                >
                  {authMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Đang xử lý...
                    </span>
                  ) : isRegister ? (
                    "Tạo tài khoản mới"
                  ) : (
                    "Đăng nhập ngay"
                  )}
                </Button>
                <button
                  type="button"
                  disabled={authMutation.isPending}
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setFormData({ username: "", password: "" });
                    setErrors({});
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-semibold uppercase tracking-widest text-white/50 transition-colors hover:text-white"
                >
                  {isRegister
                    ? "Đã có tài khoản? Đăng nhập ngay"
                    : "Chưa có tài khoản? Đăng ký tại đây"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#ff4655] hover:text-[#e03e4c] transition-colors"
                >
                  ← Quay lại xem Pokémon
                </button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginPageContent />
    </GuestGuard>
  );
}
