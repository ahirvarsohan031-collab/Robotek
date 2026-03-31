"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { UserCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  type: "text" | "image" | "file" | "audio";
  media_url: string;
  created_at: string;
}

interface ChatWindowProps {
  chatId: string; // This is the partner's username
  currentUsername: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ChatWindow({ chatId, currentUsername }: ChatWindowProps) {
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages between current user and the partner (chatId)
  const { data: messages, mutate } = useSWR<ChatMessage[]>(`/api/chat/messages?chatId=${chatId}`, fetcher, {
    refreshInterval: 3000, // Faster refresh for simple messenger
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className="flex-1 flex flex-col h-full bg-chat-window md:rounded-br-[24px]">
      
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#003875] shadow-sm sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#002855] border border-[#001f40] flex items-center justify-center shadow-inner">
            <UserCircleIcon className="w-6 h-6 text-white/80" />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">{chatId}</h3>
            {/* Online status removed as requested */}
          </div>
        </div>
        <button className="p-2 text-white/60 hover:text-white rounded-full hover:bg-[#002855] transition-colors">
          <InformationCircleIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col gap-2 relative z-0"
      >
        {/* Pattern Background Layer */}
        <div 
          className="absolute inset-0 z-[-1] opacity-50 pointer-events-none" 
          style={{ 
            backgroundImage: "url('/assets/chat/chat_bg_pattern.png')",
            backgroundRepeat: 'repeat',
            backgroundSize: '300px'
          }}
        />

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
            
            return (
              <MessageBubble
                key={msg.id}
                message={msg as any}
                isOwn={isOwn}
                showTail={showTail}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}
