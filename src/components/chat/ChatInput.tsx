import { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { useReactMediaRecorder } from "react-media-recorder";
import { 
  PaperClipIcon, 
  FaceSmileIcon, 
  MicrophoneIcon, 
  PaperAirplaneIcon,
  XMarkIcon,
  StopCircleIcon
} from "@heroicons/react/24/outline";

interface ChatInputProps {
  onSendMessage: (text: string, type: "text"|"image"|"file"|"audio", mediaUrl?: string) => void;
  isSending: boolean;
}

export default function ChatInput({ onSendMessage, isSending }: ChatInputProps) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } = useReactMediaRecorder({ audio: true });

  const handleSendText = () => {
    if (text.trim() && !isSending) {
      onSendMessage(text, "text");
      setText("");
      setShowEmoji(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const onEmojiClick = (emojiObj: any) => {
    setText((prev) => prev + emojiObj.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success && data.fileId) {
        const type = file.type.startsWith("image/") ? "image" : "file";
        onSendMessage(file.name, type, data.fileId);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendAudio = async () => {
    if (!mediaBlobUrl) return;
    setUploading(true);
    try {
      const response = await fetch(mediaBlobUrl);
      const blob = await response.blob();
      const file = new File([blob], "voice-note.webm", { type: blob.type || "audio/webm" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success && data.fileId) {
        onSendMessage("Voice Note", "audio", data.fileId);
        clearBlobUrl();
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      console.error("Audio block failed", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative p-3 bg-[#003875] flex items-end gap-2 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      
      {/* Upload Progress Indicator */}
      {uploading && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 animate-bounce">
          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Uploading media...
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-full left-2 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-panel-border">
          <EmojiPicker onEmojiClick={onEmojiClick} theme={"auto" as any} />
        </div>
      )}

      {/* Media Recorder Overlay */}
      {status === "recording" && (
        <div className="absolute inset-x-2 bottom-full mb-2 bg-red-500/20 border border-red-500/50 backdrop-blur-md text-white p-3 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 animate-ping">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="font-semibold text-sm">Recording audio...</span>
          </div>
          <button onClick={stopRecording} className="text-white hover:text-red-300">
             <StopCircleIcon className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      {/* Audio Preview after recording */}
      {mediaBlobUrl ? (
        <div className="flex-1 flex items-center gap-3 bg-input-bg rounded-full px-4 py-2 border border-primary/30 h-11">
          <audio src={mediaBlobUrl} controls className="h-8 flex-1 outline-none" />
          <button onClick={clearBlobUrl} className="text-foreground/60 hover:text-red-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSendAudio}
            disabled={isSending || uploading}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 cursor-pointer"
          >
            <PaperAirplaneIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-1 mb-1">
             <button
               onClick={() => setShowEmoji(!showEmoji)}
               className="p-2 text-white/60 hover:text-white rounded-full hover:bg-[#002855] transition-colors cursor-pointer"
             >
               <FaceSmileIcon className="w-5 h-5" />
             </button>
             <button
               onClick={() => fileInputRef.current?.click()}
               className="p-2 text-white/60 hover:text-white rounded-full hover:bg-[#002855] transition-colors cursor-pointer"
             >
               <PaperClipIcon className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 bg-white border-none rounded-3xl flex items-center transition-all shadow-inner">
            <textarea
              className="flex-1 bg-transparent border-none focus:ring-0 text-foreground placeholder-foreground/40 p-3 max-h-32 min-h-[44px] resize-none text-sm custom-scrollbar"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>

          <div className="flex items-center space-x-1 mb-1 ml-1">
             {text.trim() ? (
               <button 
                 onClick={handleSendText}
                 disabled={isSending || uploading}
                 className="p-3 bg-primary hover:brightness-110 text-white rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
               >
                 <PaperAirplaneIcon className="w-5 h-5" />
               </button>
             ) : (
               <button 
                 onClick={startRecording}
                 className="p-3 bg-[#002855] hover:bg-[#001f40] text-white/80 rounded-full transition-colors cursor-pointer"
               >
                 <MicrophoneIcon className="w-5 h-5" />
               </button>
             )}
          </div>
        </>
      )}
    </div>
  );
}
