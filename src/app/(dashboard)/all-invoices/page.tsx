"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate, calculateItemTotals } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InvoiceWithTotals } from "@/types/database";

export default function AllInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((inv) => inv.id)));
    }
  }

  function printSelected() {
    const ids = Array.from(selectedIds).join(",");
    router.push(`/all-invoices/print?ids=${ids}`);
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    const supabase = createClient();

    const { data: invoicesData } = await supabase
      .from("invoices")
      .select("*")
      .order("date", { ascending: false });

    if (!invoicesData) {
      setLoading(false);
      return;
    }

    const invoicesWithTotals: InvoiceWithTotals[] = [];
    for (const inv of invoicesData) {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", inv.supplier_id)
        .single();

      const { data: items } = await supabase
        .from("invoice_items")
        .select("quantity_per_carton, cartons_count, total_purchase_price, selling_price_per_piece")
        .eq("invoice_id", inv.id);

      let totalPurchase = 0;
      let totalSelling = 0;
      let profit = 0;
      let itemsCount = 0;

      if (items) {
        itemsCount = items.length;
        for (const item of items) {
          const calc = calculateItemTotals(
            item.quantity_per_carton,
            item.cartons_count,
            item.total_purchase_price,
            item.selling_price_per_piece
          );
          totalPurchase += calc.totalPurchase;
          totalSelling += calc.totalSelling;
          profit += calc.profit;
        }
      }

      invoicesWithTotals.push({
        ...inv,
        items_count: itemsCount,
        total_purchase: totalPurchase,
        total_selling: totalSelling,
        profit,
        supplier_name: supplier?.name,
      });
    }

    setInvoices(invoicesWithTotals);
    setLoading(false);
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
        <h1 className="text-2xl font-bold">كل الفواتير</h1>
        {selectedIds.size > 0 && (
          <button
            onClick={printSelected}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            طباعة المحدد ({selectedIds.size})
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500 text-lg">لا يوجد فواتير</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 md:px-4 md:py-3 text-center">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedIds.size === invoices.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">رقم الفاتورة</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">المورد</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">عدد الأصناف</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">إجمالي الشراء</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">إجمالي البيع</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">الربح</th>
                <th className="px-2 py-2 md:px-4 md:py-3 text-right text-sm font-medium text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 md:px-4 md:py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(invoice.id)}
                      onChange={() => toggleSelect(invoice.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </td>
                  <td className="px-2 py-2 md:px-4 md:py-3 font-medium">{invoice.invoice_number}</td>
                  <td className="px-2 py-2 md:px-4 md:py-3 text-blue-600 font-medium">{invoice.supplier_name}</td>
                  <td className="px-2 py-2 md:px-4 md:py-3 text-gray-500">{formatDate(invoice.date)}</td>
                  <td className="px-2 py-2 md:px-4 md:py-3">{invoice.items_count}</td>
                  <td className="px-2 py-2 md:px-4 md:py-3">{formatCurrency(invoice.total_purchase)} ج.م</td>
                  <td className="px-2 py-2 md:px-4 md:py-3">{formatCurrency(invoice.total_selling)} ج.م</td>
                  <td className="px-2 py-2 md:px-4 md:py-3">
                    <span className={invoice.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(invoice.profit)} ج.م
                    </span>
                  </td>
                  <td className="px-2 py-2 md:px-4 md:py-3">
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
