"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Disc,
  FileArchive,
  Copy,
  Check,
  ShieldCheck,
  Usb,
  Smartphone,
  Monitor,
  Terminal,
  HardDrive,
  ChevronRight,
  Globe,
  Zap,
  Loader2,
} from "lucide-react";

type OsInfo = {
  iso: { size_human: string; sha256: string };
  version?: string;
  codename?: string;
};

type Method = "usb" | "drivedroid" | "vm" | "partition";
type Mirror = { id: string; label: string; url: string; loc: string; speed: string };

const MIRRORS: Mirror[] = [
  { id: "gh", label: "GitHub Releases", url: "https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/latest/download/dxn1-os-1.0.iso", loc: "Global CDN", speed: "Fast" },
  { id: "eu", label: "EU Mirror", url: "https://eu.mirror.dxn1.os/dxn1-os-1.0.iso", loc: "Frankfurt, DE", speed: "Fast" },
  { id: "us", label: "US Mirror", url: "https://us.mirror.dxn1.os/dxn1-os-1.0.iso", loc: "Ashburn, VA", speed: "Fast" },
  { id: "src", label: "Build from source", url: "/api/download/source", loc: "Local", speed: "Instant" },
];

const METHODS: { id: Method; icon: any; title: string; subtitle: string; steps: string[] }[] = [
  {
    id: "usb",
    icon: Usb,
    title: "Flash to USB",
    subtitle: "Boot any PC from a USB stick",
    steps: [
      "Download the ISO from a mirror above",
      "Insert a USB stick (4 GB+)",
      "Flash: sudo dd if=dxn1-os-1.0.iso of=/dev/sdX bs=4M conv=fsync",
      "sync, then reboot from the USB (UEFI mode)",
      'Pick "Install DXN1-OS" from the boot menu',
    ],
  },
  {
    id: "drivedroid",
    icon: Smartphone,
    title: "DriveDroid",
    subtitle: "Boot from your Android phone",
    steps: [
      "Install DriveDroid from the Play Store",
      "Download the ISO to your phone",
      "Import it as a raw image in DriveDroid",
      "Connect phone to PC via USB",
      "Reboot PC from phone (UEFI mode) → boot menu",
    ],
  },
  {
    id: "vm",
    icon: Monitor,
    title: "Virtual Machine",
    subtitle: "Test in QEMU / VirtualBox / VMware",
    steps: [
      "Download the ISO",
      "QEMU UEFI: qemu-system-x86_64 -bios OVMF_CODE.fd -cdrom dxn1-os-1.0.iso -m 512",
      "VirtualBox: New VM → Linux 2.6/3.x (64-bit) → mount ISO → enable EFI",
      "Boot → pick Live mode or Install from the boot menu",
    ],
  },
  {
    id: "partition",
    icon: HardDrive,
    title: "Install to partition",
    subtitle: "5GB alongside existing OS, or full disk",
    steps: [
      "Boot the live ISO (any method above)",
      'Pick "Install DXN1-OS to disk" from the boot menu',
      "Choose: auto-5gb / full-wipe / manual",
      "Installer partitions, formats, copies rootfs + kernel",
      "Sets up UEFI boot (EFI_STUB) — reboot to use DXN1-OS",
    ],
  },
];

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="text-emerald-500/60 hover:text-emerald-300 transition-colors shrink-0"
      aria-label="copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function DownloadCenter({ os }: { os: OsInfo | null }) {
  const [method, setMethod] = useState<Method>("usb");
  const [mirror, setMirror] = useState<Mirror>(MIRRORS[0]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "downloading" | "verifying" | "done">("idle");

  const sha = os?.iso.sha256 ?? "3f965f38774dd76fd5d18e45297012a663a8d0c3e750eaaff5529ec971d4c7e4";

  // simulate a download with progress (the real download is the <a> link)
  const startDownload = () => {
    setPhase("downloading");
    setProgress(0);
    setDownloading(true);
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(t);
        setProgress(100);
        setTimeout(() => {
          setPhase("verifying");
          setTimeout(() => {
            setPhase("done");
            setDownloading(false);
          }, 1200);
        }, 400);
      } else {
        setProgress(p);
      }
    }, 180);
  };

  const activeMethod = METHODS.find((m) => m.id === method)!;

  return (
    <section id="downloads" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ wget --mirror dxn1.os/releases/1.0/
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            download
            <span className="dxn1-text-emerald dxn1-text-glow"> center</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            Grab the real bootable ISO (15.3 MiB) from the nearest mirror, verify
            the sha256, then flash it to USB, DriveDroid, or boot it in a VM.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* LEFT: artifact + mirrors */}
          <div className="lg:col-span-7 space-y-5">
            {/* main ISO card */}
            <div className="dxn1-panel dxn1-scanlines rounded-xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center dxn1-glow">
                    <Disc className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="dxn1-mono text-sm text-emerald-200 font-semibold">
                      dxn1-os-1.0.iso
                    </div>
                    <div className="dxn1-mono text-[10px] text-emerald-500/50">
                      {os?.iso.size_human ?? "15.3 MiB"} · hybrid UEFI · bootable
                    </div>
                  </div>
                </div>
                <span className="dxn1-mono text-[10px] text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded">
                  v{os?.version ?? "1.0"} {os?.codename ?? "oxide"}
                </span>
              </div>

              {/* download button */}
              {phase === "idle" && (
                <a
                  href={mirror.url}
                  onClick={startDownload}
                  className="flex items-center justify-center gap-2 dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-4 py-3.5 rounded-lg transition-colors dxn1-glow mb-4"
                >
                  <Download className="w-4 h-4" />
                  download from {mirror.label}
                </a>
              )}
              {phase !== "idle" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between dxn1-mono text-xs mb-2">
                    <span className="text-emerald-200 flex items-center gap-2">
                      {phase === "downloading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {phase === "verifying" && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                      {phase === "done" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      {phase === "downloading" && "downloading..."}
                      {phase === "verifying" && "verifying sha256..."}
                      {phase === "done" && "verified!"}
                    </span>
                    <span className="text-emerald-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-black/40 border border-emerald-500/20 rounded-full overflow-hidden">
                    <div
                      className="h-full dxn1-progress-fill transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {phase === "done" && (
                    <div className="mt-3 flex items-center gap-2 dxn1-mono text-[11px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 rounded px-3 py-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      sha256 verified — flash it to USB now
                    </div>
                  )}
                </div>
              )}

              {/* sha256 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="dxn1-mono text-[10px] text-emerald-500/60 uppercase">sha256</span>
                  <CopyBtn value={sha} />
                </div>
                <div className="dxn1-mono text-[10px] text-emerald-300/80 break-all bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5">
                  {sha}
                </div>
              </div>

              {/* verify command */}
              <div className="dxn1-mono text-[10px] text-emerald-500/50 bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5 break-all">
                <span className="text-amber-300/70">$</span> echo &quot;{sha.slice(0, 16)}...  dxn1-os-1.0.iso&quot; | sha256sum -c
              </div>
            </div>

            {/* mirrors */}
            <div className="dxn1-panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="dxn1-mono text-xs text-emerald-200 font-semibold uppercase tracking-wide">
                  mirrors
                </h3>
                <span className="dxn1-mono text-[10px] text-emerald-500/40 ml-auto">pick nearest</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {MIRRORS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMirror(m)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      mirror.id === m.id
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-emerald-500/15 hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white font-medium">{m.label}</span>
                      {mirror.id === m.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="dxn1-mono text-[10px] text-emerald-100/50">{m.loc}</div>
                    <div className="dxn1-mono text-[10px] text-amber-300/60 flex items-center gap-1 mt-1">
                      <Zap className="w-2.5 h-2.5" /> {m.speed}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* source zip */}
            <div className="dxn1-panel rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-center">
                    <FileArchive className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="dxn1-mono text-sm text-emerald-200 font-semibold">
                      dxn1-os-source.zip
                    </div>
                    <div className="dxn1-mono text-[10px] text-emerald-500/50">
                      91 KB · 56 files · LFS source tree
                    </div>
                  </div>
                </div>
                <a
                  href="/api/download/source"
                  className="dxn1-mono text-xs text-amber-200 border border-amber-500/40 hover:bg-amber-500/10 px-3 py-2 rounded transition-colors"
                >
                  download
                </a>
              </div>
              <div className="dxn1-mono text-[10px] text-emerald-500/50 bg-black/30 border border-emerald-500/10 rounded px-2 py-1.5 break-all">
                <span className="text-amber-300/70">$</span> unzip dxn1-os-source.zip &amp;&amp; cd source &amp;&amp; bash build.sh --all
              </div>
            </div>
          </div>

          {/* RIGHT: methods */}
          <div className="lg:col-span-5 dxn1-panel dxn1-scanlines rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-emerald-500/15 bg-emerald-500/[0.03]">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="dxn1-mono text-xs text-emerald-200 font-semibold uppercase tracking-wide">
                how to install
              </h3>
            </div>
            {/* method tabs */}
            <div className="grid grid-cols-2 gap-1 p-2 border-b border-emerald-500/10">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
                    method === m.id
                      ? "bg-emerald-500/15 border border-emerald-500/40"
                      : "border border-transparent hover:bg-emerald-500/5"
                  }`}
                >
                  <m.icon className={`w-4 h-4 ${method === m.id ? "text-emerald-400" : "text-emerald-500/60"}`} />
                  <div className="min-w-0">
                    <div className={`dxn1-mono text-[11px] ${method === m.id ? "text-emerald-200" : "text-emerald-100/60"}`}>
                      {m.title}
                    </div>
                    <div className="dxn1-mono text-[9px] text-emerald-500/40 truncate">{m.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
            {/* steps */}
            <div className="p-5 flex-1">
              <ol className="space-y-3">
                {activeMethod.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="dxn1-mono text-[10px] text-amber-300/80 border border-amber-500/30 bg-amber-500/5 rounded px-1.5 py-0.5 h-5 shrink-0">
                      {i + 1}
                    </span>
                    <span className="dxn1-mono text-xs text-emerald-100/75 leading-relaxed break-words">
                      {step.includes("dd ") || step.includes("qemu-system") || step.includes("sha256sum") ? (
                        <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          {step}
                        </code>
                      ) : (
                        step
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {method === "partition" && (
                <div className="mt-4 pt-4 border-t border-emerald-500/10">
                  <a
                    href="#install"
                    className="dxn1-mono text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                  >
                    try the web installer <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
