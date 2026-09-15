"use client";

import { Download, FileArchive, Disc, Copy, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";

type OsInfo = {
  iso: { size_human: string; sha256: string };
  boot_menu?: string[];
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="text-emerald-500/60 hover:text-emerald-300 transition-colors"
      aria-label="copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Downloads({ os }: { os: OsInfo | null }) {
  const sha = os?.iso.sha256 ?? "67e8aa8a931c57323aaaa9463dd4453d60e5df3139c657dcce58da357712e7d8";

  return (
    <section id="downloads" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ wget dxn1-os/releases/1.0/
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            download the
            <span className="dxn1-text-emerald dxn1-text-glow"> artifacts</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            Two artifacts per release: a bootable hybrid ISO and the full source
            tree. Both are verified by sha256 — verify before flashing.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* ISO card */}
          <div className="dxn1-panel dxn1-scanlines rounded-xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center">
                  <Disc className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="dxn1-mono text-sm text-emerald-200 font-semibold">
                    dxn1-os-1.0.iso
                  </div>
                  <div className="dxn1-mono text-[10px] text-emerald-500/50">
                    hybrid BIOS+UEFI · bootable
                  </div>
                </div>
              </div>
              <span className="dxn1-mono text-[10px] text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded">
                LIVE ISO
              </span>
            </div>

            <dl className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <dt className="dxn1-mono text-emerald-500/50 text-xs">size</dt>
                <dd className="dxn1-mono text-emerald-200">{os?.iso.size_human ?? "688 MiB"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="dxn1-mono text-emerald-500/50 text-xs">kernel</dt>
                <dd className="dxn1-mono text-emerald-200">6.10.5</dd>
              </div>
              <div className="flex justify-between">
                <dt className="dxn1-mono text-emerald-500/50 text-xs">rootfs</dt>
                <dd className="dxn1-mono text-emerald-200">squashfs · zstd -19</dd>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <dt className="dxn1-mono text-emerald-500/50 text-xs">sha256</dt>
                  <CopyButton value={sha} />
                </div>
                <dd className="dxn1-mono text-[10px] text-emerald-300/80 break-all bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5">
                  {sha}
                </dd>
              </div>
            </dl>

            <div className="mt-auto space-y-2">
              <a
                href="/api/download/iso"
                className="flex items-center justify-center gap-2 dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-4 py-3 rounded-lg transition-colors dxn1-glow"
              >
                <Download className="w-4 h-4" />
                download .iso
              </a>
              <div className="dxn1-mono text-[10px] text-emerald-500/50 bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5 break-all">
                <span className="text-amber-300/70">$</span> sudo dd if=dxn1-os-1.0.iso of=/dev/sdX bs=4M conv=fsync &amp;&amp; sync
              </div>
            </div>
          </div>

          {/* Source card */}
          <div className="dxn1-panel dxn1-scanlines rounded-xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-center">
                  <FileArchive className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="dxn1-mono text-sm text-emerald-200 font-semibold">
                    dxn1-os-source.zip
                  </div>
                  <div className="dxn1-mono text-[10px] text-emerald-500/50">
                    33 files · 332 KiB · LFS build pipeline
                  </div>
                </div>
              </div>
              <span className="dxn1-mono text-[10px] text-amber-300 border border-amber-500/30 bg-amber-500/10 px-2 py-1 rounded">
                SOURCE
              </span>
            </div>

            <ul className="space-y-1.5 mb-5 dxn1-mono text-xs">
              {[
                "build.sh — main orchestrator",
                "config/kernel.config — 200+ CONFIG lines",
                "scripts/00-08 — 9-stage LFS pipeline",
                "installer/dxn1-installer — TUI",
                "drivers/{gpu,net,audio,input,wifi}",
                "packages/dxn1-pkg — package manager",
              ].map((l) => (
                <li key={l} className="flex items-start gap-2 text-emerald-200/70">
                  <span className="text-emerald-500/50 mt-0.5">▸</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto space-y-2">
              <a
                href="/api/download/source"
                className="flex items-center justify-center gap-2 dxn1-mono text-sm text-amber-200 border border-amber-500/50 hover:bg-amber-500/10 font-semibold px-4 py-3 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                download source .zip
              </a>
              <div className="dxn1-mono text-[10px] text-emerald-500/50 bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5 break-all">
                <span className="text-amber-300/70">$</span> sudo bash build.sh --all
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 dxn1-panel rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-100/70 leading-relaxed">
            <span className="text-emerald-300 dxn1-mono">verify:</span>{" "}
            always compare the downloaded ISO against the sha256 above before
            flashing. The source archive is signed and reproducible — rebuild
            the ISO locally with{" "}
            <span className="dxn1-mono text-amber-300">python3 scripts/build-iso.py</span>.
          </div>
        </div>
      </div>
    </section>
  );
}
