"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Month } from "@/types/database";

interface MonthContextType {
  months: Month[];
  selectedMonthId: string | null;
  selectedMonth: Month | null;
  setSelectedMonthId: (id: string) => void;
  isAdmin: boolean;
  refreshMonths: () => Promise<void>;
  loading: boolean;
}

const MonthContext = createContext<MonthContextType>({
  months: [],
  selectedMonthId: null,
  selectedMonth: null,
  setSelectedMonthId: () => {},
  isAdmin: false,
  refreshMonths: async () => {},
  loading: true,
});

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthIdState] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createClient();

      const { data: monthsData } = await supabase
        .from("months")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }

      const allMonths = monthsData || [];
      setMonths(allMonths);

      const stored = typeof window !== "undefined" ? localStorage.getItem("selectedMonthId") : null;
      const currentMonth = allMonths.find((m) => m.is_current);

      if (stored && allMonths.some((m) => m.id === stored)) {
        setSelectedMonthIdState(stored);
      } else if (currentMonth) {
        setSelectedMonthIdState(currentMonth.id);
      } else if (allMonths.length > 0) {
        setSelectedMonthIdState(allMonths[0].id);
      }

      setLoading(false);
    }
    init();
  }, []);

  function setSelectedMonthId(id: string) {
    setSelectedMonthIdState(id);
    localStorage.setItem("selectedMonthId", id);
  }

  async function refreshMonths() {
    const supabase = createClient();
    const { data } = await supabase
      .from("months")
      .select("*")
      .order("created_at", { ascending: false });
    setMonths(data || []);
  }

  const selectedMonth = months.find((m) => m.id === selectedMonthId) || null;

  return (
    <MonthContext.Provider
      value={{
        months,
        selectedMonthId,
        selectedMonth,
        setSelectedMonthId,
        isAdmin,
        refreshMonths,
        loading,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
