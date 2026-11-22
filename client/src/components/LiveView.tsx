import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Maximize, Radio } from "lucide-react";

interface LiveViewProps {
  cameraIp: string;
  connected: boolean;
}

export function LiveView({ cameraIp, connected }: LiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(console.error);
      } else {
        document.exitFullscreen().catch(console.error);
      }
    }
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
        </div>
      </div>

      <div className="flex justify-between items-center px-4 py-2.5 bg-[#12151f] border-t border-slate-800/80">
        <span className="text-xs text-slate-400">
          Stream H.264 (1920×1080) &bull; 12 FPS &bull; Bitrate 896 kbps
        </span>
        <div className="flex items-center gap-2">
          <a href="http://localhost:8088/snapshot" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Camera className="w-3.5 h-3.5" /> Snapshot
            </Button>
          </a>
          <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="gap-1.5 text-xs">
            <Maximize className="w-3.5 h-3.5" /> Layar Penuh
          </Button>
        </div>
      </div>
    </div>
  );
}
