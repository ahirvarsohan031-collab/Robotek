"use client";

import { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon, 
  PlusIcon, 
  XMarkIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  PrinterIcon,
  ClockIcon as HistoryIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ToastProvider';
import Portal from '@/components/Portal';

interface AgendaItem {
  id: string;
  duration: string;
  title: string;
  owner: 'EA' | 'MD' | 'Both';
}

interface ActionLogItem {
  id: string;
  task: string;
}

interface SyncMeeting {
  id: string;
  date: string;
  time: string;
  location: string;
  agenda: AgendaItem[];
  decisions: string;
  actionItems: ActionLogItem[];
  notes: string;
}

export default function SyncMeetingView() {
  const toast = useToast();

  // Primary State
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('Office / ERP room');
  
  const [agenda, setAgenda] = useState<AgendaItem[]>([
    { id: '1', duration: '5-10 min', title: 'Pending MD actions - decisions required', owner: 'MD' },
    { id: '2', duration: '10-15 min', title: 'Priority alignment - this week focus', owner: 'Both' },
    { id: '3', duration: '15-20 min', title: 'Team queries - batch responses', owner: 'Both' },
    { id: '4', duration: '20-25 min', title: 'Upcoming deadlines and events', owner: 'EA' },
    { id: '5', duration: '25-30 min', title: 'Any other business', owner: 'Both' }
  ]);

  const [decisions, setDecisions] = useState('');
  const [actionItems, setActionItems] = useState<ActionLogItem[]>([]);
  const [notes, setNotes] = useState('');

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<SyncMeeting[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/ea-md/sync-meeting");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  const addAgendaItem = () => {
    const newItem: AgendaItem = {
      id: Date.now().toString(),
      duration: '0-5 min',
      title: '',
      owner: 'Both'
    };
    setAgenda([...agenda, newItem]);
  };

  const updateAgendaItem = (id: string, updates: Partial<AgendaItem>) => {
    setAgenda(agenda.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeAgendaItem = (id: string) => {
    setAgenda(agenda.filter(item => item.id !== id));
  };

  const addActionItem = () => {
    const newItem: ActionLogItem = {
      id: Date.now().toString(),
      task: ''
    };
    setActionItems([...actionItems, newItem]);
  };

  const updateActionItem = (id: string, task: string) => {
    setActionItems(actionItems.map(item => item.id === id ? { ...item, task } : item));
  };

  const removeActionItem = (id: string) => {
    setActionItems(actionItems.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      date,
      time,
      location,
      agenda,
      decisions,
      actionItems,
      notes
    };

    try {
      const method = meetingId ? 'PUT' : 'POST';
      const url = meetingId ? `/api/ea-md/sync-meeting?id=${meetingId}` : '/api/ea-md/sync-meeting';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Meeting record saved successfully!");
        const data = await res.json();
        if (!meetingId) setMeetingId(data.id);
        loadHistory();
      } else {
        toast.error("Failed to save meeting.");
      }
    } catch (err) {
      toast.error("Error connecting to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadMeeting = (meeting: SyncMeeting) => {
    setMeetingId(meeting.id);
    setDate(meeting.date);
    setTime(meeting.time);
    setLocation(meeting.location);
    setAgenda(meeting.agenda);
    setDecisions(meeting.decisions);
    setActionItems(meeting.actionItems);
    setNotes(meeting.notes);
    setIsHistoryOpen(false);
    toast.success("Meeting data loaded.");
  };

  const resetForm = () => {
    setMeetingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTime('');
    setLocation('Office / ERP room');
    setAgenda([
        { id: '1', duration: '5-10 min', title: 'Pending MD actions - decisions required', owner: 'MD' },
        { id: '2', duration: '10-15 min', title: 'Priority alignment - this week focus', owner: 'Both' },
        { id: '3', duration: '15-20 min', title: 'Team queries - batch responses', owner: 'Both' },
        { id: '4', duration: '20-25 min', title: 'Upcoming deadlines and events', owner: 'EA' },
        { id: '5', duration: '25-30 min', title: 'Any other business', owner: 'Both' }
    ]);
    setDecisions('');
    setActionItems([]);
    setNotes('');
  };

  return (
    <div className="flex flex-col w-full space-y-4 max-w-7xl mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-[#001736] dark:text-white uppercase tracking-tight">Sync Meeting</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Build agenda, log decisions and actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-100 dark:border-navy-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            <HistoryIcon className="w-4 h-4" /> History
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-100 dark:border-navy-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
            <PrinterIcon className="w-4 h-4" /> Print agenda
          </button>
        </div>
      </div>

      {/* Meeting Details Section */}
      <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-gray-100 dark:border-navy-700 shadow-sm transition-all duration-300 hover:shadow-md">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4" /> Meeting details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Date</label>
            <div className="relative group">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-navy-900 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-navy-700 outline-none text-[12px] font-bold text-gray-800 dark:text-white transition-all focus:ring-2 focus:ring-[#1e40af]/20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Time</label>
            <div className="relative group">
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-gray-50 dark:bg-navy-900 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-navy-700 outline-none text-[12px] font-bold text-gray-800 dark:text-white transition-all focus:ring-2 focus:ring-[#1e40af]/20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Location</label>
            <div className="relative group">
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Where?"
                className="w-full bg-gray-50 dark:bg-navy-900 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-navy-700 outline-none text-[12px] font-bold text-gray-800 dark:text-white transition-all focus:ring-2 focus:ring-[#1e40af]/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Agenda Section */}
        <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-gray-100 dark:border-navy-700 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="w-4 h-4" /> Agenda
                </h3>
                <button 
                  onClick={addAgendaItem}
                  className="bg-[#1e40af] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:scale-105 transition-all shadow-sm active:scale-95"
                >
                  <PlusIcon className="w-3 h-3 stroke-[3]" /> Add item
                </button>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                <AnimatePresence initial={false}>
                    {agenda.map((item) => (
                        <motion.div 
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-navy-900/50 rounded-2xl group border border-transparent hover:border-blue-100 dark:hover:border-navy-600 transition-all shadow-sm"
                        >
                            <input 
                              type="text" 
                              value={item.duration} 
                              onChange={e => updateAgendaItem(item.id, { duration: e.target.value })}
                              placeholder="0-0 min"
                              className="w-20 bg-white dark:bg-navy-800 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-navy-700 text-[10px] font-black text-blue-600 text-center outline-none" 
                            />
                            <input 
                              type="text" 
                              value={item.title} 
                              onChange={e => updateAgendaItem(item.id, { title: e.target.value })}
                              placeholder="Topic name..."
                              className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-gray-800 dark:text-gray-200 placeholder:text-gray-400" 
                            />
                            <div className="flex items-center gap-1 bg-white dark:bg-navy-800 p-0.5 rounded-lg border border-gray-200 dark:border-navy-700">
                                {(['EA', 'MD', 'Both'] as const).map(o => (
                                    <button
                                      key={o}
                                      onClick={() => updateAgendaItem(item.id, { owner: o })}
                                      className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${
                                          item.owner === o ? 'bg-[#001736] text-white shadow-sm scale-105' : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                    >
                                        {o}
                                    </button>
                                ))}
                            </div>
                            <button 
                              onClick={() => removeAgendaItem(item.id)}
                              className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <XMarkIcon className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>

        {/* Decisions & Actions Section */}
        <div className="space-y-6 flex flex-col h-full">
            {/* Decisions Made */}
            <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-gray-100 dark:border-navy-700 shadow-sm flex flex-col flex-1">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <CheckBadgeIcon className="w-4 h-4" /> Decisions & actions
                </h3>
                
                <div className="flex-1 space-y-4 flex flex-col">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Decisions Made</label>
                        <textarea 
                          value={decisions}
                          onChange={e => setDecisions(e.target.value)}
                          placeholder="Record key decisions..."
                          className="w-full bg-gray-50 dark:bg-navy-900 p-4 rounded-2xl border border-gray-100 dark:border-navy-700 outline-none text-[11px] font-bold text-gray-800 dark:text-white transition-all focus:ring-2 focus:ring-blue-100 min-h-[120px] resize-none"
                        />
                    </div>
                    
                    <div className="space-y-2 flex-1 flex flex-col">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">New Action Items</label>
                            <button 
                              onClick={addActionItem}
                              className="text-[#1e40af] text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline"
                            >
                                <PlusIcon className="w-3 h-3 stroke-[3]" /> Add
                            </button>
                        </div>
                        <div className="flex-1 max-h-[150px] overflow-y-auto pr-1">
                            {actionItems.length === 0 ? (
                                <p className="text-[10px] font-bold text-gray-400 italic py-4">No open action items</p>
                            ) : (
                                <div className="space-y-2">
                                    {actionItems.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 group">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <input 
                                              type="text" 
                                              value={item.task}
                                              onChange={e => updateActionItem(item.id, e.target.value)}
                                              placeholder="What needs to be done?"
                                              className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-gray-800 dark:text-white"
                                            />
                                            <button 
                                              onClick={() => removeActionItem(item.id)}
                                              className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                                            >
                                                <XMarkIcon className="w-3 h-3 stroke-[3]" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Meeting Notes Section */}
      <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-gray-100 dark:border-navy-700 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <PencilSquareIcon className="w-4 h-4" /> Meeting notes
          </h3>
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="General notes, details, context..."
            className="w-full bg-gray-50 dark:bg-navy-900 p-6 rounded-2xl border border-gray-100 dark:border-navy-700 outline-none text-[12px] font-bold text-gray-800 dark:text-white transition-all focus:ring-2 focus:ring-blue-100 min-h-[100px] resize-none"
          />
      </div>

      {/* Save Action */}
      <div className="flex items-center justify-between p-2">
          <button 
            onClick={resetForm}
            className="px-6 py-3 text-gray-400 hover:text-gray-900 dark:hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            Reset Form
          </button>
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="bg-[#c5a242] text-white px-12 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:shadow-xl shadow-lg active:scale-95 transition-all relative overflow-hidden"
          >
            {isSaving ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
            )}
            {meetingId ? 'Update meeting record' : 'Save meeting record'}
          </button>
      </div>

      {/* History Side Panel */}
      {isHistoryOpen && (
        <Portal>
            <div className="fixed inset-0 z-[100] flex justify-end">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-[#001736]/40 backdrop-blur-sm"
                    onClick={() => setIsHistoryOpen(false)}
                />
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-white dark:bg-navy-900 h-screen shadow-2xl flex flex-col flex-1"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-navy-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Meeting History</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Load previous records</p>
                        </div>
                        <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-navy-800 rounded-full transition-all">
                            <XMarkIcon className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {history.length === 0 ? (
                            <div className="py-20 text-center opacity-30">
                                <HistoryIcon className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-sm font-bold uppercase tracking-widest">No history found</p>
                            </div>
                        ) : (
                            history.map(m => (
                                <button 
                                  key={m.id} 
                                  onClick={() => loadMeeting(m)}
                                  className="w-full text-left p-5 bg-gray-50 dark:bg-navy-800/50 rounded-2xl border border-gray-100 dark:border-navy-700 hover:border-blue-500 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{m.date}</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase">{m.time || 'No time'}</span>
                                    </div>
                                    <h4 className="text-[12px] font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{m.location}</h4>
                                    <div className="mt-3 flex gap-2">
                                        <span className="text-[8px] font-black text-gray-400 uppercase border border-gray-200 px-2 py-0.5 rounded">
                                            {m.agenda.length} Agenda
                                        </span>
                                        <span className="text-[8px] font-black text-gray-400 uppercase border border-gray-200 px-2 py-0.5 rounded">
                                            {m.actionItems.length} Actions
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </Portal>
      )}

      {/* Styles for scrollbar */}
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
