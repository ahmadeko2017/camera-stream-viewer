import { useEffect, useState } from "react";
import { LiveView } from "@/components/LiveView";
import { PtzPad } from "@/components/PtzPad";
import { PresetManager } from "@/components/PresetManager";
import { ImageTuner } from "@/components/ImageTuner";
import { AudioConsole } from "@/components/AudioConsole";
import { StorageManagerCard } from "@/components/StorageManagerCard";
import { PlaybackGalleryModal } from "@/components/PlaybackGalleryModal";
import { SystemCard } from "@/components/SystemCard";
import { api } from "@/lib/api";
import { ShieldCheck, Video } from "lucide-react";

export function App() {
  const [cameraIp, setCameraIp] = useState("192.168.18.122");
  const [connected, setConnected] = useState(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      api.getStatus()
        .then((status) => {
          setCameraIp(status.camera_ip);
          setConnected(status.rtsp_connected);
        })
        .catch(() => setConnected(false));
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-[#0e111a]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              IP CAMERA STUDIO PRO
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                1080p FHD
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Model: IPC06835014F401 &bull; SoC: Goke GK7101
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gateway Terhubung</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <LiveView cameraIp={cameraIp} connected={connected} />
          <StorageManagerCard onOpenGallery={() => setIsGalleryOpen(true)} />
          <SystemCard />
        </div>

        <div className="lg:col-span-4 space-y-5">
          <PtzPad />
          <PresetManager />
          <AudioConsole />
          <ImageTuner />
        </div>
      </main>

      <PlaybackGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      <footer className="border-t border-slate-800/80 py-3 px-6 text-center text-xs text-slate-500">
        IP Camera Studio Portal &bull; Dikembangkan dengan Vite, React & shadcn/ui &bull; Bebas Plugin Flash
      </footer>
    </div>
  );
}

export default App;
