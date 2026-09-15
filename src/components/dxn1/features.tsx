"use client";

import * as Icons from "lucide-react";
import { FEATURES } from "@/lib/dxn1-data";

export default function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ ls -la /features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            everything you need,
            <br />
            <span className="dxn1-text-emerald dxn1-text-glow">nothing you don&apos;t.</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            DXN1-OS ships a complete, bootable Linux in under 700 MiB — a real
            kernel with hardware drivers, an installer, a package manager and a
            tiling desktop, all built from pinned source.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = (Icons as any)[f.icon] ?? Icons.Box;
            return (
              <div
                key={f.title}
                className="group dxn1-panel rounded-xl p-5 hover:border-emerald-500/40 transition-colors relative overflow-hidden"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-colors" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center mb-4 group-hover:border-emerald-500/60 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-semibold text-base mb-2 leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-emerald-100/55 text-sm leading-relaxed mb-3">
                    {f.desc}
                  </p>
                  <div className="dxn1-mono text-[10px] text-amber-300/70 border-t border-emerald-500/10 pt-2">
                    {f.tag}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
