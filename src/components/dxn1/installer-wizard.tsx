"use client";

import { useEffect, useRef, useState } from "react";
import {
  Usb,
  Smartphone,
  HardDrive,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  Terminal as TermIcon,
  Cpu,
} from "lucide-react";

type Method = "usb" | "drivedroid" | "partition";
type Profile = "5gb" | "full" | "manual";
type Step = "method" | "profile" | "config" | "review" | "running" | "done";

const METHODS: { id: Method; icon: any; title: string; desc: string; tag: string }[] = [
  {
    id: "usb",
    icon: Usb,
    title: "Flash to USB",
    desc: "dd the ISO onto a USB stick (4 GB+) and boot from it. The TUI installer runs from the live environment.",
    tag: "dd bs=4M conv=fsync",
  },
  {
    id: "drivedroid",
    icon: Smartphone,
    title: "DriveDroid image",
    desc: "Import the ISO as a raw image in DriveDroid on your Android phone — boot any PC without dedicated media.",
    tag: "raw image · .import.txt",
  },
  {
    id: "partition",
    icon: HardDrive,
    title: "Install to partition",
    desc: "Simulate a full disk install: partition, copy rootfs, build drivers, install GRUB. Choose a profile below.",
    tag: "build.sh --stage 06",
  },
];

const PROFILES: { id: Profile; title: string; desc: string; layout: string[] }[] = [
  {
    id: "5gb",
    title: "5 GB minimal",
    desc: "Tiny footprint, installs alongside your existing OS. 1 MiB BIOS boot + ESP, 1 GiB swap, ~3 GiB root.",
    layout: ["boot 1 MiB", "ESP 512 MiB", "swap 1 GiB", "root ~3 GiB"],
  },
  {
    id: "full",
    title: "Full disk",
    desc: "Use the entire target disk. Swap = 1/8 disk (capped 8 GiB), root takes the remainder.",
    layout: ["ESP 512 MiB", "swap ≤ 8 GiB", "root (rest)"],
  },
  {
    id: "manual",
    title: "Manual",
    desc: "Use pre-existing partitions you have already formatted. The installer only installs into them.",
    layout: ["your partitions"],
  },
];

const STEPS: { id: Step; label: string }[] = [
  { id: "method", label: "method" },
  { id: "profile", label: "profile" },
  { id: "config", label: "config" },
  { id: "review", label: "review" },
  { id: "running", label: "install" },
];

export default function InstallerWizard() {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("partition");
  const [profile, setProfile] = useState<Profile>("5gb");
  const [disk, setDisk] = useState("/dev/sda");
  const [hostname, setHostname] = useState("dxn1");
  const [output, setOutput] = useState<string>("");
  const [done, setDone] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [output]);

  const reset = () => {
    setStep("method");
    setOutput("");
    setDone(false);
  };

  const runInstall = async () => {
    setStep("running");
    setOutput("");
    setDone(false);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/install/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, profile, disk, hostname }),
        signal: abortRef.current.signal,
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done: rdone } = await reader.read();
        if (rdone) break;
        buf += dec.decode(value, { stream: true });
        // split into lines but keep them
        setOutput(buf);
      }
      setDone(true);
    } catch (e: any) {
      if (e.name !== "AbortError") setOutput((o) => o + "\r\n\x1b[31m[error] " + String(e) + "\x1b[0m");
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setStep("review");
  };

  const next = () => {
    const order: Step[] = ["method", "profile", "config", "review", "running"];
    if (step === "method" && method !== "partition") {
      // usb/drivedroid skip profile+config, go straight to review
      setStep("review");
      return;
    }
    const i = order.indexOf(step);
    if (i < order.length - 1) setStep(order[i + 1]);
  };
  const back = () => {
    const order: Step[] = ["method", "profile", "config", "review", "running"];
    const i = order.indexOf(step);
    if (step === "review" && method !== "partition") {
      setStep("method");
      return;
    }
    if (i > 0) setStep(order[i - 1]);
  };

  return (
    <section id="install" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ dxn1-installer
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            try the
            <span className="dxn1-text-emerald dxn1-text-glow"> installer</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            A web preview of the DXN1-OS TUI installer. Pick a method, choose a
            partition profile (including the 5 GB option), and watch a simulated
            install run live in the terminal.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* wizard panel */}
          <div className="lg:col-span-5 dxn1-panel dxn1-scanlines rounded-xl overflow-hidden">
            {/* step bar */}
            <div className="flex border-b border-emerald-500/15 bg-black/30">
              {STEPS.map((s, i) => {
                const active = stepIndex >= i;
                return (
                  <div
                    key={s.id}
                    className={`flex-1 px-3 py-2.5 text-center border-r border-emerald-500/10 last:border-r-0 ${
                      active ? "bg-emerald-500/10" : ""
                    }`}
                  >
                    <div
                      className={`dxn1-mono text-[9px] ${
                        active ? "text-emerald-300" : "text-emerald-500/40"
                      }`}
                    >
                      0{i + 1}
                    </div>
                    <div
                      className={`dxn1-mono text-[10px] ${
                        active ? "text-emerald-200" : "text-emerald-500/40"
                      }`}
                    >
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 min-h-[340px] flex flex-col">
              {step === "method" && (
                <div className="space-y-3">
                  <h3 className="dxn1-mono text-xs text-emerald-300 uppercase tracking-wide mb-1">
                    select install method
                  </h3>
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        method === m.id
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-emerald-500/15 hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center">
                          <m.icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium flex items-center gap-2">
                            {m.title}
                            {method === m.id && (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>
                          <div className="text-xs text-emerald-100/55 leading-snug mt-0.5">
                            {m.desc}
                          </div>
                          <div className="dxn1-mono text-[10px] text-amber-300/60 mt-1">
                            {m.tag}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === "profile" && (
                <div className="space-y-3">
                  <h3 className="dxn1-mono text-xs text-emerald-300 uppercase tracking-wide mb-1">
                    partition profile
                  </h3>
                  {PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProfile(p.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        profile === p.id
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-emerald-500/15 hover:border-emerald-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white font-medium flex items-center gap-2">
                          {p.title}
                          {profile === p.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </span>
                        {p.id === "5gb" && (
                          <span className="dxn1-mono text-[9px] text-amber-300 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-emerald-100/55 leading-snug">{p.desc}</div>
                      <div className="dxn1-mono text-[10px] text-emerald-500/50 mt-1.5 flex flex-wrap gap-1">
                        {p.layout.map((l) => (
                          <span key={l} className="border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            {l}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === "config" && (
                <div className="space-y-4">
                  <h3 className="dxn1-mono text-xs text-emerald-300 uppercase tracking-wide mb-1">
                    configuration
                  </h3>
                  <label className="block">
                    <span className="dxn1-mono text-[10px] text-emerald-500/60 uppercase">
                      target disk
                    </span>
                    <input
                      value={disk}
                      onChange={(e) => setDisk(e.target.value)}
                      className="mt-1 w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded px-3 py-2 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="dxn1-mono text-[10px] text-emerald-500/60 uppercase">
                      hostname
                    </span>
                    <input
                      value={hostname}
                      onChange={(e) => setHostname(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32))}
                      className="mt-1 w-full dxn1-mono text-sm text-emerald-200 bg-black/40 border border-emerald-500/20 focus:border-emerald-500/60 rounded px-3 py-2 outline-none"
                    />
                  </label>
                  <div className="dxn1-mono text-[10px] text-emerald-500/40 bg-black/30 border border-emerald-500/10 rounded px-3 py-2">
                    profile: <span className="text-amber-300">{profile}</span> · disk:{" "}
                    <span className="text-emerald-300">{disk}</span> · host:{" "}
                    <span className="text-emerald-300">{hostname || "dxn1"}</span>
                  </div>
                </div>
              )}

              {step === "review" && (
                <div className="space-y-4">
                  <h3 className="dxn1-mono text-xs text-emerald-300 uppercase tracking-wide mb-1">
                    review &amp; confirm
                  </h3>
                  <div className="dxn1-mono text-xs space-y-1.5 bg-black/30 border border-emerald-500/10 rounded p-3">
                    <div className="flex justify-between"><span className="text-emerald-500/50">method</span><span className="text-emerald-200">{method}</span></div>
                    {method === "partition" && (
                      <div className="flex justify-between"><span className="text-emerald-500/50">profile</span><span className="text-emerald-200">{profile}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-emerald-500/50">target</span><span className="text-emerald-200">{method === "partition" ? disk : (method === "usb" ? "/dev/sdb (USB)" : "/storage/dxn1.img")}</span></div>
                    <div className="flex justify-between"><span className="text-emerald-500/50">hostname</span><span className="text-emerald-200">{hostname || "dxn1"}</span></div>
                    <div className="flex justify-between"><span className="text-emerald-500/50">kernel</span><span className="text-emerald-200">6.10.5</span></div>
                  </div>
                  <div className="dxn1-mono text-[10px] text-amber-300/70 bg-amber-500/5 border border-amber-500/20 rounded px-3 py-2 leading-relaxed">
                    ▲ simulation only — no disk is touched. The real installer
                    runs the same pipeline from the live ISO.
                  </div>
                </div>
              )}

              {step === "running" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
                  <Cpu className="w-8 h-8 text-emerald-400 dxn1-spin" />
                  <div className="dxn1-mono text-xs text-emerald-300">
                    installing DXN1-OS…
                  </div>
                  <button
                    onClick={cancel}
                    className="dxn1-mono text-[10px] text-red-300 border border-red-500/40 hover:bg-red-500/10 px-3 py-1 rounded"
                  >
                    abort
                  </button>
                </div>
              )}

              {/* nav buttons */}
              {step !== "running" && (
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-emerald-500/10">
                  <button
                    onClick={back}
                    disabled={step === "method"}
                    className="dxn1-mono text-xs text-emerald-300/70 hover:text-emerald-300 disabled:opacity-30 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    back
                  </button>
                  {step === "review" ? (
                    <button
                      onClick={runInstall}
                      className="dxn1-mono text-xs text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-4 py-2 rounded flex items-center gap-1.5 dxn1-glow"
                    >
                      <TermIcon className="w-3.5 h-3.5" />
                      run install
                    </button>
                  ) : (
                    <button
                      onClick={next}
                      className="dxn1-mono text-xs text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-4 py-2 rounded flex items-center gap-1.5"
                    >
                      next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {done && step !== "running" && (
                <button
                  onClick={reset}
                  className="mt-4 w-full dxn1-mono text-xs text-amber-200 border border-amber-500/40 hover:bg-amber-500/10 px-4 py-2 rounded flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  run again
                </button>
              )}
            </div>
          </div>

          {/* terminal output */}
          <div className="lg:col-span-7 dxn1-panel rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/15 bg-black/40">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="dxn1-mono text-[10px] text-emerald-500/50 ml-2">
                dxn1@installer: ~/install
              </span>
              <span className="ml-auto dxn1-mono text-[10px] text-emerald-500/40">
                {method === "partition" ? `${profile} · ${disk}` : method}
              </span>
            </div>
            <div
              ref={termRef}
              className="flex-1 bg-black/40 p-4 overflow-y-auto dxn1-scroll max-h-[460px] min-h-[340px]"
            >
              {output ? (
                <pre className="dxn1-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre-wrap break-all text-emerald-300/90">
                  <Ansi text={output} />
                  {step === "running" && <span className="dxn1-cursor" />}
                </pre>
              ) : (
                <div className="dxn1-mono text-xs text-emerald-500/40 space-y-1">
                  <div>DXN1-OS installer — live terminal</div>
                  <div className="text-emerald-500/30">
                    configure the install on the left, then click{" "}
                    <span className="text-emerald-300">run install</span>.
                  </div>
                  <div className="mt-4 text-emerald-500/30">$<span className="dxn1-cursor" /></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// minimal ANSI-to-JSX renderer (supports the 1;32, 1;33, 1;34, 1;36, 2m, 0m codes used by the simulator)
function Ansi({ text }: { text: string }) {
  const colorMap: Record<string, string> = {
    "1;32": "text-emerald-400",
    "1;33": "text-amber-400",
    "1;34": "text-sky-400",
    "1;36": "text-teal-300",
    "31": "text-red-400",
    "32": "text-emerald-400",
    "33": "text-amber-300",
    "34": "text-sky-300",
    "36": "text-teal-300",
    "2": "text-emerald-500/50",
    "0": "",
  };
  const parts: { text: string; cls: string }[] = [];
  const regex = /\x1b\[(\d+(?:;\d+)?)m/g;
  let last = 0;
  let current = "";
  let m: RegExpExecArray;
  while ((m = regex.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before) parts.push({ text: before, cls: current });
    const code = m[1];
    current = colorMap[code] ?? current;
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last), cls: current });
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={p.cls}>
          {p.text}
        </span>
      ))}
    </>
  );
}
