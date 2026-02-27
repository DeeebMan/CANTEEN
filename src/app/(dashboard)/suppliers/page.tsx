"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type { SupplierWithStats } from "@/types/database";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    const supabase = createClient();
    const { data: suppliersData } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!suppliersData) {
      setLoading(false);
      return;
    }

    // Get stats for each supplier
    const suppliersWithStats: SupplierWithStats[] = [];
    for (const supplier of suppliersData) {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("supplier_id", supplier.id);

      let totalPurchase = 0;
      let totalProfit = 0;

      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((inv) => inv.id);
        const { data: items } = await supabase
          .from("invoice_items")
          .select("quantity_per_carton, cartons_count, total_purchase_price, selling_price_per_piece")
          .in("invoice_id", invoiceIds);

        if (items) {
          for (const item of items) {
            const totalQty = item.quantity_per_carton * item.cartons_count;
            const purchase = item.total_purchase_price;
            const selling = item.selling_price_per_piece * totalQty;
            totalPurchase += purchase;
            totalProfit += selling - purchase;
          }
        }
      }

      suppliersWithStats.push({
        ...supplier,
        invoices_count: invoices?.length || 0,
        total_purchase: totalPurchase,
        total_profit: totalProfit,
      });
    }

    setSuppliers(suppliersWithStats);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from("suppliers")
        .update({ name, phone: phone || null, notes: notes || null })
        .eq("id", editingId);
      if (error) { toast.error("حدث خطأ في التعديل"); return; }
      toast.success("تم تعديل المورد بنجاح");
    } else {
      const { error } = await supabase
        .from("suppliers")
        .insert({ name, phone: phone || null, notes: notes || null });
      if (error) { toast.error("حدث خطأ في الإضافة"); return; }
      toast.success("تم إضافة المورد بنجاح");
    }

    resetForm();
    loadSuppliers();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المورد؟")) return;
    const supabase = createClient();
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { toast.error("حدث خطأ في الحذف"); return; }
    toast.success("تم حذف المورد بنجاح");
    loadSuppliers();
  }

  function startEdit(supplier: SupplierWithStats) {
    setEditingId(supplier.id);
    setName(supplier.name);
    setPhone(supplier.phone || "");
    setNotes(supplier.notes || "");
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPhone("");
    setNotes("");
    setShowForm(false);
  }

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
        <h1 className="text-2xl font-bold">الموردين</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "إلغاء" : "إضافة مورد"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                اسم المورد *
              </label>
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
                رقم التليفون
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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

      {suppliers.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500 text-lg">لا يوجد موردين بعد</p>
          <p className="text-gray-400 mt-2">اضغط على "إضافة مورد" للبدء</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  اسم المورد
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  التليفون
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  عدد الفواتير
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي المشتريات
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي الربح
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <Link
                      href={`/suppliers/${supplier.id}/invoices`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {supplier.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-gray-500" dir="ltr">
                    {supplier.phone || "-"}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">{supplier.invoices_count}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    {formatCurrency(supplier.total_purchase)} ج.م
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <span
                      className={
                        supplier.total_profit >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(supplier.total_profit)} ج.م
                    </span>
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <div className="flex flex-col md:flex-row gap-1 md:gap-2">
                      <Link
                        href={`/suppliers/${supplier.id}/invoices`}
                        className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                      >
                        الفواتير
                      </Link>
                      <button
                        onClick={() => startEdit(supplier)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
