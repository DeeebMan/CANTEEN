"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Expense } from "@/types/database";

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const payload = {
      description,
      amount: parseFloat(amount),
      date,
      notes: notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editingId);
      if (error) { toast.error("حدث خطأ في التعديل"); return; }
      toast.success("تم تعديل النثرية بنجاح");
    } else {
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) { toast.error("حدث خطأ في الإضافة"); return; }
      toast.success("تم إضافة النثرية بنجاح");
    }

    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا البند؟")) return;
    const supabase = createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error("حدث خطأ في الحذف"); return; }
    toast.success("تم حذف النثرية بنجاح");
    loadData();
  }

  function startEdit(item: Expense) {
    setEditingId(item.id);
    setDescription(item.description);
    setAmount(String(item.amount));
    setDate(item.date);
    setNotes(item.notes || "");
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowForm(false);
  }

  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">النثريات</h1>
          <p className="text-gray-500 text-sm mt-1">
            إجمالي النثريات: {formatCurrency(total)} ج.م
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "إلغاء" : "إضافة نثرية"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الوصف *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المبلغ *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            {editingId ? "تحديث" : "إضافة"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500 text-lg">لا يوجد نثريات</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  الوصف
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  المبلغ
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  التاريخ
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  ملاحظات
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 md:px-6 md:py-4 font-medium">{item.description}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-red-600">
                    {formatCurrency(Number(item.amount))} ج.م
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-gray-500">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-gray-500">
                    {item.notes || "-"}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <div className="flex flex-col md:flex-row gap-1 md:gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="px-3 py-2 md:px-6 md:py-3">الإجمالي</td>
                <td className="px-3 py-2 md:px-6 md:py-3 text-red-600">
                  {formatCurrency(total)} ج.م
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
