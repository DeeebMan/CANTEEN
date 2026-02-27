"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import SummaryCard from "@/components/SummaryCard";
import type { DashboardStats } from "@/types/database";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_due_to_suppliers: 0,
    total_profit: 0,
    cash_sales_profit: 0,
    carried_goods_deduction: 0,
    expenses_deduction: 0,
    net_profit: 0,
    pending_credits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const supabase = createClient();

    // Get all invoice items for totals
    const { data: items } = await supabase
      .from("invoice_items")
      .select("quantity_per_carton, cartons_count, total_purchase_price, selling_price_per_piece");

    let totalPurchase = 0;
    let totalProfit = 0;
    if (items) {
      for (const item of items) {
        const totalQty = item.quantity_per_carton * item.cartons_count;
        const purchase = item.total_purchase_price;
        const selling = item.selling_price_per_piece * totalQty;
        totalPurchase += purchase;
        totalProfit += selling - purchase;
      }
    }

    // Get carried goods deduction (الكمية × سعر البيع)
    const { data: carriedGoods } = await supabase
      .from("carried_goods")
      .select("quantity, selling_price");
    const carriedDeduction =
      carriedGoods?.reduce((sum, g) => sum + Number(g.quantity) * Number(g.selling_price), 0) || 0;

    // Get expenses deduction
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount");
    const expensesDeduction =
      expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Get cash sales profit
    const { data: cashSales } = await supabase
      .from("cash_sales")
      .select("quantity, purchase_price, selling_price_per_piece");
    let cashSalesProfit = 0;
    if (cashSales) {
      for (const cs of cashSales) {
        cashSalesProfit += cs.selling_price_per_piece * cs.quantity - cs.purchase_price;
      }
    }

    setStats({
      total_due_to_suppliers: totalPurchase,
      total_profit: totalProfit,
      cash_sales_profit: cashSalesProfit,
      carried_goods_deduction: carriedDeduction,
      expenses_deduction: expensesDeduction,
      net_profit: totalProfit + cashSalesProfit - carriedDeduction - expensesDeduction,
      pending_credits: 0,
    });
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
      <h1 className="text-2xl font-bold mb-6">الصفحة الرئيسية</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          title="إجمالي المطلوب للموردين"
          amount={stats.total_due_to_suppliers}
          color="blue"
        />
        <SummaryCard
          title="إجمالي ربح الموردين"
          amount={stats.total_profit}
          color="green"
        />
        <SummaryCard
          title="ربح النقدي"
          amount={stats.cash_sales_profit}
          color="green"
        />
        <SummaryCard
          title="خصم البضاعة المرحلة"
          amount={stats.carried_goods_deduction}
          color="yellow"
        />
        <SummaryCard
          title="خصم النثريات"
          amount={stats.expenses_deduction}
          color="yellow"
        />
        <SummaryCard
          title="صافي الربح"
          amount={stats.net_profit}
          color={stats.net_profit >= 0 ? "green" : "red"}
        />
      </div>
    </div>
  );
}
