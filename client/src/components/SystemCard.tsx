import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Clock, RotateCcw, Copy, Check } from "lucide-react";

export function SystemCard() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const rtspUrl = "rtsp://admin:admin@192.168.18.122:554/ch0_0.h264";

  const handleSyncTime = () => {
    api.syncTime()
      .then(() => setStatus("Waktu berhasil disinkronkan"))
      .catch(() => setStatus("Gagal sinkron"));
    setTimeout(() => setStatus(""), 3000);
  };

  const handleReboot = () => {
    if (confirm("Apakah Anda yakin ingin me-reboot kamera IP?")) {
      api.reboot()
        .then(() => alert("Perintah reboot telah dikirim ke kamera."))
        .catch(console.error);
    }
  };

  const handleCopyRtsp = () => {
    navigator.clipboard.writeText(rtspUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sistem & Akses RTSP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={handleSyncTime}>
            <Clock className="w-3.5 h-3.5" /> Sinkron Jam PC
          </Button>
          <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleReboot}>
            <RotateCcw className="w-3.5 h-3.5" /> Reboot
          </Button>
        </div>
        {status && <p className="text-xs text-emerald-400 text-center">{status}</p>}

        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400 block">RTSP Stream (VLC / NVR Player):</span>
          <div className="flex items-center gap-1.5 bg-[#090b10] border border-slate-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-300">
            <span className="truncate flex-1">{rtspUrl}</span>
            <button type="button" onClick={handleCopyRtsp} className="hover:text-blue-400">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
