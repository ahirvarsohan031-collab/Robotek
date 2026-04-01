"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { O2D, O2DItem, O2D_STEPS, O2D_STEP_SHORTS, O2DStepConfig } from "@/types/o2d";
import useSWR, { mutate } from "swr";
const fetcher = (url: string) => fetch(url).then((res) => res.json());
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
  ShoppingBagIcon,
  PhotoIcon,
  UserIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  ChatBubbleBottomCenterTextIcon,
  CurrencyRupeeIcon,
  HashtagIcon,
  ArchiveBoxIcon,
  EyeIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  ClockIcon,
  PauseCircleIcon,
  NoSymbolIcon,
  MinusCircleIcon,
  CheckBadgeIcon,
  ShareIcon,
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  TruckIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  GiftIcon,
  TagIcon
} from "@heroicons/react/24/solid";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
import PartyFormModal from "@/components/PartyFormModal";
import { getDriveImageUrl } from "@/lib/drive-utils";

// --- Searchable Dropdown ---
interface SearchableDropdownProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  keepOpen?: boolean;
  listPosition?: "absolute" | "relative";
}

function SearchableDropdown({ label, icon: Icon, value, onChange, options, placeholder, required, keepOpen = false, listPosition = "absolute" }: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 group">
        <Icon className="w-3 h-3 transition-colors group-hover:text-[#FFD500]" />
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[34px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus-within:border-[#FFD500] cursor-pointer flex items-center justify-between shadow-sm transition-all"
      >
        <span className={`text-[11px] font-bold truncate pr-2 ${value ? 'text-gray-800 dark:text-zinc-100' : 'text-gray-400'}`}>
          {value || placeholder || `Select...`}
        </span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className={`${listPosition} z-[10000] w-full mt-1 bg-white dark:bg-navy-800 border border-orange-100 dark:border-navy-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="p-2 border-b border-gray-100 dark:border-navy-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-gray-50 dark:bg-navy-950 border-none outline-none text-[11px] font-bold text-gray-700 dark:text-white rounded-md"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto no-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onChange(opt);
                    if (!keepOpen) {
                      setIsOpen(false);
                      setSearch("");
                    }
                  }}
                  className={`px-4 py-2 text-[11px] font-bold cursor-pointer transition-colors ${value === opt
                      ? 'bg-[#FFD500] text-black'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-white/5'
                    }`}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-[10px] text-gray-400 font-bold text-center italic">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function O2DPage() {
  const { data: session } = useSession();
  const currentUser = (session?.user as any)?.username || "";

  const { data: o2ds = [], isLoading: isDataLoading } = useSWR<O2D[]>("O2D", async () => {
    const res = await fetch("/api/o2d", { cache: "no-store" });
    return res.json();
  }, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderNo, setEditingOrderNo] = useState<string | null>(null);
  const userRole = (session?.user as any)?.role || 'User';
  const isSpecialRole = userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'EA';
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  // Data
  const [parties, setParties] = useState<string[]>([]);
  const [fullParties, setFullParties] = useState<any[]>([]);
  const [dropdownItems, setDropdownItems] = useState<{ name: string; amount: string }[]>([]);

  // Form State
  const [commonData, setCommonData] = useState({ order_no: "", party_name: "", remark: "" });
  const [items, setItems] = useState<O2DItem[]>([{ item_name: "", item_qty: "", est_amount: "", item_specification: "" }]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Modals
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ type: 'delete' | 'hold' | 'cancelled', orderNo: string, currentValue?: string } | null>(null);
  const [isRemoveFollowUpModalOpen, setIsRemoveFollowUpModalOpen] = useState(false);
  const [removeStep, setRemoveStep] = useState(1);
  const [removeOnwards, setRemoveOnwards] = useState(true);

  const [isBusyModalOpen, setIsBusyModalOpen] = useState(false);
  const [busySearchQuery, setBusySearchQuery] = useState("");

  const [detailViewMode, setDetailViewMode] = useState<'full' | 'table'>('full');
  const [showFilters, setShowFilters] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, []);




  // Setup Config
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [globalConfigs, setGlobalConfigs] = useState<O2DStepConfig[]>([]);
  const [stepConfigs, setStepConfigs] = useState<O2DStepConfig[]>([]);
  const [usersList, setUsersList] = useState<string[]>([]);

  // Step Update Modal State
  const [isStepUpdateModalOpen, setIsStepUpdateModalOpen] = useState(false);
  const [currentStepToUpdate, setCurrentStepToUpdate] = useState<number>(1);
  const [stepUpdateFields, setStepUpdateFields] = useState<any>({});
  const [stepAttachment, setStepAttachment] = useState<File | null>(null);
  const [stepAttachmentPreview, setStepAttachmentPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchO2Ds();
    fetchDetails();
  }, []);

  const fetchO2Ds = async () => {
    // Now handled by SWR
    // We just trigger a revalidation if needed
    mutate("O2D");
  };

  const fetchDetails = async () => {
    try {
      const [detailsRes, configRes, partiesRes] = await Promise.all([
        fetch("/api/o2d?type=details"),
        fetch("/api/o2d/config"),
        fetch("/api/party-management")
      ]);
      const data = await detailsRes.json();
      const configData = await configRes.json();
      const partiesData = await partiesRes.json();

      if (Array.isArray(partiesData) && partiesData.length > 0) {
        setFullParties(partiesData);
        const partyNames = partiesData.map((p: any) => p.partyName).filter(Boolean);
        setParties(partyNames.length > 0 ? partyNames : (data.parties || []));
      } else {
        setFullParties([]);
        setParties(data.parties || []);
      }

      setDropdownItems(data.items || []);

      if (configData && Array.isArray(configData)) {
        const mergedConfigs = O2D_STEPS.map((step, idx) => {
          const found = configData.find(c => c.step_name === step) || configData[idx];
          return {
            step_name: step,
            tat: found?.tat || "24 Hrs",
            responsible_person: found?.responsible_person || ""
          };
        });
        setGlobalConfigs(mergedConfigs);
        setStepConfigs(mergedConfigs);
      } else {
        const fallback = O2D_STEPS.map(step => ({ step_name: step, tat: "24 Hrs", responsible_person: "" }));
        setGlobalConfigs(fallback);
        setStepConfigs(fallback);
      }
    } catch (error) { console.error(error); }
  };

  const generateOrderNo = (existing: O2D[]) => {
    const orderNos = Array.from(new Set(existing.map(o => o.order_no)));
    if (orderNos.length === 0) return "OR-01";
    const maxNum = orderNos.reduce((max, no) => {
      const num = parseInt(no.replace("OR-", ""));
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return `OR-${(maxNum + 1).toString().padStart(2, '0')}`;
  };

  const groupedOrders = useMemo(() => {
    return o2ds.reduce((acc: Record<string, O2D[]>, o2d: O2D) => {
      const orderNo = o2d.order_no || "Unknown";
      if (!acc[orderNo]) acc[orderNo] = [];
      acc[orderNo].push(o2d);
      return acc;
    }, {});
  }, [o2ds]);
  const [selectedDateFilters, setSelectedDateFilters] = useState<string[]>([]);
  const [selectedStepFilters, setSelectedStepFilters] = useState<number[]>([]);

  // Pagination Reset
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDateFilters, selectedStepFilters]);


  const toggleDateFilter = (id: string) => {
    if (id === '') {
      setSelectedDateFilters([]);
      return;
    }
    setSelectedDateFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleStepFilter = (stepIdx: number) => {
    setSelectedStepFilters(prev =>
      prev.includes(stepIdx) ? prev.filter(s => s !== stepIdx) : [...prev, stepIdx]
    );
  };

  // Helper: check if an order matches the date filter based on planned times of steps
  const orderMatchesDateFilter = (orderItems: O2D[], filter: string): boolean => {
    if (!filter) return true;    // Status-based filters
    if (filter === 'Hold') return !!orderItems[0].hold && !orderItems[0].cancelled;
    if (filter === 'Cancelled') return !!orderItems[0].cancelled;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const pendingStepIdx = getPendingStepIdx(orderItems);

    // If fully completed, it doesn't show in active date filters
    if (pendingStepIdx === -1) return false;

    const firstItem = orderItems[0] as any;
    const plannedRaw = firstItem[`planned_${pendingStepIdx}`] as string;
    if (!plannedRaw || plannedRaw === '-' || plannedRaw.trim() === '') return false;

    const pd = new Date(plannedRaw);
    if (isNaN(pd.getTime())) return false;

    const pdDay = new Date(pd);
    pdDay.setHours(0, 0, 0, 0);

    const diffDays = Math.round((pdDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'Delayed') return pd < now;
    if (filter === 'Today') return diffDays === 0;
    if (filter === 'Tomorrow') return diffDays === 1;
    if (filter === 'Next5') return diffDays > 0 && diffDays <= 5;
    if (filter === 'Next10') return diffDays > 0 && diffDays <= 10;

    return false;
  };

  const getPendingStepIdx = (orderItems: O2D[]): number => {
    const firstItem = orderItems[0] as any;
    for (let i = 1; i <= 11; i++) {
      const pVal = (firstItem[`planned_${i}`] || "").toString().trim();
      const aVal = (firstItem[`actual_${i}`] || "").toString().trim();

      // Step is active if it's PLANNED but NOT yet ACTUALIZED
      if (pVal && pVal !== "-" && (!aVal || aVal === "-")) {
        return i;
      }
    }
    return -1;
  };


  const orderMatchesAnyFilter = (no: string): boolean => {
    const items = groupedOrders[no];
    if (!items || items.length === 0) return false;

    const pIdx = getPendingStepIdx(items);
    const isHold = !!items[0].hold;
    const isCancelled = !!items[0].cancelled;

    // Role-based Filtering
    if (!isSpecialRole) {
      if (pIdx !== -1) {
        const stepConfig = globalConfigs[pIdx - 1];
        if (stepConfig?.responsible_person && userRole.toUpperCase() === 'USER' && stepConfig.responsible_person !== currentUser) {
          return false;
        }
      } else if (!selectedDateFilters.includes('Hold') && !selectedDateFilters.includes('Cancelled')) {
        return false;
      }

      const hasStatusFilter = selectedDateFilters.includes('Hold') || selectedDateFilters.includes('Cancelled');
      if ((isHold || isCancelled) && !hasStatusFilter) return false;
    }

    // Step Filtering
    if (selectedStepFilters.length > 0 && !selectedStepFilters.includes(pIdx)) return false;

    // Date/Status Filtering
    if (selectedDateFilters.length > 0) {
      if (!selectedDateFilters.some(f => orderMatchesDateFilter(items, f))) return false;
    } else if (!isSpecialRole) {
      if (isHold || isCancelled || pIdx === -1) return false;
    }

    return true;
  };

  const getDateFilterCount = (filter: string): number => {
    return Object.keys(groupedOrders).filter(no => {
      const items = groupedOrders[no];
      const matchesDate = orderMatchesDateFilter(items, filter);
      const pIdx = getPendingStepIdx(items);

      // Respect Role-based filtering
      if (!isSpecialRole) {
        if (pIdx !== -1) {
          const config = globalConfigs[pIdx - 1];
          if (config?.responsible_person && userRole.toUpperCase() === 'USER' && config.responsible_person !== currentUser) return false;
        } else if (filter !== 'Hold' && filter !== 'Cancelled') return false;
        if ((items[0].hold || items[0].cancelled) && filter !== 'Hold' && filter !== 'Cancelled') return false;
      }

      // Respect ONLY Step Filters
      if (selectedStepFilters.length > 0 && !selectedStepFilters.includes(pIdx)) return false;

      return matchesDate;
    }).length;
  };

  const getStepFilterCount = (stepIdx: number): number => {
    return Object.keys(groupedOrders).filter(no => {
      const items = groupedOrders[no];
      const pIdx = getPendingStepIdx(items);
      if (pIdx !== stepIdx) return false;

      // Respect Role-based filtering
      if (!isSpecialRole) {
        const config = globalConfigs[pIdx - 1];
        if (config?.responsible_person && userRole.toUpperCase() === 'USER' && config.responsible_person !== currentUser) return false;
        if (items[0].hold || items[0].cancelled) return false;
      }

      // Respect ONLY Date Filters
      if (selectedDateFilters.length > 0) {
        if (!selectedDateFilters.some(f => orderMatchesDateFilter(items, f))) return false;
      }

      return true;
    }).length;
  };

  const sortedOrderNumbers = useMemo(() => {
    return Object.keys(groupedOrders)
      .filter(no => {
        const matchesSearch = no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          groupedOrders[no][0].party_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilters = orderMatchesAnyFilter(no);
        return matchesSearch && matchesFilters;
      })
      .sort((a, b) => b.localeCompare(a));
  }, [groupedOrders, searchTerm, selectedDateFilters, selectedStepFilters]);

  const totalPages = Math.ceil(sortedOrderNumbers.length / itemsPerPage);
  const paginatedOrderNumbers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedOrderNumbers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedOrderNumbers, currentPage, itemsPerPage]);


  const addItemRow = () => setItems([...items, { item_name: "", item_qty: "", est_amount: "", item_specification: "" }]);
  const removeItemRow = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index: number, field: keyof O2DItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    const itemName = field === 'item_name' ? value : newItems[index].item_name;
    const qty = parseFloat(field === 'item_qty' ? value : newItems[index].item_qty);
    const match = dropdownItems.find(di => di.name === itemName);
    if (match) {
      const unitPrice = parseFloat(match.amount);
      if (!isNaN(unitPrice) && !isNaN(qty)) newItems[index].est_amount = (unitPrice * qty).toFixed(2);
      else if (!isNaN(unitPrice)) newItems[index].est_amount = unitPrice.toFixed(2);
    }
    setItems(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setCommonData({ order_no: generateOrderNo(o2ds), party_name: "", remark: "" });
    setItems([{ item_name: "", item_qty: "", est_amount: "", item_specification: "" }]);
    setScreenshotFile(null); setImagePreview(null);
    setEditingOrderNo(null);
  };

  const calculatePlannedDate = (baseDate: string | Date, tatString: string) => {
    if (!baseDate || !tatString) return "";
    let date = new Date(baseDate);
    if (isNaN(date.getTime())) return "";

    const parts = tatString.trim().split(" ");
    let val = parseFloat(parts[0]);
    const unit = parts[1]?.toLowerCase() || "hrs";
    if (isNaN(val)) return date.toISOString();

    // Convert everything to minutes to consume
    let totalMinutesToConsume = unit.includes("day") ? val * 10 * 60 : val * 60;

    const WORK_START_HOUR = 9.5; // 9:30 AM
    const WORK_END_HOUR = 19.5;   // 7:30 PM
    const MINS_PER_WORK_DAY = (WORK_END_HOUR - WORK_START_HOUR) * 60;

    while (totalMinutesToConsume > 0) {
      // 1. Skip Sunday
      if (date.getDay() === 0) {
        date.setDate(date.getDate() + 1);
        date.setHours(9, 30, 0, 0);
        continue;
      }

      // 2. Adjust current time to working window if outside
      let hours = date.getHours();
      let mins = date.getMinutes();
      let currentTimeVal = hours + mins / 60;

      if (currentTimeVal >= WORK_END_HOUR) {
        // Move to next day 9:30 AM
        date.setDate(date.getDate() + 1);
        date.setHours(9, 30, 0, 0);
        continue;
      }

      if (currentTimeVal < WORK_START_HOUR) {
        date.setHours(9, 30, 0, 0);
        currentTimeVal = WORK_START_HOUR;
      }

      // 3. Calculate available minutes in the current window
      const endOfToday = new Date(date);
      endOfToday.setHours(19, 30, 0, 0);
      const availableMinutesToday = (endOfToday.getTime() - date.getTime()) / (1000 * 60);

      if (totalMinutesToConsume <= availableMinutesToday) {
        date.setMinutes(date.getMinutes() + totalMinutesToConsume);
        totalMinutesToConsume = 0;
      } else {
        totalMinutesToConsume -= availableMinutesToday;
        // Move to next day 9:30 AM
        date.setDate(date.getDate() + 1);
        date.setHours(9, 30, 0, 0);
      }
    }

    // Final check: if final date falls on Sunday (unlikely due to loop logic but safe), move to Monday
    if (date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
      date.setHours(9, 30, 0, 0);
    }

    return date.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();

    // Show loader
    setActionStatus('loading');
    setActionMessage(editingOrderNo ? 'Updating Order...' : 'Creating Order...');
    setIsStatusModalOpen(true);

    // Optimistic Update
    const currentO2Ds = o2ds;
    let optimisticO2Ds = [...o2ds];
    let currentMaxId = o2ds.length > 0 ? Math.max(...o2ds.map(o => parseInt(o.id) || 0)) : 0;

    try {
      if (editingOrderNo) {
        let baseRecord = { ...groupedOrders[editingOrderNo][0] };

        // Cascading logic
        let currentBase = baseRecord.created_at || now;
        for (let i = 0; i < 11; i++) {
          const tat = globalConfigs[i]?.tat || "24 Hrs";
          const pKey = `planned_${i + 1}`;
          if (i === 0) {
            if (!(baseRecord as any)[pKey]) (baseRecord as any)[pKey] = calculatePlannedDate(currentBase, tat);
          } else {
            const prevActual = (baseRecord as any)[`actual_${i}`];
            if (prevActual && prevActual !== "-" && prevActual.trim() !== "") {
              (baseRecord as any)[pKey] = calculatePlannedDate(prevActual, tat);
            } else if (!(baseRecord as any)[pKey]) {
              (baseRecord as any)[pKey] = "";
            }
          }
        }

        const updatedItems = items.map(item => {
          let idToUse = item.id;
          if (!idToUse) {
            currentMaxId++;
            idToUse = currentMaxId.toString();
          }
          const updated = {
            ...baseRecord,
            id: idToUse,
            item_name: item.item_name,
            item_qty: item.item_qty,
            est_amount: item.est_amount,
            item_specification: item.item_specification,
            party_name: commonData.party_name,
            remark: commonData.remark,
            updated_at: now
          } as O2D;

          // Recalculate cascading logic for THIS item/row
          let currentBase = updated.created_at || now;
          for (let i = 0; i < 11; i++) {
            const tat = globalConfigs[i]?.tat || "24 Hrs";
            const pKey = `planned_${i + 1}`;
            const stepIdx = i + 1;

            if (i === 0) {
              if (!(updated as any)[pKey]) (updated as any)[pKey] = calculatePlannedDate(currentBase, tat);
            } else {
              const prevActual = (updated as any)[`actual_${i}`];
              const prevStatus = (updated as any)[`status_${i}`];

              // Skip logic: if Step 4 is Yes, skip Step 5 and go to Step 6
              if (stepIdx === 5 && prevStatus === "Yes" && i === 4) {
                (updated as any)[pKey] = ""; // Skip Step 5
                continue;
              }
              if (stepIdx === 6 && (updated as any)[`status_4`] === "Yes") {
                const actual4 = (updated as any)[`actual_4`];
                if (actual4 && actual4 !== "-" && actual4.trim() !== "") {
                  (updated as any)[pKey] = calculatePlannedDate(actual4, tat);
                  continue;
                }
              }

              if (prevActual && prevActual !== "-" && prevActual.trim() !== "") {
                (updated as any)[pKey] = calculatePlannedDate(prevActual, tat);
              } else if (!(updated as any)[pKey]) {
                (updated as any)[pKey] = "";
              }
            }
          }
          return updated;
        });

        optimisticO2Ds = optimisticO2Ds.filter(o => o.order_no !== editingOrderNo);
        optimisticO2Ds = [...updatedItems, ...optimisticO2Ds];

        mutate("O2D", optimisticO2Ds, false);
        setIsModalOpen(false);
        resetForm();

        const formData = new FormData();
        formData.append("o2dData", JSON.stringify(updatedItems));
        if (screenshotFile) formData.append("order_screenshot", screenshotFile);

        const res = await fetch(`/api/o2d/order/${editingOrderNo}`, {
          method: "PUT",
          body: formData,
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        const tat1 = globalConfigs[0]?.tat || "24 Hrs";
        let initRecord: any = { planned_1: calculatePlannedDate(now, tat1) };
        for (let i = 2; i <= 11; i++) initRecord[`planned_${i}`] = "";

        const newItems = items.map(item => {
          currentMaxId++;
          return {
            ...initRecord,
            id: currentMaxId.toString(), order_no: commonData.order_no, party_name: commonData.party_name,
            item_name: item.item_name, item_qty: item.item_qty, est_amount: item.est_amount,
            item_specification: item.item_specification,
            remark: commonData.remark, filled_by: currentUser, created_at: now, updated_at: now
          } as O2D;
        });

        optimisticO2Ds = [...newItems, ...optimisticO2Ds];
        mutate("O2D", optimisticO2Ds, false);
        setIsModalOpen(false);
        resetForm();

        const formData = new FormData();
        formData.append("o2dData", JSON.stringify(newItems));
        if (screenshotFile) formData.append("order_screenshot", screenshotFile);
        const res = await fetch("/api/o2d", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Creation failed");
      }
      setActionStatus('success');
      setActionMessage(editingOrderNo ? 'Order Updated!' : 'Order Created!');
      mutate("O2D"); // Revalidate to get real IDs/Server state
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch (error: any) {
      console.error(error);
      mutate("O2D", currentO2Ds, false); // Rollback
      setActionStatus('error');
      setActionMessage(error.message);
      setIsStatusModalOpen(true);
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleEdit = (orderNo: string) => {
    const orderItems = groupedOrders[orderNo];
    setEditingOrderNo(orderNo);
    setCommonData({
      order_no: orderNo,
      party_name: orderItems[0].party_name,
      remark: orderItems[0].remark
    });
    setItems(orderItems.map(o => ({
      id: o.id,
      item_name: o.item_name,
      item_qty: o.item_qty,
      est_amount: o.est_amount,
      item_specification: o.item_specification || ""
    })));
    setImagePreview(orderItems[0].order_screenshot ? getDriveImageUrl(orderItems[0].order_screenshot) : null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (orderNo: string) => {
    setConfirmPayload({ type: 'delete', orderNo });
    setIsConfirmOpen(true);
  };

  const performDelete = async () => {
    const orderNo = confirmPayload?.orderNo;
    if (!orderNo) return;

    const currentO2Ds = o2ds;
    const optimisticO2Ds = o2ds.filter(o => o.order_no !== orderNo);

    mutate("O2D", optimisticO2Ds, false);
    setSelectedOrderNo(null);
    setConfirmPayload(null);
    setIsConfirmOpen(false);

    // Show loader
    setActionStatus('loading');
    setActionMessage('Deleting Order...');
    setIsStatusModalOpen(true);

    try {
      const res = await fetch(`/api/o2d/order/${orderNo}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setActionStatus('success');
      setActionMessage('Order Deleted');
      mutate("O2D");
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch (error) {
      mutate("O2D", currentO2Ds, false);
      setActionStatus('error');
      setActionMessage("Delete Failed");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleOpenSetup = async () => {
    setActionStatus('loading');
    setActionMessage("Fetching Configurations...");
    setIsStatusModalOpen(true);
    try {
      const [configRes, usersRes] = await Promise.all([
        fetch("/api/o2d/config"),
        fetch("/api/users")
      ]);
      const configData = await configRes.json();
      const usersData = await usersRes.json();

      setUsersList(usersData.map((u: any) => u.username));

      if (configData && Array.isArray(configData)) {
        const mergedConfigs = O2D_STEPS.map((step, idx) => {
          const found = configData.find(c => c.step_name === step) || configData[idx];
          return {
            step_name: step,
            tat: found?.tat || "",
            responsible_person: found?.responsible_person || ""
          };
        });
        setStepConfigs(mergedConfigs);
      } else {
        setStepConfigs(O2D_STEPS.map(step => ({
          step_name: step,
          tat: "",
          responsible_person: ""
        })));
      }
      setIsStatusModalOpen(false);
      setIsSetupModalOpen(true);
    } catch (e: any) {
      setActionStatus('error');
      setActionMessage(e.message || "Failed to fetch parameters");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus('loading');
    setActionMessage("Saving Configurations...");
    setIsStatusModalOpen(true);
    try {
      const res = await fetch("/api/o2d/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepConfigs)
      });
      if (!res.ok) throw new Error("Save failed");

      // Update global configs in memory
      setGlobalConfigs(stepConfigs);

      setActionStatus('success');
      setActionMessage("Configuration Saved Successfully");
      setTimeout(() => {
        setIsStatusModalOpen(false);
        setIsSetupModalOpen(false);
      }, 1500);
    } catch (e: any) {
      setActionStatus('error');
      setActionMessage(e.message || "Failed to save configuration");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleToggleStatus = async (orderNo: string, action: 'hold' | 'cancelled', currentValue: string | undefined) => {
    if (!orderNo) return;

    const newValue = !currentValue ? new Date().toISOString() : "";
    const currentO2Ds = o2ds;
    const optimisticO2Ds = o2ds.map(o => o.order_no === orderNo ? { ...o, [action]: newValue } : o);

    mutate("O2D", optimisticO2Ds, false);
    setConfirmPayload(null);
    setIsConfirmOpen(false);

    // Show loader
    const actionLabel = action === 'hold' ? (newValue ? 'Putting On Hold...' : 'Releasing Hold...') : (newValue ? 'Cancelling Order...' : 'Restoring Order...');
    setActionStatus('loading');
    setActionMessage(actionLabel);
    setIsStatusModalOpen(true);

    try {
      const res = await fetch("/api/o2d/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo, action, value: newValue })
      });

      if (!res.ok) throw new Error(`Failed to toggle ${action}`);
      setActionStatus('success');
      setActionMessage('Status Updated');
      mutate("O2D");
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch (e: any) {
      mutate("O2D", currentO2Ds, false);
      setActionStatus('error');
      setActionMessage(e.message || "Action failed");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const selectedOrder = useMemo(() => {
    return groupedOrders[selectedOrderNo || ""] || [];
  }, [groupedOrders, selectedOrderNo]);

  const handleRemoveFollowUp = async () => {
    if (!selectedOrderNo) return;
    setActionStatus('loading');
    setActionMessage(`Purging Step ${removeStep}${removeOnwards ? " Onwards" : ""}...`);
    setIsStatusModalOpen(true);

    try {
      const res = await fetch("/api/o2d/remove-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: selectedOrderNo, startStep: removeStep, onlyThisStep: !removeOnwards })
      });

      if (!res.ok) throw new Error("Purge failed");

      setActionStatus('success');
      setActionMessage("Data Cleared Successfully");
      setIsRemoveFollowUpModalOpen(false);
      mutate("O2D");
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch (e: any) {
      setActionStatus('error');
      setActionMessage(e.message || "Purge failed");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const handleExport = () => {
    if (o2ds.length === 0) return;
    const headers = ['ID', 'Order No', 'Party Name', 'Item Name', 'Item Qty', 'Est Amount', 'Remark', 'Filled By', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...o2ds.map((item: O2D) => [
        item.id,
        item.order_no,
        `"${item.party_name}"`,
        `"${item.item_name}"`,
        item.item_qty,
        item.est_amount,
        `"${item.remark || ''}"`,
        item.filled_by,
        item.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `o2d_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCurrentStep = (order: O2D[]) => {
    return getPendingStepIdx(order);
  };

  const isStep1Lockout = useMemo(() => {
    if (!selectedOrder || selectedOrder.length === 0) return false;
    const first = selectedOrder[0];
    const stepIdx = getCurrentStep(selectedOrder);
    if (stepIdx !== 1) return false;

    if (!first.created_at) return false;
    const createdAt = new Date(first.created_at).getTime();
    const now = currentTime.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    return (now - createdAt) < thirtyMinutes;
  }, [selectedOrder, currentTime]);

  const lockoutTimeLeft = useMemo(() => {
    if (!selectedOrder || selectedOrder.length === 0) return { m: 0, s: 0 };
    const first = selectedOrder[0];
    if (!first.created_at) return { m: 0, s: 0 };
    const createdAt = new Date(first.created_at).getTime();
    const now = currentTime.getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    const timePassed = now - createdAt;
    const timeLeft = Math.max(0, thirtyMinutes - timePassed);
    
    const m = Math.floor(timeLeft / (1000 * 60));
    const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
    return { m, s };
  }, [selectedOrder, currentTime]);

  const openStepUpdateModal = () => {
    if (!selectedOrder) return;
    const stepIdx = getCurrentStep(selectedOrder);
    if (stepIdx === -1) return; // Process ended or all steps done

    setCurrentStepToUpdate(stepIdx);

    // Initialize fields with current values
    const first = selectedOrder[0];
    const fields: any = {
      status: (first as any)[`status_${stepIdx}`] || "No",
      actual: (first as any)[`actual_${stepIdx}`] || new Date().toISOString()
    };

    // Add step-specific fields
    if (stepIdx === 1) {
      fields.final_amount_1 = first?.final_amount_1 || "";
      fields.so_number_1 = first?.so_number_1 || "";
      fields.merge_order_with_1 = first?.merge_order_with_1 || "";
    } else if (stepIdx === 6) {
      fields.num_of_parcel_6 = first?.num_of_parcel_6 || "";
      fields.actual_date_of_order_packed_6 = first?.actual_date_of_order_packed_6 || "";
    } else if (stepIdx === 7) {
      fields.voucher_num_7 = first?.voucher_num_7 || "";
    } else if (stepIdx === 8) {
      fields.order_details_checked_8 = first?.order_details_checked_8 || "No";
      fields.voucher_num_51_8 = first?.voucher_num_51_8 || "";
      fields.t_amt_8 = first?.t_amt_8 || "";
    } else if (stepIdx === 9) {
      fields.num_of_parcel_9 = first?.num_of_parcel_9 || "";
    }

    setStepUpdateFields(fields);
    setStepAttachment(null);
    setStepAttachmentPreview(null);
    setIsStepUpdateModalOpen(true);
  };

  const handleStepUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderNo) return;

    const timestamp = new Date().toISOString();
    const currentO2Ds = o2ds;

    // Prepare optimistic update
    const updatedO2Ds = o2ds.map(o2d => {
      if (o2d.order_no !== selectedOrderNo) return o2d;

      const updated = { ...o2d };
      const stepIdx = currentStepToUpdate;

      (updated as any)[`status_${stepIdx}`] = stepUpdateFields.status;
      (updated as any)[`actual_${stepIdx}`] = timestamp;

      if (stepIdx === 1) {
        updated.final_amount_1 = stepUpdateFields.final_amount_1;
        updated.so_number_1 = stepUpdateFields.so_number_1;
        updated.merge_order_with_1 = stepUpdateFields.merge_order_with_1;
      } else if (stepIdx === 6) {
        updated.num_of_parcel_6 = stepUpdateFields.num_of_parcel_6;
        updated.actual_date_of_order_packed_6 = stepUpdateFields.actual_date_of_order_packed_6;
      } else if (stepIdx === 7) {
        updated.voucher_num_7 = stepUpdateFields.voucher_num_7;
      } else if (stepIdx === 8) {
        updated.order_details_checked_8 = stepUpdateFields.order_details_checked_8;
        updated.voucher_num_51_8 = stepUpdateFields.voucher_num_51_8;
        updated.t_amt_8 = stepUpdateFields.t_amt_8;
      } else if (stepIdx === 9) {
        updated.num_of_parcel_9 = stepUpdateFields.num_of_parcel_9;
      }

      if ((stepUpdateFields.status === "Yes" || (stepIdx === 4 && stepUpdateFields.status === "No")) && stepIdx < 11) {
        let nextStepIdx = stepIdx + 1;

        // Skip logic: if Step 4 is Yes, skip Step 5 and go straight to Step 6
        if (stepIdx === 4 && stepUpdateFields.status === "Yes") {
          (updated as any)[`planned_5`] = "";
          nextStepIdx = 6;
        }

        // Termination logic: if Step 5 is No, end the process (do not plan Step 6)
        if (stepIdx === 5 && stepUpdateFields.status === "No") {
          return updated;
        }

        const nextTat = globalConfigs[nextStepIdx - 1]?.tat || "24 Hrs";
        let baseForNext = timestamp;
        if (stepIdx === 6 && stepUpdateFields.actual_date_of_order_packed_6) {
          baseForNext = stepUpdateFields.actual_date_of_order_packed_6;
        }
        (updated as any)[`planned_${nextStepIdx}`] = calculatePlannedDate(baseForNext, nextTat);
      }
      updated.updated_at = timestamp;
      return updated;
    });

    mutate("O2D", updatedO2Ds, false);
    setIsStepUpdateModalOpen(false);

    // Show loader
    setActionStatus('loading');
    setActionMessage(`Updating Step ${currentStepToUpdate}...`);
    setIsStatusModalOpen(true);

    try {
      // Handle file attachment if present
      let fileUploaded = false;
      if (stepAttachment) {
        const formData = new FormData();
        formData.append("file", stepAttachment);
        formData.append("orderNo", selectedOrderNo);
        formData.append("step", currentStepToUpdate.toString());

        const uploadRes = await fetch("/api/o2d/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { fileId } = await uploadRes.json();
          fileUploaded = true;
          const fieldMap: any = { 1: 'upload_so_1', 6: 'upload_pi_6', 9: 'attach_bilty_9' };
          const targetField = fieldMap[currentStepToUpdate];
          if (targetField) {
            updatedO2Ds.forEach((o: any) => {
              if (o.order_no === selectedOrderNo) o[targetField] = fileId;
            });
            // Update cache again with fileId
            mutate("O2D", updatedO2Ds, false);
          }
        }
      }

      const res = await fetch(`/api/o2d/order/${selectedOrderNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedO2Ds.filter(o => o.order_no === selectedOrderNo)),
      });

      if (!res.ok) throw new Error("Step update failed");
      setActionStatus('success');
      setActionMessage('Step Updated Successfully');
      mutate("O2D");
      setTimeout(() => setIsStatusModalOpen(false), 1500);
    } catch (error: any) {
      mutate("O2D", currentO2Ds, false);
      setActionStatus('error');
      setActionMessage(error.message);
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "-") return "-";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) {
      return dateString;
    }
  };

  const getTimeDelay = (pRaw: string, aRaw: string) => {
    if (!pRaw || pRaw === "-" || pRaw.trim() === "") return null;
    const pDate = new Date(pRaw);
    if (isNaN(pDate.getTime())) return null;

    let cDate = new Date();
    if (aRaw && aRaw !== "-" && aRaw.trim() !== "") {
      const aDate = new Date(aRaw);
      if (!isNaN(aDate.getTime())) cDate = aDate;
    }

    const diffMs = pDate.getTime() - cDate.getTime();
    const absDiff = Math.abs(diffMs);

    if (absDiff < 60000) return { text: "On Time", isDelayed: false };

    const isDelayed = diffMs < 0;
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((absDiff / 1000 / 60) % 60);

    let textParts = [];
    if (days > 0) textParts.push(`${days}d`);
    if (hours > 0) textParts.push(`${hours}h`);
    if (minutes > 0 || textParts.length === 0) textParts.push(`${minutes}m`);

    return {
      text: isDelayed ? `${textParts.join(" ")} Late` : `${textParts.join(" ")} Early`,
      isDelayed
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-3">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row items-center gap-2 px-1 shrink-0">
        <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight italic">O2D SYSTEM</h1>
          <p className="text-[#003875] dark:text-[#FFD500] font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-80 -mt-1">Syncing Intelligence</p>
        </div>
        <div className="w-full lg:w-1/3 flex justify-center flex-shrink-0 min-w-0">
          <div className="flex items-center gap-1 rounded-full border-2 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-lg p-0.5 overflow-x-auto no-scrollbar max-w-full">
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-2 sm:px-4 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all">
              <PlusIcon className="w-4 h-4 stroke-[3]" /> 
              <span className="hidden sm:inline">New Order</span>
            </button>
            <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
            <button onClick={handleExport} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-2 sm:px-3 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all">
              <ArrowDownTrayIcon className="w-4 h-4 stroke-[3]" /> 
              <span className="hidden sm:inline">Export</span>
            </button>
            <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
            <button onClick={handleOpenSetup} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-2 sm:px-3 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all">
              <Cog6ToothIcon className="w-4 h-4 stroke-[3]" /> 
              <span className="hidden sm:inline">Setup</span>
            </button>
            <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
            <button onClick={() => setIsBusyModalOpen(true)} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-2 sm:px-3 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all">
              <ClipboardDocumentCheckIcon className="w-4 h-4 stroke-[3]" /> 
              <span className="hidden sm:inline">For Busy</span>
            </button>
            <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
            <button onClick={fetchO2Ds} className="p-1 text-[#003875] dark:text-[#FFD500] rounded-full hover:bg-gray-100 dark:hover:bg-navy-700 transition-all"><ArrowPathIcon className={`w-4.5 h-4.5 ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
        <div className="hidden lg:block lg:w-1/3"></div>
      </div>

      {/* Main Master-Detail View Wrapper */}
      <div className="flex-1 flex flex-col relative">
        {/* Toggle Filters Button - Floating at the top edge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[50]">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-navy-800 border border-gray-100 dark:border-navy-700 rounded-full shadow-md hover:shadow-lg transition-all text-[#003875] dark:text-[#FFD500] group"
          >
            <FunnelIcon className={`w-3 h-3 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </span>
            {showFilters ? (
              <ChevronUpIcon className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            ) : (
              <ChevronDownIcon className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            )}
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-xl">
          {showFilters && (
            <>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 px-3 py-2 bg-white dark:bg-navy-900 border-b border-gray-100 dark:border-navy-800 animate-in slide-in-from-top duration-300">
          {O2D_STEP_SHORTS.map((stepName, idx) => {
            const stepIdx = idx + 1;
            const count = getStepFilterCount(stepIdx);
            const isActive = selectedStepFilters.includes(stepIdx);

            // Icons for each step
            const stepIcons = [
              PencilSquareIcon,
              MagnifyingGlassIcon,
              CheckBadgeIcon,
              ShareIcon,
              ArrowsRightLeftIcon,
              ArchiveBoxIcon,
              DocumentTextIcon,
              CurrencyRupeeIcon,
              TruckIcon,
              ClipboardDocumentCheckIcon,
              CheckCircleIcon
            ];
            const Icon = stepIcons[idx] || PhotoIcon;

            // Premium colors for steps (Standard state)
            const stepColors = [
              'border-indigo-100 bg-indigo-50/50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-400',
              'border-blue-100 bg-blue-50/50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400',
              'border-cyan-100 bg-cyan-50/50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/5 dark:text-cyan-400',
              'border-teal-100 bg-teal-50/50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/5 dark:text-teal-400',
              'border-emerald-100 bg-emerald-50/50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400',
              'border-green-100 bg-green-50/50 text-green-700 dark:border-green-500/20 dark:bg-green-500/5 dark:text-green-400',
              'border-amber-100 bg-amber-100/50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-1000/5 dark:text-amber-400',
              'border-orange-100 bg-orange-50/50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400',
              'border-red-100 bg-red-50/50 text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400',
              'border-pink-100 bg-pink-50/50 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/5 dark:text-pink-400',
              'border-rose-100 bg-rose-50/50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400'
            ];

            // Active colors
            const activeColors = [
              'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:text-black dark:border-indigo-500',
              'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:text-black dark:border-blue-500',
              'bg-cyan-600 text-white border-cyan-600 dark:bg-cyan-500 dark:text-black dark:border-cyan-500',
              'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:text-black dark:border-teal-500',
              'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:text-black dark:border-emerald-500',
              'bg-green-600 text-white border-green-600 dark:bg-green-500 dark:text-black dark:border-green-500',
              'bg-amber-600 text-white border-amber-600 dark:bg-amber-1000 dark:text-black dark:border-amber-500',
              'bg-orange-600 text-white border-orange-600 dark:bg-orange-500 dark:text-black dark:border-orange-500',
              'bg-red-600 text-white border-red-600 dark:bg-red-500 dark:text-black dark:border-red-500',
              'bg-pink-600 text-white border-pink-600 dark:bg-pink-500 dark:text-black dark:border-pink-500',
              'bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:text-black dark:border-rose-500'
            ];

            const iconColors = [
              'bg-indigo-600 text-white dark:bg-indigo-400 dark:text-navy-950',
              'bg-blue-600 text-white dark:bg-blue-400 dark:text-navy-950',
              'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-navy-950',
              'bg-teal-600 text-white dark:bg-teal-400 dark:text-navy-950',
              'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-navy-950',
              'bg-green-600 text-white dark:bg-green-400 dark:text-navy-950',
              'bg-amber-600 text-white dark:bg-amber-400 dark:text-navy-950',
              'bg-orange-600 text-white dark:bg-orange-400 dark:text-navy-950',
              'bg-red-600 text-white dark:bg-red-400 dark:text-navy-950',
              'bg-pink-600 text-white dark:bg-pink-400 dark:text-navy-950',
              'bg-rose-600 text-white dark:bg-rose-400 dark:text-navy-950'
            ];

            return (
              <button
                key={stepIdx}
                onClick={() => toggleStepFilter(stepIdx)}
                className={`flex-shrink-0 w-auto h-[52px] rounded-xl border flex flex-row items-center px-4 gap-3 transition-all duration-300 ${isActive
                    ? `${activeColors[idx]} shadow-lg scale-105 z-10`
                    : `${stepColors[idx]} hover:scale-[1.02] hover:shadow-sm`
                  }`}
              >
                <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : iconColors[idx]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start leading-[1.1] whitespace-nowrap">
                  <div className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'text-white/80 dark:text-black/70' : 'opacity-80'}`}>
                    {stepIdx}. {stepName}
                  </div>
                  <div className="text-[17px] font-black">{count}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 px-3 py-1.5 border-b border-gray-100 dark:border-navy-800 bg-gray-50/40 dark:bg-navy-900/60">
          {[
            { id: '', label: 'All', color: 'bg-white text-gray-700 border-gray-300 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600' },
            { id: 'Delayed', label: 'Delayed', color: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
            { id: 'Today', label: 'Today', color: 'bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' },
            { id: 'Tomorrow', label: 'Tomorrow', color: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
            { id: 'Next5', label: 'Next 5', color: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' },
            { id: 'Next10', label: 'Next 10', color: 'bg-violet-50 text-violet-600 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700' },
          ].map(f => {
            const count = getDateFilterCount(f.id);
            const isActive = (f.id === '' ? selectedDateFilters.length === 0 : selectedDateFilters.includes(f.id));
            return (<button
              key={f.id}
              onClick={() => toggleDateFilter(f.id)}
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${(f.id === '' ? selectedDateFilters.length === 0 : selectedDateFilters.includes(f.id))
                  ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-md scale-105'
                  : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/10 dark:bg-white/10'}`}>
                {count}
              </span>
            </button>
            );
          })}

          {/* Status-based filters with Partition */}
          <div className="w-[1.5px] h-4 bg-[#003875]/10 dark:bg-white/10 mx-1 shrink-0" />

          {[
            { id: 'Hold', label: 'On Hold', color: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40' },
            { id: 'Cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40' },
          ].map(f => {
            const count = getDateFilterCount(f.id);
            const isActive = selectedDateFilters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive
                    ? f.id === 'Hold' ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105' : 'bg-red-500 text-white border-red-500 shadow-md scale-105'
                    : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                  }`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/10 dark:bg-white/10'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
            </>
          )}

        {/* Panels Row */}
        <div className="flex-1 flex overflow-hidden">
          {/* Master Pane: Order List */}
          <div className={`w-full lg:w-80 flex flex-col border-r border-[#003875]/5 dark:border-navy-800 ${selectedOrderNo ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-2 border-b border-gray-50 dark:border-navy-800 bg-gray-50/30 dark:bg-navy-900/40">
              <div className="relative group mb-2">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 h-[34px] bg-white dark:bg-black border border-gray-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] rounded-xl transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] focus:shadow-md"
                />
              </div>

              {/* Sidebar Pagination - Top Position */}
              {!isLoading && sortedOrderNumbers.length > itemsPerPage && (
                <div className="flex items-center justify-between gap-2 px-1 py-1 bg-white/50 dark:bg-navy-800/50 rounded-xl border border-gray-100 dark:border-navy-700 shadow-sm">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 disabled:opacity-30 text-[#003875] dark:text-[#FFD500] hover:shadow-md transition-all active:scale-95"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Page</span>
                    <span className="text-[11px] font-black text-[#003875] dark:text-white leading-none">
                      {currentPage} <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span> {totalPages}
                    </span>
                  </div>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 disabled:opacity-30 text-[#003875] dark:text-[#FFD500] hover:shadow-md transition-all active:scale-95"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                  <div className="w-6 h-6 border-2 border-[#FFD500]/20 border-t-[#FFD500] rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Fetching...</p>
                </div>
              ) : sortedOrderNumbers.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                  <ShoppingBagIcon className="w-10 h-10 text-gray-100 mx-auto mb-2" />
                  <p className="text-[11px] font-black uppercase tracking-widest italic text-gray-400">No records</p>
                </div>
              ) : (
                paginatedOrderNumbers.map((no) => {
                  const orderItems = groupedOrders[no];
                  const first = orderItems[0];
                  const totalQty = orderItems.reduce((sum: number, item: O2D) => sum + (parseFloat(item.item_qty) || 0), 0);
                  const totalAmt = orderItems.reduce((sum: number, item: O2D) => sum + (parseFloat(item.est_amount) || 0), 0);


                  // Find current pending stage using the unified helper
                  const pIdx = getPendingStepIdx(orderItems);
                  const currentStageIdx = pIdx !== -1 ? pIdx - 1 : -1;
                  const allDone = currentStageIdx === -1;
                  const isSelected = selectedOrderNo === no;
                  const isCancelled = !!first?.cancelled;
                  const isHold = !!first?.hold && !isCancelled;


                  return (
                    <div
                      key={no}
                      onClick={() => setSelectedOrderNo(no)}
                      className={`group relative p-2 rounded-xl border transition-all cursor-pointer ${isSelected
                          ? 'border-[#003875] dark:border-[#FFD500] bg-[#003875]/5 dark:bg-[#FFD500]/5 shadow-xl scale-[1.02] z-10'
                          : isCancelled
                            ? 'border-red-200 dark:border-red-800/40 bg-gradient-to-br from-red-100 via-red-50 to-white dark:from-red-900/30 dark:via-red-900/10 dark:to-navy-800/50 shadow-md hover:shadow-lg hover:scale-[1.01]'
                            : isHold
                              ? 'border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-100 via-orange-50 to-white dark:from-orange-900/30 dark:via-orange-900/10 dark:to-navy-800/50 shadow-md hover:shadow-lg hover:scale-[1.01]'
                              : 'border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800/50 shadow-md hover:shadow-lg dark:hover:border-navy-600 hover:scale-[1.01]'
                        }`}
                    >
                      <div className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-all ${isSelected ? 'bg-[#FFD500]' : isCancelled ? 'bg-red-500' : isHold ? 'bg-orange-500' : 'bg-[#003875]/10 group-hover:bg-[#003875]/20'
                        }`} />

                      {/* Line 1: Order No & Status Labels */}
                      <div className="flex justify-between items-start mb-0.5 pl-1.5">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[13px] font-black text-gray-900 dark:text-white truncate tracking-tight flex items-center gap-2">
                            {currentStageIdx === 0 && !isCancelled && !isHold && (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
                              </span>
                            )}
                            {no}
                          </span>
                          {first?.cancelled ? <span className="px-1.5 py-0.5 rounded-sm bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-[7px] uppercase tracking-widest leading-none font-bold">Cancelled</span> : null}
                          {first?.hold && !first?.cancelled ? <span className="px-1.5 py-0.5 rounded-sm bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 text-[7px] uppercase tracking-widest leading-none font-bold">Hold</span> : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(no); }} className="p-1 px-1.5 bg-[#003875]/5 text-[#003875] dark:bg-[#FFD500]/10 dark:text-[#FFD500] hover:bg-[#003875] hover:text-white dark:hover:bg-[#FFD500] dark:hover:text-black rounded-lg transition-all"><PencilSquareIcon className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(no); }} className="p-1 px-1.5 bg-[#CE2029]/5 text-[#CE2029] hover:bg-[#CE2029] hover:text-white rounded-lg transition-all"><TrashIcon className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Line 2: Party Name */}
                      <div className="pl-1.5 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">
                        {first?.party_name}
                      </div>

                      {/* Line 3: Current Stage & Item Details */}
                      <div className="flex items-end justify-between pl-1.5 min-w-0">
                        <div className="min-w-0 mr-2">
                          {allDone ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 truncate">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 truncate">
                              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse inline-block" />
                              Step {currentStageIdx + 1}: {O2D_STEP_SHORTS[currentStageIdx]}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end shrink-0 leading-[1.1]">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{totalQty} ITEMS</span>
                          <span className="text-[12px] font-black text-[#003875] dark:text-[#FFD500]">₹{totalAmt.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Thick Dark Blue Divider Line */}
          <div className="w-[3px] bg-[#003875] h-full hidden lg:block opacity-80" />

          {/* Detail Pane: Order Details - Compact Layout */}
          <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-navy-900/20 ${!selectedOrderNo ? 'hidden lg:flex' : 'flex'}`}>
            {selectedOrder && selectedOrder.length > 0 ? (
              <div className="flex-1 flex flex-col overflow-hidden">                {/* CREAM HEADER - Compact with all Actions */}
                <div className="px-4 py-2 flex items-center justify-between bg-[#FEF6DB] dark:bg-navy-800 border-b border-orange-100 dark:border-navy-700 text-[#003875] dark:text-[#FFD500]">
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => setSelectedOrderNo(null)} className="lg:hidden p-1.5 bg-[#003875]/10 hover:bg-[#003875]/20 rounded-full transition-all"><ArrowLeftIcon className="w-4 h-4 text-[#003875] dark:text-[#FFD500]" /></button>
                    <h2 className="text-[15px] font-black italic tracking-tight uppercase">{selectedOrderNo}</h2>
                  </div>

                  <div className="flex items-center gap-1">                    {/* Workflow Actions */}
                    {!selectedOrder[0]?.hold && !selectedOrder[0]?.cancelled && !isStep1Lockout && (
                      <div className="flex items-center gap-1.5">
                        {isSpecialRole && (
                          <button
                            onClick={() => setIsRemoveFollowUpModalOpen(true)}
                            className="flex items-center gap-1.5 p-1.5 sm:px-4 sm:py-1.5 bg-[#003875]/5 hover:bg-[#003875]/10 rounded-full text-[#003875] dark:text-[#FFD500] transition-all transition-transform active:scale-90 border border-[#003875]/10 dark:border-[#FFD500]/10"
                            title="Remove Follow-up"
                          >
                            <MinusCircleIcon className="w-4 h-4" />
                            <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Remove Follow-up</span>
                          </button>
                        )}
                        <button
                          onClick={openStepUpdateModal}
                          className="flex items-center gap-1.5 p-1.5 sm:px-5 sm:py-1.5 bg-[#003875] text-[#FFD500] hover:bg-[#002a5a] rounded-full transition-all transition-transform active:scale-90 shadow-lg shadow-black/10 animate-pulse"
                          title="Update Progress"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          <span className="hidden lg:inline text-[10px] font-black uppercase opacity-90">Update</span>
                        </button>
                      </div>
                    )}

                    {/* Status Actions: Hold & Cancel */}
                    <button
                      onClick={() => {
                        setConfirmPayload({ type: 'hold', orderNo: selectedOrderNo as string, currentValue: selectedOrder[0]?.hold });
                        setIsConfirmOpen(true);
                      }}
                       className={`flex items-center gap-1.5 p-1.5 sm:px-4 sm:py-1.5 rounded-full transition-all transition-transform active:scale-90 border ${selectedOrder[0]?.hold ? 'bg-orange-500 text-white border-orange-400 shadow-md' : 'bg-[#003875]/5 text-[#003875]/80 border-[#003875]/10 hover:bg-[#003875]/10 hover:text-[#003875] dark:text-[#FFD500]/80 dark:border-[#FFD500]/10 dark:hover:bg-[#FFD500]/10 dark:hover:text-[#FFD500]'}`}
                      title={selectedOrder[0]?.hold ? 'Resume Order' : 'Put on Hold'}
                    >
                      <PauseCircleIcon className="w-4 h-4" />
                      <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">{selectedOrder[0]?.hold ? 'On Hold' : 'Hold'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmPayload({ type: 'cancelled', orderNo: selectedOrderNo as string, currentValue: selectedOrder[0]?.cancelled });
                        setIsConfirmOpen(true);
                      }}
                      className={`flex items-center gap-1.5 p-1.5 sm:px-4 sm:py-1.5 rounded-full transition-all transition-transform active:scale-90 border ${selectedOrder[0]?.cancelled ? 'bg-black text-white border-black shadow-md' : 'bg-[#003875]/5 text-[#003875]/80 border-[#003875]/10 hover:bg-[#003875]/10 hover:text-[#003875] dark:text-[#FFD500]/80 dark:border-[#FFD500]/10 dark:hover:bg-[#FFD500]/10 dark:hover:text-[#FFD500]'}`}
                      title={selectedOrder[0]?.cancelled ? 'Undo Cancellation' : 'Cancel Order'}
                    >
                      <NoSymbolIcon className="w-4 h-4" />
                      <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">{selectedOrder[0]?.cancelled ? 'Cancelled' : 'Cancel'}</span>
                    </button>

                    <div className="w-px h-5 bg-[#003875]/10 dark:bg-white/20 mx-1 hidden sm:block" />

                    <div className="flex items-center gap-1.5 p-1 bg-[#003875]/5 dark:bg-black/10 rounded-full border border-[#003875]/10 dark:border-white/20 backdrop-blur-sm">
                      <button
                        onClick={() => setDetailViewMode('full')}
                        className={`p-1.5 rounded-full transition-all ${detailViewMode === 'full' ? 'bg-[#003875] text-[#FFD500] shadow-md scale-105' : 'text-[#003875]/60 hover:text-[#003875] dark:text-white/60 dark:hover:text-white'}`}
                      >
                        <Squares2X2Icon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDetailViewMode('table')}
                        className={`p-1.5 rounded-full transition-all ${detailViewMode === 'table' ? 'bg-[#003875] text-[#FFD500] shadow-md scale-105' : 'text-[#003875]/60 hover:text-[#003875] dark:text-white/60 dark:hover:text-white'}`}
                      >
                        <ListBulletIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {detailViewMode === 'full' ? (
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 animate-in fade-in duration-200">
                    {/* Consolidated Summary - Cream Background */}
                    <div className="bg-white dark:bg-navy-800/50 p-6 rounded-2xl border-2 border-gray-100 dark:border-navy-700 shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-9">
                        <div className="mb-5">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">ESTABLISHED PARTNER</p>
                          <p className="text-lg font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-wide">{selectedOrder[0]?.party_name}</p>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          <div className="flex items-center gap-3">
                            <ArchiveBoxIcon className="w-4.5 h-4.5 text-[#003875]/40" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Loadout</span>
                              <span className="text-[13px] font-black text-gray-700 dark:text-gray-100">{selectedOrder.length} Items</span>
                            </div>
                          </div>
                          <div className="w-px h-8 bg-[#003875]/5 mx-1 hidden sm:block" />
                          <div className="flex items-center gap-3">
                            <UserIcon className="w-4.5 h-4.5 text-[#003875]/40" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Operator</span>
                              <span className="text-[13px] font-black text-gray-700 dark:text-gray-100 uppercase truncate max-w-[120px]">{selectedOrder[0]?.filled_by}</span>
                            </div>
                          </div>
                          <div className="w-px h-8 bg-[#003875]/5 mx-1 hidden sm:block" />
                          <div className="flex items-center gap-3">
                            <CalendarDaysIcon className="w-4.5 h-4.5 text-[#003875]/40" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Timestamp</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-black text-gray-700 dark:text-gray-100">
                                  {new Date(selectedOrder[0]?.created_at).toLocaleString(undefined, {
                                    dateStyle: 'short',
                                    timeStyle: 'short'
                                  })}
                                </span>
                                {isStep1Lockout && (
                                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 text-[12px] font-black shadow-sm">
                                    <ClockIcon className="w-4 h-4 animate-pulse" />
                                    -{lockoutTimeLeft.m.toString().padStart(2, '0')}:{lockoutTimeLeft.s.toString().padStart(2, '0')} to enable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {selectedOrder[0]?.hold && !selectedOrder[0]?.cancelled && (
                            <>
                              <div className="w-px h-8 bg-orange-500/10 mx-1 hidden sm:block" />
                              <div className="flex items-center gap-3">
                                <PauseCircleIcon className="w-4.5 h-4.5 text-orange-500/60" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-orange-400 uppercase">Held On</span>
                                  <span className="text-[13px] font-black text-orange-500">
                                    {selectedOrder[0]?.hold && new Date(selectedOrder[0]?.hold).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}

                          {selectedOrder[0]?.cancelled && (
                            <>
                              <div className="w-px h-8 bg-red-500/10 mx-1 hidden sm:block" />
                              <div className="flex items-center gap-3">
                                <NoSymbolIcon className="w-4.5 h-4.5 text-red-500/60" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-red-400 uppercase">Cancelled On</span>
                                  <span className="text-[13px] font-black text-[#CE2029]">
                                    {selectedOrder[0]?.cancelled && new Date(selectedOrder[0]?.cancelled).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-3 flex justify-end">
                        <div className="relative group w-28 h-28">
                          <div className="absolute inset-0 bg-[#FFD500] blur-lg opacity-10" />
                          <div className="relative h-full bg-white dark:bg-black border-4 border-white dark:border-navy-800 rounded-xl overflow-hidden shadow-xl group-hover:scale-105 transition-transform">
                            {selectedOrder[0]?.order_screenshot ? (
                              <img src={getDriveImageUrl(selectedOrder[0]?.order_screenshot)} className="w-full h-full object-cover" />
                            ) : (
                              <PhotoIcon className="w-6 h-6 text-gray-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={selectedOrder[0]?.order_screenshot ? getDriveImageUrl(selectedOrder[0]?.order_screenshot) : "#"} target="_blank" className="p-2 bg-white rounded-full transition-transform hover:scale-110"><EyeIcon className="w-4.5 h-4.5 text-black" /></a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Promotional Deployment - Extra Items for Dispatch */}
                    {(() => {
                      const activeParty = fullParties.find(p => p.partyName === selectedOrder[0]?.party_name);
                      if (activeParty && activeParty.firstOrderItems) {
                        // Parse order no from customerType e.g. "NEW (OR-05)"
                        const match = (activeParty.customerType || '').match(/NEW\s*\((.+?)\)/i);
                        const firstOrderNo = match ? match[1].trim() : null;
                        // Only show if this is the specific linked first order
                        if (firstOrderNo && firstOrderNo === selectedOrder[0]?.order_no) {
                          const promoItems = activeParty.firstOrderItems.split(',').map((s: string) => s.trim()).filter(Boolean);
                          if (promoItems.length > 0) {
                            // Icon + color map for known promo items
                            const promoIconMap: Record<string, { icon: React.ElementType; color: string }> = {
                              "T Shirt": { icon: TagIcon, color: "text-rose-500" },
                              "Note Pad": { icon: DocumentTextIcon, color: "text-sky-500" },
                              "Pen": { icon: PencilSquareIcon, color: "text-violet-500" },
                              "Thele": { icon: ShoppingBagIcon, color: "text-emerald-500" },
                              "Tape Roll": { icon: ArchiveBoxIcon, color: "text-amber-500" },
                              "Posters": { icon: PhotoIcon, color: "text-pink-500" },
                              "Catalogue": { icon: ClipboardDocumentCheckIcon, color: "text-teal-500" },
                            };
                            return (
                              <div className="bg-gradient-to-r from-amber-50 to-[#FFFBF0] dark:from-navy-800 dark:to-navy-900 rounded-2xl border-2 border-[#FFD500] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400 relative">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FFD500]" />
                                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div>
                                    <h3 className="text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest flex items-center gap-2">
                                      <GiftIcon className="w-5 h-5 text-[#FFD500]" />
                                      PROMOTIONAL DEPLOYMENT
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-500 mt-0.5 ml-7 uppercase tracking-wider">Required First Order Extras for Dispatch</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {promoItems.map((item: string, idx: number) => {
                                      const itemMatch = item.match(/(.*?)\s*\(Qty:\s*(.*?)\)/);
                                      const name = itemMatch ? itemMatch[1].trim() : item;
                                      const qty = itemMatch ? itemMatch[2] : "1";
                                      const promo = promoIconMap[name] || { icon: GiftIcon, color: "text-orange-500" };
                                      const ItemIcon = promo.icon;
                                      return (
                                        <div key={idx} className="bg-white dark:bg-black px-3 py-1.5 rounded-lg border border-orange-100 dark:border-navy-700 flex items-center gap-2 shadow-sm">
                                          <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${promo.color}`} />
                                          <span className="text-[11px] font-black text-gray-800 dark:text-gray-100">{name}</span>
                                          <div className="w-px h-3 bg-gray-200 dark:bg-navy-700" />
                                          <span className="text-[11px] font-black text-[#003875] dark:text-[#FFD500]">×{qty}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        }
                      }
                      return null;
                    })()}

                    {/* Tactical Inventory - Reverted to Simple 4-Column Table View */}
                    <div className="bg-white dark:bg-navy-800/50 rounded-2xl border-2 border-gray-100 dark:border-navy-700 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="px-6 py-3 border-b border-gray-100 dark:border-navy-700 flex items-center justify-between bg-white/40 dark:bg-transparent">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 items-center">
                          <div className="w-1 h-3.5 bg-[#003875] rounded-full" /> Tactical Inventory
                        </h3>
                        <div className="text-[12px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tighter">
                          TOTAL Value: ₹{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-amber-100 dark:bg-navy-950 text-[10px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest">
                              <th className="px-6 py-3">NOMENCLATURE</th>
                              <th className="px-6 py-3">ITEM SPECIFICATION</th>
                              <th className="px-6 py-3 text-center">QUANTITY</th>
                              <th className="px-6 py-3 text-right">ESTIMATED AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-navy-800/20">
                            {selectedOrder.map((item, idx) => (
                              <tr key={idx} className="text-[12px] font-bold text-gray-700 dark:text-gray-300 hover:bg-[#003875]/[0.02] dark:hover:bg-navy-700/10 transition-colors">
                                <td className="px-6 py-4 font-black text-gray-900 dark:text-white uppercase">{item.item_name}</td>
                                <td className="px-6 py-4 text-[11px] font-medium text-gray-500 dark:text-gray-400 italic italic">{item.item_specification || "-"}</td>
                                <td className="px-6 py-4 text-center font-black text-[#003875] dark:text-[#FFD500]">{item.item_qty}</td>
                                <td className="px-6 py-4 text-right font-black text-[#CE2029]">₹{parseFloat(item.est_amount).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-100/50 dark:bg-black/20 text-[11px] font-black uppercase tracking-widest text-[#003875] dark:text-[#FFD500]">
                              <td colSpan={2} className="px-6 py-4 italic">Aggregate Order Sum</td>
                              <td className="px-6 py-4 text-center bg-[#003875]/5 dark:bg-[#003875]/10 text-gray-700 dark:text-gray-300">
                                {selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.item_qty) || 0), 0)} Units
                              </td>
                              <td className="px-6 py-4 text-right bg-[#003875] text-white">
                                ₹{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                    {/* Operational Manifest - Step Specific Details */}
                    <div className="bg-white dark:bg-navy-800/50 rounded-2xl border-2 border-gray-100 dark:border-navy-700 shadow-md overflow-hidden">
                      <div className="px-6 py-3 border-b border-gray-100 dark:border-navy-700 bg-white/40 dark:bg-transparent">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 items-center">
                          <div className="w-1 h-3.5 bg-[#003875] rounded-full" /> Operational Manifest
                        </h3>
                      </div>
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
                        {/* Step 1: SO Details */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest border-b border-gray-100 pb-2"><IdentificationIcon className="w-4 h-4" /> Step 1: SO Protocol</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">SO Number</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.so_number_1 || "-"}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Final Amt</span><span className="text-[14px] font-black text-[#003875] dark:text-[#FFD500]">₹{parseFloat(selectedOrder[0]?.final_amount_1 || "0").toLocaleString()}</span></div>
                          </div>
                          <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Merge With</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.merge_order_with_1 || "N/A"}</span></div>
                          {selectedOrder[0]?.upload_so_1 && (
                            <a href={getDriveImageUrl(selectedOrder[0]?.upload_so_1)} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-[#003875]/5 rounded-lg text-[11px] font-black text-[#003875] hover:bg-[#003875]/10 w-fit transition-all uppercase tracking-widest mt-1"><EyeIcon className="w-4 h-4" /> View SO Doc</a>
                          )}
                        </div>

                        {/* Step 6: Packing */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest border-b border-gray-100 pb-2"><ArchiveBoxIcon className="w-4 h-4" /> Step 6: Packing</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Parcels</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.num_of_parcel_6 || "-"}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Packed On</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.actual_date_of_order_packed_6 ? new Date(selectedOrder[0]?.actual_date_of_order_packed_6).toLocaleDateString() : "-"}</span></div>
                          </div>
                          {selectedOrder[0]?.upload_pi_6 && (
                            <a href={getDriveImageUrl(selectedOrder[0]?.upload_pi_6)} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-[#003875]/5 rounded-lg text-[11px] font-black text-[#003875] hover:bg-[#003875]/10 w-fit transition-all uppercase tracking-widest mt-1"><EyeIcon className="w-4 h-4" /> View PI Doc</a>
                          )}
                        </div>

                        {/* Step 7 & 9: Dispatch & Bilty */}
                        <div className="space-y-8">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest border-b border-gray-100 pb-2"><CalendarDaysIcon className="w-4 h-4" /> Step 7: Dispatch</div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Voucher #</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.voucher_num_7 || "-"}</span></div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest border-b border-gray-100 pb-2"><HashtagIcon className="w-4 h-4" /> Step 9: Bilty</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Parcels</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.num_of_parcel_9 || "-"}</span></div>
                              {selectedOrder[0]?.attach_bilty_9 && (
                                <a href={getDriveImageUrl(selectedOrder[0]?.attach_bilty_9)} target="_blank" className="flex items-center gap-2 px-3 py-1.5 bg-[#003875]/5 rounded-lg text-[10px] font-black text-[#003875] hover:bg-[#003875]/10 w-fit transition-all uppercase tracking-widest self-end mb-1"><EyeIcon className="w-3.5 h-3.5" /> Bilty</a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Step 8: Verification */}
                        <div className="space-y-4 lg:col-span-2">
                          <div className="flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest border-b border-gray-100 pb-2"><CalendarDaysIcon className="w-4 h-4" /> Step 8: Operational Audit</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Checked</span><span className={`text-[14px] font-black ${selectedOrder[0]?.order_details_checked_8 === 'Yes' ? 'text-green-500' : 'text-red-500'}`}>{selectedOrder[0]?.order_details_checked_8 || "No"}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Voucher 51</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.voucher_num_51_8 || "-"}</span></div>
                            <div className="flex flex-col sm:col-span-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">T. Amount</span><span className="text-[14px] font-black text-[#003875] dark:text-[#FFD500]">₹{parseFloat(selectedOrder[0]?.t_amt_8 || "0").toLocaleString()}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dark Blue Decorative Line */}
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-[#003875]/20 to-transparent" />

                    {/* Compact Remarks - Cream Background */}
                    {selectedOrder[0]?.remark && (
                      <div className="bg-[#FEF6DB] dark:bg-navy-800/50 p-5 rounded-2xl border-2 border-orange-100 dark:border-navy-700 relative shadow-md">
                        <ChatBubbleBottomCenterTextIcon className="absolute top-4 right-4 w-6 h-6 text-[#003875]/10" />
                        <span className="text-[9px] font-black text-[#003875]/40 uppercase tracking-[0.2em] block mb-1.5 font-bold">Intelligence Report</span>
                        <p className="text-[12px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed italic">"{selectedOrder[0]?.remark}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Pure Simple Table View - Cream Background Theme */
                  <div className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar p-6 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-white dark:bg-navy-900 rounded-xl border-2 border-gray-100 dark:border-navy-700 shadow-xl w-max min-w-full overflow-hidden">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-amber-100 dark:bg-navy-950 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest">
                            <th className="px-6 py-4 border-r border-[#003875]/10 sticky left-0 z-10 bg-amber-100 dark:bg-navy-950">Nomenclature</th>
                            <th className="px-6 py-4 border-r border-[#003875]/10">Item Specification</th>
                            <th className="px-6 py-4 text-center border-r border-[#003875]/10">Quantity</th>
                            <th className="px-6 py-4 text-right border-r border-[#003875]/10">Estimated Amount</th>
                            {O2D_STEPS.map((step, idx) => (
                              <th key={idx} className="px-4 py-3 text-center border-r border-[#003875]/10 last:border-r-0 align-top" title={step}>
                                <div className="flex flex-col items-center justify-center gap-0.5 min-w-[120px]">
                                  <span className="text-[8px] opacity-50 uppercase tracking-[0.2em] font-black">Step {idx + 1}</span>
                                  <span className="text-[10px] whitespace-normal leading-tight">{O2D_STEP_SHORTS[idx]}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#CE2029]/5 dark:divide-navy-800/20">
                          {selectedOrder.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors text-[13px] font-medium text-gray-700 dark:text-gray-200">
                              <td className="px-6 py-3 border-r border-[#CE2029]/5 sticky left-0 z-10 bg-white dark:bg-navy-800">{item.item_name}</td>
                              <td className="px-6 py-3 border-r border-[#CE2029]/5 italic text-gray-500 text-[11px] max-w-[250px] truncate" title={item.item_specification}>{item.item_specification || "-"}</td>
                              <td className="px-6 py-3 text-center border-r border-[#CE2029]/5 bg-[#FFD500]/5 dark:bg-navy-900 font-black">{item.item_qty}</td>
                              <td className="px-6 py-3 text-right font-black text-[#003875] dark:text-[#FFD500] border-r border-[#CE2029]/5">₹{parseFloat(item.est_amount).toLocaleString()}</td>
                              {O2D_STEPS.map((_, stepIdx) => {
                                const plannedRaw = item[`planned_${stepIdx + 1}` as keyof O2D] as string;
                                const actualRaw = item[`actual_${stepIdx + 1}` as keyof O2D] as string;
                                const status = item[`status_${stepIdx + 1}` as keyof O2D] as string;

                                const planned = formatDate(plannedRaw);
                                const actual = formatDate(actualRaw);
                                const delay = getTimeDelay(plannedRaw, actualRaw);

                                return (
                                  <td key={stepIdx} className="px-6 py-2 min-w-[140px] border-r border-[#CE2029]/5 last:border-r-0">
                                    <div className="flex flex-col gap-1.5 text-[10.5px]">
                                      <div className="flex justify-between items-center gap-2"><span className="text-gray-400 font-black tracking-widest uppercase text-[9px]">Plan</span> <span className="font-bold text-gray-800 dark:text-gray-200">{planned}</span></div>
                                      <div className="flex justify-between items-center gap-2"><span className="text-gray-400 font-black tracking-widest uppercase text-[9px]">Actual</span> <span className="font-black text-[#003875] dark:text-[#FFD500]">{actual}</span></div>
                                      <div className="flex justify-between items-center gap-2"><span className="text-gray-400 font-black tracking-widest uppercase text-[9px]">Status</span> <span className={`font-black uppercase ${((status || "").toString().trim().toLowerCase() === 'done' || (status || "").toString().trim().toLowerCase() === 'yes') ? 'text-green-500' : 'text-[#CE2029]'}`}>{status || '-'}</span></div>
                                      {delay && (
                                        <div className={`flex justify-between items-center gap-2 border-t pt-1.5 mt-0.5 ${delay.isDelayed ? 'border-red-100 dark:border-red-900/30' : 'border-green-100 dark:border-green-900/30'}`}>
                                          <span className="text-gray-400 font-black tracking-widest uppercase text-[9px]">Delay</span>
                                          <span className={`font-black text-[10px] ${delay.isDelayed ? 'text-[#CE2029]' : 'text-green-600'}`}>
                                            {delay.text}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#FEF6DB]/80 dark:bg-navy-950 font-black text-[#003875] dark:text-white text-[13px] border-t-2 border-[#003875]/20 shadow-inner">
                            <td className="px-6 py-4 border-r border-[#003875]/10 sticky left-0 z-10 bg-[#FEF6DB]/80 dark:bg-navy-950 backdrop-blur-md">AGGREGATE SUM</td>
                            <td className="px-6 py-4 border-r border-[#003875]/10"></td>
                            <td className="px-6 py-4 text-center border-r border-[#003875]/10">{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.item_qty) || 0), 0)} Units</td>
                            <td className="px-6 py-4 text-right text-[#003875] dark:text-[#FFD500] border-r border-[#003875]/10">₹{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}</td>
                            <td colSpan={O2D_STEPS.length} className="px-6 py-4"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-30">
                <div className="w-16 h-16 bg-[#003875]/5 rounded-full flex items-center justify-center mb-4"><Squares2X2Icon className="w-8 h-8 text-[#003875]" /></div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#003875] italic">Select record to engage</p>
              </div>
            )}
          </div>{/* end Detail Pane */}
        </div>{/* end Panels Row */}
      </div>{/* end Main Container (now inside wrapper) */}
    </div>{/* end Main Master-Detail View Wrapper */}

      <PartyFormModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        onSuccess={(partyName, partyData) => {
          setParties((prev) => Array.from(new Set([...prev, partyName])));
          if (partyData) {
            setFullParties((prev) => [...prev, partyData]);
          }
          setCommonData((prev) => ({ ...prev, party_name: partyName }));
          setIsPartyModalOpen(false);
        }}
        salePersonName={session?.user?.name || ""}
        linkedOrderNo={commonData.order_no}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-900 w-full max-w-2xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-orange-100/30 dark:border-navy-700 flex items-center justify-between shrink-0 bg-[#FEF6DB] dark:bg-navy-800">
              <div>
                <h2 className="text-xl font-black text-[#003875] dark:text-[#FFD500] italic">{editingOrderNo ? `EDIT ORDER: ${editingOrderNo}` : "CREATE NEW ORDER"}</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">Automated Intelligence Protocol</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-2xl transition-all"><XMarkIcon className="w-6 h-6 shrink-0" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5 bg-white/40 dark:bg-navy-900 no-scrollbar">
              <div className="space-y-6">
                {/* Common Information */}
                <div className="bg-white dark:bg-navy-800/60 p-5 rounded-3xl border border-gray-100 dark:border-navy-700 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 -ml-1">
                    <div className="w-1 h-5 bg-[#003875] dark:bg-[#FFD500] rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-200">MASTER CLASSIFICATION</h3>
                  </div>

                  <div className="flex flex-wrap items-end gap-5">
                    <div className="relative group">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><PhotoIcon className="w-3 h-3 text-[#FFD500]" />Order Proof</label>
                      <label className="flex flex-col items-center justify-center w-28 h-28 bg-gray-50/50 dark:bg-navy-900 border-2 border-dashed border-gray-100 dark:border-navy-700 rounded-3xl hover:border-[#FFD500] cursor-pointer transition-all active:scale-95 shadow-inner overflow-hidden relative">
                        {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <><PhotoIcon className="w-7 h-7 text-gray-200 group-hover:text-[#FFD500] transition-colors" /><span className="text-[8px] font-black text-gray-300 mt-2 tracking-tighter">UPLOAD</span></>}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                      {imagePreview && <button type="button" onClick={() => { setScreenshotFile(null); setImagePreview(null); }} className="absolute -top-1 -right-1 p-1.5 bg-red-500 text-white rounded-xl shadow-lg border-2 border-white"><XMarkIcon className="w-3 h-3" /></button>}
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><IdentificationIcon className="w-3 h-3" />Order ID</label>
                        <input type="text" value={commonData.order_no} readOnly className="w-full h-[36px] bg-gray-50 dark:bg-black border border-transparent dark:border-navy-700 px-3 rounded-xl font-bold text-[11px] text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-inner" />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 min-w-0">
                          <SearchableDropdown label="Partner Name" icon={BuildingOfficeIcon} value={commonData.party_name} onChange={(val) => setCommonData({ ...commonData, party_name: val })} options={parties} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPartyModalOpen(true)}
                          className="w-[36px] h-[36px] shrink-0 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-xl flex items-center justify-center shadow-sm hover:scale-105 transition-all mt-[auto] border border-[#003875]/20 dark:border-[#FFD500]/20"
                          title="Create New Party"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><ChatBubbleBottomCenterTextIcon className="w-3 h-3" />Remarks</label>
                    <textarea value={commonData.remark} onChange={(e) => setCommonData({ ...commonData, remark: e.target.value })} className="w-full bg-[#FEF6DB] dark:bg-black p-3 rounded-2xl border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm min-h-[60px] no-scrollbar" placeholder="Order notes..." />
                  </div>
                </div>

                {/* Dynamic Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-[#CE2029] rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-200">ITEMIZED LOGISTICS</h3>
                    </div>
                    <button type="button" onClick={addItemRow} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#003875] dark:text-[#FFD500] hover:scale-105 transition-all bg-[#003875]/5 dark:bg-[#FFD500]/10 px-4 py-2 rounded-full shadow-sm"><PlusIcon className="w-3.5 h-3.5 stroke-[3]" /> ADD LINE ITEM</button>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((item, index) => (
                      <div key={index} className="p-4 bg-white dark:bg-navy-800/50 rounded-2xl border border-gray-100 dark:border-navy-700 animate-in slide-in-from-right-2 duration-300 shadow-sm space-y-4 relative group">
                        {/* Remove Button - Top Right Absolute for Mobile Optimization */}
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="absolute top-2.5 right-2.5 p-1.5 text-gray-300 hover:text-[#CE2029] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all z-10"
                            title="Remove Line Item"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end">
                          <div className="md:col-span-6 min-w-0">
                            <SearchableDropdown label="Nomenclature" icon={ArchiveBoxIcon} value={item.item_name} onChange={(val) => handleItemChange(index, 'item_name', val)} options={dropdownItems.map(i => i.name)} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1.5"><HashtagIcon className="w-2.5 h-2.5" />Qty</label>
                            <input type="number" value={item.item_qty} onChange={(e) => handleItemChange(index, 'item_qty', e.target.value)} className="w-full h-[34px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm transition-all" required />
                          </div>
                          <div className="md:col-span-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1.5"><CurrencyRupeeIcon className="w-2.5 h-2.5" />Total</label>
                            <input type="text" value={item.est_amount} onChange={(e) => handleItemChange(index, 'est_amount', e.target.value)} className="w-full h-[34px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-[#003875] dark:text-[#FFD500] shadow-sm transition-all" required />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-50 dark:border-white/5">
                          <input
                            type="text"
                            value={item.item_specification}
                            onChange={(e) => handleItemChange(index, 'item_specification', e.target.value)}
                            className="w-full h-[34px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm transition-all"
                            placeholder="Item Specification..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-orange-100/30 dark:border-navy-700 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-[48px] rounded-2xl font-black text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]">Abandon</button>
                <button type="submit" className="flex-[2] h-[48px] bg-[#CE2029] hover:bg-[#8E161D] text-white rounded-2xl font-black transition-all shadow-[0_8px_20px_-6px_rgba(206,32,41,0.5)] active:scale-95 uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 group"><PlusIcon className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" /> {editingOrderNo ? "PROTOCOL UPDATE" : "EXECUTE ORDER"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSetupModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-md" onClick={() => setIsSetupModalOpen(false)} />
          <div className="relative bg-[#FEF6DB] dark:bg-navy-900 w-full max-w-4xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-orange-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-orange-100/50 dark:border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-[#003875] dark:text-[#FFD500] italic">SYSTEM CONFIGURATION</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">Define TAT and Operators</p>
              </div>
              <button type="button" onClick={() => setIsSetupModalOpen(false)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-2xl transition-all"><XMarkIcon className="w-6 h-6 shrink-0" /></button>
            </div>

            <form onSubmit={handleSaveSetup} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-3 no-scrollbar">
              {stepConfigs.map((config, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white dark:bg-navy-800/50 rounded-2xl border border-gray-100 dark:border-navy-700 shadow-sm items-center hover:border-orange-100 dark:hover:border-[#FFD500]/30 transition-colors">
                  <div className="md:col-span-5 flex flex-col">
                    <span className="text-[9px] font-black text-[#003875]/50 dark:text-[#FFD500]/50 uppercase tracking-widest mb-1">Step {index + 1}</span>
                    <span className="text-[12px] font-bold text-gray-800 dark:text-gray-100 leading-tight">{config.step_name}</span>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><ClockIcon className="w-3 h-3 text-[#FFD500]" /> TAT</label>
                    <div className="flex h-[38px] bg-[#FEF6DB] dark:bg-navy-950/50 border border-orange-100 dark:border-navy-700 focus-within:border-[#FFD500] rounded-2xl shadow-sm transition-all overflow-hidden items-center p-1">
                      <div className="flex gap-1 bg-white/50 dark:bg-navy-900 p-0.5 rounded-xl border border-gray-100 dark:border-navy-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const val = config.tat.split(" ")[0] || "24";
                            const newConfigs = [...stepConfigs];
                            newConfigs[index].tat = `${val} Hrs`;
                            setStepConfigs(newConfigs);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${config.tat.includes("Hrs") ? "bg-[#FFD500] text-black shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                        >
                          Hrs
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = config.tat.split(" ")[0] || "1";
                            const newConfigs = [...stepConfigs];
                            newConfigs[index].tat = `${val} Days`;
                            setStepConfigs(newConfigs);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${config.tat.includes("Days") ? "bg-[#FFD500] text-black shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                        >
                          Days
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={config.tat.split(" ")[0] || ""}
                        onChange={(e) => {
                          const unit = config.tat.split(" ")[1] || "Hrs";
                          const newConfigs = [...stepConfigs];
                          newConfigs[index].tat = `${e.target.value} ${unit}`;
                          setStepConfigs(newConfigs);
                        }}
                        placeholder="24"
                        className="w-full bg-transparent px-3 outline-none text-[12px] font-black text-gray-800 dark:text-gray-100 placeholder:text-gray-400/50 text-right"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-4 self-end">
                    <SearchableDropdown
                      label="Responsible Operator"
                      icon={UserIcon}
                      value={config.responsible_person}
                      onChange={(val) => {
                        const newConfigs = [...stepConfigs];
                        newConfigs[index].responsible_person = val;
                        setStepConfigs(newConfigs);
                      }}
                      options={usersList}
                      placeholder="Assign to..."
                    />
                  </div>
                </div>
              ))}
            </form>

            <div className="p-5 border-t border-orange-100/50 dark:border-navy-700 flex gap-3 shrink-0 bg-white/40 dark:bg-transparent">
              <button type="button" onClick={() => setIsSetupModalOpen(false)} className="flex-1 h-[48px] rounded-2xl font-black text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-white/5 transition-all uppercase tracking-widest text-[10px]">Cancel</button>
              <button type="submit" onClick={handleSaveSetup} className="flex-[2] h-[48px] bg-[#003875] dark:bg-[#FFD500] hover:bg-[#002855] dark:hover:bg-[#E6C000] text-white dark:text-black rounded-2xl font-black transition-all shadow-[0_8px_20px_-6px_rgba(0,56,117,0.5)] dark:shadow-[0_8px_20px_-6px_rgba(255,213,0,0.3)] active:scale-95 uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2"><Cog6ToothIcon className="w-5 h-5 stroke-[2.5]" /> SAVE CONFIGURATION</button>
            </div>
          </div>
        </div>
      )}

      {isStepUpdateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" onClick={() => setIsStepUpdateModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-orange-100/30 dark:border-navy-700 flex items-center justify-between shrink-0 bg-[#FEF6DB] dark:bg-navy-800">
              <div>
                <h2 className="text-lg font-black text-[#CE2029] italic uppercase tracking-tight">Step Update: {O2D_STEP_SHORTS[currentStepToUpdate - 1]}</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Execution Protocol {selectedOrderNo}</p>
              </div>
              <button onClick={() => setIsStepUpdateModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleStepUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              <div className="space-y-4">
                {/* Status Toggle */}
                <YesNoToggle
                  label="Mission Completed?"
                  value={stepUpdateFields.status}
                  onChange={(val) => setStepUpdateFields({ ...stepUpdateFields, status: val })}
                />

                {/* Actual Time - Automated */}
                <div className="hidden">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><ClockIcon className="w-3 h-3 text-[#FFD500]" /> Actual Timestamp</label>
                  <input
                    type="datetime-local"
                    value={stepUpdateFields.actual ? new Date(stepUpdateFields.actual).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, actual: new Date(e.target.value).toISOString() })}
                    className="w-full h-[38px] bg-[#FEF6DB] dark:bg-black px-4 rounded-xl border border-orange-100 dark:border-navy-700 font-bold text-[11px] outline-none focus:border-[#FFD500]"
                  />
                </div>

                {/* Step Specific Fields */}
                {currentStepToUpdate === 1 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Final Amount</label>
                        <input type="text" value={stepUpdateFields.final_amount_1} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, final_amount_1: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white" placeholder="Value..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">SO Number</label>
                        <input type="text" value={stepUpdateFields.so_number_1} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, so_number_1: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white" placeholder="SO#..." />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <SearchableDropdown
                        label="Merge Order With"
                        icon={IdentificationIcon}
                        value={stepUpdateFields.merge_order_with_1 ? (
                          (() => {
                            const match = Object.keys(groupedOrders).find(no => no === stepUpdateFields.merge_order_with_1);
                            return match ? `${match} | ${groupedOrders[match][0]?.party_name || ''}` : stepUpdateFields.merge_order_with_1;
                          })()
                        ) : ""}
                        onChange={(val) => {
                          const no = val.split(" | ")[0];
                          setStepUpdateFields({ ...stepUpdateFields, merge_order_with_1: no });
                        }}
                        options={Object.keys(groupedOrders)
                          .filter(no => no !== selectedOrderNo)
                          .map(no => `${no} | ${groupedOrders[no][0]?.party_name || ''}`)
                        }
                        placeholder="Select Order ID..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5"><PhotoIcon className="w-3 h-3" /> Upload SO (Attachment)</label>
                      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-orange-100 rounded-2xl hover:bg-orange-50/30 cursor-pointer overflow-hidden relative">
                        {stepAttachmentPreview && stepAttachment?.type.startsWith('image/') ? (
                          <img src={stepAttachmentPreview} className="w-full h-full object-cover" />
                        ) : stepAttachment ? (
                          <div className="flex flex-col items-center gap-1">
                            <ArchiveBoxIcon className="w-8 h-8 text-[#003875]/40" />
                            <span className="text-[8px] font-black text-gray-400 max-w-[150px] truncate">{stepAttachment.name}</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <PlusIcon className="w-5 h-5 text-gray-300 mx-auto" />
                            <span className="text-[9px] font-black text-gray-300 tracking-widest uppercase">Select File</span>
                          </div>
                        )}
                        <input type="file" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setStepAttachment(file);
                            setStepAttachmentPreview(URL.createObjectURL(file));
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                )}

                {currentStepToUpdate === 6 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">Number of Parcel</label>
                      <input type="text" value={stepUpdateFields.num_of_parcel_6} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, num_of_parcel_6: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white" placeholder="Count..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-bold">Actual Date of Packing</label>
                      <input type="date" value={stepUpdateFields.actual_date_of_order_packed_6 ? new Date(stepUpdateFields.actual_date_of_order_packed_6).toISOString().split('T')[0] : ""} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, actual_date_of_order_packed_6: new Date(e.target.value).toISOString() })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1.5 font-bold"><PhotoIcon className="w-3 h-3" /> Upload PI (Attachment)</label>
                      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-orange-100 rounded-2xl hover:bg-orange-50/30 cursor-pointer overflow-hidden relative mt-1.5">
                        {stepAttachmentPreview && stepAttachment?.type.startsWith('image/') ? (
                          <img src={stepAttachmentPreview} className="w-full h-full object-cover" />
                        ) : stepAttachment ? (
                          <div className="flex flex-col items-center gap-1">
                            <ArchiveBoxIcon className="w-8 h-8 text-[#003875]/40" />
                            <span className="text-[8px] font-black text-gray-400 max-w-[150px] truncate">{stepAttachment.name}</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <PlusIcon className="w-5 h-5 text-gray-300 mx-auto" />
                            <span className="text-[9px] font-black text-gray-300 tracking-widest uppercase">Select PI</span>
                          </div>
                        )}
                        <input type="file" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setStepAttachment(file);
                            setStepAttachmentPreview(URL.createObjectURL(file));
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                )}

                {currentStepToUpdate === 7 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">Voucher Number</label>
                      <input type="text" value={stepUpdateFields.voucher_num_7} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, voucher_num_7: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white" placeholder="Voucher#..." />
                    </div>
                  </div>
                )}

                {currentStepToUpdate === 8 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <YesNoToggle
                      label="Details checked in Sheet?"
                      value={stepUpdateFields.order_details_checked_8}
                      onChange={(val) => setStepUpdateFields({ ...stepUpdateFields, order_details_checked_8: val })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">Voucher Num (51)</label>
                        <input type="text" value={stepUpdateFields.voucher_num_51_8} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, voucher_num_51_8: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white" placeholder="V#51..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">T. Amount</label>
                        <input type="text" value={stepUpdateFields.t_amt_8} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, t_amt_8: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-[#003875] dark:text-[#FFD500]" placeholder="Amt..." />
                      </div>
                    </div>
                  </div>
                )}

                {currentStepToUpdate === 9 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">Number of Parcel</label>
                      <input type="text" value={stepUpdateFields.num_of_parcel_9} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, num_of_parcel_9: e.target.value })} className="w-full h-[36px] bg-[#FEF6DB] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 font-bold text-[11px] text-gray-800 dark:text-white" placeholder="Count..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block flex items-center gap-1.5 font-bold font-bold"><PhotoIcon className="w-3 h-3" /> Attach Bilty (Attachment)</label>
                      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-orange-100 rounded-2xl hover:bg-orange-50/30 cursor-pointer overflow-hidden relative mt-1.5">
                        {stepAttachmentPreview && stepAttachment?.type.startsWith('image/') ? (
                          <img src={stepAttachmentPreview} className="w-full h-full object-cover" />
                        ) : stepAttachment ? (
                          <div className="flex flex-col items-center gap-1">
                            <ArchiveBoxIcon className="w-8 h-8 text-[#003875]/40" />
                            <span className="text-[8px] font-black text-gray-400 max-w-[150px] truncate">{stepAttachment.name}</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <PlusIcon className="w-5 h-5 text-gray-300 mx-auto" />
                            <span className="text-[9px] font-black text-gray-300 tracking-widest uppercase">Select Bilty</span>
                          </div>
                        )}
                        <input type="file" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setStepAttachment(file);
                            setStepAttachmentPreview(URL.createObjectURL(file));
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsStepUpdateModalOpen(false)} className="flex-1 h-[44px] rounded-xl font-black text-gray-400 uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-all">Abort</button>
                <button type="submit" className="flex-[2] h-[44px] bg-[#CE2029] text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 active:scale-95 transition-all">Deploy Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen && !!confirmPayload}
        onClose={() => { setIsConfirmOpen(false); setConfirmPayload(null); }}
        onConfirm={async () => {
          if (!confirmPayload) return;
          if (confirmPayload.type === 'delete') {
            await performDelete();
          } else {
            await handleToggleStatus(confirmPayload.orderNo as string, confirmPayload.type as 'hold' | 'cancelled', confirmPayload.currentValue);
          }
          setIsConfirmOpen(false);
          setConfirmPayload(null);
        }}
        title={
          confirmPayload?.type === 'delete' ? "Terminate Protocol?" :
            confirmPayload?.type === 'hold' ? (confirmPayload.currentValue ? "Release Hold?" : "Place on Hold?") :
              "Cancel Order?"
        }
        message={
          confirmPayload?.type === 'delete' ? "This action will permanently purge this record from the grid. Are you sure you want to execute this command?" :
            confirmPayload?.type === 'hold' ? (confirmPayload.currentValue ? "Do you want to release this order from the hold status?" : "Do you want to place this order on hold?") :
              "Are you sure you want to cancel this order? This action will mark it as cancelled."
        }
        confirmLabel="Yes, Execute"
        cancelLabel="No, Abort"
        type={confirmPayload?.type === 'delete' || confirmPayload?.type === 'cancelled' ? 'danger' : 'info'}
      />
      <ActionStatusModal isOpen={isStatusModalOpen} status={actionStatus} message={actionMessage} />

      {/* Remove Follow-up Modal */}
      {isRemoveFollowUpModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" onClick={() => setIsRemoveFollowUpModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-navy-700 flex items-center justify-between bg-gray-50/50 dark:bg-navy-800">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white italic uppercase tracking-tight">Revision Protocol</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Clear Operational Data: {selectedOrderNo}</p>
              </div>
              <button onClick={() => setIsRemoveFollowUpModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block">Target Step to Clear</label>
                <select
                  value={removeStep}
                  onChange={(e) => setRemoveStep(parseInt(e.target.value))}
                  className="w-full h-[48px] bg-[#FEF6DB] dark:bg-black px-4 rounded-xl border border-orange-100 dark:border-navy-700 font-bold text-[13px] outline-none appearance-none"
                >
                  {O2D_STEPS.map((step, idx) => (
                    <option key={idx} value={idx + 1}>Step {idx + 1}: {step}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Clearance Scope</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRemoveOnwards(false)}
                    className={`py-3 px-4 rounded-xl border-2 transition-all text-center ${!removeOnwards ? 'border-[#CE2029] bg-[#CE2029]/5 text-[#CE2029]' : 'border-gray-100 dark:border-navy-700 text-gray-400 hover:border-gray-200'}`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-tighter">Only Step {removeStep}</p>
                    <p className="text-[8px] font-bold opacity-60">Surgical Clear</p>
                  </button>
                  <button
                    onClick={() => setRemoveOnwards(true)}
                    className={`py-3 px-4 rounded-xl border-2 transition-all text-center ${removeOnwards ? 'border-[#CE2029] bg-[#CE2029]/5 text-[#CE2029]' : 'border-gray-100 dark:border-navy-700 text-gray-400 hover:border-gray-200'}`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-tighter">Step {removeStep} Onwards</p>
                    <p className="text-[8px] font-bold opacity-60">Sequence Reset</p>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-amber-100 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                  <span className="font-black uppercase tracking-widest block mb-1">Impact Analysis:</span>
                  This will clear Status, Actual Time, and Step-specific data (Vouchers, SO#, etc.). <strong>Planned dates will be preserved</strong> to allow accurate re-entry.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsRemoveFollowUpModalOpen(false)} className="flex-1 h-[48px] rounded-xl font-black text-gray-400 uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all underline decoration-dotted">Abort</button>
                <button onClick={handleRemoveFollowUp} className="flex-[2] h-[48px] bg-[#CE2029] text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all">Confirm Clear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BusyModal
        isOpen={isBusyModalOpen}
        onClose={() => setIsBusyModalOpen(false)}
        groupedOrders={groupedOrders}
        fullParties={fullParties}
      />
    </div>
  );
}

function BusyModal({ isOpen, onClose, groupedOrders, fullParties }: { isOpen: boolean, onClose: () => void, groupedOrders: any, fullParties: any[] }) {
  const [selectedNos, setSelectedNos] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState("Copy All for Busy");

  const orderOptions = useMemo(() => {
    return Object.keys(groupedOrders)
      .map(no => ({
        no,
        party: groupedOrders[no][0]?.party_name || ""
      }))
      .sort((a, b) => b.no.localeCompare(a.no)) // Sort newest first
      .map(item => `${item.no} | ${item.party}`);
  }, [groupedOrders]);

  const results = useMemo(() => {
    return selectedNos.map(no => {
      const orders = Object.keys(groupedOrders)
        .filter(k => k.toLowerCase() === no.toLowerCase())
        .map(k => groupedOrders[k])[0];
        
      if (!orders || orders.length === 0) return { orderNo: no, found: false, partyName: "", items: [], promoItems: [] };
      
      const first = orders[0];
      const activeParty = fullParties.find(p => p.partyName === first.party_name);
      let promoItems: { name: string, qty: string }[] = [];
      
      if (activeParty && activeParty.firstOrderItems) {
        const match = (activeParty.customerType || '').match(/NEW\s*\((.+?)\)/i);
        const firstOrderNo = match ? match[1].trim() : null;
        
        if (firstOrderNo && firstOrderNo === first.order_no) {
          promoItems = activeParty.firstOrderItems.split(',').map((s: string) => {
            const m = s.trim().match(/(.*?)\s*\(Qty:\s*(.*?)\)/);
            return m ? { name: m[1].trim(), qty: m[2] } : { name: s.trim(), qty: "1" };
          }).filter((i: { name: string }) => i.name);
        }
      }

      return {
        orderNo: first.order_no,
        partyName: first.party_name,
        items: orders.map((o: any) => ({ name: o.item_name, qty: o.item_qty })),
        promoItems,
        found: true
      };
    });
  }, [selectedNos, groupedOrders, fullParties]);

  const handleCopy = () => {
    // Format as Tab-Separated Values for easy pasting into grids
    let text = "";
    results.filter(r => r.found).forEach(r => {
      r.items.forEach((i: any) => {
        text += `${i.name}\t${i.qty}\n`;
      });
      if (r.promoItems && r.promoItems.length > 0) {
        r.promoItems.forEach((p: any) => {
          text += `${p.name} (PROMO)\t${p.qty}\n`;
        });
      }
    });

    navigator.clipboard.writeText(text);
    setCopyStatus("Copied to Clipboard!");
    setTimeout(() => setCopyStatus("Copy All for Busy"), 2000);
  };

  const addOrder = (val: string) => {
    const no = val.split(" | ")[0];
    if (no && !selectedNos.includes(no)) {
      setSelectedNos(prev => [...prev, no]);
    }
  };

  const removeOrder = (no: string) => {
    setSelectedNos(prev => prev.filter(n => n !== no));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-navy-900 w-full max-w-lg rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-navy-700 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-orange-100/30 dark:border-navy-700 flex items-center justify-between shrink-0 bg-[#FEF6DB] dark:bg-navy-800">
          <div>
            <h2 className="text-xl font-black text-[#003875] dark:text-[#FFD500] italic uppercase">DATA FOR BUSY</h2>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">Simple Item Logistics</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 bg-white/40 dark:bg-navy-900">
          <div className="space-y-4">
            <SearchableDropdown
              label="Select Orders"
              icon={MagnifyingGlassIcon}
              value=""
              onChange={addOrder}
              options={orderOptions.filter(no => !selectedNos.includes(no))}
              placeholder="Search order number..."
              keepOpen={true}
              listPosition="relative"
            />
            
            {selectedNos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedNos.map(no => (
                  <span key={no} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#003875] text-[#FFD500] rounded-full text-[10px] font-black shadow-sm" title={groupedOrders[no]?.[0]?.party_name}>
                    {no}
                    <span className="opacity-60 font-bold border-l border-[#FFD500]/30 pl-1.5 ml-0.5 truncate max-w-[80px]">
                      {groupedOrders[no]?.[0]?.party_name}
                    </span>
                    <button onClick={() => removeOrder(no)} className="hover:text-red-400 transition-colors ml-1"><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                ))}
                <button onClick={() => setSelectedNos([])} className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline ml-auto">Clear All</button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {results.length > 0 ? (
              results.map((r, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border-2 ${r.found ? 'bg-white dark:bg-navy-800/50 border-orange-100/30 dark:border-navy-700 shadow-sm' : 'bg-red-50 border-red-100 text-red-500 opacity-60'}`}>
                  {!r.found ? (
                    <p className="text-[10px] font-black italic">Order {r.orderNo} not found</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col border-b border-gray-50 dark:border-white/5 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-black text-[#003875] dark:text-[#FFD500] italic">{r.orderNo}</span>
                          <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate max-w-[200px]">{r.partyName}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-2">
                        {/* Header */}
                        <div className="col-span-10 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5 pb-1">Item Description</div>
                        <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-white/5 pb-1 text-right">Qty</div>
                        
                        {/* Items */}
                        {r.items.map((i: any, ii: number) => (
                          <React.Fragment key={ii}>
                            <div className="col-span-10 text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase truncate py-0.5">{i.name}</div>
                            <div className="col-span-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] text-right py-0.5">{i.qty}</div>
                          </React.Fragment>
                        ))}
                        
                        {/* Promos */}
                        {r.promoItems && r.promoItems.length > 0 && r.promoItems.map((p: any, ii: number) => (
                          <React.Fragment key={`p-${ii}`}>
                            <div className="col-span-10 text-[11px] font-bold text-rose-500 uppercase truncate py-0.5 flex items-center gap-1.5 mt-1 border-t border-rose-50 dark:border-rose-900/10 pt-1">
                              <span className="w-1 h-1 rounded-full bg-rose-400" />
                              {p.name} (X-TRA)
                            </div>
                            <div className="col-span-2 text-[11px] font-black text-rose-500 text-right py-0.5 mt-1 border-t border-rose-50 dark:border-rose-900/10 pt-1">{p.qty}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 opacity-30">
                <ArchiveBoxIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready for extraction</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-navy-700 bg-white/80 dark:bg-navy-800/80 backdrop-blur-md flex flex-col gap-3">
          <button
            onClick={handleCopy}
            disabled={results.filter(r => r.found).length === 0}
            className="w-full h-[52px] bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
           <ClipboardDocumentCheckIcon className="w-5 h-5" />
           {copyStatus}
          </button>
          <button onClick={onClose} className="w-full h-[40px] rounded-xl font-black text-gray-400 uppercase tracking-widest text-[9px] hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Close Modal</button>
        </div>
      </div>
    </div>
  );
}

function YesNoToggle({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FEF6DB] to-white dark:from-navy-800 dark:to-navy-900 rounded-2xl border border-orange-100 dark:border-navy-700 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD500]/30" />
      <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">{label}</span>
      <div className="flex bg-gray-100/50 dark:bg-black/40 p-1.5 rounded-full border border-gray-100 dark:border-navy-800 backdrop-blur-sm relative">
        <div
          className={`absolute top-1.5 bottom-1.5 transition-all duration-300 rounded-full shadow-lg ${value === "Yes"
              ? "left-1.5 right-[calc(50%+6px)] bg-emerald-500"
              : "left-[calc(50%+6px)] right-1.5 bg-[#CE2029]"
            }`}
        />
        <button
          type="button"
          onClick={() => onChange("Yes")}
          className={`relative z-10 w-20 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${value === "Yes" ? "text-white" : "text-gray-400 hover:text-gray-600"}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange("No")}
          className={`relative z-10 w-20 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${value === "No" ? "text-white" : "text-gray-400 hover:text-gray-600"}`}
        >
          No
        </button>
      </div>
    </div>
  );
}
