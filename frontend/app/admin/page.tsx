"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Check,
  X,
  Activity,
} from "lucide-react";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

import { AdminGuard } from "@/components/auth-provider";

function AdminPageContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");

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
            Quản lý nội dung thông báo trên shop.
          </p>
        </header>

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
