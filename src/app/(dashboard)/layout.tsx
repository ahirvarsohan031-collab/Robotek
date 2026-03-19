import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessGuard from "@/components/AccessGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--background)' }} className="min-h-screen flex overflow-hidden transition-all duration-500">
      <Sidebar />

      <div className="flex-1 flex flex-col ml-16 peer-hover:ml-56 min-h-screen py-1.5 pr-1.5 transition-all duration-300 ease-in-out">
        <div style={{ backgroundColor: 'var(--panel-bg)' }} className="flex-1 flex flex-col rounded-tl-[32px] rounded-bl-[32px] shadow-2xl overflow-hidden border-l border-y border-white/5 dark:border-white/10 transition-all duration-500 panel-transition">
          <Header />
          
          <main className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-none mx-auto">
              <AccessGuard>
                {children}
              </AccessGuard>
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
