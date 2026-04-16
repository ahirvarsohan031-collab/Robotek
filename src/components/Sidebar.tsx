"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";

import { useSession, signOut } from "next-auth/react";
import { XMarkIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  const [delegationsPendingCount, setDelegationsPendingCount] = useState(0);
  const [checklistsPendingCount, setChecklistsPendingCount] = useState(0);
  const [ticketsOpenCount, setTicketsOpenCount] = useState(0);
  const [o2dPendingCount, setO2dPendingCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    
    // @ts-ignore
    const userRole = session.user.role || 'USER';
    const currentUser = (session.user as any)?.username || "";

    const fetchCounts = async () => {
      try {
        const safeFetch = async (url: string) => {
          try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
          } catch (e) {
            console.error(`Sidebar fetch failed for ${url}:`, e);
          }
          return null;
        };

        const [delData, checkData, tickData, o2dData, configData, chatData] = await Promise.all([
          safeFetch('/api/delegations'),
          safeFetch('/api/checklists'),
          safeFetch('/api/tickets'),
          safeFetch('/api/o2d?all=true'),
          safeFetch('/api/o2d/config'),
          safeFetch('/api/chat/users')
        ]);
        
        // Filter for USER role
        const baseDel = (delData || []).length > 0 && userRole === 'USER' ? delData.filter((d: any) => d.assigned_to === currentUser) : (delData || []);
        const baseCheck = (checkData || []).length > 0 && userRole === 'USER' ? checkData.filter((c: any) => c.assigned_to === currentUser) : (checkData || []);

        // Common helper
        const getEarliestDate = (dateString?: string) => {
          if (!dateString) return null;
          if (!dateString.includes(',')) {
            if (dateString.includes('/')) {
              const parts = dateString.split(' ')[0].split('/');
              if (parts.length === 3) {
                  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              }
            }
            return new Date(dateString);
          }
          const dates = dateString.split(',').map(d => new Date(d.trim()));
          const validDates = dates.filter(d => !isNaN(d.getTime()));
          if (validDates.length === 0) return null;
          return validDates.reduce((earliest, current) => current < earliest ? current : earliest);
        };

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const isDelayedOrToday = (item: any) => {
          const s = item.status;
          if (s === 'Completed' || s === 'Approved') return false;
          
          if (!item.due_date) return false;
          
          const due = getEarliestDate(item.due_date);
          if (!due || isNaN(due.getTime())) return false;
          
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          return diffDays <= 0; // Negative is delayed, 0 is today
        };

        setDelegationsPendingCount(baseDel.filter(isDelayedOrToday).length);
        setChecklistsPendingCount(baseCheck.filter(isDelayedOrToday).length);
        setTicketsOpenCount(tickData.filter((t: any) => t.status !== 'Closed').length);

        // O2D Logic
        let delayed = 0;
        let today = 0;

        (o2dData || []).forEach((order: any) => {
          if (order.hold || order.cancelled) return;

          // Find pending step
          let pendingStepIdx = -1;
          for (let i = 1; i <= 11; i++) {
            const status = order[`status_${i}`];
            if (status !== 'Yes' && status !== 'Done') {
              pendingStepIdx = i;
              break;
            }
          }

          if (pendingStepIdx !== -1) {
            // Role Filter
            const stepConfig = configData.configs?.find((c: any) => c.step === pendingStepIdx);
            if (userRole.toUpperCase() === 'USER' && stepConfig) {
              const responsibleList = stepConfig.responsible_person
                ? stepConfig.responsible_person.split(",").map((s: string) => s.trim())
                : [];
              if (stepConfig.responsible_person && !responsibleList.includes(currentUser)) return;
            }

            // Date Filter
            const plannedDateStr = order[`planned_${pendingStepIdx}`];
            if (plannedDateStr) {
              const plannedDate = new Date(plannedDateStr);
              plannedDate.setHours(0, 0, 0, 0);
              const diff = Math.round((plannedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diff < 0) delayed++;
              else if (diff === 0) today++;
            }
          }
        });

        setO2dPendingCount(delayed + today);

        // Chat Logic
        const totalUnreadChat = Array.isArray(chatData) ? chatData.reduce((acc, user) => acc + (user.unreadCount || 0), 0) : 0;
        setChatUnreadCount(totalUnreadChat);

      } catch (err) {
        console.error("Failed to fetch sidebar counts:", err);
      }
    };

    fetchCounts();
    
    // Refresh counts every 2 minutes
    const interval = setInterval(fetchCounts, 120000);
    return () => clearInterval(interval);
  }, [session]);

  const { permissions: userPermissions, isAdmin } = usePermissions();

  const filteredNavigation = navigation.filter(item => {
    // Dashboard is the system home, visible to all authenticated users, Chat is available to all, Scheduler set to visible
    if (item.id === 'dashboard' || item.id === 'chat' || item.id === 'scheduler') return true;

    // If matrix permissions exist, use them strictly
    if (userPermissions.length > 0) {
      return userPermissions.includes(item.id);
    }
    // Fallback: Default to allowing Admins if no matrix data exists yet
    return isAdmin;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-all duration-300"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      <aside 
        style={{ background: 'var(--panel-card)' }}
        className={`
        fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out
        ${mobileOpen 
          ? 'w-60 translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] border-r-4 border-[#FFD500] dark:border-[#FFD500]/50 rounded-r-[2.5rem]' 
          : 'w-16 -translate-x-full md:translate-x-0 md:hover:w-56 border-r border-gray-100'}
        flex flex-col group overflow-hidden peer
      `}>

        <div className="flex items-center justify-between p-5 md:p-0 md:pt-6 md:pb-2 md:pl-5">
          <Link href="/" className="flex items-center gap-4 group/logo active:scale-95 transition-transform">
            <div className="w-10 h-10 min-w-[40px] rounded-xl overflow-hidden shadow-lg transform group-hover/logo:-rotate-6 transition-transform duration-500 ring-1 ring-black/5 dark:ring-white/10">
              <img src="/logo_compact.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className={`text-xl font-black tracking-tight text-gray-900 dark:text-white transition-all duration-300 whitespace-nowrap ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
              Robotek
            </span>
          </Link>

          {mobileOpen && (
            <button 
              onClick={() => setMobileOpen?.(false)}
              className="p-2 text-[#003875] bg-[#FFD500] hover:bg-[#FFE55C] rounded-xl md:hidden transition-all shadow-md active:scale-90"
            >
              <XMarkIcon className="w-6 h-6 stroke-[3]" />
            </button>
          )}
        </div>
        
        <nav className="flex-1 px-3 md:px-2 pt-3 md:pt-1 pb-3 space-y-0.5 overflow-y-auto overflow-x-hidden invisible-scrollbar">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen?.(false)}
                className={`
                  flex items-center gap-3 px-3 md:px-3 py-1.5 rounded-xl transition-all group/item font-bold overflow-hidden
                  ${isActive 
                    ? 'bg-[#003875] text-white shadow-md md:translate-x-1' 
                    : 'text-gray-500 dark:text-slate-400 border-l-4 border-transparent hover:text-[#003875] dark:hover:text-sky-400 hover:bg-[#003875]/8 dark:hover:bg-white/5 active:scale-95 hover:translate-x-1'}
                `}
              >
                <div className="flex items-center justify-center w-6 min-w-[24px]">
                  <item.icon className={`w-6 h-6 transition-all font-bold ${isActive ? 'text-white' : 'group-hover/item:text-[#003875] dark:group-hover/item:text-sky-400 group-hover/item:scale-110'}`} />
                </div>
                <span className={`flex-1 text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 md:group-hover:opacity-100 md:group-hover:translate-x-0'}`}>
                  {item.name}
                </span>
                
                {/* Pending Counts Badge */}
                {item.id === 'delegations' && delegationsPendingCount > 0 && (
                  <span className={`transition-all duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} bg-[#CE2029] text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm`}>
                    {delegationsPendingCount}
                  </span>
                )}
                {item.id === 'checklists' && checklistsPendingCount > 0 && (
                  <span className={`transition-all duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} bg-[#CE2029] text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm`}>
                    {checklistsPendingCount}
                  </span>
                )}
                {item.id === 'tickets' && ticketsOpenCount > 0 && (
                  <span className={`transition-all duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} bg-[#CE2029] text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm`}>
                    {ticketsOpenCount}
                  </span>
                )}
                {item.id === 'o2d' && o2dPendingCount > 0 && (
                  <span className={`transition-all duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} bg-[#CE2029] text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm`}>
                    {o2dPendingCount}
                  </span>
                )}
                {item.id === 'chat' && chatUnreadCount > 0 && (
                  <span className={`transition-all duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} bg-[#CE2029] text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm`}>
                    {chatUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile User Profile Section */}
        {mobileOpen && (
          <div className="p-4 mt-auto border-t border-[#003875]/5 dark:border-white/5 md:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/50 dark:bg-white/5 p-4 rounded-3xl flex items-center gap-3 border border-[#003875]/10 dark:border-white/5 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#f2b60c]/10 dark:bg-[#FFD500]/10 flex items-center justify-center border border-[#f2b60c]/20 dark:border-[#FFD500]/20">
                <UserCircleIcon className="w-6 h-6 text-[#003875] dark:text-[#FFD500]" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                  {(session?.user as any)?.username?.toUpperCase() || "USER"}
                </p>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 capitalize">
                  {/* @ts-ignore */}
                  {session?.user?.role || "Member"}
                </p>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-gray-400 hover:text-[#CE2029] hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
