"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface DateRange {
  from: string;
  to: string;
}

interface PremiumDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
  allowPast?: boolean;
}

export default function PremiumDateRangePicker({ 
  value, 
  onChange, 
  label,
  allowPast = true
}: PremiumDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Internal view state (months currently displayed)
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = value.from ? new Date(value.from) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const rightMonth = useMemo(() => {
    return new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
  }, [leftMonth]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    if (!value.from || (value.from && value.to)) {
      // Start a new range
      onChange({ from: dateStr, to: dateStr });
    } else {
      // Complete the range
      if (dateStr < value.from) {
        onChange({ from: dateStr, to: value.from });
      } else {
        onChange({ from: value.from, to: dateStr });
      }
    }
  };

  const isSelected = (dateStr: string) => dateStr === value.from || dateStr === value.to;
  const isInRange = (dateStr: string) => value.from && value.to && dateStr > value.from && dateStr < value.to;

  const renderCalendar = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
      <div className="flex-1 min-w-[260px]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest px-2">
            {monthName} {year}
          </h4>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {blanks.map(b => <div key={`b-${b}`} className="h-8" />)}
          {days.map(d => {
            const date = new Date(year, month, d);
            const dateStr = date.toISOString().split('T')[0];
            const selected = isSelected(dateStr);
            const inRange = isInRange(dateStr);
            const isStart = dateStr === value.from;
            const isEnd = dateStr === value.to;
            const today = new Date().toISOString().split('T')[0];

            return (
              <button
                key={d}
                type="button"
                onClick={() => handleDateClick(date)}
                className={`
                  h-8 text-[11px] font-bold transition-all relative z-10
                  ${selected ? "bg-[#003875] text-white" : inRange ? "bg-[#003875]/10 text-[#003875]" : "hover:bg-gray-100/50"}
                  ${isStart ? "rounded-l-lg" : ""}
                  ${isEnd ? "rounded-r-lg" : ""}
                  ${!isStart && !isEnd && selected ? "rounded-lg" : ""}
                  ${dateStr === today && !selected ? "text-rose-500 font-black" : ""}
                `}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#FFFDF2] dark:bg-navy-900 border-2 border-[#F0E6D2] dark:border-navy-800 rounded-xl px-4 py-2 flex items-center gap-3 cursor-pointer shadow-sm hover:border-[#003875]/20 group transition-all"
      >
        <CalendarDaysIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {formatDate(value.from)}
          </span>
          <span className="text-gray-300 font-bold">-</span>
          <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {formatDate(value.to)}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 bg-white dark:bg-navy-900 border-2 border-[#F0E6D2] dark:border-navy-800 rounded-[2rem] shadow-2xl p-6 z-[200] flex flex-col gap-6 min-w-[580px]"
          >
             <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Select Analysis Range</h3>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full"><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
             </div>

             <div className="flex gap-8 items-start relative">
                {/* Navigation Arrows */}
                <button onClick={handlePrevMonth} className="absolute -left-2 top-0 p-2 hover:bg-gray-100 rounded-lg transition-all z-20"><ChevronLeftIcon className="w-5 h-5 text-gray-400" /></button>
                <button onClick={handleNextMonth} className="absolute -right-2 top-0 p-2 hover:bg-gray-100 rounded-lg transition-all z-20"><ChevronRightIcon className="w-5 h-5 text-gray-400" /></button>

                {renderCalendar(leftMonth)}
                <div className="w-[1px] bg-gray-100 self-stretch" />
                {renderCalendar(rightMonth)}
             </div>

             <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                   {[
                     { label: 'Today', days: 0 },
                     { label: 'Last 7 Days', days: 7 },
                     { label: 'Last 30 Days', days: 30 },
                     { label: 'This Month', type: 'month' }
                   ].map(s => (
                     <button 
                      key={s.label}
                      onClick={() => {
                        const end = new Date();
                        let start = new Date();
                        if (s.type === 'month') {
                          start = new Date(end.getFullYear(), end.getMonth(), 1);
                        } else {
                          start.setDate(end.getDate() - (s.days as number));
                        }
                        onChange({ from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] });
                      }}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-[9px] font-black text-gray-500 uppercase transition-all"
                     >
                       {s.label}
                     </button>
                   ))}
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-[#003875] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-900 transition-all"
                >
                  Apply Range
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
