"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { I2R, I2RStepConfig, I2R_STEPS } from "@/types/i2r";
import useSWR from "swr";
import { useSSE } from "@/hooks/useSSE";
import { applyIncrementalUpdate } from "@/lib/utils/swr-sync";
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
  Cog6ToothIcon,
  ClockIcon,
  CheckCircleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const I2R_STEP_SHORT = [
  "Get Quotation",
  "Finalize Vendor",
  "Received PI",
  "Check Sample",
  "Make PO",
  "Check Packing",
  "Deliver to Cargo",
  "Receive Form",
  "Follow Up",
];

const EMPTY_FORM: Partial<I2R> = {
  id: "", indend_num: "", item_name: "", quantity: "", category: "",
  filled_by: "", created_at: "", updated_at: "", cancelled: "",
  planned_1: "", acual_1: "", status_1: "",
  planned_2: "", acual_2: "", status_2: "",
  planned_3: "", acual_3: "", status_3: "",
  planned_4: "", acual_4: "", status_4: "",
  planned_5: "", acual_5: "", status_5: "",
  planned_6: "", acual_6: "", status_6: "",
  planned_7: "", acual_7: "", status_7: "",
  planned_8: "", acual_8: "", status_8: "",
  planned_9: "", acual_9: "", status_9: "",
};

// ─── User multi-select combobox for Step Configuration ──────────────────────
function UserMultiCombobox({
  value,
  onChange,
  users,
}: {
  value: string;
  onChange: (val: string) => void;
  users: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = useMemo(
    () => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []),
    [value]
  );

  const toggle = (user: string) => {
    if (selected.includes(user)) {
      onChange(selected.filter((u) => u !== user).join(", "));
    } else {
      onChange([...selected, user].join(", "));
    }
    setQ("");
  };

  const filtered = users.filter(
    (u) => u.toLowerCase().includes(q.toLowerCase()) && !selected.includes(u)
  );
  const listToShow = q ? filtered : users.filter((u) => !selected.includes(u));

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[38px] px-3 py-1.5 bg-[#FEF6DB] dark:bg-navy-950/50 border border-orange-100 dark:border-navy-700 focus-within:border-[#FFD500] rounded-2xl flex flex-wrap gap-1 items-center cursor-text transition-all"
        onClick={() => setOpen(true)}
      >
        {selected.map((u) => (
          <span
            key={u}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#003875] text-[#FFD500] rounded-md text-[9px] font-black"
          >
            {u}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggle(u);
              }}
            >
              <XMarkIcon className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Assign to..." : ""}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-[12px] font-bold text-gray-800 dark:text-gray-100 placeholder:text-gray-400/50"
        />
      </div>
      {open && listToShow.length > 0 && (
        <ul className="absolute z-[10001] mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-navy-700/50 bg-white dark:bg-navy-900 shadow-lg">
          {listToShow.map((u) => (
            <li
              key={u}
              onMouseDown={(e) => {
                e.preventDefault();
                toggle(u);
              }}
              className="px-3 py-2 text-[12px] font-bold cursor-pointer hover:bg-[#003875]/10 dark:hover:bg-[#FFD500]/10 text-gray-800 dark:text-white"
            >
              {u}
            </li>
          ))}
        </ul>
      )}
      {open && users.length > 0 && listToShow.length === 0 && (
        <ul className="absolute z-[10001] mt-1 w-full rounded-lg border border-gray-200 dark:border-navy-700/50 bg-white dark:bg-navy-900 shadow-lg">
          <li className="px-3 py-2 text-[11px] text-gray-400 italic">No more users</li>
        </ul>
      )}
    </div>
  );
}

export default function I2RPage() {
  const { data: session } = useSession();
  const userRole: string = (session?.user as any)?.role || "User";
  const isAdmin = userRole.toUpperCase() === "ADMIN" || userRole.toUpperCase() === "EA";
  const currentUser: string = (session?.user?.name || session?.user?.email || "") as string;
  const [items, setItems] = useState<I2R[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<I2R | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof I2R;
    direction: "asc" | "desc";
  } | null>({ key: "id", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<Partial<I2R>>({ ...EMPTY_FORM });

  // Action Status States
  const [actionStatus, setActionStatus] = useState<"loading" | "success" | "error">("loading");
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Step Configuration
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [stepConfigs, setStepConfigs] = useState<I2RStepConfig[]>([]);
  const [globalConfigs, setGlobalConfigs] = useState<I2RStepConfig[]>([]);

  // Step update modal
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepModalRecord, setStepModalRecord] = useState<I2R | null>(null);
  const [stepModalNum, setStepModalNum] = useState<number>(1);
  const [stepActualInput, setStepActualInput] = useState("");
  const [stepStatusInput, setStepStatusInput] = useState("Done");

  // Row selection for bulk step done
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  // bulkMode removed — mode is now passed directly to handleBulkStepSave
  // per-row toggle in bulk modal: id -> boolean
  const [bulkToggles, setBulkToggles] = useState<Record<string, boolean>>({});

  // Cancel confirmation
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  // View mode: active / cancelled
  const [viewMode, setViewMode] = useState<"active" | "cancelled">("active");

  // Date quick-filters: 'Yesterday' | 'Today' | 'Tomorrow'
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  // Live clock for time-delay display
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: swrItems, mutate: mutateItems } = useSWR<I2R[]>(
    "/api/i2r",
    fetcher,
    {
      refreshInterval: 0,        // No background polling — SSE handles change detection
      revalidateOnFocus: true,   // Refetch when user returns to the tab
      revalidateOnMount: true,   // Refetch on page load
    }
  );

  // SSE: instantly refetch when a new I2R item is added or deleted
  // SSE: incrementally update local cache when a change is detected
  useSSE({ 
    modules: ['i2r'], 
    onUpdate: (incremental) => {
      const updates = incremental.find(m => m.module === 'i2r');
      if (updates) {
        mutateItems((current) => applyIncrementalUpdate(current, updates.upserts, updates.currentIds), false);
      }
    } 
  });

  // Fetch IMS item names for the combobox
  const { data: imsItems } = useSWR<{ item_name: string }[]>("/api/ims", fetcher);
  const imsItemNames: string[] = Array.from(
    new Set((imsItems || []).map((i) => i.item_name).filter(Boolean))
  ).sort();

  // Fetch users for responsible person dropdown
  const { data: usersData } = useSWR<{ username: string }[]>("/api/users", fetcher);
  const usersList: string[] = useMemo(
    () => (usersData || []).map((u) => u.username).filter(Boolean),
    [usersData]
  );

  // Combobox state for item_name
  const [itemNameOpen, setItemNameOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load global step configs on mount (for Planned_1 on creation)
  useEffect(() => {
    fetch("/api/i2r/config")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const merged = I2R_STEPS.map((step, idx) => {
            const found =
              data.find((c: I2RStepConfig) => c.step_name === step) || data[idx];
            return {
              step_name: step,
              tat: found?.tat || "24 Hrs",
              responsible_person: found?.responsible_person || "",
            };
          });
          setGlobalConfigs(merged);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setItemNameOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (swrItems) {
      setItems(swrItems);
      setIsLoading(false);
    }
  }, [swrItems]);

  // ─── Helper: get first pending step number (has planned, no actual) ───
  const getActiveStep = (item: I2R): number => {
    for (let i = 1; i <= 9; i++) {
      const p = ((item as any)[`planned_${i}`] || "").trim();
      const a = ((item as any)[`acual_${i}`] || "").trim();
      if (p && !a) return i;
    }
    return 0;
  };

  // Search and filter
  const filteredItems = items.filter((item) => {
    const isCancelled = !!(item.cancelled || "").trim();

    // View mode filter
    if (viewMode === "cancelled") { if (!isCancelled) return false; }
    else { if (isCancelled) return false; } // active only

    // Role-based filtering: non-admin only sees rows where they are responsible for the active step
    if (!isAdmin && viewMode === "active") {
      const activeStep = getActiveStep(item);
      if (activeStep > 0) {
        const cfg = globalConfigs[activeStep - 1];
        if (cfg?.responsible_person) {
          const responsible = cfg.responsible_person.split(",").map((s) => s.trim());
          if (!responsible.includes(currentUser)) return false;
        }
      } else {
        return false;
      }
    }

    // Date quick-filter on created_at
    if (dateFilter) {
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      if (!createdAt || isNaN(createdAt.getTime())) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const itemDay = new Date(createdAt);
      itemDay.setHours(0, 0, 0, 0);
      const diffDays = Math.round((itemDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (dateFilter === 'Yesterday' && diffDays !== -1) return false;
      if (dateFilter === 'Today' && diffDays !== 0) return false;
      if (dateFilter === 'Tomorrow' && diffDays !== 1) return false;
    }

    return Object.values(item).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Helper: count items for a date quick-filter
  const getDateFilterCount = (f: string) => items.filter((item) => {
    if (!!(item.cancelled || "").trim()) return false;
    const createdAt = item.created_at ? new Date(item.created_at) : null;
    if (!createdAt || isNaN(createdAt.getTime())) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const itemDay = new Date(createdAt);
    itemDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((itemDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (f === 'Yesterday') return diffDays === -1;
    if (f === 'Today') return diffDays === 0;
    if (f === 'Tomorrow') return diffDays === 1;
    return false;
  }).length;

  // Sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aValue = a[key] || "";
    let bValue = b[key] || "";

    if (key === "id") {
      const aNum = parseInt(String(aValue));
      const bNum = parseInt(String(bValue));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }
    }

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key: keyof I2R) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // ─── Helper: calculate planned date from TAT (respects working hours 9:30-19:30, skip Sunday) ───
  const calculatePlannedDate = (base: Date | string, tat: string): string => {
    if (!base || !tat) return "";
    let date = new Date(base);
    if (isNaN(date.getTime())) return "";
    const parts = tat.trim().split(" ");
    let val = parseFloat(parts[0]);
    const unit = (parts[1] || "Hrs").toLowerCase();
    if (isNaN(val)) return date.toISOString();
    const WORK_START = 9.5;
    const WORK_END = 19.5;
    let totalMins = unit.includes("day") ? val * 10 * 60 : val * 60;
    while (totalMins > 0) {
      if (date.getDay() === 0) { date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); continue; }
      const cur = date.getHours() + date.getMinutes() / 60;
      if (cur >= WORK_END) { date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); continue; }
      if (cur < WORK_START) { date.setHours(9, 30, 0, 0); }
      const eod = new Date(date); eod.setHours(19, 30, 0, 0);
      const avail = (eod.getTime() - date.getTime()) / 60000;
      if (totalMins <= avail) { date.setMinutes(date.getMinutes() + totalMins); totalMins = 0; }
      else { totalMins -= avail; date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); }
    }
    if (date.getDay() === 0) { date.setDate(date.getDate() + 1); date.setHours(9, 30, 0, 0); }
    return date.toISOString();
  };

  // ─── Helper: time diff (planned vs actual or now) ───
  const getTimeDiff = (
    planned: string,
    actual?: string
  ): { text: string; isDelayed: boolean } | null => {
    if (!planned) return null;
    const pDate = new Date(planned);
    if (isNaN(pDate.getTime())) return null;
    const compare = actual ? new Date(actual) : currentTime;
    const diffMs = pDate.getTime() - compare.getTime();
    const abs = Math.abs(diffMs);
    if (abs < 60000) return { text: "On Time", isDelayed: false };
    const isDelayed = diffMs < 0;
    const d = Math.floor(abs / 86400000);
    const h = Math.floor((abs / 3600000) % 24);
    const m = Math.floor((abs / 60000) % 60);
    const parts = [...(d > 0 ? [`${d}d`] : []), ...(h > 0 ? [`${h}h`] : []), ...(m > 0 || (d === 0 && h === 0) ? [`${m}m`] : [])];
    return { text: isDelayed ? `${parts.join(" ")} Late` : `${parts.join(" ")} Left`, isDelayed };
  };

  // ─── Step update modal handlers ───
  const openStepModal = (record: I2R, stepNum: number) => {
    setStepModalRecord(record);
    setStepModalNum(stepNum);
    const now = new Date();
    setStepActualInput(now.toISOString().slice(0, 16));
    setStepStatusInput("Done");
    setIsStepModalOpen(true);
  };

  const handleStepSave = async () => {
    if (!stepModalRecord) return;
    const updated = { ...stepModalRecord } as any;
    const n = stepModalNum;
    updated[`acual_${n}`] = new Date(stepActualInput).toISOString();
    updated[`status_${n}`] = stepStatusInput;
    if (n < 9 && globalConfigs[n]) {
      updated[`planned_${n + 1}`] = calculatePlannedDate(
        new Date(stepActualInput),
        globalConfigs[n].tat || "24 Hrs"
      );
    }
    updated.updated_at = new Date().toISOString();
    setActionStatus("loading");
    setActionMessage("Updating step...");
    setIsStatusModalOpen(true);
    try {
      const res = await fetch("/api/i2r", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setIsStatusModalOpen(false);
        setIsStepModalOpen(false);
        mutateItems();
      } else {
        setActionStatus("error");
        setActionMessage("Failed to update step");
      }
    } catch {
      setActionStatus("error");
      setActionMessage("Error updating step");
    }
  };

  // ─── Per-row Cancel ───
  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    const item = items.find((r) => r.id === cancelTargetId);
    if (!item) return;
    setCancelTargetId(null);
    setActionStatus("loading");
    setActionMessage("Cancelling item...");
    setIsStatusModalOpen(true);
    const now = new Date().toISOString();
    try {
      const res = await fetch("/api/i2r", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, cancelled: now, updated_at: now }),
      });
      if (res.ok) {
        setActionStatus("success");
        setActionMessage("Item cancelled!");
      } else {
        setActionStatus("error");
        setActionMessage("Failed to cancel item");
      }
    } catch {
      setActionStatus("error");
      setActionMessage("Failed to cancel item");
    }
    setTimeout(() => setIsStatusModalOpen(false), 1800);
    mutateItems();
  };

  // ─── Bulk Step Done ───
  const openBulkModal = () => {
    // Pre-toggle all selected rows ON
    const toggles: Record<string, boolean> = {};
    selectedIds.forEach((id) => { toggles[id] = true; });
    setBulkToggles(toggles);
    setIsBulkModalOpen(true);
  };

  const handleBulkStepSave = async () => {
    const toProcess = Array.from(selectedIds).filter((id) => bulkToggles[id]);
    if (toProcess.length === 0) return;
    setActionStatus("loading");
    setActionMessage(`Updating ${toProcess.length} records...`);
    setIsStatusModalOpen(true);
    setIsBulkModalOpen(false);
    const now = new Date().toISOString();
    let errorCount = 0;
    for (const id of toProcess) {
      const item = items.find((r) => r.id === id);
      if (!item) continue;
      const updated = { ...item } as any;
      updated.updated_at = now;
      // step done only
      const n = getActiveStep(item);
      if (!n) continue;
      updated[`acual_${n}`] = now;
      updated[`status_${n}`] = "Done";
      if (n < 9 && globalConfigs[n]) {
        updated[`planned_${n + 1}`] = calculatePlannedDate(new Date(), globalConfigs[n].tat || "24 Hrs");
      }
      try {
        const res = await fetch("/api/i2r", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        if (!res.ok) errorCount++;
      } catch { errorCount++; }
    }
    if (errorCount === 0) {
      setActionStatus("success");
      setActionMessage(`${toProcess.length} record(s) updated!`);
    } else {
      setActionStatus("error");
      setActionMessage(`${errorCount} record(s) failed to update`);
    }
    setSelectedIds(new Set());
    setTimeout(() => setIsStatusModalOpen(false), 1800);
    mutateItems();
  };

  const handleExport = () => {
    const headers = ["ID", "Indent No.", "Item Name", "Quantity", "Category", "Filled By", "Created At", "Updated At"];
    const rows = sortedItems.map((item) => [
      item.id,
      item.indend_num,
      item.item_name,
      item.quantity,
      item.category,
      item.filled_by,
      item.created_at,
      item.updated_at,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `i2r_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAddModal = async () => {
    setEditingItem(null);
    let nextIndent = "INDT- 1";
    try {
      const res = await fetch("/api/i2r?type=next-indent");
      if (res.ok) {
        const data = await res.json();
        nextIndent = data.indentNum || "INDT- 1";
      }
    } catch {}
    const tat1 = globalConfigs[0]?.tat || "24 Hrs";
    const planned1 = calculatePlannedDate(new Date(), tat1);
    setFormData({
      ...EMPTY_FORM,
      indend_num: nextIndent,
      filled_by: (session?.user?.name || session?.user?.email || "") as string,
      planned_1: planned1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: I2R) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.item_name || !formData.quantity || !formData.category) {
      setActionStatus("error");
      setActionMessage("Please fill in all required fields");
      setIsStatusModalOpen(true);
      return;
    }

    setActionStatus("loading");
    setActionMessage(editingItem ? "Updating record..." : "Adding record...");
    setIsStatusModalOpen(true);

    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = {
        ...formData,
        filled_by: formData.filled_by || (session?.user?.name || session?.user?.email || ""),
      };

      const response = await fetch("/api/i2r", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsStatusModalOpen(false);
        closeModal();
        mutateItems();
      } else {
        setActionStatus("error");
        setActionMessage("Failed to save record");
      }
    } catch (error) {
      setActionStatus("error");
      setActionMessage("Error saving record");
      console.error(error);
    }
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setIsConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;

    setActionStatus("loading");
    setActionMessage("Deleting record...");
    setIsStatusModalOpen(true);

    try {
      const response = await fetch(`/api/i2r?id=${pendingDeleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsStatusModalOpen(false);
        mutateItems();
      } else {
        setActionStatus("error");
        setActionMessage("Failed to delete record");
      }
    } catch (error) {
      setActionStatus("error");
      setActionMessage("Error deleting record");
      console.error(error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const openConfigModal = async () => {
    setActionStatus("loading");
    setActionMessage("Loading configuration...");
    setIsStatusModalOpen(true);
    try {
      const res = await fetch("/api/i2r/config");
      const data = await res.json();
      const merged = I2R_STEPS.map((step, idx) => {
        const found =
          Array.isArray(data)
            ? data.find((c: I2RStepConfig) => c.step_name === step) || data[idx]
            : undefined;
        return {
          step_name: step,
          tat: found?.tat || "",
          responsible_person: found?.responsible_person || "",
        };
      });
      setStepConfigs(merged);
      setIsStatusModalOpen(false);
      setIsConfigModalOpen(true);
    } catch {
      setActionStatus("error");
      setActionMessage("Failed to load configuration");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleSaveConfig = async () => {
    setActionStatus("loading");
    setActionMessage("Saving configuration...");
    setIsStatusModalOpen(true);
    try {
      const res = await fetch("/api/i2r/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepConfigs),
      });
      if (!res.ok) throw new Error("Save failed");
      setGlobalConfigs(stepConfigs);
      setActionStatus("success");
      setActionMessage("Configuration saved successfully");
      setTimeout(() => {
        setIsStatusModalOpen(false);
        setIsConfigModalOpen(false);
      }, 1500);
    } catch {
      setActionStatus("error");
      setActionMessage("Failed to save configuration");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const SortIcon = ({ column }: { column: keyof I2R }) => {
    if (sortConfig?.key !== column) return <div className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="w-3 h-3 ml-1 text-[#FFD500]" />
    ) : (
      <ChevronDownIcon className="w-3 h-3 ml-1 text-[#FFD500]" />
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 mb-2">
        <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
          <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              I2R Management
            </h1>
            <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">
              Indent to Request &mdash; Item Requisitions
            </p>
          </div>

          <div className="w-full lg:w-1/3 flex justify-center flex-shrink-0 min-w-0">
            <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar max-w-full">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 md:px-5 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[9px] md:text-[10px] rounded-full whitespace-nowrap"
                title="Export to CSV"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={openConfigModal}
                className="flex items-center justify-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 md:px-4 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[9px] md:text-[10px] rounded-full whitespace-nowrap"
                title="Step Configuration"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Config</span>
              </button>

              <button
                onClick={openAddModal}
                className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 transition-colors rounded-full"
                title="Add Record"
              >
                <PlusIcon className="w-5 h-5" />
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200 dark:bg-navy-600 mx-1" />

              <button
                onClick={() => { setViewMode(viewMode === "cancelled" ? "active" : "cancelled"); setSelectedIds(new Set()); setCurrentPage(1); }}
                className={`flex items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 font-black transition-colors uppercase tracking-widest text-[9px] md:text-[10px] rounded-full whitespace-nowrap ${
                  viewMode === "cancelled"
                    ? "bg-red-500 text-white"
                    : "text-[#003875] dark:text-[#FFD500] hover:bg-gray-100 dark:hover:bg-navy-700"
                }`}
                title="View Cancelled"
              >
                <NoSymbolIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Cancelled</span>
                <span className="opacity-70">({items.filter((i) => !!(i.cancelled || "").trim()).length})</span>
              </button>
            </div>
          </div>
          <div className="hidden lg:block lg:w-1/3" />
        </div>

      </div>

      {/* Table Panel */}
      <div
        style={{ borderColor: "var(--panel-border)" }}
        className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500"
      >
        {/* Search & Pagination Row */}
        <div
          style={{
            backgroundColor: "var(--panel-card)",
            borderBottom: "1px solid var(--panel-border)",
          }}
          className="px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          {/* Left: Search + Date filters + Step Done — all in one tight row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group w-36 shrink-0">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-navy-900 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[12px] text-gray-700 dark:text-white transition-all shadow-sm"
              />
            </div>

            {/* Date quick-filters: Yesterday / Today / Tomorrow */}
            {[
              { id: 'Yesterday', color: 'bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700' },
              { id: 'Today',     color: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' },
              { id: 'Tomorrow',  color: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
            ].map(f => {
              const count = getDateFilterCount(f.id);
              const isActive = dateFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setDateFilter(isActive ? null : f.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all h-[30px] flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-sm scale-105'
                      : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                  }`}
                >
                  {f.id}
                  <span className={`px-1 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Bulk Step Done button — only when rows selected in active view */}
            {selectedIds.size > 0 && viewMode === "active" && (
              <button
                onClick={openBulkModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003875] hover:bg-[#002a5a] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Step Done ({selectedIds.size})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                Page{" "}
                <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span>{" "}
                of {totalPages || 1}
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
            <div className="hidden xs:block h-4 w-[1px] bg-gray-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Show
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none p-0 text-[10px] font-bold outline-none dark:text-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          style={{ backgroundColor: "var(--panel-card)" }}
          className="overflow-x-auto transition-colors duration-500"
        >
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading records...</div>
          ) : sortedItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No records found. Create one to get started.
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200">
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      className="accent-[#FFD500] cursor-pointer"
                      checked={selectedIds.size > 0 && paginatedItems.every((r) => selectedIds.has(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            paginatedItems.forEach((r) => next.add(r.id));
                            return next;
                          });
                        } else {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            paginatedItems.forEach((r) => next.delete(r.id));
                            return next;
                          });
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    Actions
                  </th>
                  {(
                    [
                      { key: "indend_num", label: "Indent No." },
                      { key: "item_name", label: "Item Name" },
                      { key: "quantity", label: "Quantity" },
                      { key: "category", label: "Category" },
                      { key: "filled_by", label: "Filled By" },
                      { key: "created_at", label: "Created At" },
                      // Only show "Cancelled At" column in cancelled view
                      ...(viewMode === "cancelled" ? [{ key: "cancelled" as keyof I2R, label: "Cancelled At" }] : []),
                    ] as { key: keyof I2R; label: string }[]
                  ).map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center">
                        {label}
                        <SortIcon column={key} />
                      </div>
                    </th>
                  ))}
                  {I2R_STEP_SHORT.map((short, i) => (
                    <th
                      key={`step-th-${i}`}
                      className="px-3 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap min-w-[150px]"
                    >
                      Step {i + 1} — {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700/50">
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 dark:hover:bg-navy-900/30 transition-colors align-top cursor-pointer ${selectedIds.has(item.id) ? "bg-blue-50 dark:bg-navy-900/60" : ""}`}
                    onClick={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                  >
                    <td className="px-3 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="accent-[#003875] dark:accent-[#FFD500] cursor-pointer"
                        checked={selectedIds.has(item.id)}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px]" onClick={(e) => e.stopPropagation()}>
                      {viewMode === "active" ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-[#003875] dark:text-[#FFD500] hover:bg-gray-100 dark:hover:bg-navy-900 rounded-md transition-colors"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] font-bold">
                      <span className="inline-block px-2 py-0.5 bg-[#003875]/10 dark:bg-[#FFD500]/10 text-[#003875] dark:text-[#FFD500] rounded-full text-[10px] font-black tracking-wider">
                        {item.indend_num}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-900 dark:text-white font-bold">
                      {item.item_name}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-600 dark:text-slate-400">
                      {item.quantity}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-600 dark:text-slate-400">
                      {item.category}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-600 dark:text-slate-400">
                      {item.filled_by}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-500 dark:text-slate-500">
                      {item.created_at ? (
                        <div>
                          <div className="font-bold text-gray-700 dark:text-slate-300">
                            {new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    {/* Cancelled At — only shown in cancelled view */}
                    {viewMode === "cancelled" && (
                      <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-500 dark:text-slate-500">
                        {item.cancelled ? (
                          <div>
                            <div className="font-bold text-red-600 dark:text-red-400">
                              {new Date(item.cancelled).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(item.cancelled).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </div>
                          </div>
                        ) : <span className="text-gray-300 dark:text-slate-600">—</span>}
                      </td>
                    )}
                    {/* ── One column per step ── */}
                    {Array.from({ length: 9 }, (_, i) => {
                      const n = i + 1;
                      const planned = ((item as any)[`planned_${n}`] || "").trim();
                      const actual = ((item as any)[`acual_${n}`] || "").trim();
                      const isPending = !!planned && !actual;
                      const diff = planned ? getTimeDiff(planned, actual || undefined) : null;
                      const fmtDt = (dt: string) =>
                        new Date(dt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });
                      return (
                        <td key={`step-${n}`} className="px-3 py-3 align-top min-w-[150px]">
                          {planned ? (
                            <div
                              className="cursor-pointer group"
                              onClick={() => isPending && openStepModal(item, n)}
                              title={isPending ? `Click to update Step ${n}` : undefined}
                            >
                              <div className="flex gap-1 items-baseline mb-1">
                                <span className="text-[8px] font-black uppercase text-gray-400 w-11 shrink-0">Planned</span>
                                <span className="text-[9px] font-bold text-gray-700 dark:text-slate-300">{fmtDt(planned)}</span>
                              </div>
                              <div className="flex gap-1 items-baseline mb-1">
                                <span className="text-[8px] font-black uppercase text-gray-400 w-11 shrink-0">Actual</span>
                                <span className="text-[9px] font-bold text-gray-700 dark:text-slate-300">
                                  {actual ? (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); openStepModal(item, n); }}
                                      className="text-green-600 dark:text-green-400 hover:underline"
                                    >
                                      {fmtDt(actual)}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); openStepModal(item, n); }}
                                      className="text-amber-500 dark:text-amber-400 hover:underline font-black"
                                    >
                                      Pending ›
                                    </button>
                                  )}
                                </span>
                              </div>
                              <div className="flex gap-1 items-baseline">
                                <span className="text-[8px] font-black uppercase text-gray-400 w-11 shrink-0">Delay</span>
                                {diff ? (
                                  <span className={`text-[9px] font-black ${diff.isDelayed ? "text-red-500" : "text-green-500"}`}>
                                    {diff.text}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600 text-[9px]">—</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            style={{ backgroundColor: "var(--panel-card)" }}
            className="rounded-2xl max-w-md w-full p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  {editingItem ? "Update Record" : "New Indent Request"}
                </h2>
                {formData.indend_num && (
                  <p className="text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest mt-0.5">
                    {formData.indend_num}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Item Name — free-type combobox */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <div ref={comboRef} className="relative">
                  <input
                    type="text"
                    name="item_name"
                    value={formData.item_name || ""}
                    onChange={(e) => {
                      handleInputChange(e);
                      setItemNameOpen(true);
                    }}
                    onFocus={() => setItemNameOpen(true)}
                    placeholder="Type or select item name"
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                  />
                  {itemNameOpen && (() => {
                    const q = (formData.item_name || "").toLowerCase();
                    const filtered = imsItemNames.filter((n) =>
                      n.toLowerCase().includes(q)
                    );
                    return filtered.length > 0 ? (
                      <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-navy-700/50 bg-white dark:bg-navy-900 shadow-lg">
                        {filtered.map((name) => (
                          <li
                            key={name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData((prev) => ({ ...prev, item_name: name }));
                              setItemNameOpen(false);
                            }}
                            className={`px-3 py-2 text-[12px] font-bold cursor-pointer hover:bg-[#003875]/10 dark:hover:bg-[#FFD500]/10 ${
                              formData.item_name === name
                                ? "text-[#003875] dark:text-[#FFD500]"
                                : "text-gray-800 dark:text-white"
                            }`}
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity || ""}
                  onChange={handleInputChange}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category || ""}
                  onChange={handleInputChange}
                  placeholder="Enter category"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>

              {/* Filled By (read-only) */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Filled By
                </label>
                <input
                  type="text"
                  name="filled_by"
                  value={formData.filled_by || session?.user?.name || session?.user?.email || ""}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-gray-100 dark:bg-navy-950 text-gray-500 dark:text-slate-400 text-[12px] font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg text-gray-600 dark:text-gray-300 text-[11px] font-black uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-navy-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-navy-900 rounded-lg text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                {editingItem ? "Update" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={() => {
          setIsConfirmOpen(false);
          performDelete();
        }}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        type="danger"
      />

      {/* Confirm Cancel Modal */}
      <ConfirmModal
        isOpen={!!cancelTargetId}
        onClose={() => setCancelTargetId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Item"
        message="Are you sure you want to mark this item as cancelled? The current timestamp will be recorded."
        confirmLabel="Yes, Cancel It"
        type="danger"
      />

      {/* Action Status Modal */}
      <ActionStatusModal
        isOpen={isStatusModalOpen}
        status={actionStatus}
        message={actionMessage}
      />

      {/* Step Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-md"
            onClick={() => setIsConfigModalOpen(false)}
          />
          <div className="relative bg-[#FEF6DB] dark:bg-navy-900 w-full max-w-3xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-orange-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-orange-100/50 dark:border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-[#003875] dark:text-[#FFD500] italic">
                  STEP CONFIGURATION
                </h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">
                  Define TAT &amp; Responsible Person per Step
                </p>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-2xl transition-all"
              >
                <XMarkIcon className="w-6 h-6 shrink-0" />
              </button>
            </div>

            {/* Steps list */}
            <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-3 no-scrollbar">
              {stepConfigs.map((config, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white dark:bg-navy-800/50 rounded-2xl border border-gray-100 dark:border-navy-700 shadow-sm hover:border-orange-100 dark:hover:border-[#FFD500]/30 transition-colors items-start md:items-center"
                >
                  {/* Step label */}
                  <div className="md:col-span-6 flex flex-col">
                    <span className="text-[9px] font-black text-[#003875]/50 dark:text-[#FFD500]/50 uppercase tracking-widest mb-1">
                      Step {index + 1}
                    </span>
                    <span className="text-[12px] font-bold text-gray-800 dark:text-gray-100 leading-tight">
                      {config.step_name}
                    </span>
                  </div>

                  {/* TAT */}
                  <div className="md:col-span-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                      <ClockIcon className="w-3 h-3 text-[#FFD500]" /> TAT
                    </label>
                    <div className="flex h-[38px] bg-[#FEF6DB] dark:bg-navy-950/50 border border-orange-100 dark:border-navy-700 focus-within:border-[#FFD500] rounded-2xl shadow-sm transition-all overflow-hidden items-center p-1">
                      <div className="flex gap-1 bg-white/50 dark:bg-navy-900 p-0.5 rounded-xl border border-gray-100 dark:border-navy-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const val = config.tat.split(" ")[0] || "24";
                            const newConfigs = [...stepConfigs];
                            newConfigs[index] = { ...newConfigs[index], tat: `${val} Hrs` };
                            setStepConfigs(newConfigs);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                            config.tat.includes("Hrs")
                              ? "bg-[#FFD500] text-black shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          Hrs
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = config.tat.split(" ")[0] || "1";
                            const newConfigs = [...stepConfigs];
                            newConfigs[index] = { ...newConfigs[index], tat: `${val} Days` };
                            setStepConfigs(newConfigs);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                            config.tat.includes("Days")
                              ? "bg-[#FFD500] text-black shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          Days
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={config.tat.split(" ")[0] || ""}
                        onChange={(e) => {
                          const unit = config.tat.includes("Days") ? "Days" : "Hrs";
                          const newConfigs = [...stepConfigs];
                          newConfigs[index] = {
                            ...newConfigs[index],
                            tat: `${e.target.value} ${unit}`,
                          };
                          setStepConfigs(newConfigs);
                        }}
                        placeholder="24"
                        className="w-full bg-transparent px-3 outline-none text-[12px] font-black text-gray-800 dark:text-gray-100 placeholder:text-gray-400/50 text-right"
                      />
                    </div>
                  </div>

                  {/* Responsible Person */}
                  <div className="md:col-span-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                      Responsible Person
                    </label>
                    <UserMultiCombobox
                      value={config.responsible_person}
                      onChange={(val) => {
                        const newConfigs = [...stepConfigs];
                        newConfigs[index] = {
                          ...newConfigs[index],
                          responsible_person: val,
                        };
                        setStepConfigs(newConfigs);
                      }}
                      users={usersList}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-orange-100/50 dark:border-navy-700 flex gap-3 shrink-0 bg-white/40 dark:bg-transparent">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="flex-1 h-[48px] rounded-2xl font-black text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex-[2] h-[48px] bg-[#003875] dark:bg-[#FFD500] hover:bg-[#002855] dark:hover:bg-[#E6C000] text-white dark:text-black rounded-2xl font-black transition-all shadow-[0_8px_20px_-6px_rgba(0,56,117,0.5)] dark:shadow-[0_8px_20px_-6px_rgba(255,213,0,0.3)] active:scale-95 uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2"
              >
                <Cog6ToothIcon className="w-5 h-5" /> SAVE CONFIGURATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step Update Modal ── */}
      {isStepModalOpen && stepModalRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div
            style={{ backgroundColor: "var(--panel-card)" }}
            className="relative rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-orange-100 dark:border-navy-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-3">
                <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  Step {stepModalNum} Update
                </h2>
                <p className="text-[9px] text-gray-400 font-bold mt-0.5 leading-relaxed line-clamp-2">
                  {I2R_STEPS[stepModalNum - 1]}
                </p>
              </div>
              <button
                onClick={() => setIsStepModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Planned date display */}
            {((stepModalRecord as any)[`planned_${stepModalNum}`] || "").trim() && (
              <div className="mb-4 p-3 bg-[#003875]/5 dark:bg-[#FFD500]/5 rounded-xl border border-[#003875]/10 dark:border-[#FFD500]/10">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">
                  Planned
                </p>
                <p className="text-[13px] font-black text-[#003875] dark:text-[#FFD500]">
                  {new Date(
                    (stepModalRecord as any)[`planned_${stepModalNum}`]
                  ).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
                {(() => {
                  const planned = ((stepModalRecord as any)[`planned_${stepModalNum}`] || "").trim();
                  const diff = getTimeDiff(planned, undefined);
                  return diff ? (
                    <p
                      className={`text-[10px] font-black mt-0.5 ${
                        diff.isDelayed ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {diff.text}
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  Actual Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={stepActualInput}
                  onChange={(e) => setStepActualInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  Status
                </label>
                <input
                  type="text"
                  value={stepStatusInput}
                  onChange={(e) => setStepStatusInput(e.target.value)}
                  placeholder="Done"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>
            </div>

            {stepModalNum < 9 && globalConfigs[stepModalNum] && (
              <p className="mt-3 text-[9px] text-gray-400 italic">
                Saving will auto-generate{" "}
                <span className="font-black text-[#003875] dark:text-[#FFD500]">
                  Step {stepModalNum + 1}
                </span>{" "}
                planned date based on TAT ({globalConfigs[stepModalNum].tat}).
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsStepModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-navy-700 rounded-xl text-gray-600 dark:text-gray-300 text-[11px] font-black uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-navy-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStepSave}
                className="flex-[2] px-4 py-2 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-navy-900 rounded-xl text-[11px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
              >
                Save &amp; Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Action Modal ── */}
      {isBulkModalOpen && (() => {
        const toggedCount = Object.values(bulkToggles).filter(Boolean).length;
        return (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <div
              style={{ backgroundColor: "var(--panel-card)", borderColor: "var(--panel-border)" }}
              className="relative rounded-3xl w-full max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--panel-border)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[15px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                      Bulk Action
                    </h2>
                    <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5 font-bold">
                      Toggle rows then choose an action below
                    </p>
                  </div>
                  <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors ml-4 shrink-0">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Row list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {Array.from(selectedIds).map((id) => {
                  const item = items.find((r) => r.id === id);
                  if (!item) return null;
                  const activeStep = getActiveStep(item);
                  const stepName = activeStep > 0 ? I2R_STEP_SHORT[activeStep - 1] : "All Done";
                  const isOn = !!bulkToggles[id];
                  return (
                    <div
                      key={id}
                      onClick={() => setBulkToggles((prev) => ({ ...prev, [id]: !prev[id] }))}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border cursor-pointer transition-all ${
                        isOn
                          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-navy-700/50 opacity-50"
                      }`}
                      style={!isOn ? { backgroundColor: "var(--panel-card)" } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                          {item.indend_num} — {item.item_name}
                        </p>
                        {activeStep > 0 ? (
                          <p className="text-[9px] text-gray-500 dark:text-slate-400 mt-0.5">
                            Current:{" "}
                            <span className="font-black text-amber-600 dark:text-amber-400">
                              Step {activeStep} — {stepName}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[9px] text-green-500 font-black mt-0.5">All steps done</p>
                        )}
                      </div>
                      {/* Toggle switch */}
                      <div className={`ml-4 w-10 h-5 rounded-full transition-all relative shrink-0 ${isOn ? "bg-green-500" : "bg-gray-300 dark:bg-navy-600"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isOn ? "left-5" : "left-0.5"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer — only Step Done */}
              <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "var(--panel-border)" }}>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="flex-1 h-[44px] border rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-navy-900 transition-colors"
                  style={{ borderColor: "var(--panel-border)" }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleBulkStepSave}
                  disabled={Object.values(bulkToggles).filter(Boolean).length === 0}
                  className="flex-[2] h-[44px] bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Step Done ({Object.values(bulkToggles).filter(Boolean).length})
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
