/**
 * PlaybackGalleryModal.tsx — Galeri Pemutar Video Rekaman Lokal
 * Memutar, mengunduh, dan mengelola berkas rekaman MP4 yang tersimpan di server gateway.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { X, Play, Download, Trash2, Video, HardDrive } from "lucide-react";

interface PlaybackGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaybackGalleryModal({ isOpen, onClose }: PlaybackGalleryModalProps) {
  const [recordings, setRecordings] = useState<Array<{ filename: string; size_mb: number; created_at: string }>>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const loadRecordings = () => {
    api.getRecordings()
      .then((data) => {
        setRecordings(data);
        if (data.length > 0 && !selectedVideo) {
          setSelectedVideo(data[0].filename);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      loadRecordings();
    }
  }, [isOpen]);

  const handleDelete = (filename: string) => {
    if (!confirm(`Hapus berkas rekaman ${filename}?`)) return;
    api.deleteRecording(filename)
      .then(() => {
        if (selectedVideo === filename) setSelectedVideo(null);
        loadRecordings();
      })
      .catch(console.error);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e121d] border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">Galeri Rekaman Video Lokal (Mini-NVR)</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Konten Modal */}
        <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto">
          {/* Pemutar Video */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
              {selectedVideo ? (
                <video
                  key={selectedVideo}
                  src={api.getRecordingUrl(selectedVideo)}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <HardDrive className="w-8 h-8 opacity-40" />
                  <span>Pilih video dari daftar untuk memutar</span>
                </div>
              )}
            </div>
            {selectedVideo && (
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-mono truncate">{selectedVideo}</span>
                <a
                  href={api.getRecordingUrl(selectedVideo)}
                  download={selectedVideo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh MP4
                </a>
              </div>
            )}
          </div>

          {/* Daftar Berkas Rekaman */}
          <div className="md:col-span-5 flex flex-col space-y-2 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs font-semibold text-slate-400">Berkas Tersimpan ({recordings.length})</span>
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px] pr-1">
              {recordings.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Belum ada rekaman video tersimpan.</p>
              ) : (
                recordings.map((rec) => (
                  <div
                    key={rec.filename}
                    onClick={() => setSelectedVideo(rec.filename)}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      selectedVideo === rec.filename
                        ? "bg-blue-600/20 border-blue-500 text-white"
                        : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Play className="w-3 h-3 text-blue-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-mono text-[11px] truncate">{rec.filename}</div>
                        <div className="text-[10px] text-slate-500">{rec.created_at} &bull; {rec.size_mb} MB</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-500 hover:text-rose-400 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rec.filename);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
