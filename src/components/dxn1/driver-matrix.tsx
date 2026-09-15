"use client";

import * as Icons from "lucide-react";
import { DRIVER_MATRIX, STATUS_BADGE } from "@/lib/dxn1-data";

export default function DriverMatrix() {
  return (
    <section id="drivers" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ lspci -nnk · lsmod | grep -E &apos;(amdgpu|iwlwifi|snd)&apos;
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            hardware
            <span className="dxn1-text-emerald dxn1-text-glow"> just works.</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            The kernel ships with every common driver built-in or as a module,
            plus pre-installed firmware blobs. Boot and your GPU, NIC, Wi-Fi,
            audio and input are all detected by udev.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {DRIVER_MATRIX.map((cls) => {
            const Icon = (Icons as any)[cls.icon] ?? Icons.Cpu;
            return (
              <div key={cls.class} className="dxn1-panel rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-emerald-500/15 bg-emerald-500/[0.03]">
                  <div className="w-8 h-8 rounded-md border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="dxn1-mono text-sm text-emerald-200 font-semibold uppercase tracking-wide">
                    {cls.class}
                  </h3>
                </div>
                <div className="divide-y divide-emerald-500/10">
                  {cls.rows.map((r) => {
                    const badge = STATUS_BADGE[r.status];
                    return (
                      <div
                        key={r.vendor + r.module}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-emerald-500/[0.03] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium">{r.vendor}</span>
                            <span className="dxn1-mono text-[10px] text-emerald-500/40">
                              {r.chips}
                            </span>
                          </div>
                          <div className="dxn1-mono text-[10px] text-amber-300/60 truncate">
                            {r.module}
                          </div>
                        </div>
                        <span
                          className={`dxn1-mono text-[9px] border px-2 py-0.5 rounded ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 dxn1-mono text-[11px] text-emerald-200/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> supported
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> partial (firmware/quirk)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" /> unsupported
          </span>
          <span className="ml-auto text-emerald-500/40">
            full matrix: docs/DRIVERS.md
          </span>
        </div>
      </div>
    </section>
  );
}
