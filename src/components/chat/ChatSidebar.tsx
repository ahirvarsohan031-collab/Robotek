"use client";

import { useState } from "react";
import useSWR from "swr";
import { UserCircleIcon, ChatBubbleLeftEllipsisIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface User {
  id: string;
  username: string;
  image_url: string;
  role_name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ChatSidebarProps {
  currentUsername: string;
  activeChatId: string | null; // This is now the partner's username
  onSelectChat: (username: string) => void;
}

export default function ChatSidebar({ activeChatId, onSelectChat }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: contacts } = useSWR<User[]>("/api/chat/users", fetcher);

  const filteredContacts = (contacts || [])
    .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.username.localeCompare(b.username));

  return (
    <div className="w-full md:w-80 flex flex-col h-full bg-chat-sidebar">
      {/* Header */}
      <div className="p-4 bg-[#003875] text-white shadow-md">
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
            className="w-full bg-[#002855] border-none rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 shadow-inner"
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
                  className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isActive ? "bg-[#003875] text-white shadow-md ring-1 ring-[#003875]/50" : "bg-transparent hover:bg-[#003875]/5 hover:shadow-sm border-none"}`}
                >
                  <div className="relative">
                    {user.image_url ? (
                      <img src={user.image_url} alt={user.username} className="w-12 h-12 rounded-full object-cover border border-panel-border" />
                    ) : (
                      <UserCircleIcon className="w-12 h-12 text-primary/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`font-semibold truncate text-sm ${isActive ? "text-white" : "text-foreground"}`}>{user.username}</h3>
                    </div>
                    <p className={`text-xs truncate ${isActive ? "text-white/70" : "text-foreground/60"}`}>
                      {user.role_name || "Member"}
                    </p>
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
