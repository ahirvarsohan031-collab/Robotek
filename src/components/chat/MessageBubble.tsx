import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { getDriveImageUrl } from "@/lib/drive-utils";
import { PlayIcon, PauseIcon, MicrophoneIcon } from "@heroicons/react/24/solid";

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

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showTail?: boolean;
}

// Utility to check if text contains ONLY emojis and whitespace
const isEmojiOnly = (text: string) => {
  if (!text) return false;
  const stripped = text.replace(/[\s\n]/g, "");
  if (stripped.length === 0) return false;
  const emojiRegex = /^[\p{Emoji}\u200d\ufe0f]+$/u;
  return emojiRegex.test(stripped);
};

export default function MessageBubble({ message, isOwn, showTail = true }: MessageBubbleProps) {
  const emojisOnly = message.type === "text" && isEmojiOnly(message.text);
  const isRead = isOwn && message.read_by?.includes(message.receiver_id);

  // Audio Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Playback error:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setAudioCurrentTime(current);
      if (duration) {
        setAudioProgress((current / duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setAudioProgress(newProgress);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col max-w-[75%] ${isOwn ? "self-end items-end" : "self-start items-start"} mb-1`}>
      <div
        className={`group relative leading-relaxed break-words ${
          emojisOnly
            ? "text-[3.5rem] p-0 leading-[1.1] flex flex-col"
            : `text-[15px] px-4 py-2 shadow-sm ${
                isOwn
                  ? "bg-gradient-to-br from-[#003875] to-[#002855] text-white rounded-2xl " + (showTail ? "rounded-br-sm" : "")
                  : "bg-white dark:bg-navy-800 text-gray-800 dark:text-white rounded-2xl border border-gray-100 dark:border-navy-700 " + (showTail ? "rounded-bl-sm" : "")
              }`
        }`}
      >
        {/* Author Name for direct chats (if not own) */}
        {!isOwn && showTail && !emojisOnly && (
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
              className={`max-w-[180px] md:max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity ${isOwn ? "border border-white/20" : "border border-white/10"}`}
              onClick={() => window.open(`https://drive.google.com/file/d/${message.media_url}/view`, '_blank')}
            />
          </div>
        )}

        {message.type === "file" && message.media_url && (
          <a
            href={`https://drive.google.com/file/d/${message.media_url}/view`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-black/20 p-2 rounded-lg mt-1 hover:bg-black/30 transition-colors cursor-pointer text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 text-white/70">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-sm underline">Preview Document</span>
          </a>
        )}

        {message.type === "audio" && message.media_url && (
          <div className={`p-3 min-w-[240px] rounded-xl border overflow-hidden relative group transition-all duration-300 ${
            isOwn ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
          }`}>
            <h4 className={`text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10 ${
              isOwn ? "text-white/60" : "text-gray-400"
            }`}>
                <MicrophoneIcon className="w-3.5 h-3.5" /> Voice Briefing
                {isPlaying && <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>}
            </h4>
            
            <audio 
              ref={audioRef}
              src={`/api/audio/${message.media_url}`} 
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlay}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${
                    isOwn ? "bg-white text-[#003875]" : "bg-[#003875] text-white"
                  }`}
                >
                  {isPlaying ? (
                    <PauseIcon className="w-4 h-4 fill-current" />
                  ) : (
                    <PlayIcon className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={audioProgress}
                    onChange={handleAudioSeek}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all ${
                      isOwn ? "bg-white/10" : "bg-gray-200"
                    }`}
                  />
                  <div className="flex justify-between mt-1">
                    <span className={`text-[8px] font-mono font-bold ${isOwn ? "text-white/50" : "text-gray-400"}`}>
                      {formatAudioTime(audioCurrentTime)}
                    </span>
                    <span className={`text-[8px] font-mono font-bold ${isOwn ? "text-white/40" : "text-gray-300"}`}>
                      {formatAudioTime(audioDuration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Waveform Animation */}
            <div className="absolute bottom-0 right-0 left-0 flex items-end justify-center gap-[1px] h-8 opacity-[0.1] pointer-events-none px-4">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-[2px] rounded-t-full transition-all duration-300 ${
                    isOwn ? "bg-white" : "bg-[#003875]"
                  } ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
                  style={{ 
                    height: isPlaying ? `${Math.random() * 80 + 20}%` : `${(i % 5) * 10 + 20}%`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp & Ticks */}
        <div className={`text-[10px] text-right flex items-center justify-end gap-1 ${
          emojisOnly 
            ? "bg-black/10 text-gray-700 px-2 py-0.5 rounded-full inline-flex self-end drop-shadow-sm mt-[-0.5rem] mb-1" 
            : `mt-1 ${isOwn ? "text-white/80" : "text-gray-400"}`
        }`}>
          {format(new Date(message.created_at), "HH:mm")}
          {isOwn && (
            <div className="flex">
              {isRead ? (
                <div className="relative flex">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 ${emojisOnly ? "text-blue-500" : "text-blue-300 drop-shadow-sm"}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 -ml-2.5 ${emojisOnly ? "text-blue-500" : "text-blue-300 drop-shadow-sm"}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 ${emojisOnly ? "text-gray-500" : "text-white/50 drop-shadow-sm"}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

