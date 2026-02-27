"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, formatDate, calculateItemTotals } from "@/lib/utils";
import { exportToPDF } from "@/lib/pdf";
import type { Invoice, InvoiceItem, Supplier } from "@/types/database";

function toAr(num: number | string): string {
  return String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

interface InvoiceData {
  invoice: Invoice;
  supplier: Supplier | null;
  items: InvoiceItem[];
}

export default function PrintMultipleInvoicesPage() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];
  const [invoicesData, setInvoicesData] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length > 0) loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const results: InvoiceData[] = [];

    for (const id of ids) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (!invoice) continue;

      const { data: supplier } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", invoice.supplier_id)
        .single();

      const { data: items } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id);

      results.push({ invoice, supplier, items: items || [] });
    }

    setInvoicesData(results);
    setLoading(false);
  }

  useEffect(() => {
    if (!loading && invoicesData.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, invoicesData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">جاري التحميل...</p>
      </div>
    );
  }

  // Grand totals across all invoices
  const grandTotals = invoicesData.reduce(
    (acc, { items }) => {
      for (const item of items) {
        const { totalPurchase, totalSelling, profit } = calculateItemTotals(
          item.quantity_per_carton,
          item.cartons_count,
          item.total_purchase_price,
          item.selling_price_per_piece
        );
        acc.totalPurchase += totalPurchase;
        acc.totalSelling += totalSelling;
        acc.profit += profit;
      }
      return acc;
    },
    { totalPurchase: 0, totalSelling: 0, profit: 0 }
  );

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
          onClick={() => exportToPDF("print-area", "فواتير.pdf")}
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
        {/* Main Header */}
        <div style={{ textAlign: "center", marginBottom: "10px", borderBottom: "2px solid #1e40af", paddingBottom: "6px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af", marginBottom: "2px" }}>
            حساب الكانتين
          </h1>
          <p style={{ color: "#6b7280", fontSize: "10px" }}>نظام إدارة المشتريات والمبيعات</p>
        </div>

        {/* Each Invoice */}
        {invoicesData.map(({ invoice, supplier, items }, invoiceIndex) => {
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

          return (
            <div key={invoice.id} style={{ marginBottom: "14px" }}>
              {/* Invoice Info */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", backgroundColor: "#f8fafc", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div>
                  <p style={{ fontSize: "10px", color: "#6b7280" }}>رقم الفاتورة</p>
                  <p style={{ fontSize: "13px", fontWeight: "bold" }}>{toAr(invoice.invoice_number)}</p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: "#6b7280" }}>المورد</p>
                  <p style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af" }}>{supplier?.name}</p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: "#6b7280" }}>التاريخ</p>
                  <p style={{ fontSize: "13px", fontWeight: "bold" }}>{formatDate(invoice.date)}</p>
                </div>
                {supplier?.phone && (
                  <div>
                    <p style={{ fontSize: "10px", color: "#6b7280" }}>تليفون المورد</p>
                    <p style={{ fontSize: "13px", fontWeight: "bold" }} dir="ltr">{toAr(supplier.phone)}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e40af", color: "white" }}>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>#</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>اسم الصنف</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>الكمية/كرتونة</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>عدد الكراتين</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>إجمالي الكمية</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>إجمالي الشراء</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>سعر البيع</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>إجمالي البيع</th>
                    <th style={{ padding: "6px 4px", textAlign: "right", fontSize: "11px" }}>الربح</th>
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
                        <td style={{ padding: "5px 4px", fontSize: "11px" }}>{toAr(index + 1)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px", fontWeight: "600" }}>{item.item_name}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px" }}>{toAr(item.quantity_per_carton)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px" }}>{toAr(item.cartons_count)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px", fontWeight: "600" }}>{toAr(totalQuantity)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px" }}>{formatCurrency(totalPurchase)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px" }}>{formatCurrency(item.selling_price_per_piece)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px" }}>{formatCurrency(totalSelling)}</td>
                        <td style={{ padding: "5px 4px", fontSize: "11px", color: profit >= 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                          {formatCurrency(profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#1e3a5f", color: "white", fontWeight: "bold" }}>
                    <td style={{ padding: "6px 4px", fontSize: "11px" }} colSpan={5}>الإجمالي</td>
                    <td style={{ padding: "6px 4px", fontSize: "11px" }}>{formatCurrency(totals.totalPurchase)} ج.م</td>
                    <td style={{ padding: "6px 4px", fontSize: "11px" }}></td>
                    <td style={{ padding: "6px 4px", fontSize: "11px" }}>{formatCurrency(totals.totalSelling)} ج.م</td>
                    <td style={{ padding: "6px 4px", fontSize: "11px", color: totals.profit >= 0 ? "#86efac" : "#fca5a5" }}>
                      {formatCurrency(totals.profit)} ج.م
                    </td>
                  </tr>
                </tfoot>
              </table>

              {invoice.notes && (
                <div style={{ padding: "4px 8px", backgroundColor: "#fefce8", borderRadius: "4px", border: "1px solid #fde047", fontSize: "11px", marginBottom: "6px" }}>
                  <strong>ملاحظات:</strong> {invoice.notes}
                </div>
              )}

              {/* Separator between invoices */}
              {invoiceIndex < invoicesData.length - 1 && (
                <hr style={{ border: "none", borderTop: "2px dashed #94a3b8", margin: "8px 0" }} />
              )}
            </div>
          );
        })}

        {/* Grand Totals - only show if more than 1 invoice */}
        {invoicesData.length > 1 && (
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "8px" }}>
            <div style={{ flex: 1, textAlign: "center", padding: "8px", backgroundColor: "#eff6ff", borderRadius: "6px", border: "2px solid #3b82f6" }}>
              <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>إجمالي المشتريات</p>
              <p style={{ fontSize: "14px", fontWeight: "bold", color: "#1e40af" }}>{formatCurrency(grandTotals.totalPurchase)} ج.م</p>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "8px", backgroundColor: "#f0fdf4", borderRadius: "6px", border: "2px solid #22c55e" }}>
              <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>إجمالي المبيعات</p>
              <p style={{ fontSize: "14px", fontWeight: "bold", color: "#16a34a" }}>{formatCurrency(grandTotals.totalSelling)} ج.م</p>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "8px", backgroundColor: grandTotals.profit >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: "6px", border: `2px solid ${grandTotals.profit >= 0 ? "#22c55e" : "#ef4444"}` }}>
              <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>إجمالي الربح</p>
              <p style={{ fontSize: "14px", fontWeight: "bold", color: grandTotals.profit >= 0 ? "#16a34a" : "#dc2626" }}>{formatCurrency(grandTotals.profit)} ج.م</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
