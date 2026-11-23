/**
 * PtzPad.tsx — Panel Kontrol PTZ & Navigasi Arah Mata Angin
 * Mengendalikan arah 8-penjuru (Utara, Selatan, Barat, Timur, dan 4 Diagonal)
 * dengan pilihan Mode Langkah Presisi (Step Move) dan Mode Tekan-Tahan (Hold).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ZoomIn, ZoomOut, Focus, Disc, ArrowDownUp, Compass } from "lucide-react";

export function PtzPad() {
  const [activeScan, setActiveScan] = useState<"hscan" | "vscan" | null>(null);
  const [mode, setMode] = useState<"step" | "hold">("step");
  const [stepDuration, setStepDuration] = useState<number>(650);
  const [movingDirection, setMovingDirection] = useState<string | null>(null);

  /**
   * Menjalankan instruksi pergerakan motor berdasarkan mode yang dipilih.
   */
  const handleDirectionClick = (cmd: string) => {
    if (mode === "step") {
      setMovingDirection(cmd);
      api.sendPtzStep(cmd, stepDuration)
        .catch(console.error)
        .finally(() => setTimeout(() => setMovingDirection(null), stepDuration));
    }
  };

  /**
   * Binding event untuk mode Tekan-Tahan (Hold).
   */
  const bindHoldEvents = (cmd: string) => {
    if (mode !== "hold") return {};
    return {
      onMouseDown: () => api.sendPtz(cmd).catch(console.error),
      onMouseUp: () => api.sendPtz("stop").catch(console.error),
      onMouseLeave: () => api.sendPtz("stop").catch(console.error),
      onTouchStart: () => api.sendPtz(cmd).catch(console.error),
      onTouchEnd: () => api.sendPtz("stop").catch(console.error),
      onTouchCancel: () => api.sendPtz("stop").catch(console.error),
    };
  };

  /**
   * Menangani toggle sapuan otomatis (Auto Scan).
   */
  const toggleScan = (scanType: "hscan" | "vscan") => {
    if (activeScan === scanType) {
      api.sendPtz("stop").catch(console.error);
      setActiveScan(null);
    } else {
      api.sendPtz(scanType).catch(console.error);
      setActiveScan(scanType);
    }
  };

  /**
   * Menghentikan paksa seluruh gerakan motorik seketika.
   */
  const handleHardStop = () => {
    api.sendPtz("stop").catch(console.error);
    setActiveScan(null);
    setMovingDirection(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Navigasi PTZ & Mata Angin</span>
          </div>
          {movingDirection && (
            <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
              Gerak: {movingDirection}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pilihan Mode Gerak & Durasi Langkah */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("step")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                mode === "step" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Mode Langkah
            </button>
            <button
              type="button"
              onClick={() => setMode("hold")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                mode === "hold" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Mode Tahan
            </button>
          </div>

          {mode === "step" && (
            <select
              value={stepDuration}
              onChange={(e) => setStepDuration(Number(e.target.value))}
              aria-label="Jarak Langkah Pergerakan"
              className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-0.5"
            >
              <option value={350}>Halus (350ms)</option>
              <option value={650}>Normal (650ms)</option>
              <option value={1200}>Jauh (1.2s)</option>
            </select>
          )}
        </div>

        {/* D-Pad Navigasi 8-Arah Mata Angin */}
        <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto select-none pt-1">
          <Button
            variant="secondary"
            size="sm"
            title="Barat Laut (Left-Top)"
            onClick={() => handleDirectionClick("lefttop")}
            {...bindHoldEvents("lefttop")}
          >
            ↖ <span className="text-[9px] text-slate-500 ml-0.5">NW</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Utara (Atas / Top)"
            onClick={() => handleDirectionClick("top")}
            {...bindHoldEvents("top")}
          >
            ▲ <span className="text-[9px] text-slate-500 ml-0.5">U</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Timur Laut (Right-Top)"
            onClick={() => handleDirectionClick("righttop")}
            {...bindHoldEvents("righttop")}
          >
            ↗ <span className="text-[9px] text-slate-500 ml-0.5">NE</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Barat (Kiri / Left)"
            onClick={() => handleDirectionClick("left")}
            {...bindHoldEvents("left")}
          >
            ◀ <span className="text-[9px] text-slate-500 ml-0.5">B</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleHardStop}
            title="Stop Gerakan Seketika"
            className="font-bold shadow-md"
          >
            ⏹ STOP
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Timur (Kanan / Right)"
            onClick={() => handleDirectionClick("right")}
            {...bindHoldEvents("right")}
          >
            ▶ <span className="text-[9px] text-slate-500 ml-0.5">T</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Barat Daya (Left-Down)"
            onClick={() => handleDirectionClick("leftdown")}
            {...bindHoldEvents("leftdown")}
          >
            ↙ <span className="text-[9px] text-slate-500 ml-0.5">SW</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Selatan (Bawah / Down)"
            onClick={() => handleDirectionClick("down")}
            {...bindHoldEvents("down")}
          >
            ▼ <span className="text-[9px] text-slate-500 ml-0.5">S</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Tenggara (Right-Down)"
            onClick={() => handleDirectionClick("rightdown")}
            {...bindHoldEvents("rightdown")}
          >
            ↘ <span className="text-[9px] text-slate-500 ml-0.5">SE</span>
          </Button>
        </div>

        {/* Kontrol Optik & Auto Scan */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDirectionClick("zoomin")}>
            <ZoomIn className="w-3.5 h-3.5" /> Zoom In
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDirectionClick("zoomout")}>
            <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDirectionClick("focusnear")}>
            <Focus className="w-3.5 h-3.5" /> Focus +
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDirectionClick("focusfar")}>
            <Focus className="w-3.5 h-3.5" /> Focus -
          </Button>
          <Button
            variant={activeScan === "hscan" ? "default" : "outline"}
            size="sm"
            className="gap-1 text-xs"
            onClick={() => toggleScan("hscan")}
          >
            <Disc className="w-3.5 h-3.5" /> Scan Horiz
          </Button>
          <Button
            variant={activeScan === "vscan" ? "default" : "outline"}
            size="sm"
            className="gap-1 text-xs"
            onClick={() => toggleScan("vscan")}
          >
            <ArrowDownUp className="w-3.5 h-3.5" /> Scan Vert
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
