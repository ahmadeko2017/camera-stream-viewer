import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { Mic } from "lucide-react";

export function AudioConsole() {
  const [mic, setMic] = useState(238);
  const [speaker, setSpeaker] = useState(230);
  const [statusMsg, setStatusMsg] = useState("");

  const handleUpdate = (newMic: number, newSpk: number) => {
    setMic(newMic);
    setSpeaker(newSpk);
    api.setAudio(newMic, newSpk)
      .then(() => setStatusMsg("Volume tersimpan"))
      .catch(() => setStatusMsg("Gagal menyimpan"));
    setTimeout(() => setStatusMsg(""), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Mikrofon & Audio Intercom</span>
          <span className="text-[10px] text-blue-400 font-normal">G.711 PCMA 8kHz</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Slider
            label="Sensitivitas Mic Kamera"
            value={mic}
            min={0}
            max={255}
            suffix=" / 255"
            onChange={(e) => handleUpdate(Number(e.target.value), speaker)}
          />
          <Slider
            label="Volume Speaker Kamera"
            value={speaker}
            min={0}
            max={255}
            suffix=" / 255"
            onChange={(e) => handleUpdate(mic, Number(e.target.value))}
          />
        </div>

        <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mic Aktif</span>
          </div>
          {statusMsg && <span className="text-emerald-400">{statusMsg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
