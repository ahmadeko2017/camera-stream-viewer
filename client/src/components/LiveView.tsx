/**
 * LiveView.tsx — Viewport Live Stream 1080p dengan Kontrol Rekaman Lokal & Snapshot
 * Menampilkan live video feed MJPEG, overlay status, perekaman video MP4 lokal, dan snapshot instan.
 */

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Camera, Maximize, Radio, Disc, Square } from "lucide-react";

interface LiveViewProps {
  cameraIp: string;
  connected: boolean;
}

export function LiveView({ cameraIp, connected }: LiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setRecDuration((prev) => prev + 1), 1000);
    } else {
      setRecDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      api.startRecording()
        .then(() => setIsRecording(true))
        .catch((err) => console.error("Gagal mulai rekam:", err));
    } else {
      api.stopRecording()
        .then(() => setIsRecording(false))
        .catch((err) => console.error("Gagal stop rekam:", err));
    }
  };

  const handleSnapshotDownload = () => {
    const link = document.createElement("a");
    link.href = api.getSnapshotUrl();
    link.download = `snapshot_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl"
    >
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        <img
          src="http://localhost:8088/video_feed"
          alt="Live Stream IP Camera"
          className="w-full h-full object-contain select-none"
        />

        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <Badge variant={connected ? "success" : "destructive"} className="gap-1.5 shadow-md">
            <Radio className="w-3 h-3 animate-pulse" />
            {connected ? "LIVE 1080p" : "OFFLINE"}
          </Badge>
          <span className="text-xs bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-slate-300 font-mono">
            {cameraIp}
          </span>
          {isRecording && (
            <Badge variant="destructive" className="gap-1.5 shadow-md animate-pulse">
              <Disc className="w-3 h-3" />
              REC {formatTime(recDuration)}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 px-4 py-2.5 bg-[#12151f] border-t border-slate-800/80">
        <span className="text-xs text-slate-400">
          Stream H.264 (1920×1080) &bull; 12 FPS &bull; Bitrate 896 kbps
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            onClick={toggleRecording}
            className="gap-1.5 text-xs shadow-sm"
          >
            {isRecording ? <Square className="w-3.5 h-3.5" /> : <Disc className="w-3.5 h-3.5" />}
            {isRecording ? "Berhenti Rekam" : "Rekam Video (Lokal)"}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSnapshotDownload} className="gap-1.5 text-xs">
            <Camera className="w-3.5 h-3.5" /> Snapshot
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="gap-1.5 text-xs">
            <Maximize className="w-3.5 h-3.5" /> Layar Penuh
          </Button>
        </div>
      </div>
    </div>
  );
}
