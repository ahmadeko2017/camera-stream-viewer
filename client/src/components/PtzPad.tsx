import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ZoomIn, ZoomOut, Focus, Disc } from "lucide-react";

export function PtzPad() {
  const handlePtz = (cmd: string) => {
    api.sendPtz(cmd).catch((err) => console.error("PTZ Error:", err));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontrol PTZ & Navigasi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto">
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("lefttop")} onMouseUp={() => handlePtz("stop")}>↖</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("top")} onMouseUp={() => handlePtz("stop")}>▲</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("righttop")} onMouseUp={() => handlePtz("stop")}>↗</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("left")} onMouseUp={() => handlePtz("stop")}>◀</Button>
          <Button variant="destructive" size="icon" onClick={() => handlePtz("stop")}>⏹</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("right")} onMouseUp={() => handlePtz("stop")}>▶</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("leftdown")} onMouseUp={() => handlePtz("stop")}>↙</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("down")} onMouseUp={() => handlePtz("stop")}>▼</Button>
          <Button variant="secondary" size="icon" onMouseDown={() => handlePtz("rightdown")} onMouseUp={() => handlePtz("stop")}>↘</Button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" className="gap-1.5" onMouseDown={() => handlePtz("zoomin")} onMouseUp={() => handlePtz("stop")}>
            <ZoomIn className="w-3.5 h-3.5" /> Zoom In
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onMouseDown={() => handlePtz("zoomout")} onMouseUp={() => handlePtz("stop")}>
            <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onMouseDown={() => handlePtz("focusnear")} onMouseUp={() => handlePtz("stop")}>
            <Focus className="w-3.5 h-3.5" /> Focus +
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onMouseDown={() => handlePtz("hscan")} onMouseUp={() => handlePtz("stop")}>
            <Disc className="w-3.5 h-3.5" /> Auto Scan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
