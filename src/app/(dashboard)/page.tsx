"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { 
  UsersIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDelegations: 0,
    pendingTasks: 0,
    overdueTasks: 0
  });
  const [loading, setLoading] = useState(true);

  // @ts-ignore
  const userPermissions = session?.user?.permissions || [];
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, delRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/delegations')
        ]);
        const users = await usersRes.json();
        const delegations = await delRes.json();

        // Calculate dynamic status for delegations
        const now = new Date();
        now.setHours(0,0,0,0);

        let pending = 0;
        let overdue = 0;

        delegations.forEach((del: any) => {
            if (del.status?.toLowerCase() === 'completed') return;
            
            const due = new Date(del.due_date);
            due.setHours(0,0,0,0);
            
            if (isNaN(due.getTime())) {
                pending++;
            } else if (due < now) {
                overdue++;
            } else {
                pending++;
            }
        });

        setStats({
          totalUsers: users.length,
          totalDelegations: delegations.length,
          pendingTasks: pending,
          overdueTasks: overdue
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const firstName = (session?.user as any)?.username || session?.user?.name?.split(' ')[0] || "Guest";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003875] to-[#002244] p-8 text-white shadow-2xl border-b-4 border-[#FFD500]/30 min-h-[200px] flex flex-col justify-center">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#FFD500]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <span className="bg-[#FFD500] text-[#003875] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
              <SparklesIcon className="w-3 h-3" /> System Live
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 leading-tight">
            WELCOME BACK,<br/>
            <span className="text-[#FFD500] uppercase">{firstName}</span>
          </h1>
          <p className="text-blue-100/60 font-bold text-[10px] uppercase tracking-[0.3em] overflow-hidden whitespace-nowrap">Robotek Operational Command Center</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Personnel', value: stats.totalUsers, icon: UsersIcon, color: 'from-[#003875] to-blue-700', sub: 'Active Accounts' },
          { label: 'Total Tasks', value: stats.totalDelegations, icon: DocumentTextIcon, color: 'from-amber-500 to-orange-600', sub: 'Delegations assigned' },
          { label: 'Pending Now', value: stats.pendingTasks, icon: ClockIcon, color: 'from-emerald-500 to-teal-600', sub: 'Awaiting Action' },
          { label: 'Overdue Urgent', value: stats.overdueTasks, icon: ExclamationTriangleIcon, color: 'from-[#CE2029] to-red-600', sub: 'Critical Attention' },
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b ${stat.color} rounded-r-2xl opacity-20 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gray-50 dark:bg-white/5 transition-colors`}>
                <stat.icon className="w-6 h-6 text-gray-400 group-hover:text-[#003875] dark:group-hover:text-[#FFD500] transition-colors" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                {loading ? '...' : stat.value}
              </h2>
              <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Access */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight uppercase">
                <ChartBarIcon className="w-5 h-5 text-[#003875] dark:text-[#FFD500]" />
                Primary Channels
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(userPermissions.includes('users') || (userPermissions.length === 0 && isAdmin)) && (
              <Link href="/users" className="group p-6 bg-white dark:bg-navy-800 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:border-[#003875] dark:hover:border-[#FFD500] transition-all overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <UsersIcon className="w-20 h-20 -mr-6 -mt-6" />
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 group-hover:bg-[#003875] transition-all">
                          <UsersIcon className="w-8 h-8 text-[#003875] group-hover:text-white transition-colors" />
                      </div>
                      <div>
                          <h4 className="font-black text-gray-900 dark:text-white group-hover:text-[#003875] dark:group-hover:text-[#FFD500] transition-colors">Users</h4>
                          <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Access Control</p>
                      </div>
                  </div>
              </Link>
            )}
            
            {(userPermissions.includes('delegations') || (userPermissions.length === 0 && isAdmin)) && (
              <Link href="/delegations" className="group p-6 bg-white dark:bg-navy-800 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:border-[#003875] dark:hover:border-[#FFD500] transition-all overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <DocumentTextIcon className="w-20 h-20 -mr-6 -mt-6" />
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 group-hover:bg-amber-500 transition-all">
                          <DocumentTextIcon className="w-8 h-8 text-amber-600 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                          <h4 className="font-black text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">Delegations</h4>
                          <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Task Management</p>
                      </div>
                  </div>
              </Link>
            )}

            {userPermissions.length > 0 && !userPermissions.includes('users') && !userPermissions.includes('delegations') && (
                <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                    <SparklesIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">No active channels assigned</p>
                </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#003875]/5 dark:bg-[#FFD500]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 tracking-tight uppercase relative z-10">System Status</h3>
            <div className="space-y-5 relative z-10">
                {[
                    { label: 'Cloud Database', status: 'Online', color: 'bg-emerald-500' },
                    { label: 'Drive Sync', status: 'Active', color: 'bg-emerald-500' },
                    { label: 'Auth Service', status: 'Secure', color: 'bg-blue-500' },
                    { label: 'Backups', status: 'Optimized', color: 'bg-emerald-500' },
                ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group/status">
                        <div>
                            <p className="font-black text-gray-800 dark:text-slate-200 text-sm whitespace-nowrap group-hover/status:translate-x-1 transition-transform">{item.label}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{item.status}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse`} />
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 dark:border-white/5 text-center">
                <p className="text-[9px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">Robotek ERP v2.4.0</p>
            </div>
        </div>
      </div>
    </div>
  );
}
