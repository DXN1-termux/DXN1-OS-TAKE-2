"use client";

import { Download, Cpu, HardDrive, Disc, ChevronDown } from "lucide-react";
import Image from "next/image";

type OsInfo = {
  name: string;
  version: string;
  codename: string;
  arch: string;
  kernel: string;
  iso: { size_human: string; sha256: string };
};

export default function Hero({
  os,
  onDownloadIso,
  onDownloadSource,
}: {
  os: OsInfo | null;
  onDownloadIso: () => void;
  onDownloadSource: () => void;
}) {
  const stats = [
    { icon: Cpu, label: "kernel", value: os?.kernel ?? "6.10.5" },
    { icon: Disc, label: "iso size", value: os?.iso.size_human ?? "688 MiB" },
    { icon: HardDrive, label: "min install", value: "5 GB" },
    { icon: Cpu, label: "arch", value: os?.arch ?? "x86_64" },
  ];

  return (
    <section id="top" className="relative min-h-screen flex items-center pt-16 overflow-hidden dxn1-surface">
      {/* wallpaper background */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/dxn1-assets/dxn1-wallpaper.png"
          alt=""
          fill
          priority
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 dxn1-grid-bg opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060a08]/40 via-[#060a08]/70 to-[#060a08]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 dxn1-mono text-[11px] text-emerald-300 border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dxn1-pulse" />
              build 2025.01 · {os?.codename ?? "oxide"} · {os?.arch ?? "x86_64"}
            </div>

            <h1 className="font-bold tracking-tight leading-[0.95] text-5xl sm:text-6xl lg:text-7xl">
              <span className="text-white">DXN1</span>
              <span className="dxn1-text-emerald dxn1-text-glow">-OS</span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl text-emerald-100/80 font-medium">
                a minimal Linux,
              </span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl text-amber-300/90 dxn1-amber-glow font-medium">
                built from scratch.
              </span>
            </h1>

            <p className="text-emerald-100/70 text-base sm:text-lg max-w-xl leading-relaxed">
              A lightweight Linux distribution bootstrapped the{" "}
              <span className="text-emerald-300 dxn1-mono">LFS</span> way — two-stage
              toolchain, kernel with full driver support, a TUI installer with a{" "}
              <span className="text-amber-300 dxn1-mono">5 GB</span> partition option, and a
              hybrid BIOS+UEFI ISO you can flash to USB or{" "}
              <span className="text-emerald-300 dxn1-mono">DriveDroid</span>.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onDownloadIso}
                className="flex items-center gap-2 dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-5 py-3 rounded-lg transition-colors dxn1-glow"
              >
                <Download className="w-4 h-4" />
                download dxn1-os-1.0.iso
              </button>
              <button
                onClick={onDownloadSource}
                className="flex items-center gap-2 dxn1-mono text-sm text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/10 px-5 py-3 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                source (.zip)
              </button>
              <a
                href="#install"
                className="flex items-center gap-2 dxn1-mono text-sm text-amber-200 border border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-500/10 px-5 py-3 rounded-lg transition-colors"
              >
                try the installer ▸
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="dxn1-panel rounded-lg p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5 text-emerald-400/70">
                    <s.icon className="w-3.5 h-3.5" />
                    <span className="dxn1-mono text-[10px] uppercase tracking-wide">
                      {s.label}
                    </span>
                  </div>
                  <div className="dxn1-mono text-sm text-emerald-200 font-semibold">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* logo panel */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-8 bg-emerald-500/10 blur-3xl rounded-full" />
              <div className="relative dxn1-panel dxn1-scanlines rounded-2xl p-6 sm:p-8 w-full max-w-sm">
                <div className="aspect-square relative flex items-center justify-center">
                  <Image
                    src="/dxn1-assets/dxn1-logo.png"
                    alt="DXN1-OS logo"
                    fill
                    className="object-contain drop-shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-500/15 space-y-1">
                  <div className="flex justify-between dxn1-mono text-[11px]">
                    <span className="text-emerald-500/50">codename</span>
                    <span className="text-emerald-300">{os?.codename ?? "oxide"}</span>
                  </div>
                  <div className="flex justify-between dxn1-mono text-[11px]">
                    <span className="text-emerald-500/50">base</span>
                    <span className="text-emerald-300">LFS 12.2 (OpenRC)</span>
                  </div>
                  <div className="flex justify-between dxn1-mono text-[11px]">
                    <span className="text-emerald-500/50">toolchain</span>
                    <span className="text-emerald-300">gcc 14.2 · glibc 2.40</span>
                  </div>
                  <div className="flex justify-between dxn1-mono text-[11px]">
                    <span className="text-emerald-500/50">sha256</span>
                    <span className="text-emerald-300 truncate max-w-[10rem]">
                      {(os?.iso.sha256 ?? "").slice(0, 12)}…
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-emerald-500/50">
          <span className="dxn1-mono text-[10px] uppercase">scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
