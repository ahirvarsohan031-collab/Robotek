"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  ArrowDownTrayIcon
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
};

const UserDrilldownContent = ({ user, dateRange, chartGranularity, onGranularityChange, calculateDelayHours, onBack, isNegativeMode }: any) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const userAllItems = useMemo(() => {
    if (!user) return [];
    return [
      ...(user.delegationStats?.items || []),
      ...(user.checklistStats?.items || []),
      ...(user.o2dStats?.items || []),
    ];
  }, [user]);

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

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    // @ts-ignore
    const toastId = (window as any).toast?.loading?.("Preparing Multi-page MIS Report...");
    
    try {
      // 1. Capture the entire element at high quality
      const canvas = await htmlToImage.toCanvas(reportRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#FFFDF2',
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const headerHeight = 28; // mm
      const footerHeight = 10; // mm
      const margin = 10; // mm
      const contentWidth = pageWidth - (margin * 2);
      const contentHeightPerPage = pageHeight - headerHeight - footerHeight - (margin * 1);

      // Convert canvas to mm scale to find total height
      const imgProps = pdf.getImageProperties(canvas.toDataURL('image/png'));
      const pxToMmRatio = contentWidth / imgProps.width;
      const totalContentHeightMm = imgProps.height * pxToMmRatio;
      
      const totalPages = Math.ceil(totalContentHeightMm / contentHeightPerPage);
      const weekNo = getISOWeekNumber(new Date(dateRange.from));

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage('landscape');

        // --- 2. Add Branded Header (Every Page) ---
        pdf.setFillColor(0, 56, 117); // Navy #003875
        pdf.rect(0, 0, pageWidth, headerHeight - 3, 'F');

        // Logo Overlay
        try {
          const logo = new Image();
          logo.src = '/logo_compact.png';
          pdf.addImage(logo, 'PNG', 10, 5, 14, 14);
        } catch (e) {}

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("ROBOTEK", 28, 12);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text("WEEKLY MIS PERFORMANCE REPORT", 28, 17);

        // Metadata (Right Side)
        pdf.setFontSize(8);
        pdf.text(`WEEK: ${weekNo}`, pageWidth - 10, 10, { align: 'right' });
        pdf.text(`RANGE: ${dateRange.from} TO ${dateRange.to}`, pageWidth - 10, 14, { align: 'right' });
        pdf.text(`USER: ${user.user.username.toUpperCase()}`, pageWidth - 10, 18, { align: 'right' });

        // --- 3. Add Content Slice ---
        // Slicing logic: We capture the whole thing and "window" it in jsPDF
        // We use the canvas object directly for the best slicing fidelity
        const sourceY = (i * contentHeightPerPage) / pxToMmRatio;
        const sourceHeight = contentHeightPerPage / pxToMmRatio;
        
        // We use the sourceX, sourceY, etc. params of addImage
        pdf.addImage(
          canvas, 
          'PNG', 
          margin, 
          headerHeight, 
          contentWidth, 
          contentHeightPerPage,
          undefined, // alias
          'FAST', // compression
          0, // rotation
        );

        // Manual "Cover up" to simulate slicing if the above doesn't crop (it doesn't in some jsPDF versions)
        // A better way is to use a temporary canvas for the slice
        // Let's create a slice canvas for absolute precision
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(sourceHeight, canvas.height - sourceY);
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
           const sliceData = sliceCanvas.toDataURL('image/png');
           
           // Clear the full image add we did above (actually we'll just not do it or draw over it)
           // Actually, let's just do the slice and add it correctly.
           pdf.setFillColor(255, 253, 242); // Cream bg #FFFDF2
           pdf.rect(margin, headerHeight, contentWidth, contentHeightPerPage, 'F');
           
           const sliceMmHeight = (sliceCanvas.height * pxToMmRatio);
           pdf.addImage(sliceData, 'PNG', margin, headerHeight, contentWidth, sliceMmHeight);
        }

        // --- 4. Footer & Page Numbers ---
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(7);
        pdf.text(`© ${new Date().getFullYear()} ROBOTEK INDUSTRIES - CONFIDENTIAL MIS REPORT`, margin, pageHeight - 5);
        pdf.text(`Page ${i + 1} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      }

      // Save PDF
      pdf.save(`Robotek_MIS_Report_${user.user.username}_W${weekNo}.pdf`);
      // @ts-ignore
      (window as any).toast?.success?.("Report Downloaded!");
    } catch (error) {
       console.error("PDF Export Error:", error);
       // @ts-ignore
       (window as any).toast?.error?.("Failed to generate PDF");
    } finally {
       if (toastId) (window as any).toast?.dismiss?.(toastId);
    }
  };

  return (
    <div ref={reportRef} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 bg-[#FFFDF2] p-4 rounded-[2rem]">
      {/* Profile Header Card */}
      <div className="bg-[#FFFDF2] dark:bg-navy-900 rounded-[2rem] border-2 border-[#003875]/20 dark:border-[#FFD500]/20 shadow-lg p-3 md:p-5 flex flex-col xl:flex-row items-center xl:items-stretch gap-4 relative overflow-visible">
         <div className="absolute top-0 left-0 w-2 h-full bg-[#003875] dark:bg-[#FFD500] rounded-l-[2rem]" />
         
         {/* Back Button - Absolute Top Left */}
         <button 
            onClick={onBack}
            className="absolute top-4 left-6 z-20 group flex items-center gap-1.5 text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest hover:translate-x-[-2px] transition-all bg-white/50 dark:bg-navy-950/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-[#003875]/10"
          >
            <ChevronLeftIcon className="w-3 h-3 stroke-[3]" />
            Back to Dashboard
          </button>

         {/* Avatar & Name */}
         <div className="flex items-center gap-4 xl:w-64 max-w-sm shrink-0 pl-2 xl:pr-6 xl:border-r border-[#F0E6D2] dark:border-navy-800 pt-6 xl:pt-2">
            <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-[#003875] to-blue-700 dark:from-[#FFD500] dark:to-yellow-500 shadow-md flex items-center justify-center text-white dark:text-black font-black text-2xl shrink-0">
               {user.user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
               <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{user.user.username}</h2>
               <div className="px-2.5 py-1 bg-[#F0E6D2]/50 dark:bg-navy-800 rounded-lg text-[9px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest mt-1.5 inline-block">
                  {user.user.roleName}
               </div>
            </div>
            
            {/* PDF Report Generation Button */}
            <div className="ml-4 shrink-0">
               <button 
                onClick={handleDownloadPDF}
                title="Download MIS Report (PDF)"
                className="w-10 h-10 rounded-xl bg-white dark:bg-navy-950 border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm flex items-center justify-center text-[#003875] dark:text-[#FFD500] hover:bg-[#FFF9E6] dark:hover:bg-white/5 hover:scale-105 transition-all group active:scale-95"
               >
                 <ArrowDownTrayIcon className="w-5 h-5 stroke-[2.5] group-hover:animate-bounce" />
               </button>
            </div>
         </div>

         {/* Numerical Stats */}
         <div className="flex-1 flex flex-wrap items-center justify-center xl:justify-around gap-4 xl:gap-6 w-full py-2">
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
          <div className="flex items-center justify-center gap-6 md:gap-12 shrink-0 xl:pl-8 xl:border-l border-[#F0E6D2] dark:border-navy-800 w-full xl:w-auto mt-4 xl:mt-0 pt-4 xl:pt-0">
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
          <div className="w-full lg:w-[30%] bg-white dark:bg-navy-900 rounded-[2rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm overflow-hidden flex flex-col">
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
         <div className="w-full lg:w-[70%] bg-[#FFFDF2] dark:bg-navy-900 rounded-[2rem] border-2 border-[#F0E6D2] dark:border-navy-800 shadow-sm p-4 relative min-h-[350px] flex flex-col justify-center">
            <ScoreTrendChart 
               data={userTrendData} 
               granularity={chartGranularity} 
               onGranularityChange={onGranularityChange}
               isNegative={isNegativeMode}
            />

         </div>
       </div>

       {/* ROW 2: 3-column Status Sections per Category */}
       <div className="space-y-12">
          {renderCategoryStatusSections(
            user.delegationStats?.items || [], 
            "Delegations History", 
            DocumentTextIcon, 
            "text-orange-600"
          )}
          
          {renderCategoryStatusSections(
            user.checklistStats?.items || [], 
            "Checklists History", 
            ClipboardDocumentListIcon, 
            "text-emerald-600"
          )}
          
          {renderCategoryStatusSections(
            user.o2dStats?.items || [], 
            "O2D FMS Jobs History", 
            ShoppingBagIcon, 
            "text-blue-600"
          )}
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
         
         <button 
            onClick={onBack}
            className="absolute top-4 left-6 z-20 group flex items-center gap-1.5 text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest hover:translate-x-[-2px] transition-all bg-white/50 dark:bg-navy-950/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-[#003875]/10"
          >
            <ChevronLeftIcon className="w-3 h-3 stroke-[3]" />
            Back to Dashboard
          </button>

         <div className="min-w-0 flex-1 pt-6 md:pt-2">
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [viewSetting, setViewSetting] = useState<'user' | 'category'>('user');
  const [filterType, setFilterType] = useState<'week' | 'month' | 'custom' | 'tillDate'>('month');
  const [searchTerm, setSearchTerm] = useState("");
  const [chartGranularity, setChartGranularity] = useState<'day' | 'week' | 'month' | 'quarterly' | 'yearly'>('week');
  const [isNegativeMode, setIsNegativeMode] = useState(true);

  
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

          {/* Date Range Controls - Pill Style */}
          <div className="bg-[#FFFDF2] dark:bg-navy-900 p-0.5 rounded-2xl border-2 border-[#F0E6D2] dark:border-navy-800 flex shadow-sm">
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
          {selectedUserId || selectedCategoryId ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {selectedUserId && (
                  <UserDrilldownContent 
                    user={(data?.users || []).find((u: any) => u.user.id === selectedUserId)}
                    dateRange={dateRange}
                    chartGranularity={chartGranularity}
                    onGranularityChange={setChartGranularity}
                    calculateDelayHours={calculateDelayHours}
                    onBack={() => { setSelectedUserId(null); setSelectedCategoryId(null); }}
                    isNegativeMode={isNegativeMode}
                  />
                )}
                {selectedCategoryId && companyStats && (
                  <CategoryDrilldownContent 
                    catData={(companyStats as any)[selectedCategoryId]}
                    label={selectedCategoryId === 'delegationStats' ? 'Delegations' : selectedCategoryId === 'checklistStats' ? 'Checklists' : 'O2D FMS Jobs'}
                    onBack={() => { setSelectedUserId(null); setSelectedCategoryId(null); }}
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
