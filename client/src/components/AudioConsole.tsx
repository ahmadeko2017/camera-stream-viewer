/**
 * AudioConsole.tsx — Konsol Audio Mikrofon, Monitor Suara Live & Interkom Dua Arah
 * Mengatur sensitivitas mic, volume speaker, pemutaran suara mic kamera ke browser, dan push-to-talk.
 */

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { IntercomTalk } from "@/components/IntercomTalk";
import { api } from "@/lib/api";
import { Mic, Volume2, VolumeX, Headphones } from "lucide-react";

export function AudioConsole() {
  const [mic, setMic] = useState(240);
  const [speaker, setSpeaker] = useState(230);
  const [statusMsg, setStatusMsg] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [listenVolume, setListenVolume] = useState(80);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleUpdate = (newMic: number, newSpk: number) => {
    setMic(newMic);
    setSpeaker(newSpk);
    api.setAudio(newMic, newSpk)
      .then(() => setStatusMsg("Volume tersimpan"))
      .catch(() => setStatusMsg("Gagal menyimpan"));
    setTimeout(() => setStatusMsg(""), 2000);
  };

  const toggleListen = () => {
    if (!audioRef.current) return;
    if (isListening) {
      audioRef.current.pause();
      audioRef.current.src = "";
      setIsListening(false);
    } else {
      audioRef.current.src = api.getAudioFeedUrl();
      audioRef.current.volume = listenVolume / 100;
      audioRef.current.play().then(() => setIsListening(true)).catch(console.error);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setListenVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol / 100;
    }
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
        {/* Elemen Audio Tersembunyi untuk Live Stream Mic Kamera */}
        <audio ref={audioRef} preload="none" />

        {/* Fitur Monitor Suara Mic Kamera ke Speaker Laptop */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-blue-400" />
              <span>Dengar Suara Mic Kamera</span>
            </span>
            {isListening && (
              <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                LIVE AUDIO AKTIF
              </span>
            )}
          </div>

          <Button
            variant={isListening ? "default" : "secondary"}
            size="sm"
            onClick={toggleListen}
            className={`w-full text-xs gap-2 font-medium ${
              isListening ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
            }`}
          >
            {isListening ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
            <span>{isListening ? "Mute / Matikan Audio Mic" : "🔊 Dengarkan Mic Kamera (Live)"}</span>
          </Button>

          {isListening && (
            <div className="pt-1">
              <Slider
                label="Volume Speaker Laptop"
                value={listenVolume}
                min={0}
                max={100}
                suffix="%"
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Pengaturan Sensitivitas Hardware Kamera */}
        <div className="space-y-2 pt-1">
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
            <span>Mic Hardware Kamera: {mic}/255</span>
          </div>
          {statusMsg && <span className="text-emerald-400">{statusMsg}</span>}
        </div>

        {/* Fitur Push-to-Talk Interkom (Bicara ke Speaker Kamera) */}
        <IntercomTalk />
      </CardContent>
    </Card>
  );
}
