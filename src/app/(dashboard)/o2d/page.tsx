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
  MinusCircleIcon
} from "@heroicons/react/24/solid";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";
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
}

function SearchableDropdown({ label, icon: Icon, value, onChange, options, placeholder, required }: SearchableDropdownProps) {
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
        className="w-full h-[34px] bg-[#FFFBF0] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus-within:border-[#FFD500] cursor-pointer flex items-center justify-between shadow-sm transition-all"
      >
        <span className={`text-[11px] font-bold truncate pr-2 ${value ? 'text-gray-800 dark:text-zinc-100' : 'text-gray-400'}`}>
          {value || placeholder || `Select...`}
        </span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[10000] w-full mt-1 bg-white dark:bg-navy-800 border border-orange-100 dark:border-navy-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`px-4 py-2 text-[11px] font-bold cursor-pointer transition-colors ${
                    value === opt 
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

  // Data
  const [parties, setParties] = useState<string[]>([]);
  const [dropdownItems, setDropdownItems] = useState<{ name: string; amount: string }[]>([]);

  // Form State
  const [commonData, setCommonData] = useState({ order_no: "", party_name: "", remark: "" });
  const [items, setItems] = useState<O2DItem[]>([{ item_name: "", item_qty: "", est_amount: "", item_specification: "" }]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Modals
  const [actionStatus, setActionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ type: 'delete' | 'hold' | 'cancelled', orderNo: string, currentValue?: string } | null>(null);
  const [isRemoveFollowUpModalOpen, setIsRemoveFollowUpModalOpen] = useState(false);
  const [removeStep, setRemoveStep] = useState(1);
  const [removeOnwards, setRemoveOnwards] = useState(true);

  const [detailViewMode, setDetailViewMode] = useState<'full' | 'table'>('full');
  const [dateFilter, setDateFilter] = useState<string>('');

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
        const partyNames = partiesData.map((p: any) => p.partyName).filter(Boolean);
        setParties(partyNames.length > 0 ? partyNames : (data.parties || []));
      } else {
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

  // Helper: check if an order matches the date filter based on planned times of steps
  const orderMatchesDateFilter = (orderItems: O2D[], filter: string): boolean => {
    // Role detection (already defined in component scope)

    // Identify the Pending Step for the order
    const firstItem = orderItems[0] as any;
    let pendingStepIdx = -1;
    for (let i = 1; i <= 11; i++) {
      const status = (firstItem[`status_${i}`] || "").toString().trim().toLowerCase();
      
      // Skip Step 5 if Step 4 was "Yes"
      if (i === 5) {
        const status4 = (firstItem[`status_4`] || "").toString().trim().toLowerCase();
        if (status4 === 'yes') continue;
      }

      const isCompleted = status === 'done' || status === 'yes' || (i === 4 && status === 'no') || (i === 5 && status === 'no');

      if (!isCompleted) {
        pendingStepIdx = i;
        break;
      }

      // If Step 5 is "No", the process ends
      if (i === 5 && status === 'no') {
        pendingStepIdx = -1;
        break;
      }
    }

    // Role-based filtering (only for standard Users)
    if (!isSpecialRole) {
      if (pendingStepIdx !== -1) {
        const stepConfig = globalConfigs[pendingStepIdx - 1];
        if (stepConfig && stepConfig.responsible_person && userRole.toUpperCase() === 'USER' && stepConfig.responsible_person !== currentUser) {
          return false;
        }
      } else {
        // Hide fully completed orders for standard users to match their "only my steps" view
        return false;
      }
    }

    if (!filter) return true;
    
    // Status-based filters
    if (filter === 'Hold') return !!orderItems[0].hold && !orderItems[0].cancelled;
    if (filter === 'Cancelled') return !!orderItems[0].cancelled;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // If fully completed, it doesn't show in active date filters
    if (pendingStepIdx === -1) return false;

    const plannedRaw = firstItem[`planned_${pendingStepIdx}`] as string;
    if (!plannedRaw || plannedRaw === '-' || plannedRaw.trim() === '') return false;

    const pd = new Date(plannedRaw);
    if (isNaN(pd.getTime())) return false;

    const pdDay = new Date(pd);
    pdDay.setHours(0, 0, 0, 0);

    const diffDays = Math.round((pdDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'Delayed') {
      // It's delayed if the planned time is in the past
      return pd < now;
    }
    
    if (filter === 'Today') return diffDays === 0;
    if (filter === 'Tomorrow') return diffDays === 1;
    if (filter === 'Next5') return diffDays > 0 && diffDays <= 5;
    if (filter === 'Next10') return diffDays > 0 && diffDays <= 10;
    
    return false;
  };

  const getDateFilterCount = (filter: string): number => {
    return Object.keys(groupedOrders).filter(no =>
      orderMatchesDateFilter(groupedOrders[no], filter)
    ).length;
  };

  const sortedOrderNumbers = useMemo(() => {
    return Object.keys(groupedOrders)
      .filter(no => {
        const matchesSearch = no.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             groupedOrders[no][0].party_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = orderMatchesDateFilter(groupedOrders[no], dateFilter);
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => b.localeCompare(a));
  }, [groupedOrders, searchTerm, dateFilter]);

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
          const pKey = `planned_${i+1}`;
          if (i === 0) {
            if (!(baseRecord as any)[pKey]) (baseRecord as any)[pKey] = calculatePlannedDate(currentBase, tat);
          } else {
            const prevActual = (baseRecord as any)[`actual_${i}`];
            if (prevActual && prevActual !== "-" && prevActual.trim() !== "") {
              (baseRecord as any)[pKey] = calculatePlannedDate(prevActual, tat);
            } else {
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
              const pKey = `planned_${i+1}`;
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
                } else {
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
      mutate("O2D"); // Revalidate to get real IDs/Server state
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

    try {
      const res = await fetch(`/api/o2d/order/${orderNo}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      mutate("O2D");
    } catch (error) { 
      mutate("O2D", currentO2Ds, false);
      setActionStatus('error'); 
      setActionMessage("Delete Failed"); 
      setIsStatusModalOpen(true);
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

    try {
      const res = await fetch("/api/o2d/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo, action, value: newValue })
      });

      if (!res.ok) throw new Error(`Failed to toggle ${action}`);
      mutate("O2D");
    } catch (e: any) {
      mutate("O2D", currentO2Ds, false);
      setActionStatus('error');
      setActionMessage(e.message || "Action failed");
      setIsStatusModalOpen(true);
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
    const first = order[0];
    if (!first) return 1;
    for (let i = 1; i <= 11; i++) {
      const status = ((first as any)[`status_${i}`] || "").toString().trim().toLowerCase();
      
      // Skip Step 5 if Step 4 was "Yes"
      if (i === 5) {
        const status4 = ((first as any)[`status_4`] || "").toString().trim().toLowerCase();
        if (status4 === 'yes') continue;
      }

      const isCompleted = status === 'yes' || status === 'done' || (i === 4 && status === 'no') || (i === 5 && status === 'no');
      
      if (!isCompleted) return i;

      // If Step 5 is "No", the process ends
      if (i === 5 && status === 'no') return -1;
    }
    return 11; // All steps done
  };

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
      mutate("O2D");
    } catch (error: any) {
      mutate("O2D", currentO2Ds, false);
      setActionStatus('error');
      setActionMessage(error.message);
      setIsStatusModalOpen(true);
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
    } catch(e) {
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
    <div className="flex flex-col h-[calc(100vh-115px)] space-y-2">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight italic">O2D SYSTEM</h1>
          <p className="text-[#003875] dark:text-[#FFD500] font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-80 -mt-1">Syncing Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border-2 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-lg p-0.5">
             <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-4 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all"><PlusIcon className="w-4 h-4 stroke-[3]" /> New Order</button>
             <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
             <button onClick={handleExport} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all"><ArrowDownTrayIcon className="w-4 h-4 stroke-[3]" /> Export</button>
             <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
             <button onClick={handleOpenSetup} className="flex items-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#003875]/5 dark:hover:bg-navy-700 transition-all"><Cog6ToothIcon className="w-4 h-4 stroke-[3]" /> Setup</button>
             <div className="h-4 w-[1px] bg-[#003875]/10 dark:bg-[#FFD500]/10 mx-0.5" />
             <button onClick={fetchO2Ds} className="p-1 text-[#003875] dark:text-[#FFD500] rounded-full hover:bg-gray-100 dark:hover:bg-navy-700 transition-all"><ArrowPathIcon className={`w-4.5 h-4.5 ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </div>

      {/* Main Master-Detail View */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-xl">

        {/* Date Filter Buttons Strip — full width inside container */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 px-3 py-1.5 border-b border-gray-100 dark:border-navy-800 bg-gray-50/40 dark:bg-navy-900/60">
          {[
            { id: '', label: 'All', color: 'bg-white text-gray-700 border-gray-300 dark:bg-navy-800 dark:text-gray-300 dark:border-navy-600' },
            { id: 'Delayed', label: 'Delayed', color: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' },
            { id: 'Today', label: 'Today', color: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' },
            { id: 'Tomorrow', label: 'Tomorrow', color: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
            { id: 'Next5', label: 'Next 5', color: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' },
            { id: 'Next10', label: 'Next 10', color: 'bg-violet-50 text-violet-600 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700' },
          ].map(f => {
            const count = (f.id === '' || f.id === 'Hold' || f.id === 'Cancelled') 
              ? Object.keys(groupedOrders).filter(no => orderMatchesDateFilter(groupedOrders[no], f.id)).length 
              : getDateFilterCount(f.id);
            const isActive = dateFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black border-[#003875] dark:border-[#FFD500] shadow-md scale-105'
                    : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                }`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'}`}>
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
            const count = Object.keys(groupedOrders).filter(no => orderMatchesDateFilter(groupedOrders[no], f.id)).length;
            const isActive = dateFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? f.id === 'Hold' ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105' : 'bg-red-500 text-white border-red-500 shadow-md scale-105'
                    : `${f.color} hover:shadow-sm hover:scale-[1.02]`
                }`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/10'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Panels Row */}
        <div className="flex-1 flex overflow-hidden">
        {/* Master Pane: Order List */}
        <div className={`w-full lg:w-80 flex flex-col border-r border-[#003875]/5 dark:border-navy-800 ${selectedOrderNo ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-2 border-b border-gray-50 dark:border-navy-800 bg-gray-50/30 dark:bg-navy-900/40">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 h-[34px] bg-white dark:bg-black border border-gray-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] rounded-xl transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] focus:shadow-md" 
              />
            </div>
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
              sortedOrderNumbers.map((no) => {
                const orderItems = groupedOrders[no];
                const first = orderItems[0];
                const totalQty = orderItems.reduce((sum: number, item: O2D) => sum + (parseFloat(item.item_qty) || 0), 0);
                const totalAmt = orderItems.reduce((sum: number, item: O2D) => sum + (parseFloat(item.est_amount) || 0), 0);


                // Find current pending stage (first step not marked Done/Yes)
                let currentStageIdx = -1;
                for (let i = 1; i <= 11; i++) {
                  const status = (first as any)[`status_${i}`] as string;
                  if (!status || (status !== 'Done' && status !== 'Yes')) { currentStageIdx = i - 1; break; }
                }
                const allDone = currentStageIdx === -1;
                const isSelected = selectedOrderNo === no;
                const isCancelled = !!first?.cancelled;
                const isHold = !!first?.hold && !isCancelled;

                return (
                  <div 
                    key={no} 
                    onClick={() => setSelectedOrderNo(no)}
                    className={`group relative p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-[#003875] dark:border-[#FFD500] bg-[#003875]/5 dark:bg-[#FFD500]/5 shadow-xl scale-[1.02] z-10' 
                        : isCancelled
                        ? 'border-red-200 dark:border-red-800/40 bg-gradient-to-br from-red-100 via-red-50 to-white dark:from-red-900/30 dark:via-red-900/10 dark:to-navy-800/50 shadow-md hover:shadow-lg hover:scale-[1.01]'
                        : isHold
                        ? 'border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-100 via-orange-50 to-white dark:from-orange-900/30 dark:via-orange-900/10 dark:to-navy-800/50 shadow-md hover:shadow-lg hover:scale-[1.01]'
                        : 'border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800/50 shadow-md hover:shadow-lg dark:hover:border-navy-600 hover:scale-[1.01]'
                    }`}
                  >
                    <div className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-all ${
                        isSelected ? 'bg-[#FFD500]' : isCancelled ? 'bg-red-500' : isHold ? 'bg-orange-500' : 'bg-[#003875]/10 group-hover:bg-[#003875]/20'
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
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 truncate">
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

        {/* Thick Red Divider Line */}
        <div className="w-[3px] bg-[#CE2029] h-full hidden lg:block opacity-80" />

        {/* Detail Pane: Order Details - Compact Layout */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-navy-900/20 ${!selectedOrderNo ? 'hidden lg:flex' : 'flex'}`}>
          {selectedOrder && selectedOrder.length > 0 ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* BRAND RED HEADER */}
              <div className="px-5 py-3.5 flex items-center justify-between bg-[#CE2029] text-white">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedOrderNo(null)} className="lg:hidden p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all shadow-inner"><ArrowLeftIcon className="w-4 h-4 text-white" /></button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-[16px] font-black italic tracking-tight uppercase text-white">{selectedOrderNo}</h2>
                    <span className="px-3 py-1 bg-white/20 text-white rounded-md text-[9px] font-black uppercase tracking-[0.2em] border border-white/30 backdrop-blur-sm">LIVE PROTOCOL</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   {/* Action Toggles */}
                   <div className="flex items-center gap-1.5 hidden sm:flex">
                       {!selectedOrder[0]?.hold && !selectedOrder[0]?.cancelled && (
                         <>
                           {isSpecialRole && (
                             <button
                               onClick={() => setIsRemoveFollowUpModalOpen(true)}
                               className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-md active:scale-95"
                             >
                               <MinusCircleIcon className="w-3.5 h-3.5 text-white/70" />
                               Remove Follow-up
                             </button>
                           )}
                           <button
                             onClick={openStepUpdateModal}
                             className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-white text-[#CE2029] hover:bg-[#FFFBF0] shadow-md active:scale-95 animate-in fade-in slide-in-from-right-2 duration-300"
                           >
                             <ArrowPathIcon className="w-3.5 h-3.5" />
                             Update
                           </button>
                         </>
                       )}
                     <button
                        onClick={() => {
                          setConfirmPayload({ type: 'hold', orderNo: selectedOrderNo as string, currentValue: selectedOrder[0]?.hold });
                          setIsConfirmOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedOrder[0]?.hold ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-black/10 text-white/70 hover:bg-black/20 hover:text-white'}`}
                     >
                        <PauseCircleIcon className="w-3.5 h-3.5" />
                        {selectedOrder[0]?.hold ? 'On Hold' : 'Hold'}
                     </button>
                     <button
                        onClick={() => {
                          setConfirmPayload({ type: 'cancelled', orderNo: selectedOrderNo as string, currentValue: selectedOrder[0]?.cancelled });
                          setIsConfirmOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedOrder[0]?.cancelled ? 'bg-black text-white shadow-md' : 'bg-black/10 text-white/70 hover:bg-black/20 hover:text-white'}`}
                     >
                        <NoSymbolIcon className="w-3.5 h-3.5" />
                        {selectedOrder[0]?.cancelled ? 'Cancelled' : 'Cancel'}
                     </button>
                   </div>
                   
                   <div className="w-px h-6 bg-white/20 hidden sm:block" />

                   <div className="flex items-center gap-1.5 p-1 bg-black/10 rounded-full border border-white/20 backdrop-blur-sm">
                      <button 
                        onClick={() => setDetailViewMode('full')} 
                        className={`p-1.5 rounded-full transition-all ${detailViewMode === 'full' ? 'bg-white text-[#CE2029] shadow-md scale-105' : 'text-white/60 hover:text-white'}`}
                      >
                        <Squares2X2Icon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDetailViewMode('table')} 
                        className={`p-1.5 rounded-full transition-all ${detailViewMode === 'table' ? 'bg-white text-[#CE2029] shadow-md scale-105' : 'text-white/60 hover:text-white'}`}
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
                                 <span className="text-[13px] font-black text-gray-700 dark:text-gray-100">
                                   {new Date(selectedOrder[0]?.created_at).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short'
                                   })}
                                 </span>
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

                  {/* High Density Items Table - Cream Background */}
                  <div className="bg-white dark:bg-navy-800/50 rounded-2xl border-2 border-gray-100 dark:border-navy-700 shadow-md overflow-hidden">
                     <div className="px-6 py-3 border-b border-gray-100 dark:border-navy-700 flex items-center justify-between bg-white/40 dark:bg-transparent">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 items-center">
                          <div className="w-1 h-3.5 bg-[#003875] rounded-full" /> Tactical Inventory
                        </h3>
                        <div className="text-[12px] font-black text-[#003875] dark:text-[#FFD500]">
                          TOTAL: ₹{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}
                        </div>
                     </div>
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-[#CE2029] text-[10px] font-black text-white uppercase tracking-widest">
                              <th className="px-6 py-3 rounded-tl-lg">Item Name</th>
                              <th className="px-6 py-3 text-center">Qty</th>
                              <th className="px-6 py-3 text-right rounded-tr-lg">Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-navy-800/20">
                           {selectedOrder.map((item, idx) => (
                             <React.Fragment key={idx}>
                               <tr className="text-[12px] font-bold text-gray-700 dark:text-gray-300 hover:bg-white/40 transition-colors">
                                  <td className="px-6 py-3.5">{item.item_name}</td>
                                  <td className="px-6 py-3.5 text-center"><span className="px-2.5 py-1 bg-white dark:bg-black rounded-md text-[11px] font-black shadow-sm border border-gray-100 dark:border-navy-700">{item.item_qty}</span></td>
                                  <td className="px-6 py-3.5 text-right font-black text-[#003875] dark:text-[#FFD500]">₹{parseFloat(item.est_amount).toLocaleString()}</td>
                               </tr>
                               {item.item_specification && (
                                 <tr className="bg-gray-50/30 dark:bg-navy-900/40">
                                   <td colSpan={3} className="px-6 py-2 text-[10px] text-gray-500 italic border-l-2 border-[#CE2029]/20 ml-6">
                                     <span className="font-black uppercase tracking-tighter mr-2 text-[8px] opacity-60">Spec:</span>
                                     {item.item_specification}
                                   </td>
                                 </tr>
                               )}
                             </React.Fragment>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  {/* Operational Manifest - Step Specific Details */}
                  <div className="bg-white dark:bg-navy-800/50 rounded-2xl border-2 border-gray-100 dark:border-navy-700 shadow-md overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100 dark:border-navy-700 bg-white/40 dark:bg-transparent">
                      <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 items-center">
                        <div className="w-1 h-3.5 bg-[#CE2029] rounded-full" /> Operational Manifest
                      </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12">
                      {/* Step 1: SO Details */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[11px] font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-widest border-b border-gray-100 pb-2"><IdentificationIcon className="w-4 h-4" /> Step 1: SO Protocol</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">SO Number</span><span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{selectedOrder[0]?.so_number_1 || "-"}</span></div>
                          <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Final Amt</span><span className="text-[14px] font-black text-[#CE2029]">₹{parseFloat(selectedOrder[0]?.final_amount_1 || "0").toLocaleString()}</span></div>
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

                  {/* Red Decorative Line */}
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-[#CE2029]/20 to-transparent" />

                  {/* Compact Remarks - Cream Background */}
                  {selectedOrder[0]?.remark && (
                    <div className="bg-white dark:bg-navy-800/50 p-5 rounded-2xl border-2 border-gray-100 dark:border-navy-700 relative shadow-md">
                       <ChatBubbleBottomCenterTextIcon className="absolute top-4 right-4 w-6 h-6 text-[#CE2029]/10" />
                       <span className="text-[9px] font-black text-[#CE2029]/40 uppercase tracking-[0.2em] block mb-1.5 font-bold">Intelligence Report</span>
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
                            <tr className="bg-[#CE2029] text-[11px] font-black text-white uppercase tracking-widest">
                               <th className="px-6 py-4 border-r border-white/10 sticky left-0 z-10 bg-[#CE2029]">Nomenclature</th>
                               <th className="px-6 py-4 border-r border-white/10">Item Specification</th>
                               <th className="px-6 py-4 text-center border-r border-white/10">Quantity</th>
                               <th className="px-6 py-4 text-right border-r border-white/10">Estimated Amount</th>
                              {O2D_STEPS.map((step, idx) => (
                                <th key={idx} className="px-4 py-3 text-center border-r border-white/10 last:border-r-0 align-top" title={step}>
                                  <div className="flex flex-col items-center justify-center gap-0.5 min-w-[120px]">
                                    <span className="text-[8px] text-white/50 uppercase tracking-[0.2em] font-black">Step {idx + 1}</span>
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
                                   const plannedRaw = item[`planned_${stepIdx+1}` as keyof O2D] as string;
                                   const actualRaw = item[`actual_${stepIdx+1}` as keyof O2D] as string;
                                   const status = item[`status_${stepIdx+1}` as keyof O2D] as string;
                                   
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
                            <tr className="bg-white/80 dark:bg-navy-950 font-black text-gray-900 dark:text-white text-[13px] border-t-2 border-[#CE2029]/20 shadow-inner">
                               <td className="px-6 py-4 border-r border-[#CE2029]/10 sticky left-0 z-10 bg-white/80 dark:bg-navy-950 backdrop-blur-md">AGGREGATE SUM</td>
                               <td className="px-6 py-4 border-r border-[#CE2029]/10"></td>
                               <td className="px-6 py-4 text-center border-r border-[#CE2029]/10">{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.item_qty) || 0), 0)} Units</td>
                               <td className="px-6 py-4 text-right text-[#CE2029] border-r border-[#CE2029]/10">₹{selectedOrder.reduce((sum: number, i: O2D) => sum + (parseFloat(i.est_amount) || 0), 0).toLocaleString()}</td>
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
               <div className="w-16 h-16 bg-[#CE2029]/5 rounded-full flex items-center justify-center mb-4"><Squares2X2Icon className="w-8 h-8 text-[#CE2029]" /></div>
               <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#CE2029] italic">Select record to engage</p>
            </div>
          )}
        </div>{/* end Detail Pane */}
        </div>{/* end Panels Row */}
      </div>{/* end Main Container */}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-navy-900 w-full max-w-2xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-orange-100/30 dark:border-navy-700 flex items-center justify-between shrink-0 bg-[#FFFBF0] dark:bg-navy-800">
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

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><IdentificationIcon className="w-3 h-3" />Order ID</label>
                                 <input type="text" value={commonData.order_no} readOnly className="w-full h-[36px] bg-gray-50 dark:bg-black border border-transparent dark:border-navy-700 px-3 rounded-xl font-bold text-[11px] text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-inner" />
                            </div>
                            <SearchableDropdown label="Partner Name" icon={BuildingOfficeIcon} value={commonData.party_name} onChange={(val) => setCommonData({ ...commonData, party_name: val })} options={parties} />
                        </div>
                    </div>

                    <div className="mt-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><ChatBubbleBottomCenterTextIcon className="w-3 h-3" />Remarks</label>
                        <textarea value={commonData.remark} onChange={(e) => setCommonData({ ...commonData, remark: e.target.value })} className="w-full bg-[#FFFBF0] dark:bg-black p-3 rounded-2xl border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm min-h-[60px] no-scrollbar" placeholder="Order notes..." />
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
                           <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                             <div className="md:col-span-6 min-w-0">
                                  <SearchableDropdown label="Nomenclature" icon={ArchiveBoxIcon} value={item.item_name} onChange={(val) => handleItemChange(index, 'item_name', val)} options={dropdownItems.map(i => i.name)} />
                             </div>
                             <div className="md:col-span-2">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1.5"><HashtagIcon className="w-2.5 h-2.5" />Qty</label>
                                   <input type="number" value={item.item_qty} onChange={(e) => handleItemChange(index, 'item_qty', e.target.value)} className="w-full h-[34px] bg-[#FFFBF0] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm transition-all" required />
                             </div>
                             <div className="md:col-span-3">
                                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1.5"><CurrencyRupeeIcon className="w-2.5 h-2.5" />Total</label>
                                   <input type="text" value={item.est_amount} onChange={(e) => handleItemChange(index, 'est_amount', e.target.value)} className="w-full h-[34px] bg-[#FFFBF0] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-[#003875] dark:text-[#FFD500] shadow-sm transition-all" required />
                             </div>
                             <div className="md:col-span-1 flex items-end pb-1 pr-1">
                                  <button type="button" onClick={() => removeItemRow(index)} className="w-full h-[30px] flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"><TrashIcon className="w-4 h-4" /></button>
                             </div>
                           </div>
                           <div className="pt-2 border-t border-gray-50 dark:border-white/5">
                                <input 
                                  type="text"
                                  value={item.item_specification} 
                                  onChange={(e) => handleItemChange(index, 'item_specification', e.target.value)} 
                                  className="w-full h-[34px] bg-[#FFFBF0] dark:bg-black px-3 rounded-lg border border-orange-100 dark:border-navy-700 focus:border-[#FFD500] outline-none font-bold text-[11px] text-gray-800 dark:text-gray-100 shadow-sm transition-all" 
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
          <div className="relative bg-[#FFFBF0] dark:bg-navy-900 w-full max-w-4xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-orange-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
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
                       <div className="flex h-[38px] bg-[#FFFBF0] dark:bg-navy-950/50 border border-orange-100 dark:border-navy-700 focus-within:border-[#FFD500] rounded-2xl shadow-sm transition-all overflow-hidden items-center p-1">
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
            <div className="p-5 border-b border-orange-100/30 dark:border-navy-700 flex items-center justify-between shrink-0 bg-[#FFFBF0] dark:bg-navy-800">
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
                    className="w-full h-[38px] bg-[#FFFBF0] dark:bg-black px-4 rounded-xl border border-orange-100 dark:border-navy-700 font-bold text-[11px] outline-none focus:border-[#FFD500]"
                  />
                </div>

                {/* Step Specific Fields */}
                {currentStepToUpdate === 1 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Final Amount</label>
                        <input type="text" value={stepUpdateFields.final_amount_1} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, final_amount_1: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="Value..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">SO Number</label>
                        <input type="text" value={stepUpdateFields.so_number_1} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, so_number_1: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="SO#..." />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <SearchableDropdown 
                        label="Merge Order With" 
                        icon={IdentificationIcon} 
                        value={stepUpdateFields.merge_order_with_1} 
                        onChange={(val) => setStepUpdateFields({ ...stepUpdateFields, merge_order_with_1: val })} 
                        options={Object.keys(groupedOrders).filter(no => no !== selectedOrderNo)} 
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
                      <input type="text" value={stepUpdateFields.num_of_parcel_6} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, num_of_parcel_6: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="Count..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block font-bold">Actual Date of Packing</label>
                      <input type="date" value={stepUpdateFields.actual_date_of_order_packed_6 ? new Date(stepUpdateFields.actual_date_of_order_packed_6).toISOString().split('T')[0] : ""} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, actual_date_of_order_packed_6: new Date(e.target.value).toISOString() })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px] outline-none" />
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
                      <input type="text" value={stepUpdateFields.voucher_num_7} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, voucher_num_7: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="Voucher#..." />
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
                        <input type="text" value={stepUpdateFields.voucher_num_51_8} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, voucher_num_51_8: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="V#51..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">T. Amount</label>
                        <input type="text" value={stepUpdateFields.t_amt_8} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, t_amt_8: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="Amt..." />
                      </div>
                    </div>
                  </div>
                )}

                {currentStepToUpdate === 9 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-bold">Number of Parcel</label>
                      <input type="text" value={stepUpdateFields.num_of_parcel_9} onChange={(e) => setStepUpdateFields({ ...stepUpdateFields, num_of_parcel_9: e.target.value })} className="w-full h-[36px] bg-[#FFFBF0] px-3 rounded-lg border border-orange-100 font-bold text-[11px]" placeholder="Count..." />
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
                    className="w-full h-[48px] bg-[#FFFBF0] dark:bg-black px-4 rounded-xl border border-orange-100 dark:border-navy-700 font-bold text-[13px] outline-none appearance-none"
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

                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
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
    </div>
  );
}

function YesNoToggle({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFFBF0] to-white dark:from-navy-800 dark:to-navy-900 rounded-2xl border border-orange-100 dark:border-navy-700 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD500]/30" />
      <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">{label}</span>
      <div className="flex bg-gray-100/50 dark:bg-black/40 p-1.5 rounded-full border border-gray-100 dark:border-navy-800 backdrop-blur-sm relative">
        <div 
          className={`absolute top-1.5 bottom-1.5 transition-all duration-300 rounded-full shadow-lg ${
            value === "Yes" 
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
