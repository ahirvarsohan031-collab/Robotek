"use client";

import { useState } from "react";
import {
  XMarkIcon,
  ArchiveBoxIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import ActionStatusModal from "@/components/ActionStatusModal";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (itemName: string, itemPrice: string) => void;
}

export default function ItemFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ItemFormModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [actionStatus, setActionStatus] = useState<"loading" | "success" | "error">("loading");
  const [actionMessage, setActionMessage] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setActionStatus("loading");
    setActionMessage("Adding new item...");
    setIsStatusModalOpen(true);

    try {
      const res = await fetch("/api/o2d?type=item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price }),
      });

      if (res.ok) {
        setActionStatus("success");
        setActionMessage("Item added successfully!");
        setTimeout(() => {
          setIsStatusModalOpen(false);
          onSuccess(name, price);
          setName("");
          setPrice("");
          onClose();
        }, 1500);
      } else {
        throw new Error("Failed to add item");
      }
    } catch (error) {
      setActionStatus("error");
      setActionMessage("Something went wrong. Please try again.");
      setTimeout(() => setIsStatusModalOpen(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-md" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-navy-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-navy-900">
        <div className="p-5 border-b border-orange-100/30 dark:border-navy-700 flex items-center justify-between shrink-0 bg-[#FEF6DB] dark:bg-navy-800">
          <div>
            <h2 className="text-lg font-black text-[#003875] dark:text-[#FFD500] italic uppercase">
              Add New Item
            </h2>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">
              Nomenclature & Pricing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              <ArchiveBoxIcon className="w-3.5 h-3.5" />
              Item Name (Nomenclature)
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Iron Rod, 10mm"
              className="w-full bg-[#FEF6DB] dark:bg-black px-4 py-2.5 rounded-xl border border-orange-100 dark:border-navy-700 outline-none focus:border-[#FFD500] font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              <CurrencyRupeeIcon className="w-3.5 h-3.5" />
              Default Price
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 500.00"
              className="w-full bg-[#FEF6DB] dark:bg-black px-4 py-2.5 rounded-xl border border-orange-100 dark:border-navy-700 outline-none focus:border-[#FFD500] font-bold text-xs text-gray-800 dark:text-zinc-100 transition-all shadow-sm"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-black text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all uppercase tracking-widest text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] bg-[#CE2029] hover:bg-[#8E161D] text-white py-3 rounded-2xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest text-[10px]"
            >
              Save Item
            </button>
          </div>
        </form>
      </div>
      <ActionStatusModal 
        isOpen={isStatusModalOpen} 
        status={actionStatus} 
        message={actionMessage} 
      />
    </div>
  );
}
