
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { z } from "zod";
import {
  CalendarDays,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import api from "../../lib/api";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

type UserRole = "ADMIN" | "STAFF";

type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

type UserStat = {
  label: string;
  value: number;
  description: string;
  icon: typeof Users;
};

const userSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().optional(),
});

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    return typeof message === "string" ? message : fallback;
  }

  return fallback;
};

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");
  const [password, setPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get("/user");
      const result: unknown = response.data.data ?? response.data;

      if (!Array.isArray(result)) {
        throw new Error("Format data user dari server tidak valid.");
      }

      setUsers(result as User[]);
      setError("");
    } catch (loadError: unknown) {
      setError(
        getErrorMessage(loadError, "Gagal mengambil data user."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void fetchUsers();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fetchUsers]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("STAFF");
    setPassword("");
    setEditingUser(null);
    setActionError("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword("");
    setActionError("");
    setOpenDialog(true);
  };

  const handleDialogChange = (open: boolean) => {
    setOpenDialog(open);

    if (!open && !submitting) {
      resetForm();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = userSchema.safeParse({
      name,
      email,
      role,
      password: password || undefined,
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ?? "Data tidak valid.",
      );
      return;
    }

    if (!editingUser && !password) {
      setActionError("Password wajib diisi.");
      return;
    }

    const payload: {
      name: string;
      email: string;
      role: UserRole;
      password?: string;
    } = {
      name: name.trim(),
      email: email.trim(),
      role,
    };

    if (password) {
      payload.password = password;
    }

    try {
      setSubmitting(true);
      setActionError("");

      if (editingUser) {
        await api.patch(`/user/${editingUser.id}`, payload);
      } else {
        await api.post("/user", payload);
      }

      setOpenDialog(false);
      resetForm();
      await fetchUsers();
    } catch (submitError: unknown) {
      setActionError(
        getErrorMessage(
          submitError,
          "Gagal menyimpan data user.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      await api.delete(`/user/${selectedUser.id}`);

      setOpenDeleteDialog(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (deleteError: unknown) {
      setActionError(
        getErrorMessage(deleteError, "Gagal menghapus user."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword),
    );
  }, [users, search]);

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "ADMIN").length,
    [users],
  );

  const staffCount = users.length - adminCount;

  const stats: UserStat[] = [
    {
      label: "Total Users",
      value: users.length,
      description: "Semua akun terdaftar",
      icon: Users,
    },
    {
      label: "Admins",
      value: adminCount,
      description: "Akses administrator",
      icon: ShieldCheck,
    },
    {
      label: "Staff",
      value: staffCount,
      description: "Akun operasional",
      icon: UserRound,
    },
  ];

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#829078]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Administration</span>
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Users
          </h1>

          <p className="mt-1 text-sm text-[#858779]">
            Manage admin and staff accounts.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreate}
          className="h-9 w-fit rounded-lg bg-[#8B9A6E] px-3 text-xs font-medium text-white hover:bg-[#74835A]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add User
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-[#F0D5D0] bg-[#FFF5F2] px-3.5 py-3 text-xs text-[#A65348]"
        >
          <p>{error}</p>

          <button
            type="button"
            aria-label="Tutup pesan error"
            onClick={() => setError("")}
            className="shrink-0 rounded p-0.5 hover:bg-[#FCE9E5]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-xl border-[#EAE5DB] bg-white shadow-none"
            >
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#858779]">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-xl font-semibold tracking-tight text-[#34382D]">
                      {stat.value}
                    </p>

                    <p className="mt-1 text-[11px] text-[#969789]">
                      {stat.description}
                    </p>
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F3E9] text-[#778865]">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden rounded-xl border-[#EAE5DB] bg-white shadow-none">
        <CardContent className="space-y-3.5 p-3.5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#414638]">
                User List
              </h2>
              <p className="mt-0.5 text-xs text-[#929385]">
                {filteredUsers.length} users found
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#969789]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users..."
                  aria-label="Search users"
                  className="h-9 rounded-lg border-[#E5E0D7] pl-9 text-xs placeholder:text-[#A6A698] focus-visible:ring-[#A6B394]"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                aria-label="Refresh users"
                className="h-9 w-9 shrink-0 rounded-lg border-[#E5E0D7] bg-white text-[#737967] hover:bg-[#F5F2EC]"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardContent>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-y border-[#EEE9E0] bg-[#FAF9F6]">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  User
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Role
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Date Created
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F0ECE5]">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-xs text-[#929385]"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : error && users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-xs text-[#A65348]"
                  >
                    Failed to load users. Please try again.
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F2EC] text-[#929385]">
                        <Users className="h-5 w-5" />
                      </div>

                      <p className="text-sm font-medium text-[#555B4D]">
                        No users found
                      </p>

                      <p className="text-xs text-[#929385]">
                        Try another search keyword.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[#FCFBF8]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F3E9] text-[#778865]">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#414638]">
                            {user.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-[#929385]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          user.role === "ADMIN"
                            ? "rounded-md border-[#D9E8D8] bg-[#EFF6ED] px-2 py-0.5 text-[10px] font-medium text-[#53734F]"
                            : "rounded-md border-[#E5E0D7] bg-[#F7F5F0] px-2 py-0.5 text-[10px] font-medium text-[#737967]"
                        }
                      >
                        {user.role === "ADMIN" && (
                          <ShieldCheck className="mr-1 h-3 w-3" />
                        )}
                        {user.role}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-[#737967]">
                        <CalendarDays className="h-3.5 w-3.5 text-[#969789]" />
                        {formatDate(user.createdAt)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${user.name}`}
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 w-8 rounded-lg text-[#737967] hover:bg-[#F0F3E9] hover:text-[#53734F]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => {
                            setSelectedUser(user);
                            setActionError("");
                            setOpenDeleteDialog(true);
                          }}
                          className="h-8 w-8 rounded-lg text-[#A65348] hover:bg-[#FFF2EF] hover:text-[#A65348]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-1 border-t border-[#EEE9E0] px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-[11px] text-[#929385]">
            Showing {filteredUsers.length} of {users.length} users
          </p>
          <p className="flex items-center gap-1 text-[11px] text-[#929385]">
            <CheckCircle2 className="h-3 w-3" />
            Role-based access
          </p>
        </div>
      </Card>

      <Dialog open={openDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-[#E5E0D7] bg-[#FCFBF8] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34382D]">
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>

            <DialogDescription className="text-xs leading-5 text-[#858779]">
              {editingUser
                ? "Update the user account details."
                : "Create a new staff or admin account."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="user-name"
                className="text-xs font-medium text-[#555B4D]"
              >
                Name
              </label>
              <Input
                id="user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter name"
                required
                minLength={2}
                className="h-9 rounded-lg border-[#E5E0D7] bg-white text-xs focus-visible:ring-[#A6B394]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="user-email"
                className="text-xs font-medium text-[#555B4D]"
              >
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                required
                className="h-9 rounded-lg border-[#E5E0D7] bg-white text-xs focus-visible:ring-[#A6B394]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="user-role"
                className="text-xs font-medium text-[#555B4D]"
              >
                Role
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as UserRole)
                }
                className="h-9 w-full rounded-lg border border-[#E5E0D7] bg-white px-3 text-xs text-[#34382D] outline-none focus:border-[#A6B394] focus:ring-2 focus:ring-[#A6B394]/20"
              >
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="user-password"
                className="text-xs font-medium text-[#555B4D]"
              >
                Password
              </label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  editingUser
                    ? "Leave blank to keep current password"
                    : "Enter password"
                }
                required={!editingUser}
                className="h-9 rounded-lg border-[#E5E0D7] bg-white text-xs focus-visible:ring-[#A6B394]"
              />
              {editingUser && (
                <p className="text-[11px] leading-4 text-[#929385]">
                  Leave blank if you do not want to change the password.
                </p>
              )}
            </div>

            {actionError && (
              <p role="alert" className="text-xs text-[#A65348]">
                {actionError}
              </p>
            )}

            <DialogFooter className="gap-2 pt-1 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleDialogChange(false)}
                className="h-9 rounded-lg border-[#E5E0D7] bg-white px-3 text-xs text-[#555B4D] hover:bg-[#F5F2EC]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="h-9 rounded-lg bg-[#8B9A6E] px-3 text-xs font-medium text-white hover:bg-[#74835A]"
              >
                {submitting
                  ? "Saving..."
                  : editingUser
                    ? "Save Changes"
                    : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={openDeleteDialog}
        onOpenChange={(open) => {
          setOpenDeleteDialog(open);

          if (!open && !submitting) {
            setActionError("");
            setSelectedUser(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-xl border-[#E5E0D7] bg-[#FCFBF8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-[#34382D]">
              Delete User
            </AlertDialogTitle>

            <AlertDialogDescription className="text-xs leading-5 text-[#858779]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#414638]">
                {selectedUser?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionError && (
            <p role="alert" className="text-xs text-[#A65348]">
              {actionError}
            </p>
          )}

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={submitting}
              className="h-9 rounded-lg border-[#E5E0D7] bg-white px-3 text-xs text-[#555B4D] hover:bg-[#F5F2EC]"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="h-9 rounded-lg bg-[#B85C5C] px-3 text-xs font-medium text-white hover:bg-[#A34F4F]"
            >
              {submitting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
