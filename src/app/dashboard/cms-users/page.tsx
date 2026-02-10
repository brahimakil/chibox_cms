"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Search,
  UserPlus,
  Calendar,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CmsUser {
  user_id: number;
  user_name: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  phone_number_one: string | null;
  user_role: number;
  last_login: string | null;
  created_at: string;
  gender: string | null;
  main_image: string | null;
}

interface FormData {
  user_name: string;
  first_name: string;
  last_name: string;
  email_address: string;
  phone_number_one: string;
  password: string;
}

const emptyForm: FormData = {
  user_name: "",
  first_name: "",
  last_name: "",
  email_address: "",
  phone_number_one: "",
  password: "",
};

export default function CmsUsersPage() {
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CmsUser | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<CmsUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/cms-users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowPassword(false);
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (user: CmsUser) => {
    setEditingUser(user);
    setForm({
      user_name: user.user_name,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email_address: user.email_address || "",
      phone_number_one: user.phone_number_one || "",
      password: "",
    });
    setShowPassword(false);
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingUser
        ? `/api/cms-users/${editingUser.user_id}`
        : "/api/cms-users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setDialogOpen(false);
      fetchUsers();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/cms-users/${deleteUser.user_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete user");
        setDeleting(false);
        return;
      }

      setDeleteUser(null);
      fetchUsers();
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.user_name.toLowerCase().includes(q) ||
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      (u.last_name && u.last_name.toLowerCase().includes(q)) ||
      (u.email_address && u.email_address.toLowerCase().includes(q))
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (user: CmsUser) => {
    const f = user.first_name?.[0]?.toUpperCase() || "";
    const l = user.last_name?.[0]?.toUpperCase() || "";
    return f + l || user.user_name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-xl border bg-card shadow-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            CMS Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} admin {users.length === 1 ? "user" : "users"} total
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Admin
        </Button>
      </div>

      {/* Search */}
      {users.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Users Table / List */}
      {users.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-muted p-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No admin users yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first admin user to manage the CMS. They&apos;ll be
                able to log in and manage everything.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="mt-2 gap-2">
              <Plus className="h-4 w-4" />
              Create First Admin
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {[user.first_name, user.last_name]
                              .filter(Boolean)
                              .join(" ") || user.user_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{user.user_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {user.email_address && (
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email_address}
                          </p>
                        )}
                        {user.phone_number_one && (
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone_number_one}
                          </p>
                        )}
                        {!user.email_address && !user.phone_number_one && (
                          <span className="text-xs text-muted-foreground/50">
                            No contact info
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={user.last_login ? "" : "text-muted-foreground/50"}>
                          {formatDate(user.last_login)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {filteredUsers.map((user) => (
              <div key={user.user_id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {[user.first_name, user.last_name]
                          .filter(Boolean)
                          .join(" ") || user.user_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.user_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteUser(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {user.email_address && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {user.email_address}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last login: {formatDate(user.last_login)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && search && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No users matching &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editingUser ? "Edit Admin User" : "Create Admin User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update this admin user's information. Leave password blank to keep it unchanged."
                : "Add a new admin user who can log in to the CMS."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user_name">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user_name"
                value={form.user_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, user_name: e.target.value }))
                }
                placeholder="admin_username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email_address">Email</Label>
              <Input
                id="email_address"
                type="email"
                value={form.email_address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email_address: e.target.value }))
                }
                placeholder="admin@chihelo.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone_number_one">Phone</Label>
              <Input
                id="phone_number_one"
                value={form.phone_number_one}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phone_number_one: e.target.value,
                  }))
                }
                placeholder="+961 XX XXX XXX"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password{" "}
                {editingUser ? (
                  <span className="text-xs text-muted-foreground font-normal">
                    (leave blank to keep current)
                  </span>
                ) : (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder={
                    editingUser ? "Leave blank to keep current" : "Min 6 characters"
                  }
                  required={!editingUser}
                  minLength={editingUser ? 0 : 6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingUser ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Admin User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteUser?.user_name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUser(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
