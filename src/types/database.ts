export type UserRole = "admin" | "accountant";

export interface Month {
  id: string;
  name: string;
  is_current: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  month_id: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  supplier_id: string;
  invoice_number: string;
  date: string;
  notes: string | null;
  created_by: string;
  month_id: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_name: string;
  quantity_per_carton: number;
  cartons_count: number;
  total_purchase_price: number;
  selling_price_per_piece: number;
  added_by?: string | null;
}

export interface CarriedGood {
  id: string;
  item_name: string;
  quantity: number;
  selling_price: number;
  date: string;
  notes: string | null;
  month_id: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  notes: string | null;
  month_id: string;
  created_at: string;
}

export interface CashSale {
  id: string;
  item_name: string;
  quantity: number;
  purchase_price: number;
  selling_price_per_piece: number;
  date: string;
  notes: string | null;
  month_id: string;
  added_by?: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  department: string | null;
  phone: string | null;
  created_at: string;
}

export interface EmployeeCredit {
  id: string;
  employee_id: string;
  amount: number;
  description: string | null;
  date: string;
  is_paid: boolean;
  created_at: string;
}

export interface EmployeePayment {
  id: string;
  employee_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

// Computed types
export interface InvoiceItemWithTotals extends InvoiceItem {
  total_quantity: number;
  total_purchase: number;
  total_selling: number;
  profit: number;
}

export interface InvoiceWithTotals extends Invoice {
  items_count: number;
  total_purchase: number;
  total_selling: number;
  profit: number;
  supplier_name?: string;
}

export interface SupplierWithStats extends Supplier {
  invoices_count: number;
  total_purchase: number;
  total_profit: number;
}

export interface EmployeeWithBalance extends Employee {
  total_credits: number;
  total_payments: number;
  balance: number;
}

export interface DashboardStats {
  total_due_to_suppliers: number;
  total_profit: number;
  cash_sales_profit: number;
  carried_goods_deduction: number;
  expenses_deduction: number;
  net_profit: number;
  pending_credits: number;
}
