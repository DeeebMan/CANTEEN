"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate, calculateItemTotals } from "@/lib/utils";
import { exportToPDF } from "@/lib/pdf";
import type { Invoice, InvoiceItem, Supplier } from "@/types/database";

function toAr(num: number | string): string {
  return String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export default function PrintInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  async function loadData() {
    const supabase = createClient();

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

  useEffect(() => {
    if (!loading && invoice) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, invoice]);

  const totals = items.reduce(
    (acc, item) => {
      const { totalQuantity, totalPurchase, totalSelling, profit } = calculateItemTotals(
        item.quantity_per_carton,
        item.cartons_count,
        item.total_purchase_price,
        item.selling_price_per_piece
      );
      return {
        totalQuantity: acc.totalQuantity + totalQuantity,
        totalPurchase: acc.totalPurchase + totalPurchase,
        totalSelling: acc.totalSelling + totalSelling,
        profit: acc.profit + profit,
      };
    },
    { totalQuantity: 0, totalPurchase: 0, totalSelling: 0, profit: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            top: 0;
            right: 0;
            left: 0;
            width: 100% !important;
            margin: 0;
            padding: 5mm;
            box-sizing: border-box;
          }
          #print-area table {
            width: 100% !important;
            font-size: 11px !important;
          }
          #print-area td, #print-area th {
            padding: 4px 3px !important;
            font-size: 11px !important;
          }
          aside, nav, button, .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>

      <div className="no-print mb-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          طباعة
        </button>
        <button
          onClick={() => exportToPDF("print-area", `فاتورة-${invoice?.invoice_number || ""}.pdf`)}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          تحميل PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          رجوع
        </button>
      </div>

      <div id="print-area" dir="rtl" style={{ fontFamily: "Arial, sans-serif" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "12px", borderBottom: "2px solid #1e40af", paddingBottom: "8px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e40af", marginBottom: "2px" }}>
            حساب الكانتين
          </h1>
          <p style={{ color: "#6b7280", fontSize: "11px" }}>نظام إدارة المشتريات والمبيعات</p>
        </div>

        {/* Invoice Info */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>رقم الفاتورة</p>
            <p style={{ fontSize: "16px", fontWeight: "bold" }}>{invoice && toAr(invoice.invoice_number)}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>المورد</p>
            <p style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>{supplier?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>التاريخ</p>
            <p style={{ fontSize: "16px", fontWeight: "bold" }}>{invoice && formatDate(invoice.date)}</p>
          </div>
          {supplier?.phone && (
            <div>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>تليفون المورد</p>
              <p style={{ fontSize: "16px", fontWeight: "bold" }} dir="ltr">{toAr(supplier.phone)}</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e40af", color: "white" }}>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>#</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>اسم الصنف</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>الكمية/كرتونة</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>عدد الكراتين</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>إجمالي الكمية</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>إجمالي الشراء</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>سعر البيع</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>إجمالي البيع</th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontSize: "13px" }}>الربح</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const { totalQuantity, totalPurchase, totalSelling, profit } = calculateItemTotals(
                item.quantity_per_carton,
                item.cartons_count,
                item.total_purchase_price,
                item.selling_price_per_piece
              );
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "10px 8px", fontSize: "13px" }}>{toAr(index + 1)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px", fontWeight: "600" }}>{item.item_name}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px" }}>{toAr(item.quantity_per_carton)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px" }}>{toAr(item.cartons_count)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px", fontWeight: "600" }}>{toAr(totalQuantity)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px" }}>{formatCurrency(totalPurchase)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px" }}>{formatCurrency(item.selling_price_per_piece)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px" }}>{formatCurrency(totalSelling)}</td>
                  <td style={{ padding: "10px 8px", fontSize: "13px", color: profit >= 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                    {formatCurrency(profit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "#1e3a5f", color: "white", fontWeight: "bold" }}>
              <td style={{ padding: "12px 8px", fontSize: "14px" }} colSpan={5}>الإجمالي</td>
              <td style={{ padding: "12px 8px", fontSize: "14px" }}>{formatCurrency(totals.totalPurchase)} ج.م</td>
              <td style={{ padding: "12px 8px", fontSize: "14px" }}></td>
              <td style={{ padding: "12px 8px", fontSize: "14px" }}>{formatCurrency(totals.totalSelling)} ج.م</td>
              <td style={{ padding: "12px 8px", fontSize: "14px", color: totals.profit >= 0 ? "#86efac" : "#fca5a5" }}>
                {formatCurrency(totals.profit)} ج.م
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Summary Cards */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px", backgroundColor: "#eff6ff", borderRadius: "6px", border: "2px solid #3b82f6" }}>
            <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>إجمالي المشتريات</p>
            <p style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>{formatCurrency(totals.totalPurchase)} ج.م</p>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px", backgroundColor: "#f0fdf4", borderRadius: "6px", border: "2px solid #22c55e" }}>
            <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>إجمالي المبيعات</p>
            <p style={{ fontSize: "16px", fontWeight: "bold", color: "#16a34a" }}>{formatCurrency(totals.totalSelling)} ج.م</p>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px", backgroundColor: totals.profit >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: "6px", border: `2px solid ${totals.profit >= 0 ? "#22c55e" : "#ef4444"}` }}>
            <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>الربح</p>
            <p style={{ fontSize: "16px", fontWeight: "bold", color: totals.profit >= 0 ? "#16a34a" : "#dc2626" }}>{formatCurrency(totals.profit)} ج.م</p>
          </div>
        </div>

        {/* Footer */}
        {invoice?.notes && (
          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#fefce8", borderRadius: "8px", border: "1px solid #fde047" }}>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>ملاحظات:</p>
            <p style={{ fontSize: "14px" }}>{invoice.notes}</p>
          </div>
        )}
      </div>
    </>
  );
}
