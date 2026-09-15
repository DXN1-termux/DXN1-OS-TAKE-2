"use client";

import Image from "next/image";
import { APP_CATALOG, VERSION_ROADMAP } from "@/lib/dxn1-data";
import { Check, Circle, Download, Sparkles } from "lucide-react";

export default function AppShowcase() {
  const featured = APP_CATALOG.filter((a) => a.featured);
  const rest = APP_CATALOG.filter((a) => !a.featured);

  return (
    <section id="apps" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ dxn1-pkg list --featured
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            ships with the
            <span className="dxn1-text-emerald dxn1-text-glow"> good stuff.</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            DXN1-OS is built for developers and AI-native workflows. Kitty for the
            terminal, Firefox for the web, an app store, a settings app, and Ollama
            for local LLMs — all one click away.
          </p>
        </div>

        {/* featured apps grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {featured.map((app) => (
            <div
              key={app.name}
              className="group dxn1-panel rounded-xl p-4 text-center hover:border-emerald-500/40 transition-colors"
            >
              <div className="relative w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-500/5">
                <Image src={app.icon} alt={app.name} fill className="object-contain p-2" />
              </div>
              <div className="text-sm text-white font-medium mb-1">{app.name}</div>
              <div className="dxn1-mono text-[10px] text-emerald-500/50 mb-1.5">{app.version}</div>
              <div className="dxn1-mono text-[9px] text-amber-300/60 border border-amber-500/20 bg-amber-500/5 rounded px-1.5 py-0.5 inline-block">
                {app.category}
              </div>
            </div>
          ))}
        </div>

        {/* desktop preview */}
        <div className="grid lg:grid-cols-12 gap-5 mb-12">
          <div className="lg:col-span-8 dxn1-panel dxn1-scanlines rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/15 bg-black/40">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="dxn1-mono text-[10px] text-emerald-500/50 ml-2">
                DXN1-OS v1.3 desktop — kitty + firefox + app store
              </span>
            </div>
            <div className="relative aspect-video">
              <Image
                src="/dxn1-assets/dxn1-desktop-v13.png"
                alt="DXN1-OS desktop with kitty terminal and Firefox"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-3">
            <div className="dxn1-panel rounded-xl p-5">
              <h3 className="dxn1-mono text-xs text-emerald-200 font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                AI-native dev
              </h3>
              <ul className="space-y-2 dxn1-mono text-xs text-emerald-100/70">
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Ollama local LLM runtime</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Qwen Coder 7B preconfigured</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Python 3.12 + Node 22 + Rust</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Docker (rootless mode)</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Git + gh CLI preinstalled</li>
              </ul>
            </div>
            <div className="dxn1-panel rounded-xl p-5">
              <h3 className="dxn1-mono text-xs text-emerald-200 font-semibold uppercase tracking-wide mb-3">
                optional desktops
              </h3>
              <div className="space-y-2">
                {rest.map((app) => (
                  <div key={app.name} className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/20 bg-emerald-500/5 shrink-0">
                      <Image src={app.icon} alt={app.name} fill className="object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-medium">{app.name}</div>
                      <div className="dxn1-mono text-[10px] text-emerald-500/50 truncate">{app.desc}</div>
                    </div>
                    <span className="dxn1-mono text-[9px] text-emerald-300 border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5 rounded shrink-0">
                      {app.version}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* version roadmap */}
        <div className="dxn1-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Download className="w-4 h-4 text-emerald-400" />
            <h3 className="dxn1-mono text-xs text-emerald-200 font-semibold uppercase tracking-wide">
              release roadmap
            </h3>
            <span className="dxn1-mono text-[10px] text-emerald-500/40 ml-auto">24-hour sprint</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VERSION_ROADMAP.map((v) => {
              const doneCount = v.items.filter((i) => i.done).length;
              const pct = Math.round((doneCount / v.items.length) * 100);
              return (
                <div key={v.ver} className="border border-emerald-500/15 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="dxn1-mono text-sm font-bold text-emerald-300">{v.ver}</span>
                    <span className="dxn1-mono text-[9px] text-amber-300/70 border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 rounded">
                      {v.codename}
                    </span>
                  </div>
                  <div className="text-xs text-white font-medium mb-1">{v.title}</div>
                  <div className="dxn1-mono text-[10px] text-emerald-500/40 mb-3">{v.date}</div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden mb-3">
                    <div className="h-full dxn1-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <ul className="space-y-1">
                    {v.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 dxn1-mono text-[10px]">
                        {item.done ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3 h-3 text-emerald-500/30 shrink-0 mt-0.5" />
                        )}
                        <span className={item.done ? "text-emerald-100/70" : "text-emerald-500/40"}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
