"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate, calculateItemTotals } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type { Invoice, InvoiceItem, Supplier } from "@/types/database";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantityPerCarton, setQuantityPerCarton] = useState("");
  const [cartonsCount, setCartonsCount] = useState("");
  const [totalPurchasePrice, setTotalPurchasePrice] = useState("");
  const [sellingPricePerPiece, setSellingPricePerPiece] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  async function loadData() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
      if (profile) setCurrentUserName(profile.name);
    }

    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();
    setInvoice(invoiceData);

    if (invoiceData) {
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", invoiceData.supplier_id)
        .single();
      setSupplier(supplierData);
    }

    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);
    setItems(itemsData || []);

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const data = {
      invoice_id: invoiceId,
      item_name: itemName,
      quantity_per_carton: parseFloat(quantityPerCarton),
      cartons_count: parseFloat(cartonsCount),
      total_purchase_price: parseFloat(totalPurchasePrice),
      selling_price_per_piece: parseFloat(sellingPricePerPiece),
    };

    if (editingId) {
      const { error } = await supabase.from("invoice_items").update(data).eq("id", editingId);
      if (error) { toast.error("حدث خطأ في التعديل"); return; }
      toast.success("تم تعديل الصنف بنجاح");
    } else {
      const { error } = await supabase.from("invoice_items").insert({ ...data, added_by: currentUserName });
      if (error) { toast.error("حدث خطأ في الإضافة"); return; }
      toast.success("تم إضافة الصنف بنجاح");
    }

    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الصنف؟")) return;
    const supabase = createClient();
    const { error } = await supabase.from("invoice_items").delete().eq("id", id);
    if (error) { toast.error("حدث خطأ في الحذف"); return; }
    toast.success("تم حذف الصنف بنجاح");
    loadData();
  }

  function startEdit(item: InvoiceItem) {
    setEditingId(item.id);
    setItemName(item.item_name);
    setQuantityPerCarton(String(item.quantity_per_carton));
    setCartonsCount(String(item.cartons_count));
    setTotalPurchasePrice(String(item.total_purchase_price));
    setSellingPricePerPiece(String(item.selling_price_per_piece));
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setItemName("");
    setQuantityPerCarton("");
    setCartonsCount("");
    setTotalPurchasePrice("");
    setSellingPricePerPiece("");
    setShowForm(false);
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const { totalPurchase, totalSelling, profit } = calculateItemTotals(
        item.quantity_per_carton,
        item.cartons_count,
        item.total_purchase_price,
        item.selling_price_per_piece
      );
      return {
        totalPurchase: acc.totalPurchase + totalPurchase,
        totalSelling: acc.totalSelling + totalSelling,
        profit: acc.profit + profit,
      };
    },
    { totalPurchase: 0, totalSelling: 0, profit: 0 }
  );

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
        {supplier && (
          <Link
            href={`/suppliers/${supplier.id}/invoices`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← فواتير {supplier.name}
          </Link>
        )}
        <h1 className="text-2xl font-bold">
          فاتورة رقم {invoice?.invoice_number}
        </h1>
        {invoice && (
          <span className="text-gray-500 text-sm">
            {formatDate(invoice.date)}
          </span>
        )}
      </div>

      {/* Add Item Button + Print */}
      <div className="flex justify-end gap-2 mb-4">
        <Link
          href={`/invoices/${invoiceId}/print`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          طباعة الفاتورة
        </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                اسم الصنف *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                الكمية داخل الكرتونة *
              </label>
              <input
                type="number"
                step="0.01"
                value={quantityPerCarton}
                onChange={(e) => setQuantityPerCarton(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                عدد الكراتين *
              </label>
              <input
                type="number"
                step="0.01"
                value={cartonsCount}
                onChange={(e) => setCartonsCount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                إجمالي سعر الشراء *
              </label>
              <input
                type="number"
                step="0.01"
                value={totalPurchasePrice}
                onChange={(e) => setTotalPurchasePrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                سعر بيع القطعة *
              </label>
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
          <p className="text-gray-500 text-lg">لا يوجد أصناف في هذه الفاتورة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  اسم الصنف
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  الكمية/كرتونة
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  عدد الكراتين
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي الكمية
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي الشراء
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  سعر بيع القطعة
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجمالي البيع
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  الربح
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  بواسطة
                </th>
                <th className="px-2 py-2 md:px-3 md:py-3 text-right text-sm font-medium text-gray-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => {
                const { totalQuantity, totalPurchase, totalSelling, profit } =
                  calculateItemTotals(
                    item.quantity_per_carton,
                    item.cartons_count,
                    item.total_purchase_price,
                    item.selling_price_per_piece
                  );
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 md:px-3 md:py-3 font-medium">{item.item_name}</td>
                    <td className="px-2 py-2 md:px-3 md:py-3">{item.quantity_per_carton}</td>
                    <td className="px-2 py-2 md:px-3 md:py-3">{item.cartons_count}</td>
                    <td className="px-2 py-2 md:px-3 md:py-3 font-medium">{totalQuantity}</td>
                    <td className="px-2 py-2 md:px-3 md:py-3">
                      {formatCurrency(totalPurchase)}
                    </td>
                    <td className="px-2 py-2 md:px-3 md:py-3">
                      {formatCurrency(item.selling_price_per_piece)}
                    </td>
                    <td className="px-2 py-2 md:px-3 md:py-3">
                      {formatCurrency(totalSelling)}
                    </td>
                    <td className="px-2 py-2 md:px-3 md:py-3">
                      <span
                        className={
                          profit >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {formatCurrency(profit)}
                      </span>
                    </td>
                    <td className="px-2 py-2 md:px-3 md:py-3 text-gray-500 text-sm">
                      {item.added_by || "-"}
                    </td>
                    <td className="px-2 py-2 md:px-3 md:py-3">
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
                <td className="px-2 py-2 md:px-3 md:py-3" colSpan={4}>
                  الإجمالي
                </td>
                <td className="px-2 py-2 md:px-3 md:py-3">
                  {formatCurrency(totals.totalPurchase)} ج.م
                </td>
                <td className="px-2 py-2 md:px-3 md:py-3"></td>
                <td className="px-2 py-2 md:px-3 md:py-3">
                  {formatCurrency(totals.totalSelling)} ج.م
                </td>
                <td className="px-2 py-2 md:px-3 md:py-3">
                  <span
                    className={
                      totals.profit >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatCurrency(totals.profit)} ج.م
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
