import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Moon, Sun, Sparkles } from "lucide-react";

export function ImageTuner() {
  const [bright, setBright] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [sat, setSat] = useState(50);
  const [irMode, setIrMode] = useState(0);

  const handleSliderChange = (b: number, c: number, s: number) => {
    setBright(b);
    setContrast(c);
    setSat(s);
    api.setImage(b, c, s).catch(console.error);
  };

  const handleNightVision = (mode: number) => {
    setIrMode(mode);
    api.setNightVision(mode).catch(console.error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citra Sensor & Night Vision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Slider
            label="Brightness"
            value={bright}
            min={0}
            max={100}
            onChange={(e) => handleSliderChange(Number(e.target.value), contrast, sat)}
          />
          <Slider
            label="Contrast"
            value={contrast}
            min={0}
            max={100}
            onChange={(e) => handleSliderChange(bright, Number(e.target.value), sat)}
          />
          <Slider
            label="Saturation"
            value={sat}
            min={0}
            max={100}
            onChange={(e) => handleSliderChange(bright, contrast, Number(e.target.value))}
          />
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium block">Mode Inframerah (IR LED)</span>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant={irMode === 0 ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => handleNightVision(0)}
            >
              <Sparkles className="w-3 h-3 mr-1" /> Auto
            </Button>
            <Button
              variant={irMode === 1 ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => handleNightVision(1)}
            >
              <Moon className="w-3 h-3 mr-1" /> Night On
            </Button>
            <Button
              variant={irMode === 2 ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => handleNightVision(2)}
            >
              <Sun className="w-3 h-3 mr-1" /> Day Off
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
