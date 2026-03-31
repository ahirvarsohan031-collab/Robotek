import { format } from "date-fns";
import { getDriveImageUrl } from "@/lib/drive-utils";

interface ChatMessage {
  id: string;
  sender_id: string;
  text: string;
  type: "text" | "image" | "file" | "audio";
  media_url: string;
  created_at: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showTail?: boolean;
}

export default function MessageBubble({ message, isOwn, showTail = true }: MessageBubbleProps) {
  return (
    <div className={`flex flex-col max-w-[75%] ${isOwn ? "self-end items-end" : "self-start items-start"} mb-1`}>
      <div
        className={`group relative px-4 py-2 text-[15px] leading-relaxed break-words shadow-lg ${isOwn
            ? "bg-gradient-to-br from-[#9A5BFF] to-[#7A3BFF] text-white rounded-2xl " + (showTail ? "rounded-br-sm" : "")
            : "bg-white/10 backdrop-blur-md text-white/90 rounded-2xl border border-white/5 " + (showTail ? "rounded-bl-sm" : "")
          }`}
      >
        {/* Author Name for direct chats (if not own) */}
        {!isOwn && showTail && (
          <div className="text-[11px] font-bold text-[#9A5BFF] mb-1 drop-shadow-md">
            {message.sender_id}
          </div>
        )}

        {/* Message Content */}
        {message.type === "text" && (
          <p className="whitespace-pre-wrap">{message.text}</p>
        )}

        {message.type === "image" && message.media_url && (
          <div className="mt-1 -mx-2 -mb-2">
            <img
              src={getDriveImageUrl(message.media_url)}
              alt="Uploaded media"
              className={`max-w-[250px] md:max-w-sm rounded-xl cursor-pointer hover:opacity-90 transition-opacity ${isOwn ? "border border-white/20" : "border border-white/10"}`}
              onClick={() => window.open(getDriveImageUrl(message.media_url).replace('/thumbnail?', '/uc?export=view&'), '_blank')}
            />
          </div>
        )}

        {message.type === "file" && message.media_url && (
          <a
            href={`https://drive.google.com/uc?export=view&id=${message.media_url}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-black/20 p-2 rounded-lg mt-1 hover:bg-black/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 text-white/70">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-sm underline">Download Document</span>
          </a>
        )}

        {message.type === "audio" && message.media_url && (
          <audio controls className="h-10 w-[200px] mt-1" src={`https://drive.google.com/uc?export=view&id=${message.media_url}`} />
        )}

        {/* Timestamp */}
        <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isOwn ? "text-white/70" : "text-white/40"}`}>
          {format(new Date(message.created_at), "HH:mm")}
          {isOwn && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-300 drop-shadow-sm">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
