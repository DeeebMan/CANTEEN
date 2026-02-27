"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "accountant">("accountant");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }

    // Load all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(profiles || []);

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createClient();

    // Sign up new user
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (signUpError) {
      toast.error("حدث خطأ: " + signUpError.message);
      return;
    }

    toast.success("تم إضافة المستخدم بنجاح");
    setEmail("");
    setPassword("");
    setName("");
    setRole("accountant");
    setShowForm(false);
    loadData();
  }

  async function handleRoleChange(userId: string, newRole: "admin" | "accountant") {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) { toast.error("حدث خطأ في تغيير الصلاحية"); return; }
    toast.success("تم تغيير الصلاحية بنجاح");
    loadData();
  }

  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">جاري التحميل...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 text-lg">
          ليس لديك صلاحية للوصول لهذه الصفحة
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "إلغاء" : "إضافة مستخدم"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الاسم *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                البريد الإلكتروني *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                كلمة المرور *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                الصلاحية
              </label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "admin" | "accountant")
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="accountant">محاسب</option>
                <option value="admin">مدير</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            إضافة
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                الاسم
              </th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                البريد الإلكتروني
              </th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                الصلاحية
              </th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                تاريخ الإنشاء
              </th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 md:px-6 md:py-4 font-medium">{user.name}</td>
                <td className="px-3 py-2 md:px-6 md:py-4 text-gray-500" dir="ltr">
                  {user.email}
                </td>
                <td className="px-3 py-2 md:px-6 md:py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {user.role === "admin" ? "مدير" : "محاسب"}
                  </span>
                </td>
                <td className="px-3 py-2 md:px-6 md:py-4 text-gray-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-3 py-2 md:px-6 md:py-4">
                  {user.id !== currentUser?.id && (
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(
                          user.id,
                          e.target.value as "admin" | "accountant"
                        )
                      }
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="accountant">محاسب</option>
                      <option value="admin">مدير</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
