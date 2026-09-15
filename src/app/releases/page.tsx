"use client";

import { Download, Check, Calendar, Disc, FileArchive, ExternalLink, GitBranch } from "lucide-react";

type Release = {
  ver: string;
  codename: string;
  date: string;
  title: string;
  iso_sha: string;
  iso_size: string;
  highlights: string[];
};

const RELEASES: Release[] = [
  {
    ver: "v1.4",
    codename: "kernel",
    date: "2025-03-15",
    title: "Kernel modules + networking",
    iso_sha: "5613e74e0d3ff2261fec224b67f7e1bc6c2d45ab7c85c8b044fb4ff3afc35c3b",
    iso_size: "29.1 MiB",
    highlights: [
      "314 real kernel driver modules bundled (network, GPU, audio, WiFi, USB, storage)",
      "modprobe works post-install — load any driver on demand",
      "First-boot setup: extracts modules, loads drivers, brings up DHCP networking",
      "dxn1-update now points at the real DXN1-termux/DXN1-OS-TAKE-2 repo",
    ],
  },
  {
    ver: "v1.3",
    codename: "spark",
    date: "2025-03-01",
    title: "AI-native + app store",
    iso_sha: "2f243b04da9fe61148e662ca759a49fb0e4216c99a30b0983b7c5eb6b468af40",
    iso_size: "15.3 MiB",
    highlights: [
      "DXN1 App Store — GUI package manager (browse, search, install, remove)",
      "DXN1 Settings app — system config GUI (System/Network/Display/Users/About)",
      "Ollama recipe — run LLMs locally (Llama 3, Qwen Coder, DeepSeek)",
      "28-package repository index (system/terminal/browser/desktop/dev/ai)",
    ],
  },
  {
    ver: "v1.2",
    codename: "ion",
    date: "2025-02-15",
    title: "Desktop environment",
    iso_sha: "2f243b04da9fe61148e662ca759a49fb0e4216c99a30b0983b7c5eb6b468af40",
    iso_size: "15.3 MiB",
    highlights: [
      "GNOME 46 desktop recipe (optional, dxn1-pkg install gnome-shell)",
      "KDE Plasma 6.1 desktop recipe (optional, dxn1-pkg install plasma-shell)",
      "Xorg + Wayland + PipeWire + Mesa graphics drivers",
      "Noto fonts for full unicode coverage",
    ],
  },
  {
    ver: "v1.1",
    codename: "flux",
    date: "2025-02-01",
    title: "Developer essentials",
    iso_sha: "2f243b04da9fe61148e662ca759a49fb0e4216c99a30b0983b7c5eb6b468af40",
    iso_size: "15.3 MiB",
    highlights: [
      "Kitty terminal (GPU-accelerated, default)",
      "Firefox ESR 130 browser (ships preinstalled)",
      "2 new install modes: side-install (dual-boot) + encrypted (LUKS)",
      "5 install modes: auto-5gb / full-wipe / manual / side-install / encrypted",
    ],
  },
  {
    ver: "v1.0",
    codename: "oxide",
    date: "2025-01-15",
    title: "Real bootable Linux",
    iso_sha: "3f965f38774dd76fd5d18e45297012a663a8d0c3e750eaaff5529ec971d4c7e4",
    iso_size: "15.3 MiB",
    highlights: [
      "Real Linux 5.10 kernel (Debian LTS, EFI_STUB enabled)",
      "Real busybox 1.35 static initramfs (358 entries)",
      "UEFI-bootable ISO (no bootloader needed — kernel IS the EFI app)",
      "Installer: auto-5gb / full-wipe / manual",
      "Auto-updater (dxn1-update) baked in",
    ],
  },
];

const GITHUB_BASE = "https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/download";

export default function ReleasesPage() {
  const latest = "v1.4";

  return (
    <div className="min-h-screen dxn1-surface pt-16">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ git tag --sort=-version:refname
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">releases</h1>
          <p className="text-emerald-100/60 text-base">
            Every release is a real, bootable Linux ISO. The latest is{" "}
            <span className="dxn1-mono text-emerald-300 font-semibold">{latest}</span>.
            Download, verify the sha256, flash to USB, and boot.
          </p>
        </div>

        <div className="space-y-5">
          {RELEASES.map((r) => {
            const isLatest = r.ver === latest;
            return (
              <div
                key={r.ver}
                className={`dxn1-panel rounded-xl p-6 ${
                  isLatest ? "border-emerald-500/50 dxn1-glow" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg border ${isLatest ? "border-emerald-400/60 bg-emerald-400/10" : "border-emerald-500/30 bg-emerald-500/5"} flex items-center justify-center`}>
                      <span className="dxn1-mono font-bold text-emerald-400 text-sm">
                        {r.ver.replace("v", "")}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">{r.ver}</h2>
                        <span className="dxn1-mono text-xs text-amber-300/80 border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 rounded">
                          {r.codename}
                        </span>
                        {isLatest && (
                          <span className="dxn1-mono text-[10px] text-[#060a08] bg-emerald-400 font-semibold px-2 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-emerald-100/60">{r.title}</div>
                    </div>
                  </div>
                  <div className="dxn1-mono text-[10px] text-emerald-500/50 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.date}</span>
                    <span className="flex items-center gap-1"><Disc className="w-3 h-3" /> {r.iso_size}</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {r.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-emerald-100/70">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mb-4">
                  <div className="dxn1-mono text-[10px] text-emerald-500/60 uppercase mb-1">sha256</div>
                  <div className="dxn1-mono text-[10px] text-emerald-300/70 break-all bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5">
                    {r.iso_sha}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`${GITHUB_BASE}/${r.ver}/dxn1-os-1.0.iso`}
                    className="flex items-center gap-2 dxn1-mono text-xs text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-4 py-2 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    download ISO
                  </a>
                  <a
                    href={`${GITHUB_BASE}/${r.ver}/dxn1-os-source.zip`}
                    className="flex items-center gap-2 dxn1-mono text-xs text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 px-4 py-2 rounded transition-colors"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    source.zip
                  </a>
                  <a
                    href={`https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/tag/${r.ver}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 dxn1-mono text-xs text-emerald-400/70 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 px-4 py-2 rounded transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    view on GitHub
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 dxn1-panel rounded-xl p-4 flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs text-emerald-100/60">
            To create the next release:{" "}
            <code className="dxn1-mono text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded">
              git tag v1.5 &amp;&amp; git push origin v1.5
            </code>{" "}
            — the GitHub Actions workflow auto-builds and publishes the release.
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="dxn1-mono text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors">
            ← back to DXN1-OS
          </a>
        </div>
      </div>
    </div>
  );
}
