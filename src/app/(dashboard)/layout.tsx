import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:mr-64 p-3 md:p-6 pt-17 md:pt-6">{children}</main>
    </div>
  );
}
