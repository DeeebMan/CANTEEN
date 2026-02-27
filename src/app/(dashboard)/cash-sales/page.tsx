"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useMonth } from "@/contexts/MonthContext";
import type { CashSale } from "@/types/database";

export default function CashSalesPage() {
  const { selectedMonthId } = useMonth();
  const [items, setItems] = useState<CashSale[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPricePerPiece, setSellingPricePerPiece] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedMonthId) loadData();
  }, [selectedMonthId]);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase
      .from("cash_sales")
      .select("*")
      .eq("month_id", selectedMonthId)
      .order("date", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const payload = {
      item_name: itemName,
      quantity: parseFloat(quantity),
      purchase_price: parseFloat(purchasePrice),
      selling_price_per_piece: parseFloat(sellingPricePerPiece),
      date,
      notes: notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("cash_sales").update(payload).eq("id", editingId);
      if (error) { toast.error("حدث خطأ في التعديل"); return; }
      toast.success("تم التعديل بنجاح");
    } else {
      const { error } = await supabase.from("cash_sales").insert({ ...payload, month_id: selectedMonthId });
      if (error) { toast.error("حدث خطأ في الإضافة"); return; }
      toast.success("تم الإضافة بنجاح");
    }

    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الصنف؟")) return;
    const supabase = createClient();
    const { error } = await supabase.from("cash_sales").delete().eq("id", id);
    if (error) { toast.error("حدث خطأ في الحذف"); return; }
    toast.success("تم الحذف بنجاح");
    loadData();
  }

  function startEdit(item: CashSale) {
    setEditingId(item.id);
    setItemName(item.item_name);
    setQuantity(String(item.quantity));
    setPurchasePrice(String(item.purchase_price));
    setSellingPricePerPiece(String(item.selling_price_per_piece));
    setDate(item.date);
    setNotes(item.notes || "");
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setItemName("");
    setQuantity("");
    setPurchasePrice("");
    setSellingPricePerPiece("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowForm(false);
  }

  function calcProfit(item: CashSale) {
    return item.selling_price_per_piece * item.quantity - item.purchase_price;
  }

  const totalProfit = items.reduce((s, i) => s + calcProfit(i), 0);
  const totalPurchase = items.reduce((s, i) => s + Number(i.purchase_price), 0);

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
          <h1 className="text-2xl font-bold">النقدي</h1>
          <p className="text-green-600 text-sm mt-1">
            إجمالي الربح: {formatCurrency(totalProfit)} ج.م
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "إلغاء" : "إضافة صنف"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم الصنف *</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الكمية *</label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سعر الشراء *</label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سعر بيع القطعة *</label>
              <input
                type="number"
                step="0.01"
                value={sellingPricePerPiece}
                onChange={(e) => setSellingPricePerPiece(e.target.value)}
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
          <p className="text-gray-500 text-lg">لا يوجد مبيعات نقدية</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  اسم الصنف
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  الكمية
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  سعر الشراء
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  سعر البيع
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي البيع
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  الربح
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  التاريخ
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => {
                const totalSelling = item.selling_price_per_piece * item.quantity;
                const profit = totalSelling - item.purchase_price;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 md:px-4 md:py-3 font-medium">{item.item_name}</td>
                    <td className="px-2 py-2 md:px-4 md:py-3">{item.quantity}</td>
                    <td className="px-2 py-2 md:px-4 md:py-3">
                      {formatCurrency(Number(item.purchase_price))} ج.م
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3">
                      {formatCurrency(Number(item.selling_price_per_piece))} ج.م
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3">
                      {formatCurrency(totalSelling)} ج.م
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3">
                      <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(profit)} ج.م
                      </span>
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3 text-gray-500">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3">
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
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="px-2 py-2 md:px-4 md:py-3" colSpan={2}>الإجمالي</td>
                <td className="px-2 py-2 md:px-4 md:py-3 text-blue-600">
                  {formatCurrency(totalPurchase)} ج.م
                </td>
                <td colSpan={2}></td>
                <td className="px-2 py-2 md:px-4 md:py-3">
                  <span className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(totalProfit)} ج.م
                  </span>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
