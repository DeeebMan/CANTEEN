"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { exportToPDF } from "@/lib/pdf";
import { useMonth } from "@/contexts/MonthContext";

function toAr(num: number | string): string {
  return String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

interface InvoiceSummary {
  invoice_number: string;
  supplier_name: string;
  total_purchase: number;
  total_selling: number;
  profit: number;
}

export default function MonthlyClosingPage() {
  const { selectedMonthId } = useMonth();
  const [invoiceSummaries, setInvoiceSummaries] = useState<InvoiceSummary[]>([]);
  const [goodsDelivered, setGoodsDelivered] = useState(0);
  const [carriedGoods, setCarriedGoods] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [cashInput, setCashInput] = useState("");
  const [creditsOfficers, setCreditsOfficers] = useState("");
  const [creditsNCOs, setCreditsNCOs] = useState("");
  const [creditsSoldiers, setCreditsSoldiers] = useState("");
  const [vouchersInput, setVouchersInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [calculated, setCalculated] = useState(false);

  useEffect(() => {
    if (selectedMonthId) loadData();
  }, [selectedMonthId]);

  async function loadData() {
    const supabase = createClient();

    // الكفة الأولى: الفواتير بالتفصيل
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, supplier_id")
      .eq("month_id", selectedMonthId);
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("month_id", selectedMonthId);
    const { data: items } = await supabase
      .from("invoice_items")
      .select("invoice_id, quantity_per_carton, cartons_count, total_purchase_price, selling_price_per_piece");

    const supplierMap = new Map(suppliers?.map((s) => [s.id, s.name]) || []);
    const summaries: InvoiceSummary[] = [];
    let totalSelling = 0;

    if (invoices && items) {
      for (const inv of invoices) {
        const invItems = items.filter((i) => i.invoice_id === inv.id);
        let invPurchase = 0;
        let invSelling = 0;
        for (const item of invItems) {
          const qty = item.quantity_per_carton * item.cartons_count;
          const selling = item.selling_price_per_piece * qty;
          invPurchase += item.total_purchase_price;
          invSelling += selling;
        }
        totalSelling += invSelling;
        summaries.push({
          invoice_number: inv.invoice_number,
          supplier_name: supplierMap.get(inv.supplier_id) || "",
          total_purchase: invPurchase,
          total_selling: invSelling,
          profit: invSelling - invPurchase,
        });
      }
    }
    setInvoiceSummaries(summaries);
    setGoodsDelivered(totalSelling);

    // بضاعة مرتحلة (الكمية × سعر البيع)
    const { data: carried } = await supabase
      .from("carried_goods")
      .select("quantity, selling_price")
      .eq("month_id", selectedMonthId);
    setCarriedGoods(
      carried?.reduce((sum, g) => sum + Number(g.quantity) * Number(g.selling_price), 0) || 0
    );

    // نثريات
    const { data: exp } = await supabase
      .from("expenses")
      .select("amount")
      .eq("month_id", selectedMonthId);
    setExpenses(exp?.reduce((sum, e) => sum + Number(e.amount), 0) || 0);

    setLoading(false);
  }

  const cashAmount = parseFloat(cashInput) || 0;
  const officersAmount = parseFloat(creditsOfficers) || 0;
  const ncosAmount = parseFloat(creditsNCOs) || 0;
  const soldiersAmount = parseFloat(creditsSoldiers) || 0;
  const vouchersAmount = parseFloat(vouchersInput) || 0;
  const totalCredits = officersAmount + ncosAmount + soldiersAmount;
  const rightSide = cashAmount + totalCredits + carriedGoods + expenses + vouchersAmount;
  const difference = goodsDelivered - rightSide;

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setCalculated(true);
  }

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
          body * { visibility: hidden; }
          #print-closing, #print-closing * { visibility: visible; }
          #print-closing {
            position: absolute;
            top: 0; right: 0; left: 0;
            margin: 0; padding: 10px;
            font-size: 12px;
          }
          #print-closing table { font-size: 11px; }
          #print-closing td, #print-closing th { padding: 4px 6px !important; }
          aside, nav, .no-print { display: none !important; }
          .print-header { display: block !important; }
          @page { size: A4 portrait; margin: 8mm; }
        }
      `}</style>
    <div>
      <h1 className="text-2xl font-bold mb-6">تقفيل الحساب</h1>

      {/* إدخال البيانات */}
      <form onSubmit={handleCalculate} className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
        {/* النقدي */}
        <div>
          <label className="block text-sm font-medium mb-1">المبلغ النقدي (الكاش في الدرج) *</label>
          <input
            type="number"
            step="0.01"
            value={cashInput}
            onChange={(e) => { setCashInput(e.target.value); setCalculated(false); }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="أدخل المبلغ النقدي..."
            required
            dir="ltr"
          />
        </div>

        {/* الآجل - 3 حقول */}
        <div>
          <label className="block text-sm font-medium mb-2">الآجل</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">آجل ضباط</label>
              <input
                type="number"
                step="0.01"
                value={creditsOfficers}
                onChange={(e) => { setCreditsOfficers(e.target.value); setCalculated(false); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">آجل صف</label>
              <input
                type="number"
                step="0.01"
                value={creditsNCOs}
                onChange={(e) => { setCreditsNCOs(e.target.value); setCalculated(false); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">آجل جنود</label>
              <input
                type="number"
                step="0.01"
                value={creditsSoldiers}
                onChange={(e) => { setCreditsSoldiers(e.target.value); setCalculated(false); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="0"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* البونات */}
        <div>
          <label className="block text-sm font-medium mb-1">بونات</label>
          <input
            type="number"
            step="0.01"
            value={vouchersInput}
            onChange={(e) => { setVouchersInput(e.target.value); setCalculated(false); }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
        >
          حساب التقفيل
        </button>
      </form>

      {calculated && (
        <>
          <div className="mb-4 no-print flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              طباعة التقفيل
            </button>
            <button
              onClick={() => exportToPDF("print-closing", "تقفيل-الحساب.pdf")}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              تحميل PDF
            </button>
          </div>

          <div id="print-closing" dir="rtl">

          {/* عنوان الطباعة */}
          <div className="hidden print:block text-center mb-4">
            <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af" }}>حساب الكانتين - تقفيل الحساب</h1>
          </div>

          {/* الكفتين */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* الكفة الأولى */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4 text-blue-700 border-b pb-2">
                البضاعة المسلمة
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-3 py-2 text-right">الفاتورة</th>
                      <th className="px-3 py-2 text-right">المورد</th>
                      <th className="px-3 py-2 text-right">قيمة الفاتورة</th>
                      <th className="px-3 py-2 text-right">الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoiceSummaries.map((inv, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{inv.invoice_number}</td>
                        <td className="px-3 py-2">{inv.supplier_name}</td>
                        <td className="px-3 py-2">{formatCurrency(inv.total_purchase)} ج.م</td>
                        <td className="px-3 py-2 text-green-600">{formatCurrency(inv.profit)} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50 font-bold">
                    <tr>
                      <td className="px-3 py-2" colSpan={2}>الإجمالي</td>
                      <td className="px-3 py-2 text-blue-700">
                        {formatCurrency(invoiceSummaries.reduce((s, i) => s + i.total_purchase, 0))} ج.م
                      </td>
                      <td className="px-3 py-2 text-green-600">
                        {formatCurrency(invoiceSummaries.reduce((s, i) => s + i.profit, 0))} ج.م
                      </td>
                    </tr>
                    <tr className="bg-blue-100">
                      <td className="px-3 py-2" colSpan={2}>إجمالي بسعر البيع (القيمة + الربح)</td>
                      <td className="px-3 py-2 text-blue-800" colSpan={2}>
                        {formatCurrency(goodsDelivered)} ج.م
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* الكفة التانية */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4 text-purple-700 border-b pb-2">
                ما تم توريده
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-green-50 rounded-lg p-3">
                  <span className="font-medium">النقدي (كاش)</span>
                  <span className="font-bold text-green-700">{formatCurrency(cashAmount)} ج.م</span>
                </div>
                <div className="flex justify-between items-center bg-green-50 rounded-lg p-3">
                  <span className="font-medium">بونات</span>
                  <span className="font-bold text-green-700">{formatCurrency(vouchersAmount)} ج.م</span>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">الآجل</span>
                    <span className="font-bold text-orange-700">{formatCurrency(totalCredits)} ج.م</span>
                  </div>
                  <div className="space-y-1 text-sm text-orange-600 border-t border-orange-200 pt-2">
                    <div className="flex justify-between">
                      <span>ضباط</span>
                      <span>{formatCurrency(officersAmount)} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span>صف</span>
                      <span>{formatCurrency(ncosAmount)} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span>جنود</span>
                      <span>{formatCurrency(soldiersAmount)} ج.م</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-yellow-50 rounded-lg p-3">
                  <span className="font-medium">البضاعة المرحلة</span>
                  <span className="font-bold text-yellow-700">{formatCurrency(carriedGoods)} ج.م</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 rounded-lg p-3">
                  <span className="font-medium">النثريات</span>
                  <span className="font-bold text-red-700">{formatCurrency(expenses)} ج.م</span>
                </div>
                <div className="flex justify-between items-center bg-purple-100 rounded-lg p-3 border-t-2 border-purple-300">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-bold text-purple-700">{formatCurrency(rightSide)} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* النتيجة */}
          <div
            className={`rounded-xl shadow p-6 text-center ${
              difference === 0
                ? "bg-green-50 border-2 border-green-400"
                : difference > 0
                ? "bg-red-50 border-2 border-red-400"
                : "bg-green-50 border-2 border-green-400"
            }`}
          >
            <h2 className="text-xl font-bold mb-2">النتيجة</h2>
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-sm text-gray-500">البضاعة المسلمة</p>
                <p className="text-lg font-bold">{formatCurrency(goodsDelivered)} ج.م</p>
              </div>
              <span className="text-2xl font-bold">=</span>
              <div className="text-center">
                <p className="text-sm text-gray-500">ما تم توريده</p>
                <p className="text-lg font-bold">{formatCurrency(rightSide)} ج.م</p>
              </div>
            </div>
            {difference === 0 ? (
              <p className="text-2xl font-bold text-green-600">متوازن ✓</p>
            ) : difference > 0 ? (
              <div>
                <p className="text-2xl font-bold text-red-600">
                  عجز: {formatCurrency(difference)} ج.م
                </p>
                <p className="text-sm text-red-500 mt-1">
                  فيه {formatCurrency(difference)} ج.م ناقصة
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-green-600">
                  فائض: {formatCurrency(Math.abs(difference))} ج.م
                </p>
                <p className="text-sm text-green-500 mt-1">
                  فيه {formatCurrency(Math.abs(difference))} ج.م زيادة
                </p>
              </div>
            )}
          </div>
          </div>{/* close print-closing */}
        </>
      )}
    </div>
    </>
  );
}
