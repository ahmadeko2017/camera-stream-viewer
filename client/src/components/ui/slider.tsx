import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: number;
  suffix?: string;
}

export function Slider({ label, value, suffix = "", className, ...props }: SliderProps) {
  return (
    <div className="flex flex-col space-y-1.5 py-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-400 font-mono">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        value={value}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500 focus:outline-none",
          className
        )}
        {...props}
      />
    </div>
  );
}
