/**
 * IntercomTalk.tsx — Komponen Interkom Push-to-Talk Dua Arah
 * Mengirimkan suara mikrofon pengguna langsung ke speaker fisik kamera IP.
 */

import { useState, useRef } from "react";
import { Mic, MicOff, Radio, Volume2 } from "lucide-react";
import { IntercomAudioRecorder } from "@/lib/audioRecorder";
import { api } from "@/lib/api";

export function IntercomTalk() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "transmitting" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string>("Tahan tombol untuk bicara ke speaker kamera");
  const recorderRef = useRef<IntercomAudioRecorder | null>(null);

  /**
   * Menangani awal perekaman suara saat tombol ditekan.
   */
  const handleStartTalk = async () => {
    try {
      setStatus("recording");
      setFeedback("Merekam suara... Lepas untuk mengirim");
      const rec = new IntercomAudioRecorder();
      recorderRef.current = rec;
      await rec.startRecording();
      setIsRecording(true);
    } catch {
      setStatus("error");
      setFeedback("Gagal mengakses mikrofon browser");
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  /**
   * Menghentikan perekaman dan mengirim audio ke backend gateway.
   */
  const handleStopTalk = async () => {
    if (!recorderRef.current || !isRecording) return;
    setIsRecording(false);
    setStatus("transmitting");
    setFeedback("Mengirim audio ke speaker kamera (AVTP:22554)...");

    try {
      const pcmBuffer = await recorderRef.current.stopRecording();
      recorderRef.current = null;
      const res = await api.sendTalkAudio(pcmBuffer);
      setStatus("success");
      setFeedback(res.status === "success" ? "Suara terkirim ke speaker kamera!" : "Audio tersimpan di buffer gateway");
    } catch {
      setStatus("error");
      setFeedback("Koneksi audio ke kamera terputus");
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setFeedback("Tahan tombol untuk bicara ke speaker kamera");
      }, 3000);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>Interkom Dua Arah (Talkback)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Port AVTP 22554</span>
      </div>

      <div className="flex flex-col items-center gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
        <button
          type="button"
          onMouseDown={handleStartTalk}
          onMouseUp={handleStopTalk}
          onTouchStart={handleStartTalk}
          onTouchEnd={handleStopTalk}
          className={`w-full py-2.5 px-4 rounded-md font-medium text-xs flex items-center justify-center gap-2 transition-all select-none ${
            isRecording
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-[0.98] ring-2 ring-rose-400"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
          <span>{isRecording ? "Lepas untuk Transmisi" : "Tahan untuk Bicara (Push-to-Talk)"}</span>
        </button>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 w-full justify-between">
          <span className="truncate">{feedback}</span>
          {status === "transmitting" && <Volume2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />}
        </div>
      </div>
    </div>
  );
}
