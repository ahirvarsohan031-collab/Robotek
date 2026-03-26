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

// ─── Constants ──────────────────────────────────────────────────────────────────
const CUSTOMER_TYPES = ["NEW", "OLD", "Factory Customer"] as const;
type CustomerTypeValue = typeof CUSTOMER_TYPES[number];

const PARTY_TYPE_OPTIONS = ["NBD Incoming", "NBD Outgoing", "Other"] as const;

const FIRST_ORDER_ITEMS_OPTIONS = [
  "T Shirt",
  "Note Pad",
  "Pen",
  "Thele",
  "Tape Roll",
  "Posters",
  "Catalogue",
];

const DETAILS_INSTRUCTIONS_OPTIONS = [
  "Whatsapp Catalogue shared",
  "Welcome Email & WhatsApp Message",
  "Support Team Info Shared",
  "Created Whats'App Group",
  "Added Customer in Busy and Goolge Sheet & GST details and Billing Details",
  "Cargo Details Updated in sheet",
  "Packing Instructions",
  "Disital Visiting Card",
  "Authorised Distributor Certificate creative",
  "Glow Shine Board",
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
const parseChecked = (value: string | undefined): Set<string> =>
  new Set((value || "").split(",").map((s) => s.trim()).filter(Boolean));

const setToString = (s: Set<string>): string => Array.from(s).join(", ");

// ─── Checkbox Group ─────────────────────────────────────────────────────────────
function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: Set<string>;
  onChange: (updated: Set<string>) => void;
}) {
  const toggle = (option: string) => {
    const next = new Set(selected);
    next.has(option) ? next.delete(option) : next.add(option);
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
      {options.map((opt) => {
        const checked = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 text-left transition-all text-[11px] font-bold w-full ${
              checked
                ? "bg-[#FFD500] border-[#FFD500] text-black shadow-sm"
                : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-[#FFD500]/60 hover:bg-[#FFD500]/5"
            }`}
          >
            {/* Custom checkbox box */}
            <span
              className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                checked
                  ? "bg-black border-black"
                  : "bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600"
              }`}
            >
              {checked && (
                <svg className="w-2.5 h-2.5 text-[#FFD500]" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 5L4 7.5L8.5 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="leading-tight">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Searchable Dropdown ─────────────────────────────────────────────────────────
function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm flex items-center justify-between gap-2"
      >
        <span className={value ? "text-gray-800 dark:text-zinc-100" : "text-gray-400 dark:text-zinc-500"}>
          {value || placeholder || "Select..."}
        </span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search box */}
          <div className="p-2 border-b border-orange-100 dark:border-zinc-800">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 text-xs font-bold bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md outline-none focus:border-[#FFD500] text-gray-800 dark:text-zinc-100"
            />
          </div>
          {/* Options */}
          <ul className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">No results</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`px-3 py-2 text-xs font-bold cursor-pointer transition-colors ${
                    value === opt
                      ? "bg-[#FFD500]/20 text-black dark:text-white"
                      : "hover:bg-[#FFD500]/10 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

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

  // User list for Sale Person dropdown
  const [usernames, setUsernames] = useState<string[]>([]);
  const { data: session } = useSession();

  // Form UI state
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerTypeValue>("NEW");
  const [selectedPartyType, setSelectedPartyType] = useState<string>("");
  const [customPartyType, setCustomPartyType] = useState<string>("");
  const [selectedFirstOrderItems, setSelectedFirstOrderItems] = useState<Set<string>>(new Set());
  const [selectedDetailsInstructions, setSelectedDetailsInstructions] = useState<Set<string>>(new Set());

  const emptyForm: Partial<PartyManagement> = {
    id: "",
    customerType: "",
    partyName: "",
    partyType: "",
    salesFunnelUniqueNum: "",
    salePersonName: "",
    firstOrderItems: "",
    detailsAndInstructions: "",
    remarks: "",
    filledBy: "",
    timestamp: "",
  };

  const [formData, setFormData] = useState<Partial<PartyManagement>>(emptyForm);
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
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!swrParties && parties.length === 0) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [swrParties, parties]);

  const isNewCustomer = selectedCustomerType === "NEW";

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const resetFormUI = () => {
    setSelectedCustomerType("NEW");
    setSelectedPartyType("");
    setCustomPartyType("");
    setSelectedFirstOrderItems(new Set());
    setSelectedDetailsInstructions(new Set());
  };

  const openFormForNew = () => {
    setEditingParty(null);
    setFormData({ 
      ...emptyForm, 
      id: Date.now().toString(),
      filledBy: session?.user?.name || "",
      timestamp: new Date().toISOString()
    });
    resetFormUI();
    setIsModalOpen(true);
  };

  const openFormForEdit = (party: PartyManagement) => {
    setEditingParty(party);
    setFormData(party);
    const ct = (party.customerType || "NEW") as CustomerTypeValue;
    setSelectedCustomerType(CUSTOMER_TYPES.includes(ct) ? ct : "NEW");
    const pt = party.partyType || "";
    if (pt === "NBD Incoming" || pt === "NBD Outgoing") {
      setSelectedPartyType(pt);
      setCustomPartyType("");
    } else if (pt) {
      setSelectedPartyType("Other");
      setCustomPartyType(pt);
    } else {
      setSelectedPartyType("");
      setCustomPartyType("");
    }
    setSelectedFirstOrderItems(parseChecked(party.firstOrderItems));
    setSelectedDetailsInstructions(parseChecked(party.detailsAndInstructions));
    setIsModalOpen(true);
  };

  const buildSubmitPayload = (): Partial<PartyManagement> => ({
    ...formData,
    customerType: selectedCustomerType,
    partyType: selectedPartyType === "Other" ? customPartyType : selectedPartyType,
    firstOrderItems: setToString(selectedFirstOrderItems),
    detailsAndInstructions: setToString(selectedDetailsInstructions),
  });

  // ─── Data Fetching ────────────────────────────────────────────────────────────
  const fetchParties = async () => {
    mutateParties();
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const names: string[] = (data as any[]).map((u: any) => u.username).filter(Boolean);
      setUsernames(names);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus("loading");
    setActionMessage(editingParty ? "Updating party details..." : "Creating new party...");
    setIsStatusModalOpen(true);

    const payload = buildSubmitPayload();
    const method = editingParty ? "PUT" : "POST";
    const url = editingParty ? `/api/party-management/${editingParty.id}` : "/api/party-management";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsStatusModalOpen(false);
        setIsModalOpen(false);
        setEditingParty(null);
        setFormData(emptyForm);
        resetFormUI();
        mutateParties();
      } else throw new Error("Failed");
    } catch {
      setIsStatusModalOpen(false);
      alert("Something went wrong while saving. Please try again.");
    }
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
    const headers = ["ID", "Timestamp", "Customer Type", "Party Name", "Party Type", "Sales Funnel Unique Num", "Sale Person Name", "Add following items with First order :", "Details and Instructions :", "Remarks", "Filled By"];
    const rows = sortedParties.map((p) => [
      p.id, 
      p.timestamp ? new Date(p.timestamp).toLocaleString("en-GB", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "",
      p.customerType, 
      p.partyName, 
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Party Management</h1>
            <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">Customer &amp; Client Directory</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar">
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
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-orange-100/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-orange-100/50 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{editingParty ? "Edit Party" : "Add New Party"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest">Party Configuration</p>
                  {editingParty && <span className="px-2 py-0.5 bg-orange-50 dark:bg-zinc-800 text-[8px] font-black text-gray-500 rounded border border-orange-100 dark:border-zinc-700">ID: {editingParty.id}</span>}
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"><XMarkIcon className="w-8 h-8" /></button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-5 max-h-[80vh] overflow-y-auto bg-white dark:bg-navy-800/50">

              {/* Customer Type Toggle */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  <TagIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                  Customer Type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CUSTOMER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedCustomerType(type)}
                      className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        selectedCustomerType === type
                          ? "bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-md"
                          : "bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:border-[#003875] dark:hover:border-[#FFD500]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Party Name – always visible */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  <UserIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                  Party Name
                </label>
                <input type="text" value={formData.partyName} onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm" required />
              </div>

              {/* NEW-only fields */}
              {isNewCustomer && (
                <>
                  {/* Party Type – radio */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      <BriefcaseIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                      Party Type
                    </label>
                    <div className="space-y-2">
                      {PARTY_TYPE_OPTIONS.map((opt) => {
                        const isSelected = selectedPartyType === opt;
                        return (
                          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                            <span onClick={() => setSelectedPartyType(opt)}
                              className={`w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-[#003875] dark:border-[#FFD500]" : "border-gray-300 dark:border-zinc-600 group-hover:border-[#003875] dark:group-hover:border-[#FFD500]"}`}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-[#003875] dark:bg-[#FFD500]" />}
                            </span>
                            <span onClick={() => setSelectedPartyType(opt)}
                              className={`text-xs font-bold transition-colors ${isSelected ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200"}`}>
                              {opt === "Other" ? "Other (Custom Input)" : opt}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedPartyType === "Other" && (
                      <input type="text" value={customPartyType} onChange={(e) => setCustomPartyType(e.target.value)} placeholder="Enter custom party type..."
                        className="mt-3 w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm" />
                    )}
                  </div>

                  {/* Sales Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        <Bars3BottomLeftIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                        Sales Funnel Unique Num
                      </label>
                      <input type="text" value={formData.salesFunnelUniqueNum} onChange={(e) => setFormData({ ...formData, salesFunnelUniqueNum: e.target.value })}
                        className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        <IdentificationIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                        Sale Person Name
                      </label>
                      <SearchableDropdown
                        options={usernames}
                        value={formData.salePersonName || ""}
                        onChange={(val) => setFormData({ ...formData, salePersonName: val })}
                        placeholder="Select sales person..."
                      />
                    </div>
                  </div>

                  {/* First Order Items */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      <QueueListIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                      Add following items with First order :
                    </label>
                    <CheckboxGroup options={FIRST_ORDER_ITEMS_OPTIONS} selected={selectedFirstOrderItems} onChange={setSelectedFirstOrderItems} />
                  </div>

                  {/* Details and Instructions */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      <DocumentTextIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                      Details and Instructions :
                    </label>
                    <CheckboxGroup options={DETAILS_INSTRUCTIONS_OPTIONS} selected={selectedDetailsInstructions} onChange={setSelectedDetailsInstructions} />
                  </div>
                </>
              )}

              {/* Remarks – always visible */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 text-[#FFFBF0]" />
                  Remarks
                </label>
                <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-[#FFFBF0] dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-zinc-800 focus:border-[#FFD500] focus:bg-white dark:focus:bg-zinc-900 outline-none font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm resize-y min-h-[60px]" />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-orange-100/50 dark:border-zinc-800 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl font-black text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#CE2029] hover:bg-[#8E161D] text-white px-4 py-2 rounded-xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]">
                  {editingParty ? "Save changes" : "Create party"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  const isSubmitted = viewModalItems.includes(item);
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
                        {item}
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
