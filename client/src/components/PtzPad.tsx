/**
 * PtzPad.tsx — Panel Kontrol PTZ & Navigasi Motor Kamera
 * Mengendalikan arah 8-penjuru, zoom optik, fokus, iris, dan sapuan otomatis (Auto Scan).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ZoomIn, ZoomOut, Focus, Disc, ArrowDownUp, Eye, EyeOff } from "lucide-react";

export function PtzPad() {
  const [activeScan, setActiveScan] = useState<"hscan" | "vscan" | null>(null);

  /**
   * Mengirim instruksi PTZ ke backend gateway.
   */
  const handlePtz = (cmd: string) => {
    api.sendPtz(cmd).catch((err) => console.error("PTZ Error:", err));
  };

  /**
   * Mengikat event mouse & sentuhan dengan proteksi leave agar tidak gerak sendiri.
   */
  const bindDirection = (cmd: string) => ({
    onMouseDown: () => handlePtz(cmd),
    onMouseUp: () => handlePtz("stop"),
    onMouseLeave: () => handlePtz("stop"),
    onTouchStart: () => handlePtz(cmd),
    onTouchEnd: () => handlePtz("stop"),
    onTouchCancel: () => handlePtz("stop"),
  });

  /**
   * Menangani toggle sapuan otomatis (Auto Scan Horizontal & Vertikal).
   */
  const toggleScan = (scanType: "hscan" | "vscan") => {
    if (activeScan === scanType) {
      handlePtz("stop");
      setActiveScan(null);
    } else {
      handlePtz(scanType);
      setActiveScan(scanType);
    }
  };

  /**
   * Menghentikan seluruh gerakan motorik seketika.
   */
  const handleHardStop = () => {
    handlePtz("stop");
    setActiveScan(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Kontrol PTZ & Navigasi</span>
          {activeScan && (
            <span className="text-[10px] text-amber-400 font-mono animate-pulse">
              {activeScan === "hscan" ? "Auto Scan H Aktif" : "Auto Scan V Aktif"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* D-Pad Navigasi 8 Arah */}
        <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto select-none">
          <Button variant="secondary" size="icon" {...bindDirection("lefttop")}>↖</Button>
          <Button variant="secondary" size="icon" {...bindDirection("top")}>▲</Button>
          <Button variant="secondary" size="icon" {...bindDirection("righttop")}>↗</Button>
          <Button variant="secondary" size="icon" {...bindDirection("left")}>◀</Button>
          <Button variant="destructive" size="icon" onClick={handleHardStop} title="Stop Semua Gerakan">⏹</Button>
          <Button variant="secondary" size="icon" {...bindDirection("right")}>▶</Button>
          <Button variant="secondary" size="icon" {...bindDirection("leftdown")}>↙</Button>
          <Button variant="secondary" size="icon" {...bindDirection("down")}>▼</Button>
          <Button variant="secondary" size="icon" {...bindDirection("rightdown")}>↘</Button>
        </div>

        {/* Kontrol Zoom, Fokus, Iris & Auto Scan */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" className="gap-1.5" {...bindDirection("zoomin")}>
            <ZoomIn className="w-3.5 h-3.5" /> Zoom In
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" {...bindDirection("zoomout")}>
            <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" {...bindDirection("focusnear")}>
            <Focus className="w-3.5 h-3.5" /> Focus +
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" {...bindDirection("focusfar")}>
            <Focus className="w-3.5 h-3.5" /> Focus -
          </Button>
          <Button
            variant={activeScan === "hscan" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => toggleScan("hscan")}
          >
            <Disc className="w-3.5 h-3.5" /> Scan Horiz
          </Button>
          <Button
            variant={activeScan === "vscan" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => toggleScan("vscan")}
          >
            <ArrowDownUp className="w-3.5 h-3.5" /> Scan Vert
          </Button>
        </div>

        {/* Kontrol Bukaan Lensa (Iris Aperture) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="ghost" size="sm" className="text-xs text-slate-400 gap-1.5" {...bindDirection("irislarge")}>
            <Eye className="w-3.5 h-3.5" /> Iris Buka (+)
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-slate-400 gap-1.5" {...bindDirection("irissmall")}>
            <EyeOff className="w-3.5 h-3.5" /> Iris Tutup (-)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
