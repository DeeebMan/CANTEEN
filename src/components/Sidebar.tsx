"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "الرئيسية", icon: "📊" },
  { href: "/suppliers", label: "الموردين", icon: "🏪" },
  { href: "/all-invoices", label: "الفواتير", icon: "🧾" },
  { href: "/cash-sales", label: "النقدي", icon: "💵" },
  { href: "/carried-goods", label: "البضاعة المرحلة", icon: "📦" },
  { href: "/expenses", label: "النثريات", icon: "💰" },
  { href: "/monthly-closing", label: "التقفيل", icon: "⚖️" },
  { href: "/users", label: "المستخدمين", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
        if (profile) setUserName(profile.name);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 right-0 left-0 z-50 md:hidden bg-slate-800 text-white flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xl p-2"
        >
          {isOpen ? "✕" : "☰"}
        </button>
        <h1 className="text-lg font-bold">حساب الكانتين</h1>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 md:top-0 right-0 h-[calc(100%-3.5rem)] md:h-full w-64 bg-slate-800 text-white z-40 transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "translate-x-full"} md:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-700 hidden md:block">
          <h1 className="text-xl font-bold">حساب الكانتين</h1>
          {userName && <p className="text-slate-400 text-sm mt-1">أهلاً {userName}</p>}
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 right-0 left-0 p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
