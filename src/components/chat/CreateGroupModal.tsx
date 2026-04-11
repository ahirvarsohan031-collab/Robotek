"use client";

import { useState } from "react";
import { XMarkIcon, UserGroupIcon, MagnifyingGlassIcon, CheckIcon } from "@heroicons/react/24/outline";
import useSWR from "swr";

interface User {
  id: string;
  username: string;
  image_url: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  onGroupCreated: (group: any) => void;
}

export default function CreateGroupModal({ isOpen, onClose, currentUsername, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([currentUsername]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users } = useSWR<User[]>("/api/chat/users", fetcher);

  if (!isOpen) return null;

  const filteredUsers = (users || []).filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) && 
    u.username !== currentUsername
  );

  const toggleUser = (username: string) => {
    setSelectedUsers(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username) 
        : [...prev, username]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/chat/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          participants: selectedUsers.join(","),
          creator: currentUsername
        })
      });

      if (res.ok) {
        const newGroup = await res.json();
        onGroupCreated(newGroup);
        onClose();
        setGroupName("");
        setSelectedUsers([currentUsername]);
      }
    } catch (error) {
      console.error("Create Group Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#001F3F] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-4 bg-[#003875] text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6" />
            Create New Group
          </h2>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full text-white/70 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-black text-[#003875] dark:text-white/70 uppercase tracking-widest mb-2">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[#003875] font-bold"
            />
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm font-black text-[#003875] dark:text-white/70 uppercase tracking-widest mb-2">
              Select Participants ({selectedUsers.length})
            </label>
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#003875]"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">No other users found.</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.username}
                    onClick={() => toggleUser(user.username)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                      selectedUsers.includes(user.username)
                        ? "bg-[#003875]/10 border border-[#003875]/20"
                        : "hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-left font-bold text-foreground">{user.username}</span>
                    {selectedUsers.includes(user.username) && (
                      <div className="bg-[#003875] text-white p-1 rounded-full">
                        <CheckIcon className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !groupName.trim() || selectedUsers.length < 2}
              className={`flex-[2] py-3 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest ${
                isSubmitting || !groupName.trim() || selectedUsers.length < 2
                  ? "bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed"
                  : "bg-[#003875] text-white hover:bg-[#002855]"
              }`}
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
