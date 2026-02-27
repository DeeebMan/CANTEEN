"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Month } from "@/types/database";

interface MonthContextType {
  months: Month[];
  selectedMonthId: string | null;
  selectedMonth: Month | null;
  setSelectedMonthId: (id: string) => Promise<void>;
  isAdmin: boolean;
  refreshMonths: () => Promise<void>;
  loading: boolean;
}

const MonthContext = createContext<MonthContextType>({
  months: [],
  selectedMonthId: null,
  selectedMonth: null,
  setSelectedMonthId: async () => {},
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
      let isUserAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        isUserAdmin = profile?.role === "admin";
      }
      setIsAdmin(isUserAdmin);

      const allMonths = monthsData || [];
      setMonths(allMonths);

      const currentMonth = allMonths.find((m) => m.is_current);

      if (currentMonth) {
        setSelectedMonthIdState(currentMonth.id);
      } else if (allMonths.length > 0) {
        setSelectedMonthIdState(allMonths[0].id);
      }

      setLoading(false);
    }
    init();
  }, []);

  async function setSelectedMonthId(id: string) {
    setSelectedMonthIdState(id);
    if (isAdmin) {
      const supabase = createClient();
      await supabase.from("months").update({ is_current: false }).eq("is_current", true);
      await supabase.from("months").update({ is_current: true }).eq("id", id);
      await refreshMonths();
    }
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
