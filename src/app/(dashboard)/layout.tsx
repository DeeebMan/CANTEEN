import Sidebar from "@/components/Sidebar";
import { MonthProvider } from "@/contexts/MonthContext";
import MonthSelector from "@/components/MonthSelector";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MonthProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="md:mr-64 p-3 md:p-6 pt-17 md:pt-6">
          <div className="bg-white rounded-xl shadow px-4 py-3 mb-4">
            <MonthSelector />
          </div>
          {children}
        </main>
      </div>
    </MonthProvider>
  );
}
