"use client";

import { useState, useEffect, useRef } from "react";
import { PartyManagement } from "@/types/party-management";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  TagIcon,
  UserIcon,
  BriefcaseIcon,
  Bars3BottomLeftIcon,
  IdentificationIcon,
  QueueListIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

import PartyFormModal, {
  FIRST_ORDER_ITEMS_OPTIONS,
  DETAILS_INSTRUCTIONS_OPTIONS
} from "@/components/PartyFormModal";

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function PartyManagementPage() {
  const [parties, setParties] = useState<PartyManagement[]>([]);
  const { data: swrParties, mutate: mutateParties } = useSWR<PartyManagement[]>("/api/party-management", fetcher, {
    refreshInterval: 60000,
  });

  useEffect(() => {
    if (swrParties) {
      setParties(swrParties);
    }
  }, [swrParties]);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<PartyManagement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof PartyManagement; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: session } = useSession();

  const [actionStatus, setActionStatus] = useState<"loading" | "success" | "error">("loading");
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewModalTitle, setViewModalTitle] = useState("");
  const [viewModalItems, setViewModalItems] = useState<string[]>([]);
  const [viewModalBaseOptions, setViewModalBaseOptions] = useState<string[]>([]);

  const handleViewItems = (title: string, itemsString: string, baseOptions: string[]) => {
    setViewModalTitle(title);
    setViewModalItems(itemsString ? itemsString.split(",").map(i => i.trim()).filter(Boolean) : []);
    setViewModalBaseOptions(baseOptions);
    setIsViewModalOpen(true);
  };

  useEffect(() => {
    if (!swrParties && parties.length === 0) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [swrParties, parties]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const openFormForNew = () => {
    setEditingParty(null);
    setIsModalOpen(true);
  };

  const openFormForEdit = (party: PartyManagement) => {
    setEditingParty(party);
    setIsModalOpen(true);
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────────
  const fetchParties = async () => {
    mutateParties();
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setIsConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;
    setActionStatus("loading");
    setActionMessage("Removing party from system...");
    setIsStatusModalOpen(true);
    try {
      const res = await fetch(`/api/party-management/${pendingDeleteId}`, { method: "DELETE" });
      if (res.ok) { setIsStatusModalOpen(false); mutateParties(); }
      else throw new Error("Delete failed");
    } catch {
      setIsStatusModalOpen(false);
      alert("Failed to delete party. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["ID", "Timestamp", "Customer Type", "Party Name", "Date of Birth", "Party Type", "Sales Funnel Unique Num", "Sale Person Name", "Add following items with First order :", "Details and Instructions :", "Remarks", "Filled By"];
    const rows = sortedParties.map((p) => [
      p.id, 
      p.timestamp ? new Date(p.timestamp).toLocaleString("en-GB", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "",
      p.customerType, 
      p.partyName, 
      p.dateOfBirth,
      p.partyType, 
      p.salesFunnelUniqueNum, 
      p.salePersonName, 
      p.firstOrderItems, 
      p.detailsAndInstructions, 
      p.remarks, 
      p.filledBy
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `party_management_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Filter / Sort / Paginate ─────────────────────────────────────────────────
  const filteredParties = parties.filter((p) =>
    Object.values(p).some((val) => val?.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSort = (key: keyof PartyManagement) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedParties = [...filteredParties].sort((a, b) => {
    // Default to sorting by ID descending (latest first) if no active sort column
    if (!sortConfig) {
      const aN = parseInt(String(a.id));
      const bN = parseInt(String(b.id));
      if (!isNaN(aN) && !isNaN(bN)) return bN - aN;
      return 0;
    }
    
    const { key, direction } = sortConfig;
    let aV = a[key] || ""; let bV = b[key] || "";
    if (key === "id") { const aN = parseInt(String(aV)); const bN = parseInt(String(bV)); if (!isNaN(aN) && !isNaN(bN)) return direction === "asc" ? aN - bN : bN - aN; }
    if (aV < bV) return direction === "asc" ? -1 : 1;
    if (aV > bV) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof PartyManagement }) => {
    if (sortConfig?.key !== column) return <div className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === "asc"
      ? <ChevronUpIcon className="w-3 h-3 ml-1 text-[#FFD500]" />
      : <ChevronDownIcon className="w-3 h-3 ml-1 text-[#FFD500]" />;
  };

  const totalPages = Math.ceil(sortedParties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParties = sortedParties.slice(startIndex, startIndex + itemsPerPage);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 mb-2">
        <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
          <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Party Management</h1>
            <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Customer &amp; Client Directory</p>
          </div>
          <div className="w-full lg:w-1/3 flex justify-center flex-shrink-0 min-w-0">
            <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar max-w-full">
              <button className="flex items-center gap-2 px-3 md:px-5 py-1.5 font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all rounded-full whitespace-nowrap bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-md" title="Party List">
                <UserGroupIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Party List</span>
                <span className="sm:hidden">Parties</span>
              </button>
              <button onClick={handleExport} className="flex items-center justify-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 md:px-5 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[9px] md:text-[10px] rounded-full whitespace-nowrap" title="Export to CSV">
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={openFormForNew} className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 transition-colors rounded-full" title="Add Party">
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="hidden lg:block lg:w-1/3"></div>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ borderColor: "var(--panel-border)" }} className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500">
        {/* Controls */}
        <div style={{ backgroundColor: "var(--panel-card)", borderBottom: "1px solid var(--panel-border)" }} className="px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative group flex-1 max-w-full lg:max-w-sm">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
            <input type="text" placeholder="Search database..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-navy-900 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of {totalPages || 1}</p>
              <div className="flex gap-0.5">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap">First</button>
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"><ChevronLeftIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"><ChevronRightIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-1.5 py-1 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all whitespace-nowrap">Last</button>
              </div>
            </div>
            <div className="hidden xs:block h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Show</label>
              <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "var(--panel-card)" }} className="overflow-x-auto transition-colors duration-500">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200">
                <th onClick={() => handleSort("partyName")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"><div className="flex items-center">Party Name <SortIcon column="partyName" /></div></th>
                <th onClick={() => handleSort("dateOfBirth")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"><div className="flex items-center">DOB <SortIcon column="dateOfBirth" /></div></th>
                <th onClick={() => handleSort("customerType")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden sm:table-cell"><div className="flex items-center">Customer Type <SortIcon column="customerType" /></div></th>
                <th onClick={() => handleSort("partyType")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden md:table-cell"><div className="flex items-center">Party Type <SortIcon column="partyType" /></div></th>
                <th onClick={() => handleSort("salePersonName")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden lg:table-cell"><div className="flex items-center">Sales Person <SortIcon column="salePersonName" /></div></th>
                <th onClick={() => handleSort("salesFunnelUniqueNum")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden xl:table-cell"><div className="flex items-center">SF Num <SortIcon column="salesFunnelUniqueNum" /></div></th>
                <th className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden xl:table-cell">1st Order</th>
                <th className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden 2xl:table-cell">Details</th>
                <th onClick={() => handleSort("filledBy")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden 2xl:table-cell"><div className="flex items-center">Filled By <SortIcon column="filledBy" /></div></th>
                <th onClick={() => handleSort("timestamp")} className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors hidden lg:table-cell"><div className="flex items-center">Timestamp <SortIcon column="timestamp" /></div></th>
                <th className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50/30">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center"><div className="w-6 h-6 border-2 border-gray-100 border-t-[#FFD500] rounded-full animate-spin mx-auto mb-2" /><p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Syncing...</p></td></tr>
              ) : paginatedParties.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center"><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No entries found</p></td></tr>
              ) : (
                paginatedParties.map((party) => (
                  <tr key={party.id} className="hover:bg-orange-50/10 border-b-2 border-gray-200 dark:border-white/10 last:border-0 transition-colors group">
                    <td className="px-3 md:px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-black text-[11px] md:text-xs text-gray-900 dark:text-white leading-tight truncate">{party.partyName || "Unnamed Party"}</p>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-xs font-bold text-gray-600 dark:text-slate-300">
                      {party.dateOfBirth || "—"}
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 bg-orange-50 dark:bg-[#FFD500]/10 text-[#CE2029] dark:text-[#FFD500] text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-md border border-orange-100 dark:border-[#FFD500]/20">{party.customerType || "—"}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden md:table-cell"><p className="text-[11px] md:text-xs font-bold text-gray-600 dark:text-slate-300">{party.partyType || "—"}</p></td>
                    <td className="px-3 md:px-4 py-3 hidden lg:table-cell"><p className="text-[11px] md:text-xs font-bold text-gray-600 dark:text-slate-300">{party.salePersonName || "—"}</p></td>
                    <td className="px-3 md:px-4 py-3 hidden xl:table-cell"><span className="font-mono text-xs font-bold text-gray-500">{party.salesFunnelUniqueNum || "—"}</span></td>
                    <td className="px-3 md:px-4 py-3 hidden xl:table-cell">
                      <button onClick={() => handleViewItems("Add following items with First order :", party.firstOrderItems, FIRST_ORDER_ITEMS_OPTIONS)} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-[#003875] dark:hover:text-[#FFD500] rounded-md transition-colors text-[10px] font-black uppercase">
                        <EyeIcon className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden 2xl:table-cell">
                      <button onClick={() => handleViewItems("Details and Instructions :", party.detailsAndInstructions, DETAILS_INSTRUCTIONS_OPTIONS)} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-[#003875] dark:hover:text-[#FFD500] rounded-md transition-colors text-[10px] font-black uppercase">
                        <EyeIcon className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden 2xl:table-cell"><p className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 inline-block px-1.5 py-0.5 rounded">{party.filledBy || "—"}</p></td>
                    <td className="px-3 md:px-4 py-3 hidden lg:table-cell">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                        {party.timestamp ? new Date(party.timestamp).toLocaleString("en-GB", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "—"}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openFormForEdit(party)} className="p-1.5 bg-[#003875]/10 text-[#003875] dark:bg-[#FFD500]/10 dark:text-[#FFD500] hover:bg-[#003875] hover:text-white dark:hover:bg-[#FFD500] dark:hover:text-black rounded-lg transition-all" title="Edit Party"><PencilSquareIcon className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteClick(party.id)} className="p-1.5 bg-[#CE2029]/10 text-[#CE2029] hover:bg-[#CE2029] hover:text-white rounded-lg transition-all" title="Delete Party"><TrashIcon className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal ──────────────────────────────────────────────────────────────── */}
      <PartyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          mutateParties();
        }}
        editingParty={editingParty}
        salePersonName={session?.user?.name || ""}
      />

      <ActionStatusModal isOpen={isStatusModalOpen} status={actionStatus} message={actionMessage} />
      <ConfirmModal isOpen={isConfirmOpen} title="Delete Party?" message="This action cannot be undone. The party data will be permanently removed from the system." confirmLabel="Delete Party" onClose={() => setIsConfirmOpen(false)} onConfirm={performDelete} />

      {/* ─── View Items Modal ─────────────────────────────────────────────────── */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)} />
          <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-orange-100/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-4 border-b border-orange-100/50 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{viewModalTitle}</h2>
                <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest mt-1">Selected Items</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <ul className="space-y-2">
                {viewModalBaseOptions.map((item, i) => {
                  const submittedItem = viewModalItems.find(vi => vi === item || vi.startsWith(`${item} (Qty:`));
                  const isSubmitted = !!submittedItem;
                  return (
                    <li key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border shadow-sm text-xs font-bold transition-colors ${
                      isSubmitted 
                        ? "bg-[#FFFBF0] dark:bg-zinc-800 border-[#FFD500] text-gray-900 dark:text-white"
                        : "bg-gray-50 dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-500"
                    }`}>
                      <span className={`mt-0.5 w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center transition-colors ${
                        isSubmitted ? "bg-[#FFD500] text-black" : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                      }`}>
                        {isSubmitted && (
                          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </span>
                      <div className="flex-1">
                        {isSubmitted ? submittedItem : item}
                      </div>
                      {!isSubmitted && (
                        <span className="text-[9px] uppercase tracking-widest font-black text-gray-300 dark:text-zinc-600">Pending</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="p-4 border-t border-orange-100/50 dark:border-zinc-800">
              <button type="button" onClick={() => setIsViewModalOpen(false)} className="w-full bg-[#003875] dark:bg-[#FFD500] hover:bg-[#002855] dark:hover:bg-[#E6C000] text-white dark:text-black px-4 py-2.5 rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
