"use client";

import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ForwardModal from "./ForwardModal";
import ConfirmModal from "../ConfirmModal";
import SearchableSelect from "../SearchableSelect";
import { UserCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon, ArrowDownTrayIcon, DocumentDuplicateIcon, CheckIcon, UserGroupIcon, PlusSmallIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { getDriveImageUrl } from "@/lib/drive-utils";
import { format, isToday, isYesterday } from "date-fns";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  type: "text" | "image" | "file" | "audio";
  media_url: string;
  read_by?: string;
  created_at: string;
}

interface ChatGroup {
  id: string;
  name: string;
  participants: string;
  admins: string;
  created_by: string;
  created_at: string;
}

interface ChatWindowProps {
  chatId: string; // This is the partner's username
  currentUsername: string;
  onBack?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper for gradient background color based on username
function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

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

export default function ChatWindow({ chatId, currentUsername, onBack }: ChatWindowProps) {
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);

  // Fetch messages between current user and the partner (chatId)
  const { data: messages, mutate } = useSWR<ChatMessage[]>(`/api/chat/messages?chatId=${chatId}`, fetcher, {
    refreshInterval: 15000, 
  });

  const isGroup = chatId.startsWith("group_");
  const { data: groupInfo, mutate: mutateGroupInfo } = useSWR<ChatGroup>(
    isGroup ? `/api/chat/groups/${chatId}` : null,
    fetcher
  );

  const { data: allUsers } = useSWR<any[]>(isGroup ? "/api/chat/users" : null, fetcher);
  
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [newParticipant, setNewParticipant] = useState("");
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'info';
    confirmLabel?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();

    // Mark messages as read
    if (messages && messages.length > 0) {
      const hasUnread = messages.some(
        (m) => m.sender_id !== currentUsername && !(m.read_by || "").includes(currentUsername)
      );

      if (hasUnread) {
        fetch("/api/chat/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerId: chatId })
        }).then(res => {
          if (res.ok) mutate();
        }).catch(err => console.error("Failed to mark read:", err));
      }
    }
  }, [messages, chatId, currentUsername, mutate]);

  const handleSendMessage = async (text: string, type: "text"|"image"|"file"|"audio", mediaUrl?: string) => {
    if (!text.trim() && type === "text") return;
    setIsSending(true);

    try {
      const tempId = `temp-${Date.now()}`;
      mutate(
        currentMessages => [
          ...(currentMessages || []),
          {
            id: tempId,
            sender_id: currentUsername,
            receiver_id: chatId,
            text,
            type,
            media_url: mediaUrl || "",
            created_at: new Date().toISOString(),
          } as ChatMessage
        ],
        false
      );

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId, // This is receiver_id
          text,
          type,
          media_url: mediaUrl,
        }),
      });

      if (res.ok) {
        mutate();
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleForwardMessage = async (selectedUsernames: string[], msgToForward: ChatMessage) => {
    try {
      const promises = selectedUsernames.map(async (username) => {
        if (username === chatId) {
          const tempId = `temp-fwd-${Date.now()}-${Math.random()}`;
          mutate(
            currentMessages => [
              ...(currentMessages || []),
              {
                id: tempId,
                sender_id: currentUsername,
                receiver_id: chatId,
                text: msgToForward.text,
                type: msgToForward.type,
                media_url: msgToForward.media_url || "",
                created_at: new Date().toISOString(),
              } as ChatMessage
            ],
            false
          );
        }

        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: username,
            text: msgToForward.text,
            type: msgToForward.type,
            media_url: msgToForward.media_url,
          }),
        });

        if (!res.ok) {
           console.error(`Failed to forward to ${username}`);
        }
      });

      await Promise.all(promises);
      
      if (selectedUsernames.includes(chatId)) {
         mutate();
      }
    } catch (err) {
      console.error("Error forwarding messages", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-[#FEF5E7] via-[#fdfaf5] to-[#FCE4EC] md:rounded-br-[24px] transition-colors duration-500">
      
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#001F3F] shadow-sm sticky top-0 z-50 transition-colors">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 mr-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-sm bg-gradient-to-br ${getAvatarGradient(isGroup ? (groupInfo?.name || chatId) : chatId)}`}>
            {isGroup ? <UserGroupIcon className="w-5 h-5" /> : chatId.charAt(0).toUpperCase()}
          </div>
          <div>
            {isGroup && isEditingGroupName ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  value={editedGroupName}
                  onChange={e => setEditedGroupName(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      setIsEditingGroupName(false);
                      if (editedGroupName.trim() && editedGroupName !== groupInfo?.name) {
                        await fetch(`/api/chat/groups/${chatId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: editedGroupName.trim() })
                        });
                        mutateGroupInfo();
                      }
                    } else if (e.key === 'Escape') {
                      setIsEditingGroupName(false);
                    }
                  }}
                  onBlur={() => setIsEditingGroupName(false)}
                  className="bg-white/10 border border-white/30 text-white rounded px-2 py-0.5 outline-none font-bold text-sm w-40 focus:ring-1 focus:ring-white/50"
                  placeholder="Group Name"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 className="font-bold text-white tracking-wide">
                  {isGroup ? groupInfo?.name : chatId}
                </h3>
                {isGroup && groupInfo && (groupInfo.admins || "").split(",").map(a=>a.trim()).includes(currentUsername) && (
                  <button 
                    onClick={() => {
                      setEditedGroupName(groupInfo.name);
                      setIsEditingGroupName(true);
                    }}
                    className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    title="Rename Group"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {isGroup && (
              <p className="text-[10px] font-bold text-white/60 tracking-wider">
                {(groupInfo?.participants || "").split(",").filter(Boolean).length} Members
              </p>
            )}
          </div>
        </div>
        {isGroup && (
          <button 
            onClick={() => setShowGroupInfo(!showGroupInfo)}
            className={`p-2 rounded-full transition-colors ${showGroupInfo ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
          >
            <InformationCircleIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Group Info panel */}
      {showGroupInfo && isGroup && groupInfo && (
        <div className="absolute top-[72px] right-4 w-72 bg-white dark:bg-[#001F3F] rounded-2xl shadow-2xl border border-white/10 z-[100] p-4 animate-in slide-in-from-top-2 duration-200">
           <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
              <h4 className="font-black text-xs text-[#003875] dark:text-white uppercase tracking-widest">Group Members</h4>
              <button onClick={() => setShowGroupInfo(false)} className="text-gray-400 hover:text-red-500">
                <XMarkIcon className="w-5 h-5" />
              </button>
           </div>
           
           <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar mb-4">
              {(groupInfo.participants || "").split(",").map(p => p.trim()).filter(Boolean).map(username => {
                const isAdmin = (groupInfo.admins || "").split(",").map(a => a.trim()).includes(username);
                const currentUserIsAdmin = (groupInfo.admins || "").split(",").map(a => a.trim()).includes(currentUsername);

                return (
                  <div key={username} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                       <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold bg-gradient-to-br ${getAvatarGradient(username)}`}>
                          {username.charAt(0).toUpperCase()}
                       </div>
                       <span className="text-xs font-bold text-foreground">{username}</span>
                       {isAdmin && <span className="text-[8px] bg-red-500 text-white px-1 rounded uppercase font-black">Admin</span>}
                    </div>
                    {currentUserIsAdmin && username !== currentUsername && (
                      <div className="flex items-center gap-2">
                        {!isAdmin ? (
                          <button 
                            onClick={() => {
                               setConfirmModal({
                                 isOpen: true,
                                 title: "Make Admin",
                                 message: `Are you sure you want to make ${username} an admin?`,
                                 type: "info",
                                 confirmLabel: "Make Admin",
                                 onConfirm: async () => {
                                   const newAdmins = `${groupInfo.admins},${username}`;
                                   await fetch(`/api/chat/groups/${chatId}`, {
                                     method: "PATCH",
                                     headers: { "Content-Type": "application/json" },
                                     body: JSON.stringify({ admins: newAdmins })
                                   });
                                   mutateGroupInfo();
                                 }
                               });
                            }}
                            className="text-[10px] uppercase font-bold text-blue-500 hover:underline tracking-wider"
                          >
                            Make Admin
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                               setConfirmModal({
                                 isOpen: true,
                                 title: "Remove Admin",
                                 message: `Are you sure you want to remove admin rights from ${username}?`,
                                 type: "danger",
                                 confirmLabel: "Remove",
                                 onConfirm: async () => {
                                   const newAdmins = (groupInfo.admins || "").split(",").map(a=>a.trim()).filter(a => a !== username).join(",");
                                   await fetch(`/api/chat/groups/${chatId}`, {
                                     method: "PATCH",
                                     headers: { "Content-Type": "application/json" },
                                     body: JSON.stringify({ admins: newAdmins })
                                   });
                                   mutateGroupInfo();
                                 }
                               });
                            }}
                            className="text-[10px] uppercase font-bold text-orange-500 hover:underline tracking-wider"
                          >
                            Remove Admin
                          </button>
                        )}
                        <button 
                          onClick={() => {
                             setConfirmModal({
                               isOpen: true,
                               title: "Remove Participant",
                               message: `Are you sure you want to remove ${username} from the group?`,
                               type: "danger",
                               confirmLabel: "Remove",
                               onConfirm: async () => {
                                 const newParticipants = (groupInfo.participants || "").split(",").map(p=>p.trim()).filter(p => p !== username).join(",");
                                 const newAdmins = (groupInfo.admins || "").split(",").map(a=>a.trim()).filter(a => a !== username).join(",");
                                 await fetch(`/api/chat/groups/${chatId}`, {
                                   method: "PATCH",
                                   headers: { "Content-Type": "application/json" },
                                   body: JSON.stringify({ participants: newParticipants, admins: newAdmins })
                                 });
                                 mutateGroupInfo();
                               }
                             });
                          }}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
           </div>

           {(groupInfo.admins || "").split(",").map(a => a.trim()).includes(currentUsername) && (
              <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Add Member</p>
                  <div className="flex gap-2 relative">
                    <div className="flex-1">
                      <SearchableSelect
                        value={newParticipant}
                        onChange={(val) => setNewParticipant(val)}
                        placeholder="Select User..."
                        options={(allUsers || [])
                          .filter(u => {
                            const participantList = (groupInfo.participants || "").split(",").map(p => p.trim());
                            return !participantList.includes(u.username);
                          })
                          .map(u => ({ id: u.username, label: u.username }))}
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newParticipant) return;
                        setIsUpdatingGroup(true);
                        const newParticipants = `${groupInfo.participants},${newParticipant}`;
                        await fetch(`/api/chat/groups/${chatId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ participants: newParticipants })
                        });
                        setNewParticipant("");
                        mutateGroupInfo();
                        setIsUpdatingGroup(false);
                      }}
                      disabled={isUpdatingGroup || !newParticipant}
                      className="bg-[#003875] text-white px-3 rounded-xl hover:bg-[#002855] disabled:opacity-50 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                    >
                      <PlusSmallIcon className="w-5 h-5" />
                    </button>
                 </div>
              </div>
           )}
        </div>
      )}

      {/* Messages Area Container */}
      <div className="flex-1 relative flex flex-col overflow-hidden z-0">
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col gap-2 relative z-0"
        >

        {!messages ? (
          <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/40 opacity-70">
            <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
               </svg>
            </div>
            <p className="text-sm font-medium">No messages with {chatId} yet.</p>
            <p className="text-xs mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === currentUsername;
            const showTail = index === messages.length - 1 || messages[index + 1].sender_id !== msg.sender_id;
            const showDateDivider = index === 0 || !isSameDay(messages[index - 1].created_at, msg.created_at);
            
            return (
              <React.Fragment key={msg.id}>
                {showDateDivider && (
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-gray-300/60 dark:bg-white/10" />
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-white/40 bg-white/70 dark:bg-white/5 px-3 py-0.5 rounded-full shadow-sm border border-gray-200/60 dark:border-white/10 whitespace-nowrap">
                      {getDateLabel(msg.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-gray-300/60 dark:bg-white/10" />
                  </div>
                )}
                <MessageBubble
                  message={msg as any}
                  isOwn={isOwn}
                  showTail={showTail}
                  onImageClick={(url) => setPreviewMediaUrl(url)}
                  onForwardClick={(msgToForward) => setForwardingMessage(msgToForward as any)}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Image Preview Modal */}
        {previewMediaUrl && (
          <div 
            className="absolute inset-0 z-[100] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-4 transition-opacity"
            onClick={() => setPreviewMediaUrl(null)}
          >
            {/* Top Bar with Close Button */}
            <div className="w-full flex justify-end flex-shrink-0 mb-4 h-12">
              <button 
                onClick={() => setPreviewMediaUrl(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors bg-white/10 backdrop-blur-md rounded-full shadow-lg"
              >
                <XMarkIcon className="w-6 h-6 md:w-8 md:h-8 font-bold" />
              </button>
            </div>

            {/* Image Wrapper - Takes maximum remaining space but shrinks to fit */}
            <div 
              className="flex-1 min-h-0 w-full flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={getDriveImageUrl(previewMediaUrl)}
                alt="Preview"
                className="max-h-full max-w-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
              />
            </div>

            {/* Bottom Actions */}
            <div 
              className="flex flex-shrink-0 flex-wrap items-center justify-center gap-4 w-full pt-4 pb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(`/api/drive-proxy?id=${previewMediaUrl}`);
                    if (!response.ok) throw new Error("Proxy fetch failed");
                    const blob = await response.blob();
                    await navigator.clipboard.write([
                      new ClipboardItem({ [blob.type]: blob })
                    ]);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  } catch (err) {
                    console.error("Failed to copy image to clipboard:", err);
                    navigator.clipboard.writeText(`https://drive.google.com/file/d/${previewMediaUrl}/view`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }
                }}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold shadow-lg transition-all backdrop-blur-md border border-white/10 active:scale-95"
              >
                {isCopied ? (
                  <>
                    <CheckIcon className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-5 h-5" />
                    <span>Copy Image</span>
                  </>
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://drive.google.com/uc?export=download&id=${previewMediaUrl}`, '_blank');
                }}
                className="flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition-all active:scale-95 border border-blue-400/20"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForwardMessage}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}
