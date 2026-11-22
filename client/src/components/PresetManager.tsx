import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function PresetManager() {
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const presets = [1, 2, 3, 4, 5, 6];

  const handleCall = (idx: number) => {
    setActivePreset(idx);
    api.setPreset("call", idx).catch(console.error);
  };

  const handleSave = (idx: number) => {
    api.setPreset("add", idx)
      .then(() => alert(`Posisi berhasil disimpan ke Preset ${idx}`))
      .catch(console.error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preset Sudut Pandang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <div key={p} className="flex flex-col gap-1">
              <Button
                variant={activePreset === p ? "default" : "secondary"}
                size="sm"
                className="text-xs font-mono"
                onClick={() => handleCall(p)}
              >
                Posisi {p}
              </Button>
              <button
                type="button"
                className="text-[10px] text-slate-500 hover:text-blue-400 text-center"
                onClick={() => handleSave(p)}
              >
                + Simpan
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
