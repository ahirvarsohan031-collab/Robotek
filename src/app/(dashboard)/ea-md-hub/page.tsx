"use client";

import { useState } from "react";
import { 
  Squares2X2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import WeeklyUpdateView from "./WeeklyUpdateView";
import ActionLogView from "./ActionLogView";
import TeamQueriesView from "./TeamQueriesView";
import SyncMeetingView from "./SyncMeetingView";

export default function EaMdHubPage() {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <Squares2X2Icon className="w-3 h-3" /> },
    { id: "weekly-update", label: "Weekly Update", icon: <CalendarDaysIcon className="w-3 h-3" /> },
    { id: "action-log", label: "Action Log", icon: <ClipboardDocumentListIcon className="w-3 h-3" /> },
    { id: "team-queries", label: "Team Queries", icon: <ChatBubbleLeftRightIcon className="w-3 h-3" /> },
    { id: "sync-meeting", label: "Sync Meeting", icon: <UsersIcon className="w-3 h-3" /> },
    { id: "urgent-log", label: "Urgent Log", icon: <ExclamationCircleIcon className="w-3 h-3" /> },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-2 flex flex-col h-full w-full">
      {/* Sticky Top Header & Filters */}
      <div className="space-y-2 mb-2 shrink-0">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
          <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate uppercase">EA–MD Hub</h1>
            <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Executive Assistant & Managing Director Workspace</p>
          </div>
        </div>

        {/* Tabs Layout */}
        <div className="rounded-2xl border border-gray-100 dark:border-navy-700 overflow-hidden shadow-sm transition-all duration-500 w-full bg-white dark:bg-navy-800">
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-3 bg-gray-50/50 dark:bg-navy-900/30">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-md scale-105' : 'bg-white text-gray-700 border-gray-300 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600 hover:scale-[1.02] hover:shadow-sm'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div 
        className="flex-1 flex flex-col min-h-[500px]"
      >
        <AnimatePresence mode="wait">
          <motion.div
             key={activeTab}
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 1.02 }}
             transition={{ duration: 0.2 }}
             className="flex-1 flex flex-col items-center justify-start py-2 px-1"
          >
             {/* Dynamic Content based on activeTab */}
             {tabs.map(tab => (
               activeTab === tab.id && (
                  tab.id === 'weekly-update' ? (
                    <div key={tab.id} className="w-full h-full text-left">
                       <WeeklyUpdateView />
                    </div>
                  ) : tab.id === 'action-log' ? (
                    <div key={tab.id} className="w-full h-full text-left">
                       <ActionLogView />
                    </div>
                  ) : tab.id === 'team-queries' ? (
                    <div key={tab.id} className="w-full h-full text-left">
                       <TeamQueriesView />
                    </div>
                  ) : tab.id === 'sync-meeting' ? (
                    <div key={tab.id} className="w-full h-full text-left">
                       <SyncMeetingView />
                    </div>
                  ) : (
                    <div key={tab.id} className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-20">
                       <div className="scale-[3] mb-8 text-gray-400">{tab.icon}</div>
                       <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{tab.label}</h2>
                       <p className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-widest">Workspace Module in Development</p>
                    </div>
                  )
               )
             ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
