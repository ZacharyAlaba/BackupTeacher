import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

export const metadata = {
  title: "Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell min-h-screen bg-slate-900 light:bg-slate-100">
      <AdminHeader />

      <main className="w-full px-4 py-6 md:px-6 xl:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <AdminSidebar />
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
