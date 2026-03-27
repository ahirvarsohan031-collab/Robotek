"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { 
  ChartBarIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  UserCircleIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import TaskDetailModal from "@/components/TaskDetailModal";
import PremiumDatePicker from "@/components/PremiumDatePicker";
import PremiumDateRangePicker from '@/components/PremiumDateRangePicker';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Internal Components ---

// Reduced size for compact mode
// Dynamic color based on score
const CircularProgress = ({ percentage, size = 36, strokeWidth = 3 }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const color = percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-100 dark:text-navy-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>
      <span className={`absolute text-[9px] font-black ${color.replace('text-', 'text-opacity-80 text-')}`}>{percentage}%</span>
    </div>
  );
};

// Removed VerticalBarChart as requested

const ScoreRow = ({ label, completed, total, percentage }: any) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#003875]/5 dark:border-navy-800/50 last:border-0 grow">
    <div className="flex-1">
      <p className="text-[9px] uppercase tracking-widest font-black text-gray-400 mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[12px] font-black text-gray-900 dark:text-white">{completed}</span>
        <span className="text-gray-400 text-[10px]">/</span>
        <span className="text-[10px] font-bold text-gray-400">{total}</span>
        <span className="text-gray-400 text-[10px] mx-1"> = </span>
        <span className={`text-[12px] font-black ${percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
          {percentage}%
        </span>
      </div>
    </div>
    <CircularProgress percentage={percentage} size={32} strokeWidth={3} />
  </div>
);

// --- Main Page Component ---

export default function ScorePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [viewSetting, setViewSetting] = useState<'user' | 'category'>('user');
  const [filterType, setFilterType] = useState<'week' | 'month' | 'custom' | 'tillDate'>('month');
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set(['COMPANY']));
  
  const [dateRange, setDateRange] = useState<{from: string, to: string}>(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { 
      from: first.toISOString().split('T')[0], 
      to: last.toISOString().split('T')[0] 
    };
  });

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; tasks: any[]; type: string }>({
    isOpen: false, title: '', tasks: [], type: ''
  });

  // Handle Filter Type Changes
  useEffect(() => {
    const now = new Date();
    if (filterType === 'week') {
      const first = now.getDate() - now.getDay();
      const firstDay = new Date(now.setDate(first));
      const lastDay = new Date(now.setDate(first + 6));
      setDateRange({ from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] });
    } else if (filterType === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateRange({ from: first.toISOString().split('T')[0], to: last.toISOString().split('T')[0] });
    } else if (filterType === 'tillDate') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setDateRange({ from: startOfYear.toISOString().split('T')[0], to: now.toISOString().split('T')[0] });
    }
  }, [filterType]);

  const { data, error, isLoading } = useSWR(
    `/api/score?from=${dateRange.from}&to=${dateRange.to}&type=${filterType}`, 
    fetcher, 
    { refreshInterval: 120000 }
  );

  const users = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter((u: any) => 
      u.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a: any, b: any) => b.score - a.score);
  }, [data, searchTerm]);

  const companyStats = useMemo(() => {
    if (!users.length) return null;
    const stats = {
      user: { id: 'COMPANY', username: 'COMPANY OVERALL', roleName: 'ROBOTEK SYSTEM' },
      completed: 0, total: 0, score: 0,
      onTime: 0, onTimeRate: 0,
      delegationStats: { completed: 0, total: 0, score: 0, onTime: 0, onTimeRate: 0, items: [] as any[] },
      checklistStats: { completed: 0, total: 0, score: 0, onTime: 0, onTimeRate: 0, items: [] as any[] },
      o2dStats: { completed: 0, total: 0, score: 0, onTime: 0, onTimeRate: 0, items: [] as any[] }
    };

    users.forEach((u: any) => {
      stats.completed += u.completed;
      stats.total += u.total;
      stats.onTime += u.onTime;
      
      stats.delegationStats.completed += u.delegationStats.completed;
      stats.delegationStats.total += u.delegationStats.total;
      stats.delegationStats.onTime += u.delegationStats.onTime;
      stats.delegationStats.items.push(...u.delegationStats.items);

      stats.checklistStats.completed += u.checklistStats.completed;
      stats.checklistStats.total += u.checklistStats.total;
      stats.checklistStats.onTime += u.checklistStats.onTime;
      stats.checklistStats.items.push(...u.checklistStats.items);

      stats.o2dStats.completed += u.o2dStats.completed;
      stats.o2dStats.total += u.o2dStats.total;
      stats.o2dStats.onTime += u.o2dStats.onTime;
      stats.o2dStats.items.push(...u.o2dStats.items);
    });

    stats.score = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    stats.onTimeRate = stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : 0;
    
    stats.delegationStats.score = stats.delegationStats.total > 0 ? Math.round((stats.delegationStats.completed / stats.delegationStats.total) * 100) : 0;
    stats.delegationStats.onTimeRate = stats.delegationStats.completed > 0 ? Math.round((stats.delegationStats.onTime / stats.delegationStats.completed) * 100) : 0;

    stats.checklistStats.score = stats.checklistStats.total > 0 ? Math.round((stats.checklistStats.completed / stats.checklistStats.total) * 100) : 0;
    stats.checklistStats.onTimeRate = stats.checklistStats.completed > 0 ? Math.round((stats.checklistStats.onTime / stats.checklistStats.completed) * 100) : 0;

    stats.o2dStats.score = stats.o2dStats.total > 0 ? Math.round((stats.o2dStats.completed / stats.o2dStats.total) * 100) : 0;
    stats.o2dStats.onTimeRate = stats.o2dStats.completed > 0 ? Math.round((stats.o2dStats.onTime / stats.o2dStats.completed) * 100) : 0;

    return stats;
  }, [users]);

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openModal = (type: string, tasks: any[], username: string) => {
    setModalConfig({
      isOpen: true,
      title: `${username}'s ${type.replace('Stats', '')} Tasks`,
      tasks,
      type
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Performance Score</h1>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Operational Analytics & Rankings</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative group min-w-[180px] bg-[#FFFDF2] dark:bg-navy-900 border-2 border-[#F0E6D2] dark:border-navy-800 rounded-xl overflow-hidden shadow-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 bg-transparent outline-none font-bold text-[10px] transition-all uppercase"
            />
          </div>

          {/* Date Range Controls - Pill Style */}
          <div className="bg-[#FFFDF2] dark:bg-navy-900 p-0.5 rounded-2xl border-2 border-[#F0E6D2] dark:border-navy-800 flex shadow-sm">
             {[
               { id: 'week', label: 'Week', icon: <CalendarDaysIcon className="w-3.5 h-3.5" /> },
               { id: 'month', label: 'Month', icon: <CalendarDaysIcon className="w-3.5 h-3.5" /> },
               { id: 'custom', label: 'Custom', icon: <CalendarDaysIcon className="w-3.5 h-3.5" /> },
               { id: 'tillDate', label: 'Till Date', icon: <ClockIcon className="w-3.5 h-3.5" /> }
             ].map(btn => {
               const isActive = filterType === btn.id;
               const rangeLabel = btn.id === 'week' ? '(This Week)' : btn.id === 'month' ? '(This Month)' : btn.id === 'tillDate' ? '(YTD)' : '';
               return (
                 <button 
                  key={btn.id}
                  onClick={() => setFilterType(btn.id as any)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all truncate min-w-16 flex items-center gap-1.5 ${
                    isActive ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md' : 'text-gray-400 hover:text-gray-600'
                  }`}
                 >
                   {btn.icon}
                   <span>{btn.label}</span>
                 </button>
               );
             })}
          </div>

          {/* Custom Date Range Picker - Dual Calendar */}
          <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
             <PremiumDateRangePicker 
               value={dateRange} 
               onChange={(range) => {
                 setDateRange(range);
                 setFilterType('custom');
               }} 
             />
          </div>

          {/* View Mode Toggle - Pill Style */}
          <div className="bg-[#FFFDF2] dark:bg-navy-900 p-0.5 rounded-xl border-2 border-[#F0E6D2] dark:border-navy-800 flex shadow-sm">
             <button 
              onClick={() => setViewSetting('user')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${viewSetting === 'user' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
             >
               User View
             </button>
             <button 
              onClick={() => setViewSetting('category')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${viewSetting === 'category' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
             >
               Category View
             </button>
          </div>
          {/* View Mode Toggle - Pill Style */}
          <div className="bg-[#FFFDF2] dark:bg-navy-900 p-0 rounded-full border-2 border-[#F0E6D2] dark:border-navy-800 flex shadow-sm overflow-hidden">
             <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <Squares2X2Icon className="w-4 h-4" />
             </button>
             <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <ListBulletIcon className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-40">
           <ArrowPathIcon className="w-12 h-12 animate-spin text-[#003875] dark:text-[#FFD500]" />
           <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Loading Real-Time Scores</p>
        </div>
      ) : error ? (
        <div className="p-20 text-center border-4 border-dashed border-rose-100 dark:border-rose-900/20 rounded-[3rem]">
           <ExclamationCircleIcon className="w-12 h-12 text-rose-500 mx-auto mb-4" />
           <h3 className="text-xl font-black text-rose-600 uppercase">Dashboard Sync Error</h3>
           <p className="text-xs font-bold text-gray-400 mt-2 uppercase">Please check your connection and try again</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
              {/* Company Overall Tile - Always Shown */}
              {companyStats && (
                <div className="group bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#003875]/20 dark:border-[#FFD500]/20 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col ring-4 ring-[#003875]/5 dark:ring-[#FFD500]/5">
                   <div className="p-3 border-b border-[#003875]/20 bg-gradient-to-br from-[#003875]/20 via-[#003875]/10 to-transparent dark:from-[#FFD500]/30 dark:to-transparent flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy-950 to-[#003875] dark:from-[#FFD500] dark:to-yellow-600 shadow-md flex items-center justify-center text-white dark:text-black font-black text-sm shrink-0">
                            C
                         </div>
                         <div>
                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase leading-tight">COMPANY OVERALL</h3>
                            <div className="px-1.5 py-0.5 bg-[#003875]/10 dark:bg-yellow-500/10 rounded-md text-[7px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter mt-0.5 inline-block">SYSTEM SNAPSHOT</div>
                         </div>
                      </div>
                      <button 
                        onClick={() => toggleUser('COMPANY')}
                        className={`w-8 h-5 flex items-center rounded-full transition-all duration-500 focus:outline-none p-0.5 border border-[#F0E6D2] dark:border-navy-700 ${
                          expandedUsers.has('COMPANY') ? 'bg-[#FFD500]' : 'bg-[#FFF9E6] dark:bg-navy-800'
                        }`}
                      >
                         <div className={`w-3.5 h-3.5 rounded-full shadow transition-all duration-500 ${expandedUsers.has('COMPANY') ? 'translate-x-3 bg-gray-900' : 'bg-[#DCD0B9] dark:bg-gray-400'}`} />
                      </button>
                   </div>
                   <div className="p-3 space-y-3 flex-1">
                      <section>
                         <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/10" />
                            Global Metrics
                         </h4>
                         <div className="space-y-0.5">
                            <ScoreRow label="Combined Score" completed={companyStats.completed} total={companyStats.total} percentage={companyStats.score} />
                            <ScoreRow label="Combined Accuracy" completed={companyStats.onTime} total={companyStats.completed} percentage={companyStats.onTimeRate} />
                         </div>
                      </section>
                      {expandedUsers.has('COMPANY') && (
                        <div className="space-y-2 pt-2 border-t border-[#F0E6D2] animate-in slide-in-from-top-2">
                           {[
                             { label: 'Delegations', id: 'delegationStats', icon: <DocumentTextIcon className="w-3.5 h-3.5" /> },
                             { label: 'Checklists', id: 'checklistStats', icon: <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> },
                             { label: 'O2D FMS Jobs', id: 'o2dStats', icon: <ShoppingBagIcon className="w-3.5 h-3.5" /> }
                           ].map(cat => (
                                <section key={cat.id} className="p-2 bg-[#FFF9E6] dark:bg-navy-950/20 rounded-xl border border-[#F0E6D2]">
                                   <div className="flex items-center gap-1.5 mb-1.5">
                                      <cat.icon.type {...cat.icon.props} className="w-3.5 h-3.5 text-gray-400" />
                                      <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">{cat.label}</h5>
                                   </div>
                                   <div className="space-y-0.5">
                                      <ScoreRow label="Rate" completed={(companyStats as any)[cat.id].completed} total={(companyStats as any)[cat.id].total} percentage={(companyStats as any)[cat.id].score} />
                                      <ScoreRow label="On-Time" completed={(companyStats as any)[cat.id].onTime} total={(companyStats as any)[cat.id].completed} percentage={(companyStats as any)[cat.id].onTimeRate} />
                                   </div>
                                </section>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              )}

              {/* User or Category View */}
              {viewSetting === 'user' ? (
                /* User Tiles */
                users.map((item: any) => {
                  const isExpanded = expandedUsers.has(item.user.id);
                  return (
                    <div key={item.user.id} className="group bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden flex flex-col">
                      {/* Tile Header */}
                      <div className="p-3 border-b border-[#F0E6D2] dark:border-navy-800/50 bg-[#FFF9E6]/50 dark:bg-navy-950/30">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#003875] to-blue-700 dark:from-[#FFD500] dark:to-yellow-500 shadow-md flex items-center justify-center text-white dark:text-black font-black text-sm shrink-0">
                                  {item.user.username.charAt(0).toUpperCase()}
                               </div>
                               <div className="min-w-0">
                                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase truncate max-w-[100px] leading-tight">{item.user.username}</h3>
                                  <div className="px-1.5 py-0.5 bg-[#F0E6D2]/50 dark:bg-navy-800 rounded-md text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter mt-0.5 inline-block">
                                     {item.user.roleName}
                                  </div>
                               </div>
                            </div>
                            
                            {/* Expansion Toggle */}
                            <button 
                              onClick={() => toggleUser(item.user.id)}
                              className={`w-8 h-5 flex items-center rounded-full transition-all duration-500 focus:outline-none p-0.5 border border-[#F0E6D2] dark:border-navy-700 ${
                                isExpanded ? 'bg-[#FFD500] border-[#FFD500]' : 'bg-[#FFF9E6] dark:bg-navy-800'
                              }`}
                            >
                               <div className={`w-3.5 h-3.5 rounded-full shadow transition-all duration-500 ${isExpanded ? 'translate-x-3 bg-gray-900' : 'bg-[#DCD0B9] dark:bg-gray-400'}`} />
                            </button>
                         </div>
                      </div>

                      {/* Metrics Body */}
                      <div className="p-3 space-y-3 flex-1">
                         <section>
                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/10" />
                               Overall Stats
                            </h4>
                            <div className="space-y-0.5">
                               <ScoreRow label="Completed / Total" completed={item.completed} total={item.total} percentage={item.score} />
                               <ScoreRow label="On Time / Completed" completed={item.onTime} total={item.completed} percentage={item.onTimeRate} />
                            </div>
                         </section>

                         {/* Expanded Categories */}
                         {isExpanded && (
                           <div className="space-y-2 pt-2 border-t border-[#F0E6D2] dark:border-navy-800/50 animate-in slide-in-from-top-2 duration-500">
                              {[
                                { label: 'Delegations', id: 'delegationStats', icon: <DocumentTextIcon className="w-3.5 h-3.5" />, color: 'bg-orange-500' },
                                { label: 'Checklists', id: 'checklistStats', icon: <ClipboardDocumentListIcon className="w-3.5 h-3.5" />, color: 'bg-emerald-500' },
                                { label: 'O2D FMS Jobs', id: 'o2dStats', icon: <ShoppingBagIcon className="w-3.5 h-3.5" />, color: 'bg-blue-500' }
                              ].map(cat => (
                                <section key={cat.id} className="group/cat cursor-pointer bg-[#FFF9E6]/80 dark:bg-navy-950/20 p-2 rounded-xl hover:bg-[#FFD500]/10 transition-colors border border-[#F0E6D2] dark:border-navy-800/30" onClick={() => openModal(cat.id, item[cat.id].items, item.user.username)}>
                                   <div className="flex items-center justify-between mb-1">
                                      <h5 className="text-[9px] font-black text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                                        <cat.icon.type {...cat.icon.props} className="w-3.5 h-3.5 opacity-50" />
                                        {cat.label}
                                      </h5>
                                      <ChevronRightIcon className="w-3 h-3 text-gray-300 group-hover/cat:text-[#FFD500]" />
                                   </div>
                                   <div className="space-y-0.5">
                                      <ScoreRow label="Score Calculation" completed={item[cat.id].completed} total={item[cat.id].total} percentage={item[cat.id].score} />
                                      <ScoreRow label="On-Time Calculation" completed={item[cat.id].onTime} total={item[cat.id].completed} percentage={item[cat.id].onTimeRate} />
                                   </div>
                                </section>
                              ))}
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Category Tiles (Aggregated) */
                companyStats && [
                  { label: 'Delegations', id: 'delegationStats', icon: <DocumentTextIcon className="w-6 h-6" />, color: 'text-orange-500', bg: 'from-orange-100/50 via-orange-50/50 to-transparent dark:from-orange-900/40' },
                  { label: 'Checklists', id: 'checklistStats', icon: <ClipboardDocumentListIcon className="w-6 h-6" />, color: 'text-emerald-500', bg: 'from-emerald-100/50 via-emerald-50/50 to-transparent dark:from-emerald-900/40' },
                  { label: 'O2D FMS Jobs', id: 'o2dStats', icon: <ShoppingBagIcon className="w-6 h-6" />, color: 'text-blue-500', bg: 'from-blue-100/50 via-blue-50/50 to-transparent dark:from-blue-900/40' }
                ].map(cat => {
                  const data = (companyStats as any)[cat.id];
                  return (
                    <div key={cat.id} className="group bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden flex flex-col cursor-pointer" onClick={() => openModal(cat.id, data.items, 'COMPANY')}>
                      <div className={`p-4 bg-gradient-to-br ${cat.bg} dark:bg-navy-950 border-b border-[#F0E6D2] flex items-center gap-4`}>
                         <div className={`p-2 rounded-2xl bg-white dark:bg-navy-800 shadow-sm ${cat.color}`}>
                            <cat.icon.type {...cat.icon.props} />
                         </div>
                         <div className="flex-1">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight">{cat.label}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Combined Department Score</p>
                         </div>
                         <ChevronRightIcon className="w-5 h-5 text-gray-300" />
                      </div>
                      <div className="p-4 space-y-2">
                         <ScoreRow label="Overall Efficiency" completed={data.completed} total={data.total} percentage={data.score} />
                         <ScoreRow label="Overall Compliance" completed={data.onTime} total={data.completed} percentage={data.onTimeRate} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm overflow-hidden animate-in fade-in duration-500">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-[#FFF9E6] dark:bg-navy-950 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b border-[#F0E6D2] dark:border-navy-800">
                        <th className="px-6 py-4">User Profile</th>
                        <th className="px-4 py-4 text-center">Score %</th>
                        <th className="px-4 py-4 text-center">On-Time %</th>
                        <th className="px-4 py-4 text-center">Del.</th>
                        <th className="px-4 py-4 text-center">Chk.</th>
                        <th className="px-4 py-4 text-center">O2D</th>
                        <th className="px-6 py-4 text-right">Rank</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#F0E6D2] dark:divide-navy-800/50">
                     {users.map((item: any, idx: number) => (
                        <tr key={item.user.id} className="hover:bg-[#FFF9E6]/50 dark:hover:bg-white/5 transition-colors group">
                           <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] dark:bg-navy-800 flex items-center justify-center font-black text-[#003875] dark:text-[#FFD500] border border-[#F0E6D2] dark:border-navy-700 shadow-sm transform group-hover:scale-105 transition-transform text-xs">
                                    {item.user.username.charAt(0).toUpperCase()}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="font-black text-gray-900 dark:text-white text-[10px] uppercase truncate max-w-[120px]">{item.user.username}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{item.user.roleName}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center justify-center p-1.5 rounded-xl bg-[#FFF9E6] dark:bg-navy-950 font-black text-xs w-14">
                                 <span className={item.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{item.score}%</span>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center justify-center p-1.5 rounded-xl bg-[#FFF9E6] dark:bg-navy-950 font-black text-xs w-14">
                                 <span className={item.onTimeRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{item.onTimeRate}%</span>
                              </div>
                           </td>
                           {['delegationStats', 'checklistStats', 'o2dStats'].map(catId => {
                             const cat = item[catId];
                             return (
                               <td key={catId} className="px-6 py-4 text-center">
                                  <button 
                                    onClick={() => openModal(catId, cat.items, item.user.username)}
                                    className="inline-flex flex-col items-center hover:scale-110 transition-transform disabled:opacity-30 disabled:hover:scale-100"
                                    disabled={cat.total === 0}
                                  >
                                     <span className="text-[10px] font-black text-gray-900 dark:text-white">{cat.score}%</span>
                                     <div className="w-10 h-1 bg-gray-100 dark:bg-navy-800 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-[#FFD500]" style={{ width: `${cat.score}%` }} />
                                     </div>
                                  </button>
                               </td>
                             );
                           })}
                           <td className="px-8 py-4 text-right">
                              <div className="inline-flex items-center gap-3">
                                 <div className="text-right">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{item.finalScore}%</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Efficiency</p>
                                 </div>
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                   idx === 0 ? 'bg-amber-100 text-amber-600 border-2 border-amber-300' : 
                                   idx === 1 ? 'bg-slate-100 text-slate-500 border-2 border-slate-300' : 
                                   'bg-gray-50 text-gray-400'
                                 }`}>
                                    #{idx + 1}
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </>
      )}

      {/* Task Modal Container */}
      <TaskDetailModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))}
        title={modalConfig.title}
        tasks={modalConfig.tasks}
        type={modalConfig.type}
      />
    </div>
  );
}
