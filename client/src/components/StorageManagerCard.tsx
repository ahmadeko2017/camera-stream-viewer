/**
 * StorageManagerCard.tsx — Panel Manajemen Media Penyimpanan
 * Memantau status kartu MicroSD fisik kamera dan kapasitas hard disk lokal gateway (Mini-NVR).
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { HardDrive, AlertTriangle, RefreshCw, Film, Trash2 } from "lucide-react";

interface StorageManagerCardProps {
  onOpenGallery: () => void;
}

export function StorageManagerCard({ onOpenGallery }: StorageManagerCardProps) {
  const [loading, setLoading] = useState(false);
  const [confirmFormat, setConfirmFormat] = useState(false);
  const [msg, setMsg] = useState("");
  const [storageData, setStorageData] = useState({
    camera_sd: {
      sd_detected: false,
      total_capacity: "0MB",
      available_capacity: "0MB",
      status_label: "Memeriksa...",
    },
    local_disk: { total_gb: 0, used_gb: 0, free_gb: 0, free_percent: 0 },
  });

  const fetchStatus = () => {
    api.getStorageStatus()
      .then((data) => setStorageData(data))
      .catch((err) => console.error("Gagal memuat status storage:", err));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFormat = () => {
    setLoading(true);
    setMsg("Mengirim perintah format FAT32 ke kamera...");
    api.formatSdCard()
      .then(() => {
        setMsg("Proses format dimulai (5-10 detik)...");
        setTimeout(fetchStatus, 3000);
      })
      .catch(() => setMsg("Gagal memformat kartu"))
      .finally(() => {
        setLoading(false);
        setConfirmFormat(false);
        setTimeout(() => setMsg(""), 4000);
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Media Penyimpanan & NVR</span>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchStatus} title="Segarkan Status">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Status MicroSD Kamera Fisik */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">MicroSD Fisik Kamera:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              storageData.camera_sd.sd_detected
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/20 text-rose-400 border-rose-500/30"
            }`}>
              {storageData.camera_sd.status_label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
            <div>Kapasitas: <span className="text-white font-mono">{storageData.camera_sd.total_capacity}</span></div>
            <div>Tersedia: <span className="text-white font-mono">{storageData.camera_sd.available_capacity}</span></div>
          </div>

          {/* Dialog Konfirmasi Format */}
          {!confirmFormat ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-rose-400 border-rose-900/40 hover:bg-rose-950/30 gap-1.5"
              onClick={() => setConfirmFormat(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Format MicroSD Kamera (FAT32)
            </Button>
          ) : (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-300 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Format akan menghapus seluruh isi MicroSD! Lanjutkan?</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="flex-1 text-xs" disabled={loading} onClick={handleFormat}>
                  {loading ? "Memformat..." : "Ya, Format"}
                </Button>
                <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => setConfirmFormat(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Status Penyimpanan Hard Disk PC Lokal (Mini-NVR) */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Penyimpanan PC (Mini-NVR):</span>
            <span className="text-[11px] font-mono text-blue-400">{storageData.local_disk.free_gb} GB Bebas</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, 100 - storageData.local_disk.free_percent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Terpakai: {storageData.local_disk.used_gb} GB</span>
            <span>Total: {storageData.local_disk.total_gb} GB</span>
          </div>

          <Button variant="secondary" size="sm" className="w-full text-xs gap-1.5" onClick={onOpenGallery}>
            <Film className="w-3.5 h-3.5 text-blue-400" /> Buka Galeri Rekaman Video
          </Button>
        </div>

        {msg && <p className="text-[11px] text-center text-amber-400">{msg}</p>}
      </CardContent>
    </Card>
  );
}
