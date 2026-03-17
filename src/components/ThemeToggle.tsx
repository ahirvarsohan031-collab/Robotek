"use client";

import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="w-8.5 h-8.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl flex items-center justify-center transition-all opacity-0">
        <SunIcon className="w-4.5 h-4.5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative w-8.5 h-8.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-[#CE2029] dark:hover:text-[#FFD500] rounded-xl flex items-center justify-center transition-all group shadow-sm hover:shadow-md active:scale-95"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div className="relative w-4.5 h-4.5">
        <SunIcon 
          className={`w-full h-full absolute transition-all duration-500 ease-in-out ${
            theme === "dark" ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`} 
        />
        <MoonIcon 
          className={`w-full h-full absolute transition-all duration-500 ease-in-out ${
            theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          }`} 
        />
      </div>
    </button>
  );
}
