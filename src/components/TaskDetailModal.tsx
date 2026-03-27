import React from 'react';
import { XMarkIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  plannedDate: string | null;
  actualDate: string | null;
  status: string;
  isLate: boolean;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tasks: Task[];
  type: string;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, title, tasks, type }) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#FFFDF2] dark:bg-navy-900 w-full max-w-4xl max-h-[85vh] rounded-[2rem] border-4 border-[#F0E6D2] dark:border-navy-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-4 bg-[#FFFDF2] dark:bg-navy-950 border-b border-[#F0E6D2] dark:border-navy-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detailed Task Breakdown</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <XMarkIcon className="w-8 h-8 text-gray-400" />
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FFF9E6]/30 dark:bg-navy-900/50">
          <div className="grid grid-cols-1 gap-3">
            {tasks.length === 0 ? (
              <div className="py-20 text-center text-gray-400 italic font-bold uppercase tracking-widest">No tasks found for this period</div>
            ) : tasks.map((task, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border-2 bg-[#FFFDF2] dark:bg-navy-900 shadow-sm flex items-center justify-between gap-4 border-l-[6px] ${
                  task.isLate ? 'border-l-rose-500' : task.actualDate ? 'border-l-emerald-500' : 'border-l-amber-500'
                } border-[#F0E6D2] dark:border-navy-800`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase truncate mb-1">{task.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <ClockIcon className="w-3 h-3 text-blue-400" />
                      <span>Planned: <span className="font-bold text-gray-700 dark:text-slate-300">{formatDate(task.plannedDate)}</span></span>
                    </div>
                    {task.actualDate && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <CheckCircleIcon className="w-3 h-3 text-emerald-400" />
                        <span>Actual: <span className="font-bold text-gray-700 dark:text-slate-300">{formatDate(task.actualDate)}</span></span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                    task.isLate ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 
                    task.actualDate ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20' : 
                    'bg-amber-50 text-amber-500 dark:bg-amber-900/20'
                  }`}>
                    {task.isLate ? 'Delayed' : task.actualDate ? 'On Time' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-[#FFFDF2] dark:bg-navy-950 border-t border-[#F0E6D2] dark:border-navy-800 flex justify-between">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">{tasks.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Late</p>
              <p className="text-sm font-black text-rose-500">{tasks.filter(t => t.isLate).length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Success</p>
              <p className="text-sm font-black text-emerald-500">
                {tasks.length > 0 ? Math.round((tasks.filter(t => t.actualDate && !t.isLate).length / tasks.length) * 100) : 0}%
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 dark:bg-navy-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
