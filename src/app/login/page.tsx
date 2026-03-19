"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserIcon as UserIconSolid,
  LockClosedIcon as LockClosedIconSolid
} from "@heroicons/react/24/solid";
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon
} from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username: identifier,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username/email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9E6] flex items-center justify-center p-4 font-sans selection:bg-[#CE2029] selection:text-white">
      {/* Container Card */}
      <div className="w-full max-w-5xl h-[640px] bg-white rounded-[60px] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col lg:flex-row relative">

        {/* The Giant Brand Bubble (The Core of the Layout) */}
        <div className="absolute top-1/2 left-[-35%] -translate-y-1/2 w-[110%] aspect-square max-w-[800px] bg-gradient-to-br from-[#FFD500] to-[#E6B100] rounded-full shadow-[20px_0_80px_rgba(0,0,0,0.1)] z-10 pointer-events-none hidden lg:block" />

        {/* Left Pane - Content Wrapper (Mobile Friendly) */}
        <div className="lg:w-[50%] h-full relative z-20 flex flex-col justify-center p-12 lg:p-20 text-white lg:bg-transparent bg-gradient-to-br from-[#FFD500] to-[#E6B100]">
          {/* Internal 3D Spheres for Depth */}
          <div className="absolute top-[10%] left-[20%] w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-transparent shadow-[inset_-10px_-10px_30px_rgba(0,0,0,0.1),inset_10px_10px_30px_rgba(255,255,255,0.2)]" />

          <div className="absolute bottom-[15%] left-[60%] w-64 h-64 rounded-full bg-gradient-to-br from-white/15 to-transparent shadow-[inset_-30px_-30px_60px_rgba(0,0,0,0.15),inset_30px_30px_60px_rgba(255,255,255,0.3)] backdrop-blur-[2px]" />

          <div className="space-y-8 relative z-30">
            {/* Logo injected back to Left Pane */}
            <div className="mb-2 relative z-50">
              <div className="w-full max-w-[350px] h-[120px] mb-2 drop-shadow-md">
                <img
                  src="https://drive.google.com/uc?export=view&id=1h6ar3DDzgJM9-6jQhieVmDun02Ii_DV0"
                  alt="Robotek Logo"
                  className="w-full h-full object-contain object-left"
                />
              </div>
              <p className="text-black/80 font-bold text-[10px] uppercase tracking-[0.4em] drop-shadow-sm w-full">Name of Confidence</p>
            </div>

            <div className="space-y-1">
              <h1 className="text-7xl font-black tracking-tight leading-none uppercase drop-shadow-sm">
                WELCOME
              </h1>
              <h2 className="text-3xl font-black text-black/80 tracking-tight uppercase">
                ROBOTEK ERP
              </h2>
            </div>

            <p className="text-sm font-bold text-black/60 leading-relaxed max-w-xs uppercase tracking-wide">
              Elevate your business productivity with our state-of-the-art enterprise resource planning suite.
            </p>

            {/* Logo In Brand Pane removed as per user request */}
            <div className="pt-10 h-28" />
          </div>
        </div>

        {/* Right Pane - Form */}
        <div className="flex-1 bg-white p-8 md:p-14 lg:p-20 flex flex-col justify-start relative z-20 overflow-y-auto">
          <div className="max-w-md w-full mx-auto relative z-30 flex-1 flex flex-col justify-center">
            {/* Secondary Bubble in the form area (to match reference) */}
            <div className="absolute bottom-[-100px] right-[-80px] w-72 h-72 rounded-full bg-gradient-to-tr from-[#FFD500] to-[#FFD500]/50 shadow-[inset_-20px_-20px_50px_rgba(0,0,0,0.1),inset_20px_20px_50px_rgba(255,255,255,0.2)] z-[-1]" />

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-[#CE2029] px-5 py-4 rounded-2xl text-[13px] font-black border border-red-100 flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#CE2029] rounded-full animate-pulse" />
                  {error}
                </div>
              )}

              <div className="relative group">
                <UserIconSolid className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black group-focus-within:text-black transition-colors z-10" />
                <input
                  type="text"
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder=" "
                  required
                  className="peer w-full pl-16 pr-6 pt-7 pb-3 bg-[#F8F9FA] border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#FFD500] transition-all outline-none text-[15px] font-bold text-gray-800"
                />
                <label
                  htmlFor="identifier"
                  className="absolute left-16 top-1/2 -translate-y-1/2 text-gray-400 font-bold transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-4 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest pointer-events-none"
                >
                  User Name
                </label>
              </div>

              <div className="relative group">
                <LockClosedIconSolid className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black group-focus-within:text-black transition-colors z-10" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  required
                  className="peer w-full pl-16 pr-16 pt-7 pb-3 bg-[#F8F9FA] border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#FFD500] transition-all outline-none text-[15px] font-bold text-gray-800"
                />
                <label
                  htmlFor="password"
                  className="absolute left-16 top-1/2 -translate-y-1/2 text-gray-400 font-bold transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-4 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest pointer-events-none"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-[#FFD500] transition-colors uppercase text-[10px] font-black tracking-widest z-10"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#003875] hover:bg-[#002855] text-white font-black py-5 rounded-[24px] shadow-2xl shadow-[#003875]/20 transition-all duration-300 disabled:opacity-50 active:scale-[0.98] uppercase tracking-[0.25em] text-[13px] h-16"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          {/* Footer Creds */}
          <div className="mt-8 pt-4 flex flex-col items-center gap-3 z-30 shrink-0">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#F8F9FA] rounded-full border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designed & managed by</span>
              <span className="text-[11px] font-black text-[#CE2029] tracking-tight">Sohan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
