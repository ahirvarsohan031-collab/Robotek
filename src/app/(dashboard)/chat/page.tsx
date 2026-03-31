"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const { data: session } = useSession();
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  if (!session?.user) {
    return <div className="p-8 text-foreground h-full flex items-center justify-center">Loading user session...</div>;
  }

  const currentUsername = (session.user as any).username as string;

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[500px] flex overflow-hidden rounded-[24px] bg-panel-bg relative">
      {/* Sidebar - Contacts & Recent Chats */}
      <div className={`md:flex ${activePartnerId ? "hidden md:block" : "block w-full"} flex-shrink-0 h-full`}>
        <ChatSidebar 
          currentUsername={currentUsername} 
          activeChatId={activePartnerId}
          onSelectChat={setActivePartnerId}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full bg-chat-window md:flex ${!activePartnerId ? "hidden md:flex" : "block"}`}>
        {activePartnerId ? (
          <ChatWindow 
            chatId={activePartnerId} 
            currentUsername={currentUsername} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-transparent border border-primary/30 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Robotec Internal Chat</h2>
            <p className="text-foreground/40 max-w-sm">Select a contact from the sidebar to start securely messaging.</p>
          </div>
        )}
      </div>

      {/* Mobile Back Button Override when chat is active */}
      {activePartnerId && (
        <button 
          onClick={() => setActivePartnerId(null)}
          className="md:hidden absolute top-4 left-4 z-50 p-2 bg-foreground/10 backdrop-blur-md rounded-full text-foreground/80 hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
