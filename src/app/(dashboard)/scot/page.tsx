"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PhoneIcon, 
  ArrowUpTrayIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  FingerPrintIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  TrashIcon,
  ArrowPathIcon,
  UserIcon,
  UserGroupIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import SearchableSelect from '@/components/SearchableSelect';
import { useToast } from '@/components/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilSquareIcon, XMarkIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import Portal from '@/components/Portal';

interface ScotRecord {
  employeeName: string;
  employeeNumber: string;
  toName: string;
  countryCode: string;
  toNumber: string;
  callType: string;
  duration: string;
  callDate: string;
  callTime: string;
  notes: string;
  uniqueId: string;
  audioUrl: string;
}

interface CallRecord {
  partyName: string;
  concernPerson: string;
  mobileNum: string;
  firmName: string;
  district: string;
  state: string;
  region: string;
  creditDaysNew: string;
  limit: string;
  collectionRating: string;
  customerType: string;
  salesPerson: string;
  salesCoordinator: string;
  averageOrderSize: string;
  targetAvgOrderSize: string;
  usuallyNoOfOrderMonthly: string;
  frequencyOfCallingAfterOrderPlaced: string;
  specialRemarkJSON: string;
  latestStatus?: string;
  latestNextDate?: string;
  lastOrderDate?: string;
  followUpHistoryCount?: number;
}

interface FollowUpRecord {
  partyName: string;
  status: string;
  nextFollowUpDate: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  lastFollowUpDate: string;
}

export default function ScotPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [data, setData] = useState<ScotRecord[]>([]);
  const [callsData, setCallsData] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'feeder' | 'calls' | 'lost' | 'dashboard'>('feeder');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard order counts from O2D
  const [dashboardOrderCounts, setDashboardOrderCounts] = useState<Record<string, number>>({});
  const [dashboardHistoricalAvg, setDashboardHistoricalAvg] = useState<Record<string, number>>({});
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');

  // Edit Modal State
  const [editingCall, setEditingCall] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [partyManagementParties, setPartyManagementParties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showMissingPartiesModal, setShowMissingPartiesModal] = useState(false);
  const [dateFilters, setDateFilters] = useState<string[]>([]);

  useEffect(() => {
    fetchScotData();
    fetchSupportData();
  }, [activeTab]);

  const fetchSupportData = async () => {
    try {
      const [pmRes, userRes] = await Promise.all([
        fetch('/api/party-management'),
        fetch('/api/users')
      ]);
      if (pmRes.ok) setPartyManagementParties(await pmRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (err) {
      console.error("Error fetching support data:", err);
    }
  };

  // Follow-up Sidebar State
  const [selectedFollowUpParty, setSelectedFollowUpParty] = useState<CallRecord | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpRemarks, setFollowUpRemarks] = useState<string>("");
  const [followUpType, setFollowUpType] = useState<'manual' | 'frequency'>('manual');
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpRecord[]>([]);
  const [feederLogs, setFeederLogs] = useState<ScotRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchFollowUpHistory = async (partyName: string, mobileNum: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/scot/history?partyName=${encodeURIComponent(partyName)}&mobileNum=${encodeURIComponent(mobileNum)}`);
      if (res.ok) {
        const data = await res.json();
        setFollowUpHistory(data.history || []);
        setFeederLogs(data.feederLogs || []);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedFollowUpParty) {
      fetchFollowUpHistory(selectedFollowUpParty.partyName, selectedFollowUpParty.mobileNum);
      setFollowUpStatus("");
      setFollowUpDate("");
      setFollowUpRemarks("");
      setFollowUpType('manual');
    } else {
      setFollowUpHistory([]);
      setFeederLogs([]);
    }
  }, [selectedFollowUpParty]);

  const getNextWorkingDay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    if (date.getDay() === 0) { // Sunday
      date.setDate(date.getDate() + 1);
    }
    return date.toISOString().split('T')[0];
  };

  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'latest', direction: 'desc' });

  const getEffectiveFollowUpDate = (record: CallRecord) => {
    if (record.latestNextDate) return record.latestNextDate;
    if (record.lastOrderDate) {
      const freq = parseInt(record.frequencyOfCallingAfterOrderPlaced) || 30;
      const date = new Date(new Date(record.lastOrderDate).getTime() + freq * 24 * 60 * 60 * 1000);
      return getNextWorkingDay(date.toISOString().split('T')[0]);
    }
    return "";
  };

  const getDateFilterCount = (filter: string) => {
    const baseData = activeTab === 'feeder' ? [] : callsData;
    return baseData.filter(d => {
      const followUpDate = getEffectiveFollowUpDate(d as CallRecord);
      if (!followUpDate) return false;
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = new Date(followUpDate);
      if (isNaN(due.getTime())) return false;
      due.setHours(0, 0, 0, 0);
      
      const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filter === 'Delayed') return diffDays < 0;
      if (filter === 'Today') return diffDays === 0;
      if (filter === 'Tomorrow') return diffDays === 1;
      if (filter === 'Next 3') return diffDays > 0 && diffDays <= 3;
      return false;
    }).length;
  };

  const fetchScotData = async () => {
    if (activeTab === 'dashboard') {
      // Dashboard uses callsData — fetch it if not loaded
      if (callsData.length === 0) {
        setIsLoading(true);
        try {
          const res = await fetch('/api/scot?tab=calls');
          if (res.ok) setCallsData([...await res.json()].reverse());
        } catch {}
        finally { setIsLoading(false); }
      }
      // Also fetch O2D data to count actual orders this month
      setIsDashboardLoading(true);
      try {
        const res = await fetch('/api/o2d?all=true');
        if (res.ok) {
          const o2dData: any[] = await res.json();
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();

          // Single pass: build per-party per-month unique order sets
          // partyMonths[party]["YYYY-M"] = Set<orderNo>
          const partyMonths: Record<string, Record<string, Set<string>>> = {};
          o2dData.forEach((order: any) => {
            const party = (order.party_name || '').trim().toLowerCase();
            const orderNo = (order.order_no || '').trim();
            if (!party || !orderNo) return;
            const created = new Date(order.created_at || '');
            if (isNaN(created.getTime())) return;
            const monthKey = `${created.getFullYear()}-${created.getMonth()}`;
            if (!partyMonths[party]) partyMonths[party] = {};
            if (!partyMonths[party][monthKey]) partyMonths[party][monthKey] = new Set();
            partyMonths[party][monthKey].add(orderNo);
          });

          // This-month actuals
          const thisMonthKey = `${thisYear}-${thisMonth}`;
          const counts: Record<string, number> = {};
          Object.entries(partyMonths).forEach(([party, months]) => {
            counts[party] = months[thisMonthKey]?.size ?? 0;
          });
          setDashboardOrderCounts(counts);

          // Historical average: avg unique orders per month across ALL months with data
          const avgOrders: Record<string, number> = {};
          Object.entries(partyMonths).forEach(([party, months]) => {
            const monthlyCounts = Object.values(months).map(s => s.size);
            const avg = monthlyCounts.reduce((a, b) => a + b, 0) / monthlyCounts.length;
            avgOrders[party] = Math.round(avg);
          });
          setDashboardHistoricalAvg(avgOrders);
        }
      } catch {}
      finally { setIsDashboardLoading(false); }
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/scot?tab=${activeTab}`);
      if (res.ok) {
        const json = await res.json();
        if (activeTab === 'calls') {
          setCallsData([...json].reverse()); // Latest first
        } else if (activeTab === 'lost') {
          setCallsData(json);
        } else {
          setData(json);
        }
      } else {
        toast.error(`Failed to load ${activeTab} data`);
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchScotData();
    setCurrentPage(1);
  }, [activeTab]);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const currentUsername = (session?.user as any)?.username || "";

  // Filtering Logic
  const filteredData = (activeTab === 'feeder' ? data : callsData).filter(record => {
    if (activeTab === 'feeder') {
      const r = record as ScotRecord;
      const matchesUser = isAdmin || r.employeeName.toLowerCase() === currentUsername.toLowerCase();
      const matchesSearch = 
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.toName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.toNumber.includes(searchTerm) ||
        r.uniqueId.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesUser && matchesSearch;
    } else {
      const r = record as CallRecord;
      const matchesSearch = 
        (r.partyName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (r.concernPerson?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (r.firmName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (r.mobileNum || "").includes(searchTerm);
      
      let matchesDate = true;
      if (dateFilters.length > 0) {
        const followUpDate = getEffectiveFollowUpDate(r);
        if (!followUpDate) {
          matchesDate = false;
        } else {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const due = new Date(followUpDate);
          if (!isNaN(due.getTime())) {
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            matchesDate = dateFilters.some(f => {
              if (f === 'Delayed') return diffDays < 0;
              if (f === 'Today') return diffDays === 0;
              if (f === 'Tomorrow') return diffDays === 1;
              if (f === 'Next 3') return diffDays > 0 && diffDays <= 3;
              return false;
            });
          } else {
            matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesDate;
    }
  });

  // Sorting Logic
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortConfig.key === 'latest' && activeTab === 'feeder') {
      const ra = a as ScotRecord;
      const rb = b as ScotRecord;
      const valA = new Date(`${ra.callDate} ${ra.callTime}`).getTime();
      const valB = new Date(`${rb.callDate} ${rb.callTime}`).getTime();
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }
    
    const valA = (a as any)[sortConfig.key] || "";
    const valB = (b as any)[sortConfig.key] || "";
    
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  const handleUpdateCall = async (updatedRecord: CallRecord) => {
    setIsUpdating(true);
    // Check if party already exists in our master list
    const exists = callsData.some(c => c.partyName === updatedRecord.partyName);
    
    try {
      const res = await fetch(`/api/scot?tab=calls&partyName=${encodeURIComponent(updatedRecord.partyName)}`, {
        method: exists ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: exists ? JSON.stringify(updatedRecord) : JSON.stringify({ type: 'party', data: updatedRecord }),
      });

      if (res.ok) {
        toast.success(exists ? "Call record updated successfully" : "Party added successfully to Scot");
        fetchScotData(); // Refresh to catch calculations and newest order
        setEditingCall(null);
      } else {
        toast.error(exists ? "Failed to update call record" : "Failed to add party");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-GB', { month: 'short' });
      const year = d.getFullYear().toString().slice(-2);
      
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const calculateFrequencyDate = (party: CallRecord) => {
    const freq = parseInt(party.frequencyOfCallingAfterOrderPlaced) || 30;
    const date = new Date();
    date.setDate(date.getDate() + freq);
    return getNextWorkingDay(date.toISOString().split('T')[0]);
  };

  const handleSaveFollowUp = async () => {
    if (!selectedFollowUpParty || !followUpStatus) {
      toast.error("Please select a status");
      return;
    }

    if (followUpStatus !== 'Order Lost' && !followUpDate) {
      toast.error("Please select a follow-up date");
      return;
    }

    setIsSavingFollowUp(true);
    try {
      const res = await fetch('/api/scot/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyName: selectedFollowUpParty.partyName,
          status: followUpStatus,
          nextFollowUpDate: followUpStatus === 'Order Lost' ? "" : followUpDate,
          remarks: followUpRemarks,
          createdBy: currentUsername,
          createdAt: new Date().toISOString(),
          lastFollowUpDate: selectedFollowUpParty.latestNextDate || ""
        }),
      });

      if (res.ok) {
        toast.success("Follow-up saved successfully");
        
        // Update local state instead of doing full refresh
        setCallsData(prevData => {
          return prevData.map(c => {
            if (c.partyName === selectedFollowUpParty.partyName) {
              return {
                ...c,
                latestStatus: followUpStatus,
                latestNextDate: followUpStatus === 'Order Lost' ? "" : followUpDate,
              };
            }
            return c;
          }).filter(c => {
            if (activeTab === 'calls' && followUpStatus === 'Order Lost') return false;
            if (activeTab === 'lost' && followUpStatus !== 'Order Lost') return false;
            return true;
          });
        });
        
        setSelectedFollowUpParty(null);
        setFollowUpStatus("");
        setFollowUpDate("");
        setFollowUpRemarks("");
        setFollowUpType('manual');
      } else {
        toast.error("Failed to save follow-up");
      }
    } catch (err) {
      toast.error("Error saving follow-up");
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  useEffect(() => {
    if (followUpStatus === 'Not Answered') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUpDate(getNextWorkingDay(tomorrow.toISOString().split('T')[0]));
    } else if (followUpStatus === 'Order Won') {
      if (followUpType === 'frequency' && selectedFollowUpParty) {
        setFollowUpDate(calculateFrequencyDate(selectedFollowUpParty));
      }
    } else if (followUpStatus === 'Order Lost') {
      setFollowUpDate("");
    }
  }, [followUpStatus, followUpType, selectedFollowUpParty]);

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'feeder') {
      headers = ["Employee Name", "Employee Number", "To Name", "Country Code", "To Number", "Call Type", "Duration", "Call Date", "Call Time", "Notes", "UniqueId", "Audio Url"];
      rows = (filteredData as ScotRecord[]).map(r => [
        r.employeeName,
        r.employeeNumber,
        r.toName,
        r.countryCode,
        r.toNumber,
        r.callType,
        r.duration,
        r.callDate,
        r.callTime,
        r.notes,
        r.uniqueId,
        r.audioUrl
      ]);
    } else {
      headers = [
        "Party Name", "Concern Person", "Mobile Num", "Firm Name", "District", "State", "Region", 
        "Credit Days (New)", "Limit", "Collection Rating", "Customer Type", "Sales Person", 
        "Sales Coordinator", "Average Order Size", "Target Avg order Size", 
        "Usually NO OF Order MONTHLY", "Frequency of Calling after order Placed",
        "Latest Status", "Next Follow-up Date", "Last Order Date", "Calculated Follow-up Date"
      ];
      rows = (filteredData as CallRecord[]).map(r => [
        r.partyName,
        r.concernPerson,
        r.mobileNum,
        r.firmName,
        r.district,
        r.state,
        r.region,
        r.creditDaysNew,
        r.limit,
        r.collectionRating,
        r.customerType,
        r.salesPerson,
        r.salesCoordinator,
        r.averageOrderSize,
        r.targetAvgOrderSize,
        r.usuallyNoOfOrderMonthly,
        r.frequencyOfCallingAfterOrderPlaced,
        r.latestStatus || "",
        r.latestNextDate || "",
        r.lastOrderDate || "",
        getEffectiveFollowUpDate(r) || ""
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `scot_${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data exported successfully!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const rowsToAppend = json.slice(1).filter(row => row.length > 0);

        if (rowsToAppend.length === 0) {
          toast.info("No data found in file");
          setIsImporting(false);
          return;
        }

        const res = await fetch('/api/scot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: rowsToAppend }),
        });

        if (res.ok) {
          toast.success(`Imported ${rowsToAppend.length} records successfully!`);
          fetchScotData();
        } else {
          toast.error("Failed to upload data to spreadsheet");
        }
      } catch (err) {
        toast.error("Error parsing file. Ensure it is a valid CSV or Excel file.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
        <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">Scot</h1>
          <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Operational Tracking System</p>
        </div>

        <div className="w-full lg:flex-1 flex justify-end flex-shrink-0 min-w-0">
          <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar max-w-full">
            {/* Tab: Data Feeder */}
            <button
              onClick={() => setActiveTab('feeder')}
              className={`flex items-center gap-2 px-4 py-1.5 font-black uppercase tracking-widest text-[10px] transition-all rounded-full whitespace-nowrap ${
                activeTab === 'feeder' 
                ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md' 
                : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              <span>Data Feeder</span>
            </button>

            {/* Tab: Calls */}
            <button
              onClick={() => setActiveTab('calls')}
              className={`flex items-center gap-2 px-4 py-1.5 font-black uppercase tracking-widest text-[10px] transition-all rounded-full whitespace-nowrap ${
                activeTab === 'calls' 
                ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md' 
                : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              <span>Calls</span>
            </button>

            {/* Tab: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 font-black uppercase tracking-widest text-[10px] transition-all rounded-full whitespace-nowrap ${
                activeTab === 'dashboard' 
                ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md' 
                : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              <span>Dashboard</span>
            </button>

            {/* Tab: Lost Parties */}
            <button
              onClick={() => setActiveTab('lost')}
              className={`flex items-center gap-2 px-4 py-1.5 font-black uppercase tracking-widest text-[10px] transition-all rounded-full whitespace-nowrap ${
                activeTab === 'lost' 
                ? 'bg-[#CE2029] dark:bg-rose-600 text-white shadow-md' 
                : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              <XCircleIcon className="w-3.5 h-3.5" />
              <span>Lost Parties</span>
            </button>

            {/* Action: Export */}
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 text-[#003875] dark:text-[#FFD500] px-4 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[10px] rounded-full whitespace-nowrap"
              title="Export Content"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            {/* Action: Import (Only for Feeder) */}
            {activeTab === 'feeder' && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center justify-center gap-2 text-[#CE2029] dark:text-[#FFD500] px-4 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[10px] rounded-full whitespace-nowrap"
                >
                  {isImporting ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowUpTrayIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{isImporting ? "Importing..." : "Import"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div 
        style={{ borderColor: 'var(--panel-border)' }}
        className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500 bg-white dark:bg-navy-900"
      >
        {/* Integrated Search & Pagination Row */}
        {activeTab !== 'dashboard' && (
        <div 
          className="px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-navy-700/50"
        >
          {/* Left Group: Search + Filters + Actions */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 flex-1">
            {/* Search Group */}
            <div className="flex items-center gap-3 w-full lg:w-auto lg:min-w-[250px] lg:max-w-xs">
              <div className="relative group flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-navy-950 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Filter Buttons */}
            {activeTab === 'calls' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'Delayed', label: 'Delayed', color: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
                  { id: 'Today', label: 'Today', color: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' },
                  { id: 'Tomorrow', label: 'Tomorrow', color: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
                  { id: 'Next 3', label: 'Next 3', color: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' }
                ].map(f => {
                  const count = getDateFilterCount(f.id);
                  const isActive = dateFilters.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        const newFilters = dateFilters.includes(f.id)
                          ? dateFilters.filter(item => item !== f.id)
                          : [...dateFilters, f.id];
                        setDateFilters(newFilters);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all h-[30px] flex items-center gap-1.5 whitespace-nowrap ${
                        isActive 
                          ? 'bg-[#003875] dark:bg-navy-950 text-[#FFD500] border-[#003875] dark:border-navy-800 shadow-sm scale-110' 
                          : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                      }`}
                    >
                      {f.label}
                      <span className={`px-1 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-[#FFD500] text-black' : 'bg-black/5 dark:bg-white/10'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Missing Parties Button */}
            {activeTab === 'calls' && (
              <button
                onClick={() => setShowMissingPartiesModal(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#003875] dark:bg-navy-950 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
              >
                <UserGroupIcon className="w-3.5 h-3.5" />
                Add Missing Parties
                {partyManagementParties.filter(pm => !callsData.some(c => c.partyName?.trim().toLowerCase() === pm.partyName?.trim().toLowerCase())).length > 0 && (
                   <span className="bg-[#FFD500] text-black px-1.5 py-0.5 rounded-full text-[8px]">
                     {partyManagementParties.filter(pm => !callsData.some(c => c.partyName?.trim().toLowerCase() === pm.partyName?.trim().toLowerCase())).length}
                   </span>
                )}
              </button>
            )}
          </div>

          {/* Right Group: Pagination Info */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:justify-end shrink-0">
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}
                </p>
                <div className="flex gap-0.5">
                  <button 
                    onClick={() => setCurrentPage(1)} 
                    disabled={currentPage === 1} 
                    className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap"
                  >
                    First
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                    disabled={currentPage === 1} 
                    className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(totalPages)} 
                    disabled={currentPage === totalPages || totalPages === 0} 
                    className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
            
            <div className="hidden md:block h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
            
            <div className="flex items-center gap-2">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
              <select 
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Dashboard Tab View */}
        {activeTab === 'dashboard' && (
          <div className="min-h-[400px]">
            {/* Dashboard Search Bar */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-700/50">
              <div className="relative group max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
                <input
                  type="text"
                  placeholder="Search party..."
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-navy-950 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
            {isDashboardLoading || isLoading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-[#FFD500] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Loading Dashboard...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  {/* Row 1: Group headers */}
                  <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200 uppercase text-[10px] md:text-[11px] font-black tracking-widest whitespace-nowrap">
                    <th rowSpan={2} className="px-4 py-3 border-r border-white/20 align-middle">Client Name</th>
                    <th colSpan={3} className="px-4 py-2 border-r border-white/20 text-center border-b border-white/20">
                      <span className="text-[#FFD500]">Month</span>
                    </th>
                    <th colSpan={3} className="px-4 py-2 text-center border-b border-white/20">
                      <span className="text-[#FFD500]">Week</span>
                    </th>
                  </tr>
                  {/* Row 2: Sub-headers */}
                  <tr className="bg-[#002a5a] dark:bg-navy-900 text-white/80 dark:text-slate-300 uppercase text-[9px] md:text-[10px] font-black tracking-widest whitespace-nowrap">
                    <th className="px-4 py-2 border-r border-white/10">No. of Orders / Month</th>
                    <th className="px-4 py-2 border-r border-white/10">Actual Orders Received</th>
                    <th className="px-4 py-2 border-r border-white/20">Remaining Orders</th>
                    <th className="px-4 py-2 border-r border-white/10">Weekly Order Planned</th>
                    <th className="px-4 py-2 border-r border-white/10">Actual Order Received this Week</th>
                    <th className="px-4 py-2">Remaining Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {callsData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest font-mono">No client data found</p>
                      </td>
                    </tr>
                  ) : (
                    [...callsData]
                      .filter(r => r.partyName && r.partyName.trim())
                      .filter(r => !dashboardSearch.trim() || r.partyName.toLowerCase().includes(dashboardSearch.toLowerCase()) || (r.firmName || '').toLowerCase().includes(dashboardSearch.toLowerCase()))
                      .sort((a, b) => {
                        const aKey = a.partyName.trim().toLowerCase();
                        const bKey = b.partyName.trim().toLowerCase();
                        return (dashboardHistoricalAvg[bKey] || 0) - (dashboardHistoricalAvg[aKey] || 0);
                      })
                      .map((record, idx) => {
                        const partyKey = record.partyName.trim().toLowerCase();
                        const monthlyPlanned = dashboardHistoricalAvg[partyKey] || 0;
                        const actualMonth = dashboardOrderCounts[partyKey] || 0;
                        const remainingMonth = Math.max(0, monthlyPlanned - actualMonth);
                        const weeklyPlanned = monthlyPlanned > 0 ? Math.ceil(monthlyPlanned / 4) : 0;
                        const actualWeek = Math.round(actualMonth / 4);
                        const remainingWeek = Math.max(0, weeklyPlanned - actualWeek);

                        return (
                          <tr
                            key={`${record.partyName}-${idx}`}
                            className="hover:bg-orange-50/10 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors whitespace-nowrap"
                          >
                            <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                              <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{record.partyName}</p>
                              {record.firmName && (
                                <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 truncate italic mt-0.5">{record.firmName}</p>
                              )}
                            </td>
                            {/* Monthly */}
                            <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-center">
                              <span className="text-[13px] font-black text-[#003875] dark:text-[#FFD500]">{monthlyPlanned || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-center">
                              <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">{actualMonth}</span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-center">
                              {monthlyPlanned ? (
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                                  remainingMonth > 0
                                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {remainingMonth > 0 ? (
                                    <ArrowTrendingDownIcon className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <ArrowTrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span>{remainingMonth > 0 ? `-${remainingMonth}` : `+${Math.abs(remainingMonth)}`}</span>
                                </div>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            {/* Weekly */}
                            <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-center">
                              <span className="text-[13px] font-black text-[#003875] dark:text-[#FFD500]">{weeklyPlanned || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-center">
                              <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">{actualWeek}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {weeklyPlanned ? (
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                                  remainingWeek > 0
                                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {remainingWeek > 0 ? (
                                    <ArrowTrendingDownIcon className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <ArrowTrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span>{remainingWeek > 0 ? `-${remainingWeek}` : `+${Math.abs(remainingWeek)}`}</span>
                                </div>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            )}
            </div>
          </div>
        )}

        {/* Table Section (for feeder / calls / lost tabs) */}
        {activeTab !== 'dashboard' && (
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200 uppercase text-[10px] md:text-[11px] font-black tracking-widest whitespace-nowrap">
                {activeTab === 'feeder' ? (
                  [
                    { label: 'Employee Details', key: 'employeeName' },
                    { label: 'To Details', key: 'toName' },
                    { label: 'Type', key: 'callType' },
                    { label: 'Duration', key: 'duration' },
                    { label: 'Date', key: 'callDate' },
                    { label: 'Time', key: 'callTime' },
                    { label: 'Notes', key: 'notes' },
                    { label: 'Audio', key: 'audioUrl' }
                  ].map((col) => (
                    <th 
                      key={col.key}
                      onClick={() => setSortConfig(prev => ({ 
                        key: (col.key as any) === 'callDate' || (col.key as any) === 'callTime' ? 'latest' : col.key as any, 
                        direction: prev.key === col.key && prev.direction === 'asc' ? 'desc' : 'asc' 
                      }))}
                      className="px-4 py-3 border-r border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 lg:justify-start">
                        {col.label}
                        {(sortConfig.key === col.key || (sortConfig.key === 'latest' && (col.key === 'callDate' || col.key === 'callTime'))) && (
                          <span className="text-[#FFD500] font-bold text-sm">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))
                ) : (
                  [
                    { label: 'Action', key: 'action' },
                    { label: 'Follow up info', key: 'latestStatus' },
                    { label: 'Last Order', key: 'lastOrderDate' },
                    { label: 'Party Details', key: 'partyName' },
                    { label: 'Contact Details', key: 'concernPerson' },
                    { label: 'Location Details', key: 'district' },
                    { label: 'Type', key: 'customerType' },
                    { label: 'Sales Person', key: 'salesPerson' }
                  ].map((col) => (
                    <th 
                      key={col.key}
                      onClick={() => col.key !== 'action' && setSortConfig(prev => ({ 
                        key: col.key, 
                        direction: prev.key === col.key && prev.direction === 'asc' ? 'desc' : 'asc' 
                      }))}
                      className={`px-4 py-3 border-r border-white/5 ${col.key !== 'action' ? 'cursor-pointer hover:bg-white/5' : ''} transition-colors`}
                    >
                      <div className="flex items-center gap-1.5 lg:justify-start">
                        {col.label}
                        {sortConfig.key === col.key && (
                          <span className="text-[#FFD500] font-bold text-sm">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={activeTab === 'feeder' ? 8 : 10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-[#FFD500] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Syncing with Sheet...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'feeder' ? 8 : 10} className="py-20 text-center">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest font-mono">No entries found</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {paginatedData.map((record: any, idx) => (
                    <motion.tr
                      key={activeTab === 'feeder' ? `${record.uniqueId}-${idx}` : `${record.partyName}-${idx}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: idx * 0.01 }}
                      className="hover:bg-orange-50/10 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors group cursor-default whitespace-nowrap"
                    >
                      {activeTab === 'feeder' ? (
                        <>
                          {/* Merged Employee Column */}
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[150px]">{record.employeeName}</p>
                            <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                               <PhoneIcon className="w-2.5 h-2.5" />
                               {record.employeeNumber}
                            </p>
                          </td>

                          {/* Merged To Column */}
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <p className="text-[13px] font-bold text-gray-700 dark:text-slate-300 truncate max-w-[150px]">{record.toName || "—"}</p>
                            <p className="text-[11px] font-mono font-bold text-gray-400 dark:text-slate-400 mt-0.5">
                              <span className="text-[10px] mr-1">+{record.countryCode}</span>
                              {record.toNumber}
                            </p>
                          </td>

                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                              record.callType.toLowerCase() === 'incoming' 
                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                : record.callType.toLowerCase() === 'outgoing'
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            }`}>
                              {record.callType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 font-bold text-[12px] text-gray-600 dark:text-slate-300">{record.duration}</td>
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 font-black text-[12px] text-[#003875] dark:text-[#FFD500]">{record.callDate}</td>
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 font-bold text-[11px] text-gray-400">{record.callTime}</td>
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 min-w-[160px]">
                            <p className="text-[12px] font-bold text-gray-500 dark:text-slate-400 line-clamp-1 italic truncate max-w-[220px]">{record.notes}</p>
                          </td>
                          <td className="px-4 py-2.5 text-center min-w-[70px]">
                            {record.audioUrl ? (
                              <a 
                                href={record.audioUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FFD500]/10 hover:bg-[#FFD500] text-[#003875] transition-all transform hover:scale-110 shadow-sm border border-[#FFD500]/20"
                              >
                                <MusicalNoteIcon className="w-4 h-4" />
                              </a>
                            ) : (
                              <MusicalNoteIcon className="w-4 h-4 text-gray-200 dark:text-slate-700 mx-auto" />
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 text-center border-r border-gray-100 dark:border-white/5">
                            <div className="flex items-center justify-center gap-1.5 transition-all">
                              <button 
                                onClick={() => setSelectedFollowUpParty(record)}
                                className="p-1.5 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all border border-emerald-200 dark:border-emerald-800/30 shadow-sm"
                                title={activeTab === 'lost' ? "Restart Follow Up" : "Follow Up"}
                              >
                                {activeTab === 'lost' ? (
                                  <ArrowPathIcon className="w-4 h-4" />
                                ) : (
                                  <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                )}
                              </button>
                              <button 
                                onClick={() => setEditingCall(record)}
                                className="p-1.5 bg-[#003875]/10 text-[#003875] dark:bg-[#FFD500]/10 dark:text-[#FFD500] hover:bg-[#003875] hover:text-white dark:hover:bg-[#FFD500] dark:hover:text-black rounded-lg transition-all border border-[#003875]/20 dark:border-[#FFD500]/20 shadow-sm"
                                title="Edit"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                              <div className="flex items-center gap-1.5">
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                   record.latestStatus === 'Order Won' 
                                   ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400'
                                   : record.latestStatus === 'Order Lost'
                                   ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400'
                                   : record.latestStatus === 'Not Answered'
                                   ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400'
                                   : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400'
                                 }`}>
                                   {record.latestStatus}
                                 </span>
                              </div>
                                 <div className="flex items-center gap-1.5">
                                    <ClockIcon className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] font-black text-[#003875] dark:text-[#FFD500]">
                                      {formatDisplayDate(getEffectiveFollowUpDate(record)) || "No Data"}
                                    </span>
                                 </div>
                               </div>
                             </td>

                             {/* Last Order Column */}
                             <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                               <div className="flex flex-col">
                                 <span className="text-[11px] font-black text-gray-700 dark:text-slate-300">{formatDisplayDate(record.lastOrderDate) || "—"}</span>
                               </div>
                             </td>

                          {/* Merged Party Column */}
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-navy-950 flex items-center justify-center border border-blue-100 dark:border-navy-700 shadow-sm shrink-0">
                                <FingerPrintIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase truncate flex items-center gap-1.5">
                                  {record.partyName}
                                  {activeTab === 'lost' && (
                                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black rounded uppercase tracking-tighter shadow-sm border border-rose-200">Lost</span>
                                  )}
                                </p>
                                <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 truncate mt-0.5 italic flex items-center gap-1">
                                  <DocumentTextIcon className="w-2.5 h-2.5" />
                                  {record.firmName}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Merged Contact Column */}
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-navy-950 flex items-center justify-center border border-emerald-100 dark:border-navy-700 shadow-sm shrink-0">
                                <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-bold text-gray-700 dark:text-slate-300 truncate">{record.concernPerson}</p>
                                <p className="text-[11px] font-bold text-gray-400 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                   <PhoneIcon className="w-2.5 h-2.5" />
                                   {record.mobileNum}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Merged Location Column */}
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-navy-950 flex items-center justify-center border border-orange-100 dark:border-navy-700 shadow-sm shrink-0">
                                <CalendarDaysIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-wider">{record.region}</p>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 truncate mt-0.5">
                                  {record.district}, {record.state}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-[11px] font-bold text-gray-600 dark:text-slate-400">{record.customerType}</td>
                          <td className="px-4 py-2.5 border-r border-gray-100 dark:border-white/5 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase truncate max-w-[120px]">{record.salesPerson}</td>
                        </>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Edit Call Modal */}
      {editingCall && (
        <Portal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#001736]/60 backdrop-blur-md" onClick={() => !isUpdating && setEditingCall(null)} />
            <div className="relative bg-white dark:bg-navy-900 w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-white/20 overflow-hidden">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 dark:border-navy-800 flex justify-between items-center bg-[#FFFBF0] dark:bg-navy-900">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Update Call Record</h2>
                  <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest mt-1">Party: {editingCall.partyName}</p>
                </div>
                <button onClick={() => setEditingCall(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <XMarkIcon className="w-8 h-8" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-8 bg-white dark:bg-navy-800/50 max-h-[75vh] overflow-y-auto">
                {/* Form Sections */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const updated: any = { ...editingCall };
                    formData.forEach((value, key) => {
                      updated[key] = value.toString();
                    });
                    handleUpdateCall(updated);
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { label: 'Concern Person', name: 'concernPerson', type: 'text' },
                      { label: 'Mobile Num', name: 'mobileNum', type: 'text' },
                      { label: 'Firm Name', name: 'firmName', type: 'text' },
                      { label: 'District', name: 'district', type: 'text' },
                      { label: 'State', name: 'state', type: 'text' },
                      { label: 'Region', name: 'region', type: 'text' },
                      { label: 'Credit Days (New)', name: 'creditDaysNew', type: 'text' },
                      { label: 'Limit', name: 'limit', type: 'text' },
                      { label: 'Collection Rating', name: 'collectionRating', type: 'text' },
                      { label: 'Customer Type', name: 'customerType', type: 'text' },
                      { label: 'Sales Person', name: 'salesPerson', type: 'text' },
                      { label: 'Sales Coordinator', name: 'salesCoordinator', type: 'text' },
                      { label: 'Average Order Size', name: 'averageOrderSize', type: 'text' },
                      { label: 'Target Avg Order Size', name: 'targetAvgOrderSize', type: 'text' },
                      { label: 'Usually NO OF Order MONTHLY', name: 'usuallyNoOfOrderMonthly', type: 'text' },
                      { label: 'Frequency of Calling', name: 'frequencyOfCallingAfterOrderPlaced', type: 'text' },
                    ].map((field) => (
                      <div key={field.name} className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{field.label}</label>
                          {((field.name === 'averageOrderSize' && editingCall?.isAvgDynamic) ||
                            (field.name === 'usuallyNoOfOrderMonthly' && editingCall?.isMonthlyDynamic) ||
                            (field.name === 'frequencyOfCallingAfterOrderPlaced' && editingCall?.isFreqDynamic)) && (
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded leading-none">Dynamic from O2D</span>
                          )}
                        </div>
                        {field.name === 'salesCoordinator' ? (
                          <SearchableSelect
                            options={users.map(u => ({ id: u.username, label: u.username }))}
                            value={editingCall.salesCoordinator}
                            onChange={(val) => setEditingCall({ ...editingCall, salesCoordinator: val })}
                            placeholder="Select Coordinator..."
                          />
                        ) : (
                          <input
                            type={field.type}
                            name={field.name}
                            defaultValue={(editingCall as any)[field.name]}
                            readOnly={(field.name === 'averageOrderSize' && editingCall?.isAvgDynamic) ||
                                     (field.name === 'usuallyNoOfOrderMonthly' && editingCall?.isMonthlyDynamic) ||
                                     (field.name === 'frequencyOfCallingAfterOrderPlaced' && editingCall?.isFreqDynamic)}
                            className={`w-full px-4 py-2.5 rounded-xl border outline-none text-[13px] font-bold transition-all shadow-sm ${
                              ((field.name === 'averageOrderSize' && editingCall?.isAvgDynamic) ||
                               (field.name === 'usuallyNoOfOrderMonthly' && editingCall?.isMonthlyDynamic) ||
                               (field.name === 'frequencyOfCallingAfterOrderPlaced' && editingCall?.isFreqDynamic))
                              ? 'bg-gray-100 dark:bg-navy-900 border-gray-200 dark:border-navy-800 text-gray-500 cursor-not-allowed italic'
                              : 'bg-[#FFFBF0] dark:bg-navy-950 border-orange-100 dark:border-navy-700/50 focus:border-[#003875] dark:focus:border-[#FFD500] text-gray-800 dark:text-white'
                            }`}
                          />
                        )}
                        {field.name === 'salesPerson' && <input type="hidden" name="salesPerson" value={editingCall.salesPerson} />}
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-8 flex justify-end gap-4 border-t border-gray-100 dark:border-navy-800">
                    <button
                      type="button"
                      onClick={() => setEditingCall(null)}
                      disabled={isUpdating}
                      className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-12 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-[#CE2029] dark:bg-rose-600 hover:shadow-xl transition-all active:scale-95 shadow-lg flex items-center gap-2"
                    >
                      {isUpdating ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Record"
                      )}
                    </button>
                  </div>
                </form>

                {/* Special Remarks JSON Editor */}
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-navy-800 space-y-4">
                   <h4 className="text-[11px] font-black text-[#CE2029] uppercase tracking-[0.2em] px-1">Special Remarks (JSON History)</h4>
                   <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          id="newRemarkInput"
                          placeholder="Add a new special remark..."
                          className="flex-1 bg-gray-50 dark:bg-navy-950 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-navy-700/50 outline-none text-[13px] font-bold"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('newRemarkInput') as HTMLInputElement;
                            if (!input.value.trim()) return;
                            
                            const existing = JSON.parse(editingCall.specialRemarkJSON || "[]");
                            const updated = [{ text: input.value.trim(), date: new Date().toLocaleDateString() }, ...existing];
                            handleUpdateCall({ ...editingCall, specialRemarkJSON: JSON.stringify(updated) });
                            input.value = "";
                          }}
                          className="px-6 py-2.5 bg-gray-900 text-white dark:bg-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          Add
                        </button>
                      </div>
                      
                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                         {JSON.parse(editingCall.specialRemarkJSON || "[]").map((rem: any, i: number) => (
                           <div key={i} className="p-3 bg-gray-50 dark:bg-navy-950 rounded-lg border border-gray-100 dark:border-navy-700/30 flex justify-between items-start gap-4">
                              <p className="text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed">{rem.text}</p>
                              <span className="text-[9px] font-black text-gray-400 shrink-0">{rem.date}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Follow-up Sidebar */}
      {selectedFollowUpParty && (
        <Portal>
          <div className="fixed inset-0 z-[99999] flex justify-end overflow-hidden">
            <div 
              className="absolute inset-0 bg-[#001736]/40 backdrop-blur-sm animate-in fade-in duration-300" 
              onClick={() => !isSavingFollowUp && setSelectedFollowUpParty(null)} 
            />
            <div className="relative w-full max-w-md bg-white dark:bg-navy-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-gray-100 dark:border-navy-800">
              
              {/* Sidebar Header */}
              <div className="bg-[#CE2029] dark:bg-rose-950 p-4 flex flex-col gap-1 text-white shrink-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-[#FFD500]" />
                    <h2 className="text-lg font-black uppercase tracking-tight">Follow Up</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedFollowUpParty(null)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <h3 className="text-lg font-black truncate mt-2">{selectedFollowUpParty.partyName}</h3>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Party Basic Info Section */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-navy-800 pb-2 flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" />
                    Complete Party Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Concern Person</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.concernPerson}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Mobile Number</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.mobileNum}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Firm Name</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-1">{selectedFollowUpParty.firmName}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Sales Person</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.salesPerson}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Sales Coordinator</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.salesCoordinator}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Customer Type</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.customerType}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Credit Limit / Rating</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">₹{selectedFollowUpParty.limit} <span className="text-[10px] text-gray-400 ml-1">({selectedFollowUpParty.collectionRating})</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Credit Days</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.creditDaysNew} Days</p>
                    </div>
                    <div className="col-span-2">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Location Details</p>
                       <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.region} - {selectedFollowUpParty.district}, {selectedFollowUpParty.state}</p>
                    </div>
                    
                    <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-navy-800">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Statistics</p>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Average Order Size</p>
                            <p className="text-xs font-bold text-[#CE2029]">₹{selectedFollowUpParty.averageOrderSize}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Target Order Size</p>
                            <p className="text-xs font-bold text-emerald-600">₹{selectedFollowUpParty.targetAvgOrderSize}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Monthly Orders</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{selectedFollowUpParty.usuallyNoOfOrderMonthly}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Call Frequency</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Once in {selectedFollowUpParty.frequencyOfCallingAfterOrderPlaced} Days</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-navy-800 pb-2">Action Update</h4>
                  
                  {/* Status Buttons */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Select Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'Not Answered', color: 'border-orange-200 text-orange-600 bg-orange-50/50 hover:bg-orange-50' },
                        { id: 'Call Later', color: 'border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50' },
                        { id: 'Order Won', color: 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50' },
                        { id: 'Order Lost', color: 'border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setFollowUpStatus(s.id)}
                          className={`px-3 py-2.5 rounded-xl border-2 text-[11px] font-black uppercase tracking-tight transition-all text-center ${
                            followUpStatus === s.id 
                            ? 'bg-[#CE2029] border-[#CE2029] text-white shadow-lg transform scale-105' 
                            : `${s.color} dark:bg-navy-800 dark:border-navy-700 dark:text-slate-300`
                          }`}
                        >
                          {s.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {followUpStatus === 'Call Later' || followUpStatus === 'Order Won' ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden pt-2"
                      >
                         {followUpStatus === 'Order Won' && (
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Follow-up Type</label>
                             <div className="flex p-1 bg-gray-100 dark:bg-navy-950 rounded-xl gap-1">
                                <button 
                                  onClick={() => setFollowUpType('frequency')}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${followUpType === 'frequency' ? 'bg-white dark:bg-navy-800 shadow-sm text-[#CE2029] dark:text-rose-500' : 'text-gray-400'}`}
                                >
                                  By Frequency
                                </button>
                                <button 
                                  onClick={() => setFollowUpType('manual')}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${followUpType === 'manual' ? 'bg-white dark:bg-navy-800 shadow-sm text-[#CE2029] dark:text-rose-500' : 'text-gray-400'}`}
                                >
                                  Manual
                                </button>
                             </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            {followUpStatus === 'Order Won' ? 'Next Follow-up Date' : 'Callback Date'}
                          </label>
                          <div 
                            className="relative group cursor-pointer"
                            onClick={(e) => {
                              const input = e.currentTarget.querySelector('input');
                              if (input && (input as any).showPicker) {
                                (input as any).showPicker();
                              }
                            }}
                          >
                            <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#CE2029] transition-colors pointer-events-none" />
                            <input 
                              type="date"
                              value={followUpDate}
                              readOnly={followUpStatus === 'Order Won' && followUpType === 'frequency'}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              onClick={(e) => (e.target as any).showPicker?.()}
                              className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-navy-950 border border-gray-100 dark:border-navy-700/50 rounded-xl focus:border-[#CE2029] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm cursor-pointer ${followUpStatus === 'Order Won' && followUpType === 'frequency' ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                            {followUpStatus === 'Order Won' && followUpType === 'frequency' && (
                              <p className="text-[9px] font-bold text-[#CE2029] mt-1 px-1">* Calculated using {selectedFollowUpParty?.frequencyOfCallingAfterOrderPlaced || '30'} days frequency</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ) : followUpStatus === 'Not Answered' ? (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl"
                      >
                         <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                           <ClockIcon className="w-4 h-4" />
                           Next follow-up automatically set to tomorrow: <span className="font-black underline">{followUpDate}</span>
                         </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Remarks / Notes</label>
                    <textarea 
                      rows={4}
                      value={followUpRemarks}
                      onChange={(e) => setFollowUpRemarks(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-navy-950 border border-gray-100 dark:border-navy-700/50 rounded-xl focus:border-[#CE2029] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm resize-none"
                      placeholder="Add conversation notes..."
                    />
                  </div>
                </div>
                {/* Follow-up History Section */}
                <div className="space-y-4 pt-6 mt-6 border-t border-gray-100 dark:border-navy-800">
                   <h4 className="text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-[0.2em] px-1 flex items-center justify-between">
                     <span>Follow-up History</span>
                     {isLoadingHistory && <div className="w-3 h-3 border-2 border-[#003875] border-t-transparent rounded-full animate-spin" />}
                   </h4>
                   
                   <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                     {followUpHistory.length > 0 ? (
                       followUpHistory.map((history, i) => (
                         <div key={i} className="relative pl-6 pb-4 last:pb-0">
                           {/* Timeline line */}
                           {i !== followUpHistory.length - 1 && (
                             <div className="absolute left-[7px] top-[18px] bottom-0 w-[2px] bg-gray-100 dark:bg-navy-800" />
                           )}
                           {/* Timeline dot */}
                           <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-white dark:bg-navy-900 border-2 border-[#003875] dark:border-[#FFD500] z-10" />
                           
                           <div className="p-3 bg-gray-50/50 dark:bg-navy-950/50 rounded-xl border border-gray-100 dark:border-navy-800/50">
                             <div className="flex justify-between items-start mb-2">
                               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                 history.status === 'Order Won' ? 'bg-emerald-100 text-emerald-700' :
                                 history.status === 'Order Lost' ? 'bg-rose-100 text-rose-700' :
                                 history.status === 'Not Answered' ? 'bg-orange-100 text-orange-700' :
                                 'bg-blue-100 text-blue-700'
                               }`}>
                                 {history.status}
                               </span>
                               <span className="text-[9px] font-black text-gray-400">
                                 {new Date(history.createdAt).toLocaleDateString()}
                               </span>
                             </div>
                             
                             <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold leading-relaxed mb-2 italic">
                               "{history.remarks || "No remarks provided"}"
                             </p>
                             
                             <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-navy-800">
                               <UserIcon className="w-3 h-3 text-gray-400" />
                               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Update by: {history.createdBy}</span>
                             </div>
                           </div>
                         </div>
                       ))
                     ) : !isLoadingHistory && (
                       <div className="py-8 text-center bg-gray-50/30 dark:bg-navy-950/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-navy-800">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No previous history found</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Direct Call Logs (Feeder) Section */}
                <div className="space-y-4 pt-6 mt-6 border-t border-gray-100 dark:border-navy-800">
                   <h4 className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] px-1 flex items-center justify-between">
                     <span>Direct Call Logs (Feeder)</span>
                     {isLoadingHistory && <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />}
                   </h4>
                   
                   <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {feederLogs.length > 0 ? (
                       feederLogs.map((log, i) => (
                         <div key={i} className="p-3 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-800/20">
                            <div className="flex justify-between items-center mb-1">
                               <span className={`text-[10px] font-black uppercase tracking-widest ${
                                 log.callType.toLowerCase().includes('inbound') ? 'text-blue-600 dark:text-blue-400' :
                                 log.callType.toLowerCase().includes('missed') ? 'text-rose-600 dark:text-rose-400' :
                                 'text-emerald-600 dark:text-emerald-400'
                               }`}>
                                 {log.callType || "Outbound"}
                               </span>
                               <span className="text-[9px] font-black text-gray-400">
                                 {log.callDate} {log.callTime}
                               </span>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                               <div className="flex items-center gap-1.5">
                                 <UserIcon className="w-3 h-3 text-gray-400" />
                                 <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{log.employeeName}</span>
                               </div>
                               <span className="text-[10px] font-bold text-gray-500 bg-white dark:bg-navy-900 px-2 py-0.5 rounded border border-gray-100 dark:border-navy-700">
                                 {log.duration || "0:00"}
                               </span>
                            </div>
                            {log.notes && log.notes.trim() !== "" && (
                               <p className="mt-2 text-[10px] text-gray-500 italic bg-white/50 dark:bg-navy-900/50 p-2 rounded border border-gray-100 dark:border-navy-700/50">
                                 {log.notes}
                               </p>
                            )}
                         </div>
                       ))
                     ) : !isLoadingHistory && (
                       <div className="py-8 text-center bg-gray-50/30 dark:bg-navy-950/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-navy-800">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No direct call logs found</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Special Remarks History View in Sidebar */}
                {selectedFollowUpParty.specialRemarkJSON && JSON.parse(selectedFollowUpParty.specialRemarkJSON || "[]").length > 0 && (
                  <div className="space-y-4 pt-6 mt-6 border-t border-gray-100 dark:border-navy-800">
                     <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                     <DocumentTextIcon className="w-4 h-4 text-rose-500" />
                     Special Remarks History
                     </h4>
                     <div className="space-y-3">
                       {JSON.parse(selectedFollowUpParty.specialRemarkJSON || "[]").map((rem: any, i: number) => (
                         <div key={i} className="p-3 bg-rose-50/30 dark:bg-rose-900/10 rounded-xl border border-rose-100/50 dark:border-rose-800/20">
                            <p className="text-xs text-rose-800 dark:text-rose-200 font-bold leading-relaxed italic">"{rem.text}"</p>
                            <p className="text-[9px] font-black text-rose-400 uppercase mt-2">{rem.date}</p>
                         </div>
                       ))}
                     </div>
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-3 bg-gray-50 dark:bg-navy-950 border-t border-gray-100 dark:border-navy-800 shrink-0 flex gap-3">
                <button 
                  onClick={() => setSelectedFollowUpParty(null)}
                  disabled={isSavingFollowUp}
                  className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveFollowUp}
                  disabled={isSavingFollowUp || !followUpStatus}
                  className="w-full py-4 rounded-2xl bg-[#CE2029] dark:bg-rose-600 text-white text-[13px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSavingFollowUp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Submit Follow Up"
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Missing Parties Modal */}
      {showMissingPartiesModal && (
        <Portal>
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#001736]/60 backdrop-blur-md" onClick={() => setShowMissingPartiesModal(false)} />
            <div className="relative bg-white dark:bg-navy-900 w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-white/20 overflow-hidden">
               <div className="px-8 py-6 border-b border-gray-100 dark:border-navy-800 flex justify-between items-center bg-[#FFFBF0] dark:bg-navy-900">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Add Untracked Parties</h2>
                    <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest mt-1">Found in Party Management but not in Scot</p>
                  </div>
                  <button onClick={() => setShowMissingPartiesModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <XMarkIcon className="w-8 h-8" />
                  </button>
               </div>
               
               <div className="p-8 max-h-[60vh] overflow-y-auto space-y-2">
                 {partyManagementParties
                   .filter(pm => !callsData.some(c => c.partyName?.trim().toLowerCase() === pm.partyName?.trim().toLowerCase()))
                   .length > 0 ? (
                   partyManagementParties
                     .filter(pm => !callsData.some(c => c.partyName?.trim().toLowerCase() === pm.partyName?.trim().toLowerCase()))
                     .map((pm, idx) => (
                       <button
                         key={idx}
                         onClick={() => {
                           setEditingCall({
                             partyName: pm.partyName,
                             customerType: pm.customerType,
                             salesPerson: pm.salePersonName,
                             concernPerson: "", mobileNum: "", firmName: pm.partyName, district: "", state: "", region: "", creditDaysNew: "0", limit: "0", collectionRating: "5", salesCoordinator: "", averageOrderSize: "0", targetAvgOrderSize: "", usuallyNoOfOrderMonthly: "0", frequencyOfCallingAfterOrderPlaced: "30", specialRemarkJSON: "[]"
                           });
                           setShowMissingPartiesModal(false);
                         }}
                         className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-navy-800/50 hover:bg-[#FFD500]/10 hover:border-[#FFD500] border border-transparent transition-all group"
                       >
                         <div className="text-left">
                           <p className="text-[13px] font-bold text-gray-900 dark:text-white group-hover:text-[#CE2029]">{pm.partyName}</p>
                           <div className="flex gap-2 mt-1">
                             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{pm.customerType}</span>
                             <span className="text-[9px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest">• {pm.salePersonName}</span>
                           </div>
                         </div>
                         <PlusIcon className="w-5 h-5 text-gray-300 group-hover:text-[#CE2029]" />
                       </button>
                     ))
                 ) : (
                   <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                        <UserGroupIcon className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">All parties are already added!</p>
                   </div>
                 )}
               </div>

               <div className="p-4 bg-gray-50 dark:bg-navy-950/50 flex justify-center border-t border-gray-100 dark:border-navy-800">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Data updated automatically from Party Management</p>
               </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
