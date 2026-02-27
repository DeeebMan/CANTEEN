import { formatCurrency } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  amount: number;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  subtitle?: string;
}

const colorMap = {
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  green: "bg-green-50 border-green-200 text-green-800",
  red: "bg-red-50 border-red-200 text-red-800",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  purple: "bg-purple-50 border-purple-200 text-purple-800",
};

export default function SummaryCard({
  title,
  amount,
  color = "blue",
  subtitle,
}: SummaryCardProps) {
  return (
    <div className={`rounded-xl border-2 p-4 md:p-6 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-xl md:text-2xl font-bold mt-2">{formatCurrency(amount)} ج.م</p>
      {subtitle && <p className="text-sm mt-1 opacity-60">{subtitle}</p>}
    </div>
  );
}
