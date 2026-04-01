'use client';

import React from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface CustomDateTimePickerProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    dateOnly?: boolean;
    required?: boolean;
}

export default function CustomDateTimePicker({ 
    label, 
    value, 
    onChange, 
    dateOnly = false,
    required = false 
}: CustomDateTimePickerProps) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#003875]/60 dark:text-[#FFD500]/60 pl-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group/input flex items-center bg-white dark:bg-slate-900 border-2 border-[#003875]/5 dark:border-white/5 rounded-2xl p-1.5 focus-within:border-[#003875] dark:focus-within:border-[#FFD500] transition-all duration-300 shadow-sm">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-xl group-focus-within/input:bg-[#003875] group-focus-within/input:text-white dark:group-focus-within/input:bg-[#FFD500] dark:group-focus-within/input:text-black transition-colors">
                    {dateOnly ? <CalendarIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                </div>
                <input
                    type={dateOnly ? 'date' : 'datetime-local'}
                    value={value}
                    required={required}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 appearance-none pointer-events-auto cursor-pointer"
                    style={{ colorScheme: 'auto' }}
                />
            </div>
        </div>
    );
}
