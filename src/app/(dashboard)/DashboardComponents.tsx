"use client";

import { 
  UsersIcon, 
  UserMinusIcon, 
  MapPinIcon, 
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CakeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SemiCircleGauge from "@/components/SemiCircleGauge";
import { useState, useEffect } from "react";

// --- ROW 1 COMPONENTS ---

export function CompactWelcome({ firstName, role }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#003875] to-[#011a35] p-5 text-white shadow-xl min-h-[140px] flex flex-col justify-center border-b-4 border-[#FFD500]/20"
    >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[#FFD500]/10 rounded-full blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#FFD500] text-[#003875] px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
            <SparklesIcon className="w-2 h-2" /> System Active
          </span>
          <span className="text-[8px] font-bold text-blue-200/60 uppercase tracking-widest">Robotek ERP</span>
        </div>
        <h1 className="text-2xl font-black tracking-tighter leading-none mb-1 uppercase">
          WELCOME,<br/>
          <span className="text-[#FFD500]">{firstName}</span>
        </h1>
        <p className="text-[10px] font-extrabold text-[#FFD500] uppercase tracking-widest opacity-80 mt-1">{role} MODE</p>
      </div>
    </motion.div>
  );
}

export function CompactScore({ score, total, label, isNegative = false }: any) {
    // If negative, display = score - 100
    const displayValue = isNegative ? score - 100 : score;
    
    return (
        <div className="bg-white dark:bg-navy-800 p-2 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center whitespace-nowrap">{label}</p>
            <div className="w-full h-24 mt-[-10px]">
                <SemiCircleGauge value={score} isNegative={isNegative} total={total} label="" />
            </div>
            {/* Override the display value if needed, but SemiCircleGauge handles it now */}
        </div>
    );
}

export function CompactBirthdayCard({ birthdays }: any) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-4 rounded-[2rem] shadow-lg border border-white/10 relative overflow-hidden h-full flex flex-col justify-center text-white min-h-[140px]">
      <div className="absolute top-0 right-0 p-2 opacity-10 transform rotate-12 scale-125">
        <CakeIcon className="w-16 h-16" />
      </div>
      <div className="relative z-10">
        <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-3">Today's Birthdays</p>
        
        {birthdays && birthdays.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex -space-x-3 overflow-hidden cursor-pointer" onClick={() => setShowAll(true)}>
              {birthdays.slice(0, 3).map((b: any, i: number) => (
                <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white/20 bg-indigo-500 flex items-center justify-center text-sm font-black overflow-hidden bg-cover bg-center" style={b.image ? {backgroundImage: `url(${b.image})`} : {}}>
                  {!b.image && b.username.charAt(0)}
                </div>
              ))}
              {birthdays.length > 3 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-gray-800 text-[10px] font-black text-white">
                  +{birthdays.length - 3}
                </div>
              )}
            </div>
            <button onClick={() => setShowAll(true)} className="text-[8px] font-black text-[#FFD500] uppercase tracking-widest hover:underline animate-pulse">Celebration List ({birthdays.length})</button>
          </div>
        ) : (
          <p className="text-[10px] font-bold text-white/70 uppercase">No occasions today</p>
        )}
      </div>

      <AnimatePresence>
        {showAll && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAll(false)}
          >
            <motion.div 
                className="bg-white dark:bg-navy-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <CakeIcon className="w-8 h-8 animate-bounce" />
                        <h3 className="text-xl font-black uppercase tracking-tighter">Celebrants Today!</h3>
                    </div>
                    <button onClick={() => setShowAll(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                    {birthdays.map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white text-xl font-black overflow-hidden bg-cover bg-center ring-4 ring-[#FFD500]/20" style={b.image ? {backgroundImage: `url(${b.image})`} : {}}>
                                {!b.image && b.username.charAt(0)}
                            </div>
                            <div>
                                <p className="font-black text-gray-900 dark:text-white uppercase leading-none">{b.username}</p>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{b.role}</p>
                            </div>
                            <div className="ml-auto">
                                <span className="p-2 bg-pink-50 dark:bg-pink-950/30 text-pink-500 rounded-full flex items-center justify-center">🎂</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-navy-950/50 text-center border-t border-gray-100 dark:border-white/5">
                   <p className="text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest animate-pulse">Team Robotek Wishes You A Happy Birthday!</p>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CompactPartyBirthdayCard({ partyBirthdays }: any) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-[2rem] shadow-lg border border-white/10 relative overflow-hidden h-full flex flex-col justify-center text-white min-h-[140px]">
      <div className="absolute top-0 right-0 p-2 opacity-10 transform -rotate-12 scale-125">
        <SparklesIcon className="w-16 h-16" />
      </div>
      <div className="relative z-10">
        <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-3">Party Birthdays</p>
        
        {partyBirthdays && partyBirthdays.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex -space-x-3 overflow-hidden cursor-pointer" onClick={() => setShowAll(true)}>
              {partyBirthdays.slice(0, 3).map((b: any, i: number) => (
                <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white/20 bg-orange-400 flex items-center justify-center text-sm font-black overflow-hidden bg-cover bg-center text-white">
                  {b.partyName.charAt(0)}
                </div>
              ))}
              {partyBirthdays.length > 3 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-gray-800 text-[10px] font-black text-white">
                  +{partyBirthdays.length - 3}
                </div>
              )}
            </div>
            <button onClick={() => setShowAll(true)} className="text-[8px] font-black text-[#003875] uppercase tracking-widest hover:underline animate-pulse">Celebration List ({partyBirthdays.length})</button>
          </div>
        ) : (
          <p className="text-[10px] font-bold text-white/70 uppercase">No occasions today</p>
        )}
      </div>

      <AnimatePresence>
        {showAll && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAll(false)}
          >
            <motion.div 
                className="bg-white dark:bg-navy-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-8 h-8 animate-bounce" />
                        <h3 className="text-xl font-black uppercase tracking-tighter">Party Celebrants!</h3>
                    </div>
                    <button onClick={() => setShowAll(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                    {partyBirthdays.map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-orange-400 flex items-center justify-center text-white text-xl font-black overflow-hidden bg-cover bg-center ring-4 ring-[#003875]/20">
                                {b.partyName.charAt(0)}
                            </div>
                            <div>
                                <p className="font-black text-gray-900 dark:text-white uppercase leading-none">{b.partyName}</p>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{b.partyType}</p>
                            </div>
                            <div className="ml-auto">
                                <span className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center">🎉</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-navy-950/50 text-center border-t border-gray-100 dark:border-white/5">
                   <p className="text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest animate-pulse">Team Robotek Wishes A Happy Birthday!</p>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ROW 2 COMPONENTS ---

export function StatusTile({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white dark:bg-navy-800 p-4 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-[90px]">
            <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">{value}</h3>
            </div>
            <div className={`${bg} ${color} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    );
}

export function QuickActionSquare({ label, href, icon: Icon, color }: any) {
    return (
        <Link href={href} className="group flex flex-col items-center justify-center bg-white dark:bg-navy-800 p-3 rounded-[1.5rem] border border-gray-100 dark:border-white/5 hover:border-[#003875] dark:hover:border-[#FFD500] transition-all hover:shadow-md h-[90px]">
            <div className={`${color} p-2.5 rounded-xl text-white mb-1.5 group-hover:scale-110 transition-transform shadow-lg`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tight text-center leading-none">{label}</span>
        </Link>
    );
}

export function HighightedCalendar({ history, leaveDates = [], avgIn, avgOut }: { history: any[], leaveDates?: string[], avgIn: string, avgOut: string }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const normalizeDate = (dStr: string) => {
    if (!dStr) return '';
    return dStr.split('T')[0];
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-navy-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm h-[302px] flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Personal Presence</h3>
                <span className="text-xs font-black text-[#003875] dark:text-[#FFD500] uppercase">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-1 gap-x-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="flex justify-center items-center h-7 w-7 text-[9px] font-black text-gray-300">{d}</div>
            ))}
            {Array.from({ length: 42 }).map((_, i) => {
              const day = i - startDay + 1;
              const isCurrentMonth = day > 0 && day <= daysInMonth;
              if (!isCurrentMonth) return <div key={i} className="h-7 w-7" />;
              
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const record = history?.find(h => normalizeDate(h.date) === dateStr);
              const isOnLeave = leaveDates.includes(dateStr);
              const isToday = dateStr === todayStr;
              
              let bgColor = 'hover:bg-gray-100 dark:hover:bg-white/5';
              let textColor = 'text-gray-600 dark:text-gray-400';
              
              if (record?.inTime) {
                bgColor = 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105';
                textColor = 'text-white';
              } else if (isOnLeave) {
                bgColor = 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-110';
                textColor = 'text-white';
              } else if (dateStr < todayStr && (new Date(dateStr).getDay() !== 0)) {
                bgColor = 'bg-rose-500/80 text-white';
                textColor = 'text-white';
              }

              if (isToday && !record?.inTime && !isOnLeave) {
                 bgColor = 'border-2 border-[#003875] dark:border-[#FFD500] text-[#003875] dark:text-[#FFD500]';
              }

              return (
                <div key={i} className="flex justify-center items-center h-7 w-7">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${bgColor} ${textColor}`}>
                      {day}
                    </div>
                </div>
              );
            })}
          </div>
      </div>

      <div className="lg:w-32 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-white/5 pt-4 lg:pt-0 lg:pl-6 space-y-4">
            <div className="text-center lg:text-left">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60">Success Rates</p>
                <div>
                   <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Avg In</p>
                   <p className="text-lg font-black text-emerald-500 tracking-tighter leading-none">{avgIn || '--:--'}</p>
                </div>
            </div>
            <div className="text-center lg:text-left">
                <div>
                   <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Avg Out</p>
                   <p className="text-lg font-black text-rose-500 tracking-tighter leading-none">{avgOut || '--:--'}</p>
                </div>
            </div>
            <div className="flex gap-2 justify-center lg:justify-start pt-2 border-t border-gray-50 dark:border-white/5">
                <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   <span className="text-[6px] font-bold text-gray-400">Work</span>
                </div>
                <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                   <span className="text-[6px] font-bold text-gray-400">Leave</span>
                </div>
            </div>
      </div>
    </div>
  );
}

// --- ROW 3 COMPONENTS ---

export function UpcomingMeetingsPanel({ meetings, teamMembers }: { meetings: any[], teamMembers: any[] }) {
    if (!meetings || meetings.length === 0) {
        return (
            <div className="bg-white dark:bg-navy-800 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm h-[302px] flex flex-col items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Meetings Scheduled</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-navy-800 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm h-[302px] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/1">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
                        <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Schedule</h3>
                        <p className="text-xs font-black text-[#003875] dark:text-white uppercase tracking-tight">Upcoming Meetings</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto invisible-scrollbar p-3 space-y-2">
                {meetings.map((m: any, i: number) => {
                    const startRaw = m.start_time;
                    const d = new Date(startRaw);
                    const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const end = new Date(m.end_time);
                    const endTimeString = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const todayStr = new Date().toISOString().split('T')[0];
                    const meetingDateStr = d.toISOString().split('T')[0];
                    const isToday = todayStr === meetingDateStr;

                    const attendeesRaw = m.attendees || [];
                    const attendeesList = Array.isArray(attendeesRaw) ? attendeesRaw : attendeesRaw.split(',');
                    const creatorMatch = teamMembers?.find(t => t.username === m.created_by);

                    return (
                        <div key={i} className="p-4 rounded-[1.5rem] bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all flex items-center gap-3 group">
                            
                            {/* Creator Avatar */}
                            <div className="flex-shrink-0 relative" title={`Created by ${m.created_by}`}>
                               <div className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-navy-800 bg-[#FFD500] flex items-center justify-center text-xs font-black text-[#003875] bg-cover bg-center shadow-md shadow-[#FFD500]/20" style={creatorMatch?.image_url ? {backgroundImage: `url(${creatorMatch.image_url})`} : {}}>
                                  {!creatorMatch?.image_url && (m.created_by ? m.created_by.charAt(0).toUpperCase() : '?')}
                               </div>
                               <div className="absolute -bottom-1 -right-1 bg-white dark:bg-navy-800 rounded-full p-px">
                                 <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <span className="text-[6px] text-white font-black">★</span>
                                 </div>
                               </div>
                            </div>

                            {/* Meeting Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1.5 truncate">{m.title}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {isToday ? (
                                        <span className="text-[8px] font-black bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Today</span>
                                    ) : (
                                        <span className="text-[8px] font-black bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-widest">{d.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    )}
                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <ClockIcon className="w-3 h-3 text-gray-400" />
                                        {timeString} - {endTimeString}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Attendees Stack */}
                            <div className="flex -space-x-2 overflow-hidden flex-shrink-0 relative z-0">
                                {attendeesList.slice(0, 3).map((u: string, idx: number) => {
                                    const match = teamMembers?.find(t => t.username === u.trim());
                                    return (
                                        <div key={idx} className="relative z-10 hover:z-20 inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-navy-800 bg-indigo-500 flex items-center justify-center text-[9px] font-black text-white bg-cover bg-center transition-transform hover:scale-110 shadow-sm" style={match?.image_url ? {backgroundImage: `url(${match.image_url})`} : {}}>
                                            {!match?.image_url && u.trim().charAt(0).toUpperCase()}
                                        </div>
                                    )
                                })}
                                {attendeesList.length > 3 && (
                                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-navy-800 bg-gray-800 text-[8px] font-black text-white">
                                        +{attendeesList.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- ROW 4 COMPONENTS ---

export function CompactTable({ title, icon: Icon, data, columns, linkHref }: any) {
    return (
        <div className="bg-white dark:bg-navy-800 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-[280px]">
            <div className="p-4 border-b border-gray-50 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/1">
                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#003875] dark:text-[#FFD500]" />
                    {title}
                </h3>
                {linkHref && (
                    <Link href={linkHref} className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-[#003875] dark:hover:text-[#FFD500]">Master View</Link>
                )}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white dark:bg-navy-800 z-10 shadow-sm">
                        <tr className="border-b border-gray-50 dark:border-white/5">
                            {columns.map((col: any, i: number) => (
                                <th key={i} className={`p-3 text-[8px] font-black text-gray-400 uppercase tracking-widest ${col.className}`}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="p-8 text-center text-[10px] font-bold text-gray-300 uppercase italic">Synchronization Pending...</td>
                            </tr>
                        ) : data.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/1 transition-colors group">
                                {columns.map((col: any, j: number) => (
                                    <td key={j} className={`p-3 text-[10px] font-bold text-gray-700 dark:text-gray-300 ${col.className}`}>
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- ROW 4 COMPONENTS (MODALS & OVERLAYS) ---

export function BirthdayCelebrationModal({ birthdays, partyBirthdays, currentUser }: { birthdays: any[], partyBirthdays?: any[], currentUser: string }) {
  const [show, setShow] = useState(false);

  const allCelebrants = [
    ...(birthdays || []).map((b: any) => ({ ...b, type: 'user' })),
    ...(partyBirthdays || []).map((p: any) => ({ username: p.partyName, role: p.partyType, image: null, type: 'party' }))
  ];

  useEffect(() => {
    if (allCelebrants.length > 0) {
      setShow(true);
    }
  }, [birthdays, partyBirthdays]);

  const handleClose = () => {
    setShow(false);
  };

  const isMyBirthday = birthdays?.some((b: any) => b.username === currentUser);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
           onClick={handleClose}
        >
           {/* Bottom Screen Firecrackers */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center">
              {[...Array(35)].map((_, i) => {
                  const startX = `${Math.random() * 120 - 60}vw`;
                  const peakY = `-${Math.random() * 30 + 10}vh`;
                  const endX = `${Math.random() * 120 - 60}vw`;
                  return (
                    <motion.div 
                      key={i}
                      initial={{ y: "110vh", x: startX, scale: Math.random() * 0.6 + 0.4 }}
                      animate={{ 
                         y: ["110vh", peakY, "110vh"], 
                         x: [startX, endX, endX],
                         rotate: [0, Math.random() * 1080 - 540] 
                      }}
                      transition={{ 
                        duration: 3.5 + Math.random() * 3, 
                        ease: "easeOut", 
                        delay: Math.random() * 1.5, 
                        repeat: Infinity, 
                        repeatDelay: Math.random() * 2 
                      }}
                      className="absolute bottom-0 text-5xl md:text-7xl select-none"
                    >
                      {["🎈", "🎊", "🎉", "✨", "💥", "🥳", "🙌", "👏"][Math.floor(Math.random() * 8)]}
                    </motion.div>
                  );
              })}
           </div>

           <motion.div
             initial={{ scale: 0.5, y: 50, opacity: 0 }}
             animate={{ scale: 1, y: 0, opacity: 1 }}
             exit={{ scale: 0.8, y: 20, opacity: 0 }}
             transition={{ type: "spring", damping: 15, stiffness: 100 }}
             onClick={e => e.stopPropagation()}
             className="relative bg-transparent p-4 md:p-8 max-w-4xl w-full text-center flex flex-col items-center z-10 max-h-[95vh] overflow-y-auto invisible-scrollbar"
           >
              <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-6 mt-2">
                 {allCelebrants.map((b, i) => (
                    <motion.div 
                      key={i} 
                      className="flex flex-col items-center group relative"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                    >
                       <div className="absolute inset-0 bg-[#FFD500] blur-3xl opacity-20 rounded-full"></div>
                       {/* Avatar: orange tint for party, indigo for users */}
                       <div 
                         className={`w-24 h-24 md:w-36 md:h-36 rounded-full border-[3px] border-[#FFD500] shadow-[0_0_40px_rgba(255,213,0,0.4)] flex items-center justify-center text-white text-4xl md:text-5xl font-black overflow-hidden bg-cover bg-center z-10 ${b.type === 'party' ? 'bg-orange-500' : 'bg-indigo-500'}`}
                         style={b.image ? {backgroundImage: `url(${b.image})`} : {}}
                       >
                            {!b.image && b.username.charAt(0)}
                       </div>
                       <div className="mt-3 text-xs md:text-sm font-black text-[#FFD500] uppercase tracking-widest px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full shadow-xl border border-[#FFD500]/30 z-10 w-full truncate max-w-[140px]">
                           {b.username}
                       </div>
                       {/* Party badge */}
                       {b.type === 'party' && (
                         <div className="mt-1 text-[8px] font-black text-orange-300 uppercase tracking-widest px-2 py-0.5 bg-orange-500/20 rounded-full border border-orange-400/30">
                           Party 🎉
                         </div>
                       )}
                    </motion.div>
                 ))}
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] whitespace-pre-line leading-tight">
                 {isMyBirthday 
                    ? (allCelebrants.length > 1 ? `HAPPY BIRTHDAY,\n${currentUser} & TEAM!` : `HAPPY BIRTHDAY,\n${currentUser}!`)
                    : "LET'S CELEBRATE! 🎉"}
              </h2>
              
              <p className="text-[#FFD500] font-black text-sm md:text-xl uppercase tracking-widest mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed max-w-lg mx-auto px-4 whitespace-pre-line">
                 {isMyBirthday 
                   ? (allCelebrants.length > 1 
                      ? "Wishing you an amazing year ahead! 🎈💥\n\nAlso, don't forget to wish the other celebrants a great day too! ✨🎊" 
                      : "Wishing you an amazing year ahead from the entire Robotek Team! 🎈💥")
                   : `It's time to wish ${allCelebrants.length} celebrant${allCelebrants.length > 1 ? 's' : ''} a very happy birthday today! ✨🎊`}
              </p>

              <button 
                onClick={handleClose}
                className="px-12 py-5 bg-[#FFD500] text-[#003875] rounded-full font-black uppercase tracking-[0.25em] text-sm md:text-base hover:scale-110 transition-all shadow-[0_0_30px_rgba(255,213,0,0.4)] hover:shadow-[0_0_50px_rgba(255,213,0,0.6)] relative z-10 active:scale-95 border-2 border-transparent hover:border-white"
              >
                Let's Go!
              </button>
           </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


