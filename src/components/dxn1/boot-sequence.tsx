"use client";

import { useEffect, useState } from "react";
import { BOOT_LINES } from "@/lib/dxn1-data";

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState<number>(0);
  const [fading, setFading] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (skipped) return;
    if (visible >= BOOT_LINES.length) {
      const t = setTimeout(() => setFading(true), 350);
      const t2 = setTimeout(onDone, 950);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
    const delay = visible < 6 ? 140 : 95;
    const t = setTimeout(() => setVisible((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [visible, onDone, skipped]);

  const skip = () => {
    setSkipped(true);
    setFading(true);
    setTimeout(onDone, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] dxn1-surface dxn1-scanlines flex flex-col transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex-1 overflow-y-auto dxn1-scroll px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        <pre className="dxn1-mono text-[10px] sm:text-xs leading-relaxed text-emerald-400/90 select-none">
{`
  ____  _  _   _   _  ___  _   _  ___
 |  _ \\| || | /_\\ | \\| |/ __|| | | |/ __|
 | | | | __ |/ _ \\| .\` |\\__ \\| |_| | (_ |
 |_| |_|_||_/_/ \\_\\_|\\_|___(_)___/ \\___|
`}
        </pre>
        <p className="dxn1-mono text-emerald-300/80 text-xs sm:text-sm mt-2 mb-4">
          DXN1-OS 1.0 &quot;oxide&quot; — live boot
        </p>
        <div className="space-y-0.5">
          {BOOT_LINES.slice(0, visible).map((l, i) => (
            <div
              key={i}
              className={`dxn1-mono text-[10px] sm:text-xs dxn1-fade-up ${
                l.status === "ok"
                  ? "text-emerald-400"
                  : l.status === "info"
                  ? "text-teal-300"
                  : l.status === "warn"
                  ? "text-amber-400"
                  : "text-emerald-500/60"
              }`}
            >
              {l.text}
              {l.status === "ok" && <span className="text-emerald-400">  OK</span>}
            </div>
          ))}
          {visible < BOOT_LINES.length && (
            <div className="dxn1-mono text-[10px] sm:text-xs text-emerald-400 dxn1-cursor" />
          )}
        </div>
      </div>
      <div className="px-4 py-3 text-center">
        <button
          onClick={skip}
          className="dxn1-mono text-xs text-emerald-400/70 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 rounded px-4 py-1.5 transition-colors"
        >
          skip boot ▸
        </button>
      </div>
    </div>
  );
}
