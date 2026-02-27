"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type { Supplier, InvoiceWithTotals } from "@/types/database";

export default function SupplierInvoicesPage() {
  const params = useParams();
  const supplierId = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithTotals[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [supplierId]);

  async function loadData() {
    const supabase = createClient();

    // Load supplier
    const { data: supplierData } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .single();
    setSupplier(supplierData);

    // Load invoices
    const { data: invoicesData } = await supabase
      .from("invoices")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("date", { ascending: false });

    if (invoicesData) {
      const invoicesWithTotals: InvoiceWithTotals[] = [];
      for (const inv of invoicesData) {
        const { data: items } = await supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", inv.id);

        let totalPurchase = 0;
        let totalSelling = 0;
        if (items) {
          for (const item of items) {
            const totalQty = item.quantity_per_carton * item.cartons_count;
            totalPurchase += item.total_purchase_price;
            totalSelling += item.selling_price_per_piece * totalQty;
          }
        }

        invoicesWithTotals.push({
          ...inv,
          items_count: items?.length || 0,
          total_purchase: totalPurchase,
          total_selling: totalSelling,
          profit: totalSelling - totalPurchase,
        });
      }
      setInvoices(invoicesWithTotals);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from("invoices")
        .update({
          invoice_number: invoiceNumber,
          date,
          notes: invoiceNotes || null,
        })
        .eq("id", editingId);
      if (error) { toast.error("حدث خطأ في التعديل"); return; }
      toast.success("تم تعديل الفاتورة بنجاح");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("invoices").insert({
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        date,
        notes: invoiceNotes || null,
        created_by: user?.id,
      });
      if (error) { toast.error("حدث خطأ في الإضافة"); return; }
      toast.success("تم إضافة الفاتورة بنجاح");
    }

    resetForm();
    loadData();
  }

  function startEdit(invoice: InvoiceWithTotals) {
    setEditingId(invoice.id);
    setInvoiceNumber(invoice.invoice_number);
    setDate(invoice.date);
    setInvoiceNotes(invoice.notes || "");
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setInvoiceNumber("");
    setDate(new Date().toISOString().split("T")[0]);
    setInvoiceNotes("");
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) return;
    const supabase = createClient();
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) { toast.error("حدث خطأ في الحذف"); return; }
    toast.success("تم حذف الفاتورة بنجاح");
    loadData();
  }

  // Calculate totals
  const totalPurchase = invoices.reduce((s, i) => s + i.total_purchase, 0);
  const totalSelling = invoices.reduce((s, i) => s + i.total_selling, 0);
  const totalProfit = invoices.reduce((s, i) => s + i.profit, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/suppliers"
          className="text-blue-600 hover:underline text-sm"
        >
          ← الموردين
        </Link>
        <h1 className="text-2xl font-bold">
          فواتير {supplier?.name}
        </h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">إجمالي المشتريات</p>
          <p className="text-xl font-bold text-blue-800">
            {formatCurrency(totalPurchase)} ج.م
          </p>
        </div>
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">إجمالي المبيعات</p>
          <p className="text-xl font-bold text-gray-800">
            {formatCurrency(totalSelling)} ج.م
          </p>
        </div>
        <div
          className={`border-2 rounded-xl p-4 ${
            totalProfit >= 0
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p
            className={`text-sm ${
              totalProfit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            إجمالي الربح
          </p>
          <p
            className={`text-xl font-bold ${
              totalProfit >= 0 ? "text-green-800" : "text-red-800"
            }`}
          >
            {formatCurrency(totalProfit)} ج.م
          </p>
        </div>
      </div>

      {/* Add Invoice Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "إلغاء" : "إضافة فاتورة"}
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
                رقم الفاتورة *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                التاريخ *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات</label>
              <input
                type="text"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
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

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500 text-lg">لا يوجد فواتير بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  رقم الفاتورة
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  التاريخ
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  عدد الأصناف
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي الشراء
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي البيع
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  الربح
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-gray-500">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">{invoice.items_count}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    {formatCurrency(invoice.total_purchase)} ج.م
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    {formatCurrency(invoice.total_selling)} ج.م
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <span
                      className={
                        invoice.profit >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(invoice.profit)} ج.م
                    </span>
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4">
                    <div className="flex flex-col md:flex-row gap-1 md:gap-2">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                      >
                        التفاصيل
                      </Link>
                      <Link
                        href={`/invoices/${invoice.id}/print`}
                        className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors"
                      >
                        طباعة
                      </Link>
                      <button
                        onClick={() => startEdit(invoice)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
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
