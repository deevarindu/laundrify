import { useEffect, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";

import api from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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
  DialogTrigger,
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

const userSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().optional(),
});

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const fetchUsers = async () => {
    try {
      const response = await api.get("/user");
      setUsers(response.data.data ?? response.data);
      setError("");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Gagal mengambil data user.");
      } else {
        setError("Gagal mengambil data user.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const response = await api.get("/user");

        if (!cancelled) {
          setUsers(response.data.data ?? response.data);
          setError("");
          setLoading(false);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          if (axios.isAxiosError(error)) {
            setError(error.response?.data?.message || "Gagal mengambil data user.");
          } else {
            setError("Gagal mengambil data user.");
          }

          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = userSchema.safeParse({
      name,
      email,
      role,
      password: password || undefined,
    });

    if (!result.success) {
      setActionError(result.error.issues[0]?.message || "Data tidak valid.");
      return;
    }

    if (!editingUser && !password) {
      setActionError("Password wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      const payload: {
        name: string;
        email: string;
        role: UserRole;
        password?: string;
      } = {
        name,
        email,
        role,
      };

      if (password) {
        payload.password = password;
      }

      if (editingUser) {
        await api.patch(`/user/${editingUser.id}`, payload);
      } else {
        await api.post("/user", payload);
      }

      setOpenDialog(false);
      resetForm();
      await fetchUsers();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setActionError(
          error.response?.data?.message || "Gagal menyimpan data user."
        );
      } else {
        setActionError("Gagal menyimpan data user.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      await api.delete(`/user/${selectedUser.id}`);

      setOpenDeleteDialog(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setActionError(
          error.response?.data?.message || "Gagal menghapus user."
        );
      } else {
        setActionError("Gagal menghapus user.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();

    return (
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.role.toLowerCase().includes(keyword)
    );
  });

  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const staffCount = users.filter((user) => user.role === "STAFF").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#8b9a6e]">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#30352a]">
            Users
          </h1>
          <p className="mt-1 text-sm text-[#73776d]">
            Manage admin and staff accounts.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenCreate}
              className="bg-[#8b9a6e] text-white hover:bg-[#7d8b63]"
            >
              <Plus className="mr-2 size-4" />
              Add User
            </Button>
          </DialogTrigger>

          <DialogContent className="border-[#ded8cf] bg-[#f7f2eb] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#30352a]">
                {editingUser ? "Edit User" : "Add User"}
              </DialogTitle>
              <DialogDescription className="text-[#73776d]">
                {editingUser
                  ? "Update the user account details."
                  : "Create a new staff or admin account."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4b5141]">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter name"
                  className="border-[#ded8cf] bg-white/70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4b5141]">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email"
                  className="border-[#ded8cf] bg-white/70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4b5141]">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as UserRole)
                  }
                  className="h-10 w-full rounded-md border border-[#ded8cf] bg-white/70 px-3 text-sm text-[#30352a] outline-none"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4b5141]">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                  className="border-[#ded8cf] bg-white/70"
                />
              </div>

              {actionError && (
                <p className="text-sm text-[#b85c5c]">{actionError}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenDialog(false);
                    resetForm();
                  }}
                  className="border-[#ded8cf] bg-white/60 text-[#4b5141]"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#8b9a6e] text-white hover:bg-[#7d8b63]"
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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#ded8cf] bg-white/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#eae2d6] text-[#4b5141]">
              <UserRound className="size-5" />
            </div>
            <div>
              <p className="text-sm text-[#73776d]">Total Users</p>
              <p className="text-2xl font-semibold text-[#30352a]">
                {users.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ded8cf] bg-white/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#eae2d6] text-[#4b5141]">
              <UserRound className="size-5" />
            </div>
            <div>
              <p className="text-sm text-[#73776d]">Admins</p>
              <p className="text-2xl font-semibold text-[#30352a]">
                {adminCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ded8cf] bg-white/70">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#eae2d6] text-[#4b5141]">
              <UserRound className="size-5" />
            </div>
            <div>
              <p className="text-sm text-[#73776d]">Staff</p>
              <p className="text-2xl font-semibold text-[#30352a]">
                {staffCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#ded8cf] bg-white/70">
        <CardHeader className="border-b border-[#eee7dd]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold text-[#30352a]">
              User List
            </CardTitle>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#73776d]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="border-[#ded8cf] bg-white/70 pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-[#73776d]">
              Loading users...
            </div>
          ) : error ? (
            <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-[#b85c5c]">
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-[#73776d]">
              No users found.
            </div>
          ) : (
            <div className="divide-y divide-[#eee7dd]">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eae2d6] text-[#4b5141]">
                      <UserRound className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#30352a]">
                        {user.name}
                      </p>
                      <p className="truncate text-sm text-[#73776d]">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        user.role === "ADMIN"
                          ? "border-[#cbd4bc] bg-[#e5eadb] text-[#596548]"
                          : "border-[#ded8cf] bg-[#eee] text-[#73776d]"
                      }
                    >
                      {user.role}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(user)}
                      className="text-[#73776d] hover:bg-[#eae2d6] hover:text-[#4b5141]"
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedUser(user);
                        setActionError("");
                        setOpenDeleteDialog(true);
                      }}
                      className="text-[#b85c5c] hover:bg-[#f4e3e0] hover:text-[#a34f4f]"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="border-[#ded8cf] bg-[#f7f2eb]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#30352a]">
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#73776d]">
              Are you sure you want to delete{" "}
              <span className="font-medium text-[#4b5141]">
                {selectedUser?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {actionError && (
            <p className="text-sm text-[#b85c5c]">{actionError}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#ded8cf] bg-white/60 text-[#4b5141]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-[#b85c5c] text-white hover:bg-[#a34f4f]"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;