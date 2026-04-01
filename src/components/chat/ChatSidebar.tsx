"use client";

import { useState } from "react";
import useSWR from "swr";
import { UserCircleIcon, ChatBubbleLeftEllipsisIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface User {
  id: string;
  username: string;
  image_url: string;
  role_name: string;
  lastMessage?: {
    text: string;
    type: "text" | "image" | "file" | "audio";
    sender_id: string;
    read_by: string;
    created_at: string;
  } | null;
  unreadCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper for gradient background color based on username
function getAvatarGradient(username: string) {
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-purple-500 to-fuchsia-600",
    "from-cyan-500 to-blue-600"
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

interface ChatSidebarProps {
  currentUsername: string;
  activeChatId: string | null; // This is now the partner's username
  onSelectChat: (username: string) => void;
}

export default function ChatSidebar({ currentUsername, activeChatId, onSelectChat }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: contacts } = useSWR<User[]>("/api/chat/users", fetcher);

  const filteredContacts = (contacts || [])
    .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full md:w-80 flex flex-col h-full bg-gradient-to-b from-[#FEF5E7] to-[#FCE4EC] dark:from-[#001F3F] dark:to-[#001429] transition-colors duration-500 border-r border-[#001F3F]/10">
      {/* Header */}
      <div className="p-4 bg-[#001F3F] text-white shadow-md transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-white/80" />
            Messages
          </h2>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10 dark:bg-black/20 border-none rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 shadow-inner"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-1">
          {!contacts ? (
            <div className="text-center py-4 text-foreground/40 text-sm animate-pulse">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-foreground/40 text-sm">No users found.</div>
          ) : (
            filteredContacts.map((user) => {
              const isActive = activeChatId === user.username;

              return (
                <button
                  key={user.id}
                  onClick={() => onSelectChat(user.username)}
                  className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? "bg-[#003875] text-white shadow-md ring-1 ring-[#003875]/50" 
                      : "bg-gradient-to-br from-[#FEF5E7] to-[#FCE4EC] dark:from-white/5 dark:to-white/10 dark:text-white shadow-sm border-none"
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border border-white/20 shadow-sm bg-gradient-to-br ${getAvatarGradient(user.username)}`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`font-black truncate text-sm ${isActive ? "text-white" : "text-[#003875] dark:text-white"}`}>{user.username}</h3>
                      {user.lastMessage && (
                        <span className={`text-[10px] font-bold ${isActive ? "text-white/70" : "text-[#003875]/60 dark:text-white/40"}`}>
                          {new Date(user.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {user.lastMessage ? (
                      <div className="flex items-center gap-1">
                        {user.lastMessage.sender_id === currentUsername ? (
                          <div className="flex">
                            {user.lastMessage.read_by?.includes(user.username) ? (
                              <div className="relative flex">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-blue-500">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-blue-500 -ml-2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              </div>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        ) : (
                          user.unreadCount > 0 && (
                            <div className="flex items-center justify-center bg-red-500 text-white text-[12px] font-bold rounded-full w-[22px] h-[22px] shrink-0">
                              {user.unreadCount > 99 ? '99+' : user.unreadCount}
                            </div>
                          )
                        )}
                        <p className={`text-xs truncate font-bold ${isActive ? "text-white/80" : "text-[#003875]/70 dark:text-white/60"} ${user.unreadCount > 0 ? "font-black" : ""}`}>
                          {user.lastMessage.type === "text" ? user.lastMessage.text : `[${user.lastMessage.type.toUpperCase()}]`}
                        </p>
                      </div>
                    ) : (
                      <p className={`text-xs truncate font-bold ${isActive ? "text-white/70" : "text-[#003875]/60 dark:text-white/40"}`}>
                        {user.role_name || "Member"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
