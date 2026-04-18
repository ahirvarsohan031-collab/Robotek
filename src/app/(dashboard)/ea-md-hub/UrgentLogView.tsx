"use client";

import { useState, useEffect } from "react";
import { 
  ExclamationCircleIcon,
  XMarkIcon,
  CheckIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/Portal";
import { useToast } from "@/components/ToastProvider";

interface UrgentLogItem {
  id: string;
  issueSummary: string;
  urgencyLevel: string;
  channelUsed: string;
  requiredFromMD: string;
  deadline: string;
  status: string;
}

export default function UrgentLogView() {
  const toast = useToast();

  const [logs, setLogs] = useState<UrgentLogItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [issueSummary, setIssueSummary] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("CRITICAL - immediate");
  const [channelUsed, setChannelUsed] = useState("WhatsApp");
  const [requiredFromMD, setRequiredFromMD] = useState("");
  const [deadline, setDeadline] = useState("");

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/ea-md/urgent-log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load urgent logs", err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const resetForm = () => {
    setIssueSummary("");
    setUrgencyLevel("CRITICAL - immediate");
    setChannelUsed("WhatsApp");
    setRequiredFromMD("");
    
    // Set default deadline to today
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDeadline(now.toISOString().slice(0, 16));
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const submitLog = async () => {
    if (!issueSummary) {
      toast.error("Issue summary is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        issueSummary,
        urgencyLevel,
        channelUsed,
        requiredFromMD,
        deadline,
        status: "Open"
      };

      const res = await fetch("/api/ea-md/urgent-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Urgent matter flagged successfully.");
        setIsModalOpen(false);
        fetchLogs();
      } else {
        toast.error("Failed to log urgency.");
      }
    } catch (err) {
      toast.error("Error connecting to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const resolveLog = async (id: string, log: UrgentLogItem) => {
    try {
      const res = await fetch(`/api/ea-md/urgent-log?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...log, status: "Resolved" })
      });

      if (res.ok) {
        toast.success("Marked as resolved.");
        fetchLogs();
      } else {
        toast.error("Failed to resolve.");
      }
    } catch (err) {
      toast.error("Error communicating with server.");
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      const time = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${day} ${month} \`${year}, ${time}`;
    } catch {
      return dateString;
    }
  };

  const getUrgencyColor = (level: string) => {
    if (level.includes("CRITICAL")) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    if (level.includes("URGENT")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    if (level.includes("IMPORTANT")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200";
  };

  const getUrgencyIcon = (level: string) => {
    if (level.includes("CRITICAL")) return <ShieldExclamationIcon className="w-3.5 h-3.5" />;
    if (level.includes("URGENT")) return <ExclamationTriangleIcon className="w-3.5 h-3.5" />;
    if (level.includes("IMPORTANT")) return <InformationCircleIcon className="w-3.5 h-3.5" />;
    return <ExclamationCircleIcon className="w-3.5 h-3.5" />;
  }

  const getChannelColor = (channel: string) => {
    if (channel.toLowerCase().includes("whatsapp")) return "bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20"; // Used blue instead of green strictly for theme, or green if preferred
    if (channel.toLowerCase().includes("erp")) return "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (channel.toLowerCase().includes("phone")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  const getChannelIcon = (channel: string) => {
    if (channel.toLowerCase().includes("whatsapp")) return <DevicePhoneMobileIcon className="w-3.5 h-3.5" />;
    if (channel.toLowerCase().includes("erp")) return <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />;
    if (channel.toLowerCase().includes("phone")) return <PhoneIcon className="w-3.5 h-3.5" />;
    return <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />;
  }

  return (
    <div className="flex flex-col w-full h-full space-y-6">
      {/* Header section matching exact design */}
      <div className="flex items-start justify-between px-2 pt-2">
        <div>
          <h2 className="text-2xl font-bold text-[#001736] dark:text-white tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Urgent / Escalation Log</h2>
          <p className="text-[12px] text-gray-500 mt-1">Flag via ERP Chat (or WhatsApp during transition) → phone if no response</p>
        </div>
        <button 
          onClick={openModal}
          className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
        >
          Flag urgent
        </button>
      </div>

      {/* Escalation Protocol Banner */}
      <div className="mx-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4">
        <h3 className="text-rose-700 dark:text-rose-400 font-bold text-sm mb-1">Escalation protocol</h3>
        <p className="text-rose-600/80 dark:text-rose-400/80 text-xs">Urgent (same-day) → ERP Chat [URGENT] | Critical (immediate) → Phone call | Only flag genuine urgencies</p>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto px-2 pb-6">
        <div className="bg-white dark:bg-navy-800 rounded-2xl border border-gray-200 dark:border-navy-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#001736] text-white text-[9px] uppercase tracking-wider font-extrabold">
                  <th className="p-4 rounded-tl-xl w-12 border-b border-[#001736]">#</th>
                  <th className="p-4 border-b border-[#001736]">ISSUE</th>
                  <th className="p-4 border-b border-[#001736]">LEVEL</th>
                  <th className="p-4 border-b border-[#001736]">CHANNEL</th>
                  <th className="p-4 border-b border-[#001736]">REQUIRED FROM MD</th>
                  <th className="p-4 border-b border-[#001736]">DEADLINE</th>
                  <th className="p-4 border-b border-[#001736]">STATUS</th>
                  <th className="p-4 rounded-tr-xl border-b border-[#001736] text-right pr-6">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 text-sm font-bold">
                      No urgent logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-navy-900/50 transition-colors">
                      <td className="p-4 text-[11px] font-bold text-gray-500">{idx + 1}</td>
                      <td className="p-4 text-[12px] font-bold text-gray-800 dark:text-gray-200">{log.issueSummary}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getUrgencyColor(log.urgencyLevel)}`}>
                          {log.urgencyLevel.split(' - ')[0]}
                        </span>
                      </td>
                      <td className="p-4 text-[12px] text-gray-600 dark:text-gray-300">{log.channelUsed}</td>
                      <td className="p-4 text-[12px] text-gray-600 dark:text-gray-300">{log.requiredFromMD}</td>
                      <td className="p-4 text-[11px] font-medium text-gray-500">{formatDisplayDate(log.deadline)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          log.status === 'Resolved' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        {log.status !== 'Resolved' && (
                          <button 
                            onClick={() => resolveLog(log.id, log)}
                            className="px-3 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#001736]/30 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative w-full max-w-2xl bg-white dark:bg-navy-900 rounded-2xl shadow-xl flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#001736] dark:text-white" style={{ fontFamily: 'Georgia, serif' }}>Flag urgent matter</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                  
                  {/* Issue Summary */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Issue Summary *</label>
                    <textarea 
                      value={issueSummary}
                      onChange={e => setIssueSummary(e.target.value)}
                      placeholder="Brief description..."
                      className="w-full bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 rounded-xl px-4 py-3 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-100 min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Urgency Level Buttons */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Urgency Level *</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "CRITICAL - immediate",
                        "URGENT - same day",
                        "IMPORTANT - this week"
                      ].map((level) => (
                        <button
                          key={level}
                          onClick={() => setUrgencyLevel(level)}
                          className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[11px] font-bold transition-all ${
                            urgencyLevel === level
                              ? `${getUrgencyColor(level)} shadow-sm ring-1 ring-offset-1 ring-current`
                              : 'bg-white dark:bg-navy-800 border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {getUrgencyIcon(level)}
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Channel Used Buttons */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Channel Used</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "WhatsApp",
                        "ERP Chat",
                        "Phone Call"
                      ].map((channel) => (
                        <button
                          key={channel}
                          onClick={() => setChannelUsed(channel)}
                          className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[11px] font-bold transition-all ${
                            channelUsed === channel
                              ? `${getChannelColor(channel)} shadow-sm ring-1 ring-offset-1 ring-current`
                              : 'bg-white dark:bg-navy-800 border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {getChannelIcon(channel)}
                          {channel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Required From MD & Deadline Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Required From MD</label>
                      <input 
                        type="text"
                        value={requiredFromMD}
                        onChange={e => setRequiredFromMD(e.target.value)}
                        placeholder="Decision / approval / call back..."
                        className="w-full bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 rounded-xl px-4 py-2.5 text-[12px] text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Deadline</label>
                      <input 
                        type="datetime-local"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 rounded-xl px-4 py-2.5 text-[12px] font-bold text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-navy-800/50 border-t border-gray-100 dark:border-navy-800 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 text-[12px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-navy-900 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-800"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitLog}
                    disabled={isSaving}
                    className="px-6 py-2 text-[12px] font-bold text-white bg-[#b91c1c] hover:bg-[#991b1b] rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? "Saving..." : "Log escalation"}
                  </button>
                </div>

              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
