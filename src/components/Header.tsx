"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { 
  BellIcon, 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { data: session } = useSession();

  const getNormalizedImageUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
      const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?sz=w200&id=${match[1]}`;
      }
    }
    return url;
  };

  return (
    <header 
      style={{ 
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--panel-border)'
      }}
      className="h-14 flex items-center justify-between px-6 sticky top-0 z-10 transition-all duration-300"
    >
      {/* Left Section: Welcome Message */}
      <div className="flex flex-col">
        <h1 className="text-xl font-black text-gray-900 dark:text-zinc-100 leading-none">
          HI, {(session?.user as any)?.username?.toUpperCase() || session?.user?.name?.toUpperCase() || session?.user?.email?.split("@")[0].toUpperCase() || "USER"}
        </h1>
        <p className="text-[10px] font-black text-[#CE2029] dark:text-[#FFD500] uppercase tracking-wider mt-1">
          {/* @ts-ignore */}
          {session?.user?.role || "SYSTEM ACCESS"} — WELCOME BACK
        </p>
      </div>

      {/* Right Section: Search, Notifications & Profile */}
      <div className="flex items-center gap-1.5">
        {/* Search Input */}
        <div className="relative group">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#CE2029] dark:group-focus-within:text-[#FFD500] transition-colors" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-52 pl-11 pr-4 py-1.5 bg-white/50 dark:bg-navy-900/50 border border-gray-100 dark:border-navy-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#FFD500]/10 focus:border-[#FFD500] dark:focus:border-[#FFD500]/50 focus:bg-white dark:focus:bg-navy-900 transition-all text-xs font-bold placeholder:text-gray-400 dark:text-zinc-100"
          />
        </div>

        {/* Theme Toggle (Replaces Bell) */}
        <ThemeToggle />

        <div className="h-5 w-[1px] bg-gray-200/50 dark:bg-navy-800 mx-0.5" />

        {/* User Profile & Logout */}
        <div className="flex items-center gap-1.5">
          <div className="w-8.5 h-8.5 rounded-xl overflow-hidden shadow-sm border border-orange-100 ring-2 ring-[#FFD500]/20">
            {session?.user?.image ? (
              <img 
                src={getNormalizedImageUrl(session.user.image)} 
                alt="Profile" 
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-[#FFD500] flex items-center justify-center text-[#CE2029] font-black text-xs uppercase">
                {session?.user?.name?.substring(0, 2) || session?.user?.email?.substring(0, 2) || "UR"}
              </div>
            )}
          </div>

          <button 
            onClick={() => signOut()}
            className="p-1.5 text-gray-400 hover:text-[#CE2029] hover:bg-red-50 rounded-xl transition-all group"
            title="Sign Out"
          >
            <ArrowRightOnRectangleIcon className="w-5.5 h-5.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
