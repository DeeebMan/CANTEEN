"use client";

import { useState } from "react";
import { useMonth } from "@/contexts/MonthContext";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export default function MonthSelector() {
  const { months, selectedMonthId, setSelectedMonthId, isAdmin, refreshMonths } = useMonth();
  const [showNewMonthForm, setShowNewMonthForm] = useState(false);
  const [newMonthName, setNewMonthName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleStartNewMonth(e: React.FormEvent) {
    e.preventDefault();
    if (!newMonthName.trim()) return;
    setCreating(true);
    const supabase = createClient();

    // Set all months is_current = false
    await supabase.from("months").update({ is_current: false }).eq("is_current", true);

    // Insert new month
    const { data: newMonth, error } = await supabase
      .from("months")
      .insert({ name: newMonthName.trim(), is_current: true })
      .select()
      .single();

    if (error) {
      toast.error("حدث خطأ في إنشاء الشهر الجديد");
      setCreating(false);
      return;
    }

    await refreshMonths();
    setSelectedMonthId(newMonth.id);
    setNewMonthName("");
    setShowNewMonthForm(false);
    setCreating(false);
    toast.success("تم بدء شهر جديد بنجاح");
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">الشهر:</label>
        <select
          value={selectedMonthId || ""}
          onChange={(e) => setSelectedMonthId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {months.map((month) => (
            <option key={month.id} value={month.id}>
              {month.name} {month.is_current ? "(الحالي)" : ""}
            </option>
          ))}
        </select>
      </div>

      {isAdmin && !showNewMonthForm && (
        <button
          onClick={() => setShowNewMonthForm(true)}
          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          بدء شهر جديد
        </button>
      )}

      {showNewMonthForm && (
        <form onSubmit={handleStartNewMonth} className="flex items-center gap-2">
          <input
            type="text"
            value={newMonthName}
            onChange={(e) => setNewMonthName(e.target.value)}
            placeholder="اسم الشهر (مثال: مارس 2026)"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? "..." : "إنشاء"}
          </button>
          <button
            type="button"
            onClick={() => setShowNewMonthForm(false)}
            className="text-gray-500 px-2 py-1.5 text-sm hover:text-gray-700"
          >
            إلغاء
          </button>
        </form>
      )}
    </div>
  );
}
