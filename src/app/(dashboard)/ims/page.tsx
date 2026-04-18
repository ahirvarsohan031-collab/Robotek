"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { IMS } from "@/types/ims";
import useSWR from "swr";
import { useSSE } from "@/hooks/useSSE";
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
} from "@heroicons/react/24/outline";
import ActionStatusModal from "@/components/ActionStatusModal";
import ConfirmModal from "@/components/ConfirmModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IMSPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<IMS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IMS | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof IMS;
    direction: "asc" | "desc";
  } | null>({ key: "id", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<Partial<IMS>>({
    id: "",
    item_name: "",
    est_amount_item: "",
    gst: "",
    final_amount: "",
  });

  // Action Status States
  const [actionStatus, setActionStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Confirmation states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Fetch data
  const { data: swrItems, mutate: mutateItems } = useSWR<IMS[]>(
    "/api/ims",
    fetcher,
    {
      refreshInterval: 0,        // No background polling — SSE handles change detection
      revalidateOnFocus: true,   // Refetch when user returns to the tab
      revalidateOnMount: true,   // Refetch on page load
    }
  );

  // SSE: instantly refetch when a new IMS item is added or deleted
  useSSE({ modules: ['ims'], onUpdate: () => mutateItems() });

  useEffect(() => {
    if (swrItems) {
      setItems(swrItems);
      setIsLoading(false);
    }
  }, [swrItems]);

  // Search and filter
  const filteredItems = items.filter((item) =>
    Object.values(item).some((val) =>
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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

  const handleExport = () => {
    const headers = ["ID", "Item Name", "Est. Amount/Item", "GST", "Final Amount"];
    const rows = sortedItems.map((item) => [
      item.id,
      item.item_name,
      item.est_amount_item,
      item.gst,
      item.final_amount,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ims_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: keyof IMS) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const calcFinalAmount = (est: string, gst: string): string => {
    const estNum = parseFloat(est);
    const gstNum = parseFloat(gst);
    if (!isNaN(estNum) && !isNaN(gstNum)) {
      return (estNum * (1 + gstNum / 100)).toFixed(3);
    }
    return "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "est_amount_item" || name === "gst") {
        updated.final_amount = calcFinalAmount(
          name === "est_amount_item" ? value : prev.est_amount_item || "",
          name === "gst" ? value : prev.gst || ""
        );
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (
      !formData.item_name ||
      !formData.est_amount_item ||
      !formData.gst
    ) {
      setActionStatus("error");
      setActionMessage("Please fill in all required fields");
      setIsStatusModalOpen(true);
      return;
    }

    setActionStatus("loading");
    setActionMessage(editingItem ? "Updating item..." : "Adding item...");
    setIsStatusModalOpen(true);

    try {
      const method = editingItem ? "PUT" : "POST";
      const url = "/api/ims";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsStatusModalOpen(false);
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({
          id: "",
          item_name: "",
          est_amount_item: "",
          gst: "",
          final_amount: "",
        });
        mutateItems();
      } else {
        setActionStatus("error");
        setActionMessage("Failed to save item");
      }
    } catch (error) {
      setActionStatus("error");
      setActionMessage("Error saving item");
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
    setActionMessage("Deleting item...");
    setIsStatusModalOpen(true);

    try {
      const response = await fetch(`/api/ims?id=${pendingDeleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsStatusModalOpen(false);
        mutateItems();
      } else {
        setActionStatus("error");
        setActionMessage("Failed to delete item");
      }
    } catch (error) {
      setActionStatus("error");
      setActionMessage("Error deleting item");
      console.error(error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const SortIcon = ({ column }: { column: keyof IMS }) => {
    if (sortConfig?.key !== column)
      return <div className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="w-3 h-3 ml-1 text-[#FFD500]" />
    ) : (
      <ChevronDownIcon className="w-3 h-3 ml-1 text-[#FFD500]" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Sticky Top Header & Tabs */}
      <div className="space-y-4 mb-2">
        {/* Standalone Title Row */}
        <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
          <div className="w-full lg:w-1/3 text-center lg:text-left min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              IMS Management
            </h1>
            <p className="text-gray-500 dark:text-slate-300 font-bold text-[8px] md:text-[10px] uppercase tracking-wider">
              Manage Inventory &amp; Pricing
            </p>
          </div>

          <div className="w-full lg:w-1/3 flex justify-center flex-shrink-0 min-w-0">
            {/* Single Cylinder Container for All Actions */}
            <div className="flex items-center gap-1 rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] bg-white dark:bg-navy-800 shadow-sm transition-all active:translate-y-[2px] active:border-b-2 p-1 overflow-x-auto no-scrollbar max-w-full">
              {/* Action: Export */}
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 text-[#003875] dark:text-[#FFD500] px-3 md:px-5 py-1.5 font-black transition-colors hover:bg-gray-100 dark:hover:bg-navy-700 uppercase tracking-widest text-[9px] md:text-[10px] rounded-full whitespace-nowrap"
                title="Export to CSV"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Action: Add Item */}
              <button
                onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    id: "",
                    item_name: "",
                    est_amount_item: "",
                    gst: "",
                    final_amount: "",
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 text-[#003875] dark:text-[#FFD500] px-3 py-1.5 transition-colors rounded-full"
                title="Add Item"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="hidden lg:block lg:w-1/3"></div>
        </div>
      </div>

      {/* Table Panel */}
      <div
        style={{ borderColor: "var(--panel-border)" }}
        className="rounded-2xl border overflow-hidden shadow-sm transition-all duration-500"
      >
        {/* Integrated Search & Pagination Row */}
        <div
          style={{
            backgroundColor: "var(--panel-card)",
            borderBottom: "1px solid var(--panel-border)",
          }}
          className="px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="relative group flex-1 max-w-full lg:max-w-sm">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FFD500] transition-colors" />
            <input
              type="text"
              placeholder="Search database..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-navy-900 border border-gray-100 dark:border-navy-700/50 rounded-lg focus:border-[#FFD500] outline-none font-bold text-[13px] text-gray-700 dark:text-white transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                Page <span className="text-[#003875] dark:text-[#FFD500]">{currentPage}</span> of{" "}
                {totalPages || 1}
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
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 rounded-md transition-all"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

        {/* Table Section */}
        <div
          style={{ backgroundColor: "var(--panel-card)" }}
          className="overflow-x-auto transition-colors duration-500"
        >
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading items...</div>
          ) : sortedItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No items found. Create one to get started.
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-[#003875] dark:bg-navy-950 text-white dark:text-slate-200">
                  <th
                    onClick={() => handleSort("id")}
                    className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center">ID <SortIcon column="id" /></div>
                  </th>
                  <th
                    onClick={() => handleSort("item_name")}
                    className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center">
                      Item Name <SortIcon column="item_name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("est_amount_item")}
                    className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center">
                      Est. Amt/Item <SortIcon column="est_amount_item" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("gst")}
                    className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center">GST <SortIcon column="gst" /></div>
                  </th>
                  <th
                    onClick={() => handleSort("final_amount")}
                    className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center">
                      Final Amount <SortIcon column="final_amount" />
                    </div>
                  </th>
                  <th className="px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700/50">
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-navy-900/30 transition-colors"
                  >
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-900 dark:text-white font-bold">
                      {item.id}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-900 dark:text-white font-bold">
                      {item.item_name}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-600 dark:text-slate-400">
                      {item.est_amount_item}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-600 dark:text-slate-400">
                      {item.gst}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px] text-gray-600 dark:text-slate-400">
                      {item.final_amount}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] md:text-[12px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({
                              ...item,
                              final_amount: item.final_amount || calcFinalAmount(item.est_amount_item, item.gst),
                            });
                            setIsModalOpen(true);
                          }}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            style={{ backgroundColor: "var(--panel-card)" }}
            className="rounded-2xl max-w-md w-full p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                {editingItem ? "Update Item" : "Add New Item"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                  setFormData({
                    id: "",
                    item_name: "",
                    est_amount_item: "",
                    gst: "",
                    final_amount: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name || ""}
                  onChange={handleInputChange}
                  placeholder="Enter item name"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Est. Amount/Item *
                </label>
                <input
                  type="text"
                  name="est_amount_item"
                  value={formData.est_amount_item || ""}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  GST (%) *
                </label>
                <input
                  type="number"
                  name="gst"
                  value={formData.gst || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. 18"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-white dark:bg-navy-900 text-gray-900 dark:text-white focus:outline-none focus:border-[#FFD500] text-[12px] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Final Amount <span className="text-gray-400 normal-case font-semibold">(auto-calculated)</span>
                </label>
                <input
                  type="text"
                  name="final_amount"
                  value={formData.final_amount || ""}
                  readOnly
                  placeholder="Calculated from amount + GST"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-navy-700/50 rounded-lg bg-gray-100 dark:bg-navy-950 text-gray-500 dark:text-slate-400 text-[12px] font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                  setFormData({
                    id: "",
                    item_name: "",
                    est_amount_item: "",
                    gst: "",
                    final_amount: "",
                  });
                }}
                className="flex-1 px-4 py-2 border-2 border-[#003875] dark:border-[#FFD500] text-[#003875] dark:text-[#FFD500] rounded-lg hover:bg-gray-100 dark:hover:bg-navy-900 transition-colors font-black uppercase text-[9px] tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-lg hover:bg-[#002855] dark:hover:bg-[#FFE600] transition-colors font-black uppercase text-[9px] tracking-wider"
              >
                {editingItem ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Status Modal */}
      <ActionStatusModal
        isOpen={isStatusModalOpen}
        status={actionStatus}
        message={actionMessage}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        message={`Are you sure you want to delete this item?`}
        onConfirm={() => {
          performDelete();
          setIsConfirmOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
