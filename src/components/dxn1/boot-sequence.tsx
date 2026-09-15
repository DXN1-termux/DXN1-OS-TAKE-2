"use client";

import { useEffect, useRef, useState } from "react";
import { BIOS_POST_LINES, KERNEL_BOOT_LINES } from "@/lib/dxn1-data";

type Phase = "bios" | "grub" | "kernel" | "login" | "done";

const GRUB_ENTRIES = [
  { label: "DXN1-OS 1.0 (oxide) — live, real kernel + busybox", default: true },
  { label: "DXN1-OS 1.0 — verbose boot (loglevel=7)", default: false },
  { label: "DXN1-OS 1.0 — rescue shell", default: false },
  { label: "Memtest86+", default: false },
  { label: "Reboot", default: false },
];

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("bios");
  const [biosLines, setBiosLines] = useState(0);
  const [selected, setSelected] = useState(0);
  const [grubCount, setGrubCount] = useState(5);
  const [kernelLines, setKernelLines] = useState(0);
  const [loginInput, setLoginInput] = useState("");
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [fading, setFading] = useState(false);
  const skipRef = useRef(false);

  // BIOS POST typing
  useEffect(() => {
    if (phase !== "bios") return;
    if (biosLines >= BIOS_POST_LINES.length) {
      const t = setTimeout(() => setPhase("grub"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBiosLines((n) => n + 1), 90);
    return () => clearTimeout(t);
  }, [phase, biosLines]);

  // GRUB countdown
  useEffect(() => {
    if (phase !== "grub") return;
    if (grubCount <= 0) {
      const t = setTimeout(() => setPhase("kernel"), 50);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setGrubCount((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, grubCount]);

  // kernel boot typing
  useEffect(() => {
    if (phase !== "kernel") return;
    if (kernelLines >= KERNEL_BOOT_LINES.length) {
      const t = setTimeout(() => setPhase("login"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setKernelLines((n) => n + 1), 120);
    return () => clearTimeout(t);
  }, [phase, kernelLines]);

  const skipAll = () => {
    if (skipRef.current) return;
    skipRef.current = true;
    setFading(true);
    setTimeout(onDone, 500);
  };

  const bootSelected = () => {
    if (phase !== "grub") return;
    if (selected === 4) {
      // reboot — restart boot
      setPhase("bios");
      setBiosLines(0);
      setKernelLines(0);
      setGrubCount(5);
      return;
    }
    if (selected === 3) {
      // memtest — pretend to run then return
      return;
    }
    setPhase("kernel");
  };

  const onLoginKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setLoginSubmitted(true);
      setTimeout(() => {
        setFading(true);
        setTimeout(onDone, 500);
      }, 700);
    }
  };

  const colorFor = (status?: string) =>
    status === "ok"
      ? "text-emerald-400"
      : status === "info"
      ? "text-teal-300"
      : status === "warn"
      ? "text-amber-400"
      : "text-emerald-500/70";

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black dxn1-scanlines flex flex-col transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* BIOS POST phase */}
      {phase === "bios" && (
        <div className="flex-1 overflow-y-auto dxn1-scroll px-4 sm:px-8 py-4 max-w-5xl mx-auto w-full font-mono text-[10px] sm:text-xs">
          <div className="border border-zinc-700 bg-black/60 p-3 rounded-sm">
            <div className="text-zinc-300 mb-2 flex justify-between text-[10px]">
              <span>DXN1 BIOS 1.0  American Megatrends Inc.</span>
              <span className="text-zinc-500">P4.0  01/15/2025</span>
            </div>
            {BIOS_POST_LINES.slice(0, biosLines).map((l, i) => (
              <div key={i} className="text-zinc-200 leading-relaxed dxn1-fade-up">
                {l}
                {i === BIOS_POST_LINES.length - 1 && <span className="dxn1-cursor" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRUB menu phase */}
      {phase === "grub" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl mx-auto px-4 font-mono">
            <div className="border border-emerald-500/30 bg-black/80 rounded p-4">
              <div className="text-center mb-3">
                <div className="text-emerald-400 text-sm font-bold">
                  GNU GRUB  version 2.12  —  DXN1-OS 1.0 &apos;oxide&apos;
                </div>
                <div className="text-emerald-500/50 text-[10px] mt-1">
                  ─────────────────────────────────────────
                </div>
              </div>
              <div className="space-y-0.5">
                {GRUB_ENTRIES.map((e, i) => (
                  <button
                    key={i}
                    onMouseEnter={() => setSelected(i)}
                    onClick={bootSelected}
                    className={`block w-full text-left px-3 py-1.5 text-xs ${
                      selected === i
                        ? "bg-emerald-500 text-black"
                        : "text-emerald-200/80 hover:bg-emerald-500/10"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-emerald-500/60 flex justify-between">
                <span>
                  Use ↑ and ↓ to move the highlight, ENTER to boot, &apos;e&apos; to edit.
                </span>
                <span>
                  The highlighted entry will boot automatically in{" "}
                  <span className="text-amber-300">{grubCount}s</span>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kernel boot phase */}
      {phase === "kernel" && (
        <div className="flex-1 overflow-y-auto dxn1-scroll px-4 sm:px-8 py-4 max-w-5xl mx-auto w-full font-mono text-[10px] sm:text-xs">
          {KERNEL_BOOT_LINES.slice(0, kernelLines).map((l, i) => (
            <div
              key={i}
              className={`leading-relaxed dxn1-fade-up ${colorFor(l.status)}`}
            >
              {l.text}
              {l.status === "ok" && <span className="text-emerald-400">  [  OK  ]</span>}
            </div>
          ))}
          {kernelLines < KERNEL_BOOT_LINES.length && (
            <div className="text-emerald-400 dxn1-cursor" />
          )}
        </div>
      )}

      {/* Login prompt phase */}
      {phase === "login" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full mx-auto px-4 font-mono">
            {!loginSubmitted ? (
              <div className="space-y-2">
                <pre className="text-emerald-400 text-[10px] sm:text-xs leading-tight">{`
  ____  _  _   _   _  ___  _   _  ___
 |  _ \\| || | /_\\ | \\| |/ __|| | | |/ __|
 | | | | __ |/ _ \\| .\` |\\__ \\| |_| | (_ |
 |_| |_|_||_/_/ \\_\\_|\\_|___(_)___/ \\___|
`}</pre>
                <div className="text-emerald-300 text-xs">
                  DXN1-OS 1.0 &apos;oxide&apos; — kernel 5.10.0-32-amd64
                </div>
                <div className="text-emerald-500/50 text-[10px] mt-2">
                  (real Linux kernel + real busybox userspace)
                </div>
                <div className="pt-4 text-emerald-200 text-xs">
                  dxn1-oxide login:{" "}
                  <input
                    autoFocus
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    onKeyDown={onLoginKey}
                    className="bg-transparent border-none outline-none text-emerald-300 caret-emerald-400"
                    placeholder="root"
                  />
                </div>
                <div className="text-emerald-500/40 text-[10px]">
                  ↵ press Enter to enter the desktop (any username works)
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="text-emerald-300">
                  Welcome to DXN1-OS — starting desktop environment...
                </div>
                <div className="text-emerald-500/60 text-[10px]">
                  loading /usr/bin/dxn1-wm... mounting /home... ready.
                </div>
                <div className="text-emerald-400 text-[10px] mt-2 dxn1-cursor" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skip button */}
      <div className="px-4 py-3 text-center">
        <button
          onClick={skipAll}
          className="font-mono text-xs text-emerald-400/70 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 rounded px-4 py-1.5 transition-colors"
        >
          skip boot ▸
        </button>
      </div>
    </div>
  );
}
