"use client";

import { Terminal, Heart, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-emerald-500/15 bg-[#04070a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-center dxn1-glow">
                <span className="dxn1-mono font-bold text-emerald-400 text-sm">D1</span>
              </div>
              <div className="leading-none">
                <div className="dxn1-mono font-bold text-sm text-emerald-300">
                  DXN1<span className="text-emerald-500/60">-OS</span>
                </div>
                <div className="dxn1-mono text-[10px] text-emerald-500/50">v1.0 oxide</div>
              </div>
            </div>
            <p className="text-emerald-100/50 text-sm max-w-md leading-relaxed">
              A minimal Linux distribution built from source on top of LFS.
              Open, auditable and installable everywhere — USB, DriveDroid or a
              5 GB partition on your existing disk.
            </p>
          </div>

          <div>
            <h4 className="dxn1-mono text-xs text-amber-300/80 uppercase tracking-wide mb-3">
              project
            </h4>
            <ul className="space-y-2 dxn1-mono text-xs text-emerald-200/70">
              <li><a href="#features" className="hover:text-emerald-300 transition-colors">features</a></li>
              <li><a href="#downloads" className="hover:text-emerald-300 transition-colors">downloads</a></li>
              <li><a href="#install" className="hover:text-emerald-300 transition-colors">installer</a></li>
              <li><a href="#drivers" className="hover:text-emerald-300 transition-colors">drivers</a></li>
              <li><a href="#source" className="hover:text-emerald-300 transition-colors">source tree</a></li>
            </ul>
          </div>

          <div>
            <h4 className="dxn1-mono text-xs text-amber-300/80 uppercase tracking-wide mb-3">
              stack
            </h4>
            <ul className="space-y-2 dxn1-mono text-xs text-emerald-200/70">
              <li>Linux 6.10.5</li>
              <li>glibc 2.40 · gcc 14.2</li>
              <li>OpenRC + eudev</li>
              <li>isolinux + GRUB</li>
              <li>squashfs (zstd -19)</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="dxn1-mono text-[11px] text-emerald-500/40 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>© 2025 DXN1 Project — licensed GPLv2+</span>
          </div>
          <div className="flex items-center gap-4 dxn1-mono text-[11px] text-emerald-500/40">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              reproducible builds
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400/60" />
              built with LFS
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
