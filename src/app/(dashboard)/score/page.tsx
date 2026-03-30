"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  ArrowPathIcon,
  ChevronLeftIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import PremiumDatePicker from "@/components/PremiumDatePicker";
import PremiumDateRangePicker from '@/components/PremiumDateRangePicker';
import ScoreTrendChart from "@/components/ScoreTrendChart";
import SemiCircleGauge from "@/components/SemiCircleGauge";
import { jsPDF } from "jspdf";
import * as htmlToImage from 'html-to-image';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Helper for ISO Week ---
function getISOWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

// --- Internal Components ---

// Reduced size for compact mode
// Dynamic color based on score
const CircularProgress = ({ percentage, isNegative, size = 36, strokeWidth = 3 }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // If negative mode, we show the "Failure" fill (100 - percentage)
  const displayPercentage = isNegative ? percentage - 100 : percentage;
  const fillPercentage = isNegative ? (100 - percentage) : percentage;
  const offset = circumference - (fillPercentage / 100) * circumference;
  
  const color = isNegative ? (
    fillPercentage < 20 ? 'text-emerald-500' : fillPercentage < 50 ? 'text-amber-500' : 'text-rose-500'
  ) : (
    percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500'
  );

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
      <span className={`absolute text-[9px] font-black ${color.replace('text-', 'text-opacity-80 text-')}`}>
        {displayPercentage}%
      </span>
    </div>
  );
};

const ScoreRow = ({ label, completed, total, percentage, isNegative }: any) => {
  const displayPercentage = isNegative ? percentage - 100 : percentage;
  const color = isNegative ? (
    (100 - percentage) < 20 ? 'text-emerald-500' : (100 - percentage) < 50 ? 'text-amber-500' : 'text-rose-500'
  ) : (
    percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500'
  );

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#003875]/5 dark:border-navy-800/50 last:border-0 grow">
      <div className="flex-1">
        <p className="text-[9px] uppercase tracking-widest font-black text-gray-400 mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-[12px] font-black text-gray-900 dark:text-white">{completed}</span>
          <span className="text-gray-400 text-[10px]">/</span>
          <span className="text-[10px] font-bold text-gray-400">{total}</span>
          <span className="text-gray-400 text-[10px] mx-1"> = </span>
          <span className={`text-[12px] font-black ${color}`}>
            {displayPercentage}%
          </span>
        </div>
      </div>
      <CircularProgress percentage={percentage} isNegative={isNegative} size={32} strokeWidth={3} />
    </div>
  );
};



function generateTrendData(items: any[], dateRange: { from: string, to: string }, chartGranularity: string) {
    if (!dateRange.from || !dateRange.to) return [];
    const from = new Date(dateRange.from); from.setHours(0,0,0,0);
    const to = new Date(dateRange.to); to.setHours(23,59,59,999);

    const buckets: { from: Date; to: Date; label: string }[] = [];
    const curr = new Date(from);

    if (chartGranularity === 'day') {
      while (curr <= to) {
        const s = new Date(curr); s.setHours(0,0,0,0);
        const e = new Date(curr); e.setHours(23,59,59,999);
        buckets.push({ from: s, to: e, label: curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (chartGranularity === 'week') {
      while (curr <= to) {
        const s = new Date(curr); s.setHours(0,0,0,0);
        const e = new Date(curr); e.setDate(e.getDate() + 6);
        if (e > to) e.setTime(to.getTime());
        e.setHours(23,59,59,999);
        
        const target = new Date(s.valueOf());
        const dayNr = (s.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) { target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7); }
        const wn = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        buckets.push({ from: s, to: e, label: `W${wn} '${s.getFullYear().toString().slice(-2)}` });
        curr.setDate(curr.getDate() + 7);
      }
    } else if (chartGranularity === 'month') {
      while (curr <= to) {
        const s = new Date(curr); s.setHours(0,0,0,0);
        const e = new Date(curr.getFullYear(), curr.getMonth() + 1, 0); 
        if (e > to) e.setTime(to.getTime());
        e.setHours(23,59,59,999);
        buckets.push({ from: s, to: e, label: curr.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
        curr.setMonth(curr.getMonth() + 1); curr.setDate(1);
      }
    } else if (chartGranularity === 'quarterly') {
      while (curr <= to) {
        const q = Math.floor(curr.getMonth() / 3);
        const s = new Date(curr); s.setHours(0,0,0,0);
        const e = new Date(curr.getFullYear(), (q + 1) * 3, 0);
        if (e > to) e.setTime(to.getTime());
        e.setHours(23,59,59,999);
        buckets.push({ from: s, to: e, label: `Q${q + 1} '${curr.getFullYear().toString().slice(-2)}` });
        curr.setMonth((q + 1) * 3); curr.setDate(1);
      }
    } else {
      while (curr <= to) {
        const s = new Date(curr); s.setHours(0,0,0,0);
        const e = new Date(curr.getFullYear(), 11, 31);
        if (e > to) e.setTime(to.getTime());
        e.setHours(23,59,59,999);
        buckets.push({ from: s, to: e, label: curr.getFullYear().toString() });
        curr.setFullYear(curr.getFullYear() + 1); curr.setMonth(0); curr.setDate(1);
      }
    }

    return buckets.map(b => {
      const inBucket = items.filter(item => {
        const pd = item.plannedDate ? new Date(item.plannedDate) : null;
        const ad = item.actualDate ? new Date(item.actualDate) : null;
        return (pd && pd >= b.from && pd <= b.to) || (ad && ad >= b.from && ad <= b.to);
      });
      const total = inBucket.length;
      const completed = inBucket.filter((i: any) => i.isCompleted).length;
      const onTime = inBucket.filter((i: any) => i.isCompleted && !i.isLate).length;
      return {
        label: b.label,
        score: total > 0 ? Math.round((completed / total) * 100) : 0,
        onTime: completed > 0 ? Math.round((onTime / completed) * 100) : 0
      };
    });
}

// --- Sub-components for Drill-down to avoid Hook order errors ---

const getTaskDelayMs = (item: any) => {
  if (!item.plannedDate) return 0;
  const planned = new Date(item.plannedDate);
  const now = new Date();
  const actual = item.actualDate ? new Date(item.actualDate) : null;
  
  if (actual && actual > planned) {
    return actual.getTime() - planned.getTime();
  } else if (!actual && now > planned) {
    return now.getTime() - planned.getTime();
  }
  return 0;
};



const getTaskTimeRemainingMs = (item: any) => {
  if (!item.plannedDate) return 0;
  const planned = new Date(item.plannedDate);
  const now = new Date();
  
  if (now < planned) {
    return planned.getTime() - now.getTime();
  }
  return 0;
};


const formatDuration = (ms: number) => {
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}H ${minutes}M`;
  }
  return `${minutes}M`;
};

const renderTaskTile = (task: any) => {
  const delayMs = getTaskDelayMs(task);
  const timeLeftMs = getTaskTimeRemainingMs(task);
  
  const delayStr = formatDuration(delayMs);
  const timeLeftStr = formatDuration(timeLeftMs);
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + 
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const isActuallyLate = delayMs > 0;

  return (
    <div className="bg-white dark:bg-navy-900 rounded-[1.2rem] border-2 border-[#F0E6D2] dark:border-navy-800 p-3 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${
        isActuallyLate ? 'bg-rose-500' : task.actualDate ? 'bg-emerald-500' : 'bg-amber-500'
      }`} />
      
      <div className="flex flex-col gap-2">
        <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate px-1" title={task.title}>
          {task.title}
        </h4>
        
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Target</span>
            <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {formatDate(task.plannedDate)}
            </span>
          </div>

          <div className="flex flex-col items-end shrink-0 ml-2">
            {task.actualDate ? (
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Done at</span>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {formatDate(task.actualDate)}
                </span>
                {delayStr && (
                   <span className="mt-1 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md text-[9px] font-black border border-rose-100">
                      DELAYED: {delayStr}
                   </span>
                )}
              </div>
            ) : isActuallyLate ? (
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">Delaying</span>
                <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg text-[10px] font-black border border-rose-200 dark:border-rose-900/40">
                  {delayStr}
                </span>
              </div>
            ) : (
               <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">Time Left</span>
                <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-black border border-amber-100">
                  {timeLeftStr ?? 'ANY TIME'}
                </span>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const renderCategoryStatusSections = (tasks: any[], title: string, Icon: any, colorClass: string) => {
  const now = new Date();
  
  const pendingTasks = tasks.filter(t => !t.actualDate);
  
  const completedTasks = tasks.filter(t => {
    const delay = getTaskDelayMs(t);
    // Even 1ms late is late for the filter
    return t.actualDate && delay <= 0;
  });
  
  const delayedTasks = tasks.filter(t => {
    if (t.actualDate) {
      const delay = getTaskDelayMs(t);
      return delay > 0;
    }
    return false; // Pending late items are in the Pending column
  });



  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-navy-900 px-6 py-4 rounded-[1.8rem] border-[3px] border-[#F0E6D2] dark:border-navy-800 shadow-sm flex items-center gap-4">
         <div className={`p-2 rounded-xl ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('400', '950/30')} ${colorClass}`}>
            <Icon className="w-6 h-6" />
         </div>
         <h3 className={`font-black text-lg ${colorClass} uppercase tracking-widest`}>{title}</h3>
         <div className="ml-auto flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-black border border-amber-100">{pendingTasks.length} PEND</span>
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black border border-emerald-100">{completedTasks.length} DONE</span>
            <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black border border-rose-100">{delayedTasks.length} LATE</span>
         </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* PENDING COLUMN */}
        <div className="bg-[#FFF9E6]/30 dark:bg-navy-950/30 rounded-[2.2rem] p-5 border-[3px] border-[#F0E6D2] dark:border-navy-800 h-full flex flex-col min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 border-b-2 border-[#F0E6D2] dark:border-navy-800 pb-2">
            <ArrowPathIcon className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Pending Task</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {pendingTasks.length === 0 ? (
              <p className="text-[10px] text-gray-400 font-bold text-center py-6 italic uppercase">No Pending Tasks</p>
            ) : pendingTasks.map((t, idx) => (
              <div key={idx}>{renderTaskTile(t)}</div>
            ))}
          </div>
        </div>

        {/* COMPLETED COLUMN */}
        <div className="bg-[#FFF9E6]/30 dark:bg-navy-950/30 rounded-[2.2rem] p-5 border-[3px] border-[#F0E6D2] dark:border-navy-800 h-full flex flex-col min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 border-b-2 border-[#F0E6D2] dark:border-navy-800 pb-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Completed Task</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
             {completedTasks.length === 0 ? (
                <p className="text-[10px] text-gray-400 font-bold text-center py-6 italic uppercase">No On-Time Completions</p>
             ) : completedTasks.map((t, idx) => (
                <div key={idx}>{renderTaskTile(t)}</div>
             ))}
          </div>
        </div>

        {/* DELAYED COLUMN */}
        <div className="bg-[#FFF9E6]/30 dark:bg-navy-950/30 rounded-[2.2rem] p-5 border-[3px] border-rose-100 dark:border-rose-900/30 h-full flex flex-col min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 border-b-2 border-rose-100 dark:border-rose-900/30 pb-2">
            <ExclamationCircleIcon className="w-4 h-4 text-rose-500" />
            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Delayed Task</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
             {delayedTasks.length === 0 ? (
                <p className="text-[10px] text-gray-400 font-bold text-center py-6 italic uppercase">No Delayed Tasks</p>
             ) : delayedTasks.map((t, idx) => (
                <div key={idx}>{renderTaskTile(t)}</div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};// --- PDF Specific Components (Optimized for html-to-image) ---

const PDFReportHeader = ({ user, dateRange }: any) => {
  const weekNum = getISOWeekNumber(new Date(dateRange.from));
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  return (
    <div className="w-full bg-[#003875] p-5 flex items-center justify-between text-white mb-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#FFD500] rounded-lg flex items-center justify-center shrink-0 shadow-lg">
           <img 
            src="/logo_compact.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain"
           />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-none">ROBOTEK</h1>
          <p className="text-[9px] font-bold tracking-[0.2em] mt-1 text-blue-100 uppercase">Weekly MIS Performance Report</p>
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Week: {weekNum}</p>
        <p className="text-[10px] font-black uppercase tracking-tight mt-0.5">Range: {formatDate(dateRange.from)} to {formatDate(dateRange.to)}</p>
        <p className="text-[10px] font-black uppercase tracking-tight text-[#FFD500] mt-0.5">User: {user?.user?.username || 'N/A'}</p>
      </div>
    </div>
  );
};

const PDFTaskGrid = ({ tasks, title, colorClass }: any) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const pendingTasks = tasks.filter((t: any) => !t.actualDate && !t.isLate);
  const completedTasks = tasks.filter((t: any) => t.actualDate && !t.isLate);
  const delayedTasks = tasks.filter((t: any) => t.isLate);

  const renderTaskColumn = (taskList: any[], colTitle: string, colColor: string) => (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 flex flex-col h-full overflow-hidden">
      <div className={`px-3 py-1.5 border-b border-gray-100 ${colColor.replace('text-', 'bg-').replace('600', '50').replace('400', '50')} flex items-center justify-between shrink-0`}>
        <h4 className={`text-[9px] font-black uppercase tracking-widest ${colColor}`}>{colTitle}</h4>
        <span className="text-[8px] font-black text-gray-400 opacity-70">{taskList.length}</span>
      </div>
      <div className="p-1 space-y-[2px] overflow-hidden flex-1">
        {taskList.length === 0 ? (
          <p className="text-[8px] italic text-gray-300 py-4 text-center border-2 border-dashed border-gray-50 rounded-lg m-1">No tasks</p>
        ) : taskList.map((t, idx) => (
          <div key={idx} className="px-1.5 py-1 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <p className="text-[8px] font-black text-gray-900 leading-tight truncate uppercase mb-0.5">{t.title}</p>
            <div className="flex items-center justify-between gap-1 overflow-hidden">
               <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[6px] font-bold text-gray-400 uppercase tracking-tighter">TG:</span>
                  <span className="text-[7px] font-black text-gray-500 whitespace-nowrap">{formatDate(t.plannedDate)}</span>
               </div>
               {t.actualDate ? (
                 <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[6px] font-bold text-emerald-400 uppercase tracking-tighter">DN:</span>
                    <span className="text-[7px] font-black text-emerald-600 whitespace-nowrap">{formatDate(t.actualDate)}</span>
                 </div>
               ) : t.isLate && !t.actualDate ? (
                 <div className="flex items-center gap-1 shrink-0">
                   <span className="text-[6px] font-bold text-rose-400 uppercase tracking-tighter">DLY:</span>
                   <span className="text-[7px] font-black text-rose-500 whitespace-nowrap">{formatDuration(getTaskDelayMs(t))}</span>
                 </div>
               ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col h-full overflow-hidden mb-2">
      <div className={`px-4 py-2 border-b-2 border-gray-100 bg-gray-50/50 flex items-center gap-3 mb-3 rounded-xl shrink-0`}>
         <div className={`w-1.5 h-4 rounded-full ${colorClass.replace('text-', 'bg-')}`} />
         <h3 className={`font-black text-[11px] ${colorClass} uppercase tracking-widest`}>{title}</h3>
         <span className="ml-auto text-[8px] font-black text-gray-400 uppercase tracking-widest">{tasks.length} Total</span>
      </div>
      
      <div className="flex items-start gap-3 flex-1 h-[0] overflow-hidden">
         {renderTaskColumn(pendingTasks, "Pending", "text-amber-600")}
         {renderTaskColumn(completedTasks, "Completed", "text-emerald-600")}
         {renderTaskColumn(delayedTasks, "Delayed", "text-rose-600")}
      </div>
    </div>
  );
};

const PDFHiddenReport = ({ user, dateRange, userTrendData, isNegativeMode, calculateDelayHours, pageRefs }: any) => {
  if (!user) return null;

  return (
    <div className="fixed left-[-9999px] top-0 pointer-events-none bg-[#FFFDF2]">
      {/* Page 1: Dashboard Summary - Using "every corner" */}
      <div ref={pageRefs.page1} ref-id="pdf-page-1" className="w-[794px] h-[1123px] p-4 flex flex-col bg-[#FFFDF2] overflow-hidden">
        <PDFReportHeader user={user} dateRange={dateRange} />
        
        {/* Profile Card Overlay - Compact */}
        <div className="bg-white rounded-xl border-2 border-[#003875]/10 shadow-lg p-4 flex flex-row items-center gap-4 relative shrink-0 mb-4">
           <div className="absolute top-0 left-0 w-1.5 h-full bg-[#003875]" />
           <div className="w-12 h-12 rounded-xl bg-[#003875] flex items-center justify-center text-white font-black text-xl shrink-0">
              {user.user.username.charAt(0).toUpperCase()}
           </div>
           <div className="w-40 shrink-0">
              <h2 className="text-lg font-black text-[#003875] uppercase truncate">{user.user.username}</h2>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{user.user.roleName}</p>
           </div>
           <div className="flex gap-4 px-4 border-l border-r border-gray-100 shrink-0">
              <div className="text-center">
                 <p className="text-[7px] font-black text-gray-400 uppercase mb-0.5">Total</p>
                 <p className="text-xl font-black text-[#003875] tracking-tight">{user.total}</p>
              </div>
              <div className="text-center">
                 <p className="text-[7px] font-black text-emerald-400 uppercase mb-0.5">Done</p>
                 <p className="text-xl font-black text-emerald-500 tracking-tight">{user.completed}</p>
              </div>
           </div>
           <div className="flex gap-4 px-2 items-center flex-1 justify-end">
              <div className="w-24 flex flex-col items-center">
                 <SemiCircleGauge value={user.score} isNegative={isNegativeMode} />
                 <span className="text-[7px] font-black uppercase text-[#003875] -translate-y-2">Efficiency %</span>
              </div>
              <div className="w-24 flex flex-col items-center">
                 <SemiCircleGauge value={user.onTimeRate} isNegative={isNegativeMode} />
                 <span className="text-[7px] font-black uppercase text-[#003875] -translate-y-2">Accuracy %</span>
              </div>
           </div>
        </div>

        {/* Breakdown & Trend Chart Wrapper - High Density */}
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
           <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 shrink-0">
              <h3 className="text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest border-b pb-2">Category Performance Breakdown</h3>
              <div className="flex items-center justify-around w-full mt-3">
                {[
                  { label: 'Delegations', stats: user.delegationStats, color: 'text-orange-500', icon: DocumentTextIcon },
                  { label: 'Checklists', stats: user.checklistStats, color: 'text-emerald-500', icon: ClipboardDocumentListIcon },
                  { label: 'O2D FMS Jobs', stats: user.o2dStats, color: 'text-blue-500', icon: ShoppingBagIcon }
                ].map((cat, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                     <div className="flex items-center gap-1.5">
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                        <span className="text-[8px] font-black text-gray-700 uppercase">{cat.label}</span>
                     </div>
                     <span className={`text-lg font-black ${cat.stats.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isNegativeMode ? cat.stats.score - 100 : cat.stats.score}%
                     </span>
                  </div>
                ))}
              </div>
           </div>
           
           <div className="w-full h-full bg-white rounded-xl border border-gray-100 shadow-sm p-2 flex items-center justify-center min-h-[300px] flex-1">
              <ScoreTrendChart 
                data={userTrendData} 
                granularity={'week'} 
                isNegative={isNegativeMode}
                isPrint={true}
              />
           </div>
        </div>
      </div>

      {/* Page 2: Delegations - Using 3 Column Grid */}
      <div ref={pageRefs.page2} ref-id="pdf-page-2" className="w-[794px] h-[1123px] p-4 flex flex-col bg-[#FFFDF2] overflow-hidden">
        <PDFReportHeader user={user} dateRange={dateRange} />
        <PDFTaskGrid tasks={user.delegationStats?.items || []} title="Delegations Snapshot" colorClass="text-orange-600" />
      </div>

      {/* Page 3: Checklists - Using 3 Column Grid */}
      <div ref={pageRefs.page3} ref-id="pdf-page-3" className="w-[794px] h-[1123px] p-4 flex flex-col bg-[#FFFDF2] overflow-hidden">
        <PDFReportHeader user={user} dateRange={dateRange} />
        <PDFTaskGrid tasks={user.checklistStats?.items || []} title="Checklists Snapshot" colorClass="text-emerald-600" />
      </div>

      {/* Page 4: O2D Jobs - Using 3 Column Grid */}
      <div ref={pageRefs.page4} ref-id="pdf-page-4" className="w-[794px] h-[1123px] p-4 flex flex-col bg-[#FFFDF2] overflow-hidden">
        <PDFReportHeader user={user} dateRange={dateRange} />
        <PDFTaskGrid tasks={user.o2dStats?.items || []} title="O2D FMS Jobs Snapshot" colorClass="text-blue-600" />
      </div>
    </div>
  );
};

const UserDrilldownContent = ({ user, dateRange, chartGranularity, onGranularityChange, calculateDelayHours, isNegativeMode, reportRef }: any) => {
  const userAllItems = useMemo(() => {
    if (!user) return [];
    return [
      ...(user.delegationStats?.items || []),
      ...(user.checklistStats?.items || []),
      ...(user.o2dStats?.items || []),
    ];
  }, [user]);

  // Page Refs for PDF generation
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);
  const page4Ref = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const userTrendData = useMemo(() => {
    const to = new Date(dateRange.to);
    const from = new Date(to);
    if (chartGranularity === 'week') {
      from.setDate(to.getDate() - 70); // 10 weeks
    } else if (chartGranularity === 'month') {
      from.setMonth(to.getMonth() - 10); // 10 months
    } else if (chartGranularity === 'day') {
      from.setDate(to.getDate() - 10); // 10 days
    }
    return generateTrendData(userAllItems, { from: from.toISOString().split('T')[0], to: dateRange.to }, chartGranularity);
  }, [userAllItems, dateRange.to, chartGranularity]);

  const delayedCount = useMemo(() => userAllItems.filter((i: any) => i.isLate).length, [userAllItems]);
  const delayStats = useMemo(() => calculateDelayHours(userAllItems), [userAllItems, calculateDelayHours]);
  const pendingCount = user.total - user.completed;

  return (
    <div ref={reportRef} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 bg-[#FFFDF2] p-4 rounded-[2rem]">
      
      {/* Hidden PDF Container for high-fidelity capture */}
      <PDFHiddenReport 
        user={user} 
        dateRange={dateRange} 
        userTrendData={userTrendData} 
        isNegativeMode={isNegativeMode} 
        calculateDelayHours={calculateDelayHours}
        pageRefs={{ page1: page1Ref, page2: page2Ref, page3: page3Ref, page4: page4Ref }}
      />

      {/* Profile Header Card */}
      <div className="bg-[#FFFDF2] dark:bg-navy-900 rounded-[2rem] border-2 border-[#003875]/20 dark:border-[#FFD500]/20 shadow-lg p-3 md:p-5 flex flex-col xl:flex-row items-center xl:items-stretch gap-4 relative overflow-visible">
         <div className="absolute top-0 left-0 w-2 h-full bg-[#003875] dark:bg-[#FFD500] rounded-l-[2rem]" />
         
         {/* Avatar & Name */}
         <div data-pdf-section="profile-header" className="flex items-center gap-4 xl:w-64 max-w-sm shrink-0 pl-2 xl:pr-6 xl:border-r border-[#F0E6D2] dark:border-navy-800 pt-2">
            <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-[#003875] to-blue-700 dark:from-[#FFD500] dark:to-yellow-500 shadow-md flex items-center justify-center text-white dark:text-black font-black text-2xl shrink-0">
               {user.user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
               <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{user.user.username}</h2>
               <div className="px-2.5 py-1 bg-[#F0E6D2]/50 dark:bg-navy-800 rounded-lg text-[9px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest mt-1.5 inline-block">
                  {user.user.roleName}
               </div>
            </div>
         </div>

         {/* Numerical Stats */}
         <div data-pdf-section="numerical-stats" className="flex-1 flex flex-wrap items-center justify-center xl:justify-around gap-4 xl:gap-6 w-full py-2">
            <div className="flex flex-col items-center min-w-[70px]">
               <ClipboardDocumentListIcon className="w-6 h-6 mb-2 text-[#003875] dark:text-[#FFD500]" />
               <p className="text-[10px] font-black text-[#003875]/60 dark:text-[#FFD500]/70 uppercase tracking-widest mb-1.5">Total</p>
               <p className="text-4xl font-black text-[#003875] dark:text-[#FFD500] leading-none">{user.total}</p>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
               <CheckCircleIcon className="w-6 h-6 mb-2 text-emerald-500" />
               <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1.5">Done</p>
               <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{user.completed}</p>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
               <ArrowPathIcon className="w-6 h-6 mb-2 text-amber-500" />
               <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1.5">Pending</p>
               <p className="text-4xl font-black text-amber-600 dark:text-amber-400 leading-none">{pendingCount}</p>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
               <ClockIcon className="w-6 h-6 mb-2 text-rose-500" />
               <p className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest mb-1.5">Delayed</p>
               <p className="text-4xl font-black text-rose-600 dark:text-rose-400 leading-none">{delayedCount}</p>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
               <ClockIcon className="w-6 h-6 mb-2 text-red-500" />
               <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mb-1.5">Total Hrs</p>
               <p className="text-4xl font-black text-red-600 dark:text-red-400 leading-none">{delayStats.total}</p>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
               <ClockIcon className="w-6 h-6 mb-2 text-rose-400" />
               <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Avg Hrs</p>
               <p className="text-4xl font-black text-rose-500 dark:text-rose-300 leading-none">{delayStats.avg}</p>
            </div>
         </div>

          {/* Gauges */}
          <div data-pdf-section="gauges" className="flex items-center justify-center gap-6 md:gap-12 shrink-0 xl:pl-8 xl:border-l border-[#F0E6D2] dark:border-navy-800 w-full xl:w-auto mt-4 xl:mt-0 pt-4 xl:pt-0">
             <div className="w-36 md:w-44 flex flex-col items-center group">
                <SemiCircleGauge value={user.score} isNegative={isNegativeMode} />
                <div className="bg-white dark:bg-navy-950 px-4 py-2 rounded-xl border-2 border-[#F0E6D2] dark:border-navy-800 text-[11px] font-black text-[#003875] dark:text-[#FFD500] shadow-sm uppercase tracking-widest mt-0 relative z-10 -translate-y-2">
                   Score %
                </div>
             </div>
             <div className="w-36 md:w-44 flex flex-col items-center group">
                <SemiCircleGauge value={user.onTimeRate} isNegative={isNegativeMode} />
                <div className="bg-white dark:bg-navy-950 px-4 py-2 rounded-xl border-2 border-[#F0E6D2] dark:border-navy-800 text-[11px] font-black text-[#003875] dark:text-[#FFD500] shadow-sm uppercase tracking-widest mt-0 relative z-10 -translate-y-2">
                   On-Time %
                </div>
             </div>
          </div>
      </div>


       {/* ROW 1: 30% Short Table | 70% Trend Chart */}
       <div className="flex flex-col lg:flex-row gap-6">
          <div data-pdf-section="breakdown" className="w-full lg:w-[30%] bg-white dark:bg-navy-900 rounded-[2rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm overflow-hidden flex flex-col">
             <div className="p-4 border-b border-[#F0E6D2] dark:border-navy-800 bg-[#FFF9E6]/50 dark:bg-navy-950/50">
                <h3 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-[#FFD500]" /> Category Breakdown
                </h3>
             </div>
             <div className="flex-1 p-4 flex flex-col justify-center">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-[#F0E6D2] dark:border-navy-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="pb-3 text-left">Category</th>
                      <th className="pb-3 text-center">Score %</th>
                      <th className="pb-3 text-center">On-Time %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E6D2] dark:divide-navy-800 text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300">
                    <tr>
                      <td className="py-4 flex items-center gap-2 font-black text-xs uppercase text-gray-900 dark:text-white"><DocumentTextIcon className="w-5 h-5 text-orange-500 shrink-0"/> Delegations</td>
                      <td className={`py-4 text-center font-black ${user.delegationStats?.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? user.delegationStats?.score - 100 : user.delegationStats?.score || 0}%</td>
                      <td className={`py-4 text-center font-black ${user.delegationStats?.onTimeRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? user.delegationStats?.onTimeRate - 100 : user.delegationStats?.onTimeRate || 0}%</td>
                    </tr>
                    <tr>
                      <td className="py-4 flex items-center gap-2 font-black text-xs uppercase text-gray-900 dark:text-white"><ClipboardDocumentListIcon className="w-5 h-5 text-emerald-500 shrink-0"/> Checklists</td>
                      <td className={`py-4 text-center font-black ${user.checklistStats?.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? user.checklistStats?.score - 100 : user.checklistStats?.score || 0}%</td>
                      <td className={`py-4 text-center font-black ${user.checklistStats?.onTimeRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? user.checklistStats?.onTimeRate - 100 : user.checklistStats?.onTimeRate || 0}%</td>
                    </tr>
                    <tr>
                      <td className="py-4 flex items-center gap-2 font-black text-xs uppercase text-gray-900 dark:text-white"><ShoppingBagIcon className="w-5 h-5 text-blue-500 shrink-0"/> O2D FMS Jobs</td>
                      <td className={`py-4 text-center font-black ${user.o2dStats?.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? user.o2dStats?.score - 100 : user.o2dStats?.score || 0}%</td>
                      <td className={`py-4 text-center font-black ${user.o2dStats?.onTimeRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? user.o2dStats?.onTimeRate - 100 : user.o2dStats?.onTimeRate || 0}%</td>
                    </tr>

                  </tbody>
                </table>
             </div>
          </div>
         <div data-pdf-section="chart" className="w-full lg:w-[70%] bg-[#FFFDF2] dark:bg-navy-900 rounded-[2rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm p-4 relative min-h-[350px] flex flex-col justify-center">
            <ScoreTrendChart 
               data={userTrendData} 
               granularity={chartGranularity} 
               onGranularityChange={onGranularityChange}
               isNegative={isNegativeMode}
            />

         </div>
       </div>

       <div className="space-y-12">
          <div data-pdf-section="history-delegations">
            {renderCategoryStatusSections(
              user.delegationStats?.items || [], 
              "Delegations History", 
              DocumentTextIcon, 
              "text-orange-600"
            )}
          </div>
          
          <div data-pdf-section="history-checklists">
            {renderCategoryStatusSections(
              user.checklistStats?.items || [], 
              "Checklists History", 
              ClipboardDocumentListIcon, 
              "text-emerald-600"
            )}
          </div>
          
          <div data-pdf-section="history-o2d">
            {renderCategoryStatusSections(
              user.o2dStats?.items || [], 
              "O2D FMS Jobs History", 
              ShoppingBagIcon, 
              "text-blue-600"
            )}
          </div>
       </div>
    </div>
  );
};

const CategoryDrilldownContent = ({ catData, label, onBack, isNegativeMode }: any) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Category Header Card */}
      <div className="bg-[#FFFDF2] dark:bg-navy-900 rounded-[2rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-2 h-full bg-[#FFD500] dark:bg-[#003875]" />
         
         <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{label}</h2>
            <div className="px-3 py-1 bg-[#F0E6D2]/50 dark:bg-navy-800 rounded-lg text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2 inline-block">
               Company-Wide Breakdown
            </div>
         </div>
         <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex-1 bg-white dark:bg-navy-950 p-4 rounded-2xl border border-[#F0E6D2] dark:border-navy-800 text-center min-w-[120px]">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efficiency Score</p>
               <p className={`text-3xl font-black ${catData.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? catData.score - 100 : catData.score}%</p>
            </div>
            <div className="flex-1 bg-white dark:bg-navy-950 p-4 rounded-2xl border border-[#F0E6D2] dark:border-navy-800 text-center min-w-[120px]">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">On-Time Accuracy</p>
               <p className={`text-3xl font-black ${catData.onTimeRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{isNegativeMode ? catData.onTimeRate - 100 : catData.onTimeRate}%</p>
            </div>
         </div>

      </div>
      {/* Task List - Generic Section Grid */}
      {renderCategoryStatusSections(catData.items, `${label} Breakdown`, ListBulletIcon, "text-[#003875]")}
    </div>
  );
};

// --- Main Page Component ---

export default function ScorePage() {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <ScorePageContent />
    </Suspense>
  );
}

function ScorePageContent() {
  const searchParams = useSearchParams();
  const isPrintMode = searchParams.get('print') === 'true';

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [viewSetting, setViewSetting] = useState<'user' | 'category'>('user');
  const [filterType, setFilterType] = useState<'week' | 'month' | 'custom' | 'tillDate'>('month');
  const [searchTerm, setSearchTerm] = useState("");
  const [chartGranularity, setChartGranularity] = useState<'day' | 'week' | 'month' | 'quarterly' | 'yearly'>('week');
  const [isNegativeMode, setIsNegativeMode] = useState(true);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!selectedUserId) return;
    
    // Find the current user data
    const userToPrint = (data?.users || []).find((u: any) => u.user.id === selectedUserId);
    if (!userToPrint) return;

    setIsGeneratingPDF(true);
    // @ts-ignore
    const toastId = (window as any).toast?.loading?.("Generating High-Fidelity MIS Report...");
    
    try {
      // Initialize Portrait A4 PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const captureAndAddPage = async (ref: any, pageNum: number) => {
        if (!ref.current) return;
        
        const canvas = await htmlToImage.toCanvas(ref.current, {
           quality: 1,
           pixelRatio: 2,
           backgroundColor: '#FFFDF2'
        });
        
        const imgData = canvas.toDataURL('image/png');
        if (pageNum > 1) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      };

      // Select refs from the DOM (they are hidden in PDFHiddenReport)
      // Since they are inside UserDrilldownContent, they exist when user is selected
      const p1 = document.querySelector('[ref-id="pdf-page-1"]') as any;
      const p2 = document.querySelector('[ref-id="pdf-page-2"]') as any;
      const p3 = document.querySelector('[ref-id="pdf-page-3"]') as any;
      const p4 = document.querySelector('[ref-id="pdf-page-4"]') as any;

      // We need a small delay to ensure everything is rendered in the hidden container
      await new Promise(r => setTimeout(r, 800));

      // Capture sequential pages
      await captureAndAddPage({ current: document.querySelector('[ref-id="pdf-page-1"]') }, 1);
      await captureAndAddPage({ current: document.querySelector('[ref-id="pdf-page-2"]') }, 2);
      await captureAndAddPage({ current: document.querySelector('[ref-id="pdf-page-3"]') }, 3);
      await captureAndAddPage({ current: document.querySelector('[ref-id="pdf-page-4"]') }, 4);

      pdf.save(`Robotek_MIS_${userToPrint.user.username}.pdf`);
      
      // @ts-ignore
      (window as any).toast?.success?.("Report generated successfully!");
    } catch (error: any) {
       console.error("PDF Generation Error:", error);
       // @ts-ignore
       (window as any).toast?.error?.(`Report generation failed: ${error?.message || 'Unknown error'}`);
    } finally {
       setIsGeneratingPDF(false);
       if (toastId) (window as any).toast?.dismiss?.(toastId);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  
  const [dateRange, setDateRange] = useState<{from: string, to: string}>(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { 
      from: first.toISOString().split('T')[0], 
      to: last.toISOString().split('T')[0] 
    };
  });

  // Active drill-down targets
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'delegationStats' | 'checklistStats' | 'o2dStats'>('delegationStats');

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

  // Reset drill-downs when view mode changes
  useEffect(() => {
    setSelectedUserId(null);
    setSelectedCategoryId(null);
  }, [viewSetting]);

  const { data, error, isLoading } = useSWR(
    `/api/score?from=${dateRange.from}&to=${dateRange.to}&type=${filterType}`, 
    fetcher, 
    { refreshInterval: 120000 }
  );

  const users = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter((u: any) => 
      viewSetting === 'user' ? u.user.username.toLowerCase().includes(searchTerm.toLowerCase()) : true
    ).sort((a: any, b: any) => b.score - a.score);
  }, [data, searchTerm, viewSetting]);

  const calculateDelayHours = (items: any[]) => {
    let delayMs = 0;
    let delayedCount = 0;
    const now = new Date();
    items.forEach(item => {
      if (!item.plannedDate) return;
      const planned = new Date(item.plannedDate);
      if (isNaN(planned.getTime())) return;
      
      let itemDelayMs = 0;
      if (item.actualDate) {
        const actual = new Date(item.actualDate);
        if (actual > planned) itemDelayMs = actual.getTime() - planned.getTime();
      } else {
        if (now > planned) itemDelayMs = now.getTime() - planned.getTime();
      }
      
      if (itemDelayMs > 0) {
        delayMs += itemDelayMs;
        delayedCount++;
      }
    });

    return {
      total: Math.round(delayMs / 3600000),
      avg: delayedCount > 0 ? Math.round((delayMs / delayedCount) / 3600000) : 0
    };
  };



  const companyStats = useMemo(() => {
    if (!users.length) return null;
    
    // Determine allowed categories for aggregation based on view & search
    const activeCategories = [
      { label: 'Delegations', id: 'delegationStats' },
      { label: 'Checklists', id: 'checklistStats' },
      { label: 'O2D FMS Jobs', id: 'o2dStats' }
    ];
    
    const allowedCategories = viewSetting === 'category' 
      ? activeCategories.filter(c => c.label.toLowerCase().includes(searchTerm.toLowerCase())).map(c => c.id)
      : ['delegationStats', 'checklistStats', 'o2dStats'];

    const stats = {
      user: { id: 'COMPANY', username: 'COMPANY OVERALL', roleName: 'ROBOTEK SYSTEM' },
      completed: 0, total: 0, score: 0, totalDelayHours: 0,
      onTime: 0, onTimeRate: 0,
      delegationStats: { completed: 0, total: 0, score: 0, onTime: 0, onTimeRate: 0, items: [] as any[] },
      checklistStats: { completed: 0, total: 0, score: 0, onTime: 0, onTimeRate: 0, items: [] as any[] },
      o2dStats: { completed: 0, total: 0, score: 0, onTime: 0, onTimeRate: 0, items: [] as any[] }
    };

    users.forEach((u: any) => {
      // For overall company totals, ONLY sum from the allowed categories
      if (allowedCategories.includes('delegationStats')) {
        stats.completed += u.delegationStats.completed;
        stats.total += u.delegationStats.total;
        stats.onTime += u.delegationStats.onTime;
        stats.delegationStats.completed += u.delegationStats.completed;
        stats.delegationStats.total += u.delegationStats.total;
        stats.delegationStats.onTime += u.delegationStats.onTime;
        stats.delegationStats.items.push(...u.delegationStats.items);
      }

      if (allowedCategories.includes('checklistStats')) {
        stats.completed += u.checklistStats.completed;
        stats.total += u.checklistStats.total;
        stats.onTime += u.checklistStats.onTime;
        stats.checklistStats.completed += u.checklistStats.completed;
        stats.checklistStats.total += u.checklistStats.total;
        stats.checklistStats.onTime += u.checklistStats.onTime;
        stats.checklistStats.items.push(...u.checklistStats.items);
      }

      if (allowedCategories.includes('o2dStats')) {
        stats.completed += u.o2dStats.completed;
        stats.total += u.o2dStats.total;
        stats.onTime += u.o2dStats.onTime;
        stats.o2dStats.completed += u.o2dStats.completed;
        stats.o2dStats.total += u.o2dStats.total;
        stats.o2dStats.onTime += u.o2dStats.onTime;
        stats.o2dStats.items.push(...u.o2dStats.items);
      }
    });

    stats.score = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    stats.onTimeRate = stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : 0;
    
    stats.delegationStats.score = stats.delegationStats.total > 0 ? Math.round((stats.delegationStats.completed / stats.delegationStats.total) * 100) : 0;
    stats.delegationStats.onTimeRate = stats.delegationStats.completed > 0 ? Math.round((stats.delegationStats.onTime / stats.delegationStats.completed) * 100) : 0;

    stats.checklistStats.score = stats.checklistStats.total > 0 ? Math.round((stats.checklistStats.completed / stats.checklistStats.total) * 100) : 0;
    stats.checklistStats.onTimeRate = stats.checklistStats.completed > 0 ? Math.round((stats.checklistStats.onTime / stats.checklistStats.completed) * 100) : 0;

    stats.o2dStats.score = stats.o2dStats.total > 0 ? Math.round((stats.o2dStats.completed / stats.o2dStats.total) * 100) : 0;
    stats.o2dStats.onTimeRate = stats.o2dStats.completed > 0 ? Math.round((stats.o2dStats.onTime / stats.o2dStats.completed) * 100) : 0;

    const delayStats = calculateDelayHours([
      ...stats.delegationStats.items,
      ...stats.checklistStats.items,
      ...stats.o2dStats.items
    ]);
    stats.totalDelayHours = delayStats.avg;


    return stats;
  }, [users, viewSetting, searchTerm]);

  // --- Chart: bucket creation + client-side aggregation from filtered users ---
  const chartData = useMemo(() => {
    if (!users.length) return [];

    // Determine which categories to include based on search (if in category view)
    const activeCategories = [
      { label: 'Delegations', id: 'delegationStats' },
      { label: 'Checklists', id: 'checklistStats' },
      { label: 'O2D FMS Jobs', id: 'o2dStats' }
    ];
    
    // In category view, filter categories by search term
    const allowedCategories = viewSetting === 'category' 
      ? activeCategories.filter(c => c.label.toLowerCase().includes(searchTerm.toLowerCase())).map(c => c.id)
      : ['delegationStats', 'checklistStats', 'o2dStats']; // User view includes all mapped from filtered users

    // Collect all items from filtered users/categories
    const allItems: any[] = [];
    users.forEach((u: any) => {
      if (allowedCategories.includes('delegationStats')) allItems.push(...u.delegationStats.items);
      if (allowedCategories.includes('checklistStats')) allItems.push(...u.checklistStats.items);
      if (allowedCategories.includes('o2dStats')) allItems.push(...u.o2dStats.items);
    });

    return generateTrendData(allItems, dateRange, chartGranularity);
  }, [users, dateRange, chartGranularity, viewSetting, searchTerm]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  const renderTaskTable = (tasks: any[]) => (
    <div className="overflow-hidden border border-[#F0E6D2] dark:border-navy-800 rounded-xl bg-white dark:bg-navy-900 shadow-sm">
      <table className="w-full text-left text-[10px]">
        <thead>
          <tr className="bg-[#FFF9E6] dark:bg-navy-950 border-b border-[#F0E6D2] dark:border-navy-800 text-gray-400 font-black uppercase tracking-widest">
            <th className="px-3 py-2">Task</th>
            <th className="px-2 py-2 text-center">Status</th>
            <th className="px-3 py-2 text-right">Target</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0E6D2] dark:divide-navy-800 font-bold text-gray-700 dark:text-gray-300">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-center italic text-gray-400">No tasks found</td>
            </tr>
          ) : tasks.map((task, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 text-left">
                <p className="truncate max-w-[150px] uppercase font-black text-gray-900 dark:text-white" title={task.title}>{task.title}</p>
              </td>
              <td className="px-2 py-2 text-center text-[9px] uppercase font-black">
                <span className={
                  task.isLate ? 'text-rose-500' : 
                  task.actualDate ? 'text-emerald-500' : 
                  'text-amber-500'
                }>
                  {task.isLate ? 'Late' : task.actualDate ? 'Done' : 'Pend'}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-gray-400 font-black">
                {task.plannedDate ? new Date(task.plannedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Override selection if userId is in URL (for Puppeteer)
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) setSelectedUserId(userId);
    const catId = searchParams.get('catId');
    if (catId) setSelectedCategoryId(catId);
    
    // Set custom date if provided
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    if (from && to) {
      setDateRange({ from, to });
      if (type) setFilterType(type as any);
      else setFilterType('custom');
    }

    if (isPrintMode) {
      document.body.classList.add('print-mode');
    }
    return () => document.body.classList.remove('print-mode');
  }, [searchParams, isPrintMode]);

  if (isPrintMode) {
    return (
      <div className="bg-white min-h-screen p-8 print-mode overflow-visible">
          {/* Branded Print Header */}
          <div className="flex items-center justify-between mb-8 border-b-4 border-[#003875] pb-4">
             <div>
                <h1 className="text-3xl font-black text-[#003875] uppercase tracking-tight">Robotek Industries</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Weekly MIS Performance Analytics</p>
             </div>
             <div className="text-right">
                <div className="px-3 py-1 bg-[#003875] text-[#FFD500] text-[9px] font-black uppercase tracking-widest rounded-md mb-2 inline-block">
                   Official Scorecard
                </div>
                <p className="text-[10px] font-black uppercase text-gray-300">Reporting Period</p>
                <p className="text-sm font-black text-[#003875]">{dateRange.from} to {dateRange.to}</p>
             </div>
          </div>

         {selectedUserId && (
            <UserDrilldownContent 
              user={(data?.users || []).find((u: any) => u.user.id === selectedUserId)}
              dateRange={dateRange}
              chartGranularity={chartGranularity}
              onGranularityChange={setChartGranularity}
              calculateDelayHours={calculateDelayHours}
              isNegativeMode={isNegativeMode}
              reportRef={reportRef}
            />
          )}
          {selectedCategoryId && companyStats && (
            <CategoryDrilldownContent 
              catData={(companyStats as any)[selectedCategoryId]}
              label={selectedCategoryId === 'delegationStats' ? 'Delegations' : selectedCategoryId === 'checklistStats' ? 'Checklists' : 'O2D FMS Jobs'}
              isNegativeMode={isNegativeMode}
            />
          )}

          {/* Branded Print Footer */}
          <div className="mt-16 pt-6 border-t border-gray-100 flex justify-between items-center">
             <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">© {new Date().getFullYear()} Robotek ERP - Confidential Analytics Report</p>
             <div className="flex items-center gap-4">
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">System Verify: OK</p>
                <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                   <div className="w-full h-full bg-emerald-400" />
                </div>
             </div>
          </div>
      </div>
    );
  }

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
              placeholder={viewSetting === 'user' ? "Search user..." : "Search category..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 bg-transparent outline-none font-bold text-[10px] transition-all uppercase"
            />
          </div>
          <div className="relative" ref={filterDropdownRef}>
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="bg-[#FFFDF2] dark:bg-navy-900 px-4 py-2 rounded-xl border-2 border-[#F0E6D2] dark:border-navy-800 flex items-center justify-between gap-3 shadow-sm hover:border-[#003875]/30 transition-all min-w-[140px]"
            >
              <div className="flex items-center gap-2">
                {filterType === 'tillDate' ? <ClockIcon className="w-4 h-4 text-[#003875] dark:text-[#FFD500]" /> : <CalendarDaysIcon className="w-4 h-4 text-[#003875] dark:text-[#FFD500]" />}
                <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                  {filterType === 'week' ? 'Week' : filterType === 'month' ? 'Month' : filterType === 'custom' ? 'Custom' : 'Till Date'}
                </span>
              </div>
              <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-[#FFFDF2] dark:bg-navy-900 border-2 border-[#F0E6D2] dark:border-navy-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {[
                  { id: 'week', label: 'Week', icon: <CalendarDaysIcon className="w-3.5 h-3.5" /> },
                  { id: 'month', label: 'Month', icon: <CalendarDaysIcon className="w-3.5 h-3.5" /> },
                  { id: 'custom', label: 'Custom', icon: <CalendarDaysIcon className="w-3.5 h-3.5" /> },
                  { id: 'tillDate', label: 'Till Date', icon: <ClockIcon className="w-3.5 h-3.5" /> }
                ].map(btn => {
                  const isActive = filterType === btn.id;
                  return (
                    <button 
                      key={btn.id}
                      onClick={() => {
                        setFilterType(btn.id as any);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#FFF9E6] dark:hover:bg-white/5 transition-colors ${
                        isActive ? 'text-[#003875] dark:text-[#FFD500] bg-[#FFF9E6]/50 dark:bg-white/5' : 'text-gray-400'
                      }`}
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            )}
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

          {/* Negative Mode Toggle - Circle Button */}
          <div className="flex items-center">
             <button 
              onClick={() => setIsNegativeMode(!isNegativeMode)}
              title={isNegativeMode ? "Switch to Positive Mode" : "Switch to Negative Mode"}
              className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-90 border-2 ${
                isNegativeMode 
                  ? 'bg-rose-600 border-rose-400 text-white ring-4 ring-rose-500/20' 
                  : 'bg-emerald-600 border-emerald-400 text-white ring-4 ring-emerald-500/20'
              }`}
             >
               <ExclamationCircleIcon className="w-6 h-6 stroke-[2.5]" />
             </button>
          </div>
           {/* View Selection Toggle (User / Category) */}
           <div className="bg-[#FFFDF2] dark:bg-navy-900 p-0.5 rounded-xl border-2 border-[#F0E6D2] dark:border-navy-800 flex shadow-sm transition-all overflow-hidden mr-2">
              <button 
               onClick={() => setViewSetting('user')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewSetting === 'user' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                By User
              </button>
              <button 
               onClick={() => setViewSetting('category')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewSetting === 'category' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                By Category
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

            {selectedUserId && (
             <div className="flex items-center">
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  title={isGeneratingPDF ? "Generating Report..." : "Download MIS Report (PDF)"}
                  className={`w-10 h-10 rounded-xl bg-[#FFFDF2] dark:bg-navy-900 border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm flex items-center justify-center text-[#003875] dark:text-[#FFD500] hover:bg-[#FFF9E6] dark:hover:bg-white/5 hover:scale-105 transition-all group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGeneratingPDF ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowDownTrayIcon className="w-5 h-5 stroke-[2.5] group-hover:animate-bounce" />
                  )}
                </button>
             </div>
            )}
        </div>
      </div>

      {/* Back to Dashboard Button - Outside profile cards */}
      {(selectedUserId || selectedCategoryId) && (
        <div className="px-4">
          <button 
            onClick={() => { setSelectedUserId(null); setSelectedCategoryId(null); }}
            className="group flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest hover:translate-x-[-4px] transition-all bg-white dark:bg-navy-900 px-4 py-2.5 rounded-[1.2rem] border-2 border-[#003875]/10 dark:border-navy-800 shadow-sm"
          >
            <ChevronLeftIcon className="w-4 h-4 stroke-[3]" />
            Back to Dashboard
          </button>
        </div>
      )}


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
          {selectedUserId || selectedCategoryId ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {selectedUserId && (
                  <UserDrilldownContent 
                    user={(data?.users || []).find((u: any) => u.user.id === selectedUserId)}
                    dateRange={dateRange}
                    chartGranularity={chartGranularity}
                    onGranularityChange={setChartGranularity}
                    calculateDelayHours={calculateDelayHours}
                    isNegativeMode={isNegativeMode}
                    reportRef={reportRef}
                  />
                )}
                {selectedCategoryId && companyStats && (
                  <CategoryDrilldownContent 
                    catData={(companyStats as any)[selectedCategoryId]}
                    label={selectedCategoryId === 'delegationStats' ? 'Delegations' : selectedCategoryId === 'checklistStats' ? 'Checklists' : 'O2D FMS Jobs'}
                    isNegativeMode={isNegativeMode}
                  />
                )}

            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
              {/* Company Overall Tile */}
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
                   </div>
                   <div className="p-3 space-y-3 flex-1">
                      <section>
                         <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/10" />
                            Global Metrics
                         </h4>
                         <div className="space-y-0.5">
                            <ScoreRow label="Combined Score" completed={companyStats.completed} total={companyStats.total} percentage={companyStats.score} isNegative={isNegativeMode} />
                            <ScoreRow label="Combined Accuracy" completed={companyStats.onTime} total={companyStats.completed} percentage={companyStats.onTimeRate} isNegative={isNegativeMode} />
                         </div>
                      </section>
                      {/* Bottom Section: Gauge + Delay Hours */}
                      <div className="pt-2 border-t border-[#F0E6D2] dark:border-navy-800/50 flex-1 flex flex-row items-end pb-2 px-1 gap-2 relative">
                         {/* Average Gauge */}
                         <div className="flex-1 w-full min-w-0">
                            <SemiCircleGauge value={Math.round((companyStats.score + companyStats.onTimeRate) / 2)} isNegative={isNegativeMode} />
                         </div>
                         
                         {/* Average Delayed Hours Indicator (Floating Top Right) */}
                         <div className="absolute top-3 right-3 flex flex-col items-end opacity-90 drop-shadow-sm cursor-help" title="Average delay per delayed task">
                            <div className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                               <ClockIcon className="w-4 h-4 text-rose-500" />
                               <span className="text-xl font-black leading-none tracking-tighter">
                                  {companyStats.totalDelayHours}
                               </span>
                            </div>
                            <div className="text-[7.5px] font-black text-gray-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                               Avg Delay Hrs
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* Score Trend Chart (Spans remaining cols) */}
              {companyStats && (
                <div className="md:col-span-1 xl:col-span-3 bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#003875]/20 dark:border-[#FFD500]/20 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden ring-4 ring-[#003875]/5 dark:ring-[#FFD500]/5 min-h-[180px]">
                   <ScoreTrendChart data={chartData} granularity={chartGranularity} onGranularityChange={setChartGranularity} isNegative={isNegativeMode} />
                </div>
              )}

              {/* User or Category View */}
              {viewSetting === 'user' ? (
                /* User Tiles */
                users.map((item: any) => {
                  return (
                    <div key={item.user.id} className="group bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden flex flex-col cursor-pointer" onClick={() => setSelectedUserId(item.user.id)}>
                      {/* Tile Header */}
                      <div className="p-3 border-b border-[#F0E6D2] dark:border-navy-800/50 bg-[#FFF9E6]/50 dark:bg-navy-950/30">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#003875] to-blue-700 dark:from-[#FFD500] dark:to-yellow-500 shadow-md flex items-center justify-center text-white dark:text-black font-black text-sm shrink-0">
                                  {item.user.username.charAt(0).toUpperCase()}
                               </div>
                               <div className="min-w-0">
                                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase truncate max-w-[100px] leading-tight group-hover:text-[#003875] dark:group-hover:text-[#FFD500] transition-colors">{item.user.username}</h3>
                                  <div className="px-1.5 py-0.5 bg-[#F0E6D2]/50 dark:bg-navy-800 rounded-md text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter mt-0.5 inline-block">
                                     {item.user.roleName}
                                  </div>
                               </div>
                            </div>
                            
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-navy-800 border-2 border-[#F0E6D2] dark:border-navy-700 shadow-sm group-hover:scale-110 group-hover:border-[#003875]/20 dark:group-hover:border-[#FFD500]/20 transition-all">
                               <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-[#003875] dark:group-hover:text-[#FFD500]" />
                            </div>
                         </div>
                      </div>

                      {/* Metrics Body */}
                      <div className="p-3 space-y-3 flex-1">
                         <section className="group-hover:-translate-y-0.5 transition-transform duration-300">
                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/10" />
                               Overall Stats
                            </h4>
                            <div className="space-y-0.5">
                               <ScoreRow label="Completed / Total" completed={item.completed} total={item.total} percentage={item.score} isNegative={isNegativeMode} />
                               <ScoreRow label="On Time / Completed" completed={item.onTime} total={item.completed} percentage={item.onTimeRate} isNegative={isNegativeMode} />
                            </div>
                         </section>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Category Tiles (Aggregated & Filtered by Search) */
                companyStats && [
                  { label: 'Delegations', id: 'delegationStats', icon: <DocumentTextIcon className="w-6 h-6" />, color: 'text-orange-500', bg: 'from-orange-100/50 via-orange-50/50 to-transparent dark:from-orange-900/40' },
                  { label: 'Checklists', id: 'checklistStats', icon: <ClipboardDocumentListIcon className="w-6 h-6" />, color: 'text-emerald-500', bg: 'from-emerald-100/50 via-emerald-50/50 to-transparent dark:from-emerald-900/40' },
                  { label: 'O2D FMS Jobs', id: 'o2dStats', icon: <ShoppingBagIcon className="w-6 h-6" />, color: 'text-blue-500', bg: 'from-blue-100/50 via-blue-50/50 to-transparent dark:from-blue-900/40' }
                ].filter(cat => cat.label.toLowerCase().includes(searchTerm.toLowerCase())).map(cat => {
                  const data = (companyStats as any)[cat.id];
                  return (
                    <div key={cat.id} className="group bg-[#FFFDF2] dark:bg-navy-900 rounded-[1.5rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden flex flex-col cursor-pointer" onClick={() => setSelectedCategoryId(cat.id)}>
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
                         <ScoreRow label="Overall Efficiency" completed={data.completed} total={data.total} percentage={data.score} isNegative={isNegativeMode} />
                         <ScoreRow label="Overall Compliance" completed={data.onTime} total={data.completed} percentage={data.onTimeRate} isNegative={isNegativeMode} />
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
                                 <span className={item.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{isNegativeMode ? item.score - 100 : item.score}%</span>
                              </div>
                           </td>
                           <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center justify-center p-1.5 rounded-xl bg-[#FFF9E6] dark:bg-navy-950 font-black text-xs w-14">
                                 <span className={item.onTimeRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{isNegativeMode ? item.onTimeRate - 100 : item.onTimeRate}%</span>
                              </div>
                           </td>
                           {['delegationStats', 'checklistStats', 'o2dStats'].map(catId => {
                             const cat = item[catId];
                             return (
                               <td key={catId} className="px-6 py-4 text-center">
                                  <button 
                                    onClick={() => { setSelectedUserId(item.user.id); setActiveTab(catId as any); }}
                                    className="inline-flex flex-col items-center hover:scale-110 transition-transform disabled:opacity-30 disabled:hover:scale-100"
                                    disabled={cat.total === 0}
                                  >
                                     <span className="text-[10px] font-black text-gray-900 dark:text-white">{isNegativeMode ? cat.score - 100 : cat.score}%</span>
                                     <div className="w-10 h-1 bg-gray-100 dark:bg-navy-800 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-[#FFD500]" style={{ width: `${isNegativeMode ? 100 - cat.score : cat.score}%` }} />
                                     </div>
                                  </button>
                               </td>
                             );
                           })}
                           <td className="px-8 py-4 text-right">
                              <div className="inline-flex items-center gap-3">
                                 <div className="text-right">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{isNegativeMode ? item.finalScore - 100 : item.finalScore}%</p>
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
    </div>
  );
}
