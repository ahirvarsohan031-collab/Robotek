"use client";

import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Option {
  id: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  label
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-white/5 cursor-pointer flex justify-between items-center transition-all ${isOpen ? 'border-[#FFD500] ring-1 ring-[#FFD500]/10' : ''}`}
      >
        <span className={`text-[10px] font-bold ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[11000] w-full mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-gray-100 dark:border-white/5 flex items-center gap-2 bg-gray-50/50 dark:bg-slate-800/50">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 ml-1" />
            <input
              type="text"
              className="w-full bg-transparent border-none outline-none text-[10px] font-bold p-1 text-gray-900 dark:text-white placeholder-gray-400"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <XMarkIcon 
                className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600" 
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>
          
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(String(opt.id));
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`p-2.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                    String(opt.id) === String(value)
                      ? 'bg-[#FFD500] text-black shadow-lg shadow-[#FFD500]/10'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-[10px] font-bold text-gray-400 italic">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
