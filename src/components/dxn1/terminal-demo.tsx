"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const HELP = `available commands:
  help          show this help
  uname         print system info
  neofetch      system summary
  ls /          list root filesystem
  lspci         list pci devices
  lsmod         list loaded kernel modules
  df            disk usage
  dxn1-pkg      package manager (try: dxn1-pkg list)
  cat <file>    print a file (VERSION, /etc/os-release)
  install       jump to the web installer
  clear         clear the screen`;

const ROOT_FS = [
  "bin  boot  dev  etc  home  lib  media  mnt",
  "opt  proc  root  run  sbin  srv  sys  tmp  usr  var",
];

const PCI = [
  "00:00.0 Host bridge: Intel 440FX",
  "00:01.0 ISA bridge: Intel 82371SB PIIX3",
  "00:01.1 IDE interface: Intel PIIX3",
  "00:02.0 VGA compatible: VMware SVGA II  [vmwgfx]",
  "00:03.0 Ethernet: Intel 82540EM Gigabit  [e1000]",
  "00:04.0 Network: Intel Wireless 8265  [iwlwifi]",
  "00:05.0 Audio: Intel 82801AA AC'97  [snd-intel8x0]",
  "00:06.0 USB: Intel 82371SB PIIX3 UHCI",
];

const MODULES = [
  "amdgpu  2097152  3",
  "i915    1835008  2",
  "e1000    131072  0",
  "iwlwifi  393216  0",
  "ath9k   131072  0",
  "snd_hda_intel  53248  2",
  "ext4    786432  2",
  "squashfs  65536  0",
];

const PKGS = [
  "linux-6.10.5         kernel",
  "glibc-2.40           libc",
  "gcc-14.2.0           compiler",
  "bash-5.2.32          shell",
  "coreutils-9.5        base",
  "util-linux-2.40.2    base",
  "grub-2.12            bootloader",
  "mesa-24.2.0          graphics",
  "openssh-9.9p1        net",
  "dhcpcd-10.0.8        net",
];

const FILES: Record<string, string> = {
  VERSION: 'DXN1-OS 1.0\nbuild 2025.01\narch x86_64\ncodename "oxide"',
  "/etc/os-release": `NAME="DXN1-OS"\nVERSION="1.0 (oxide)"\nID=dxn1\nID_LIKE=lfs\nPRETTY_NAME="DXN1-OS 1.0 (oxide)"\nKERNEL="6.10.5"\nARCH="x86_64"`,
};

type Line = { kind: "in" | "out"; text: string };

const BOOT = "dxn1@oxide:~$ ";

export default function TerminalDemo() {
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "DXN1-OS 1.0 'oxide' — interactive terminal demo" },
    { kind: "out", text: "type 'help' for available commands.\n" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    setLines((l) => [...l, { kind: "in", text: raw }]);
    if (cmd) setHistory((h) => [...h, cmd]);
    setHIdx(-1);

    const [name, ...args] = cmd.split(/\s+/);
    let out = "";
    switch (name) {
      case "":
        break;
      case "help":
        out = HELP;
        break;
      case "uname":
        out = "Linux dxn1-oxide 6.10.5 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux";
        break;
      case "neofetch":
        out = NEOFETCH;
        break;
      case "ls":
        out = args[0] === "/" ? ROOT_FS.join("\n") : ROOT_FS[0];
        break;
      case "lspci":
        out = PCI.join("\n");
        break;
      case "lsmod":
        out = "Module                  Size  Used by\n" + MODULES.join("\n");
        break;
      case "df":
        out =
          "Filesystem      Size  Used Avail Use% Mounted on\n" +
          "/dev/sda4       3.0G  1.2G  1.7G  41% /\n" +
          "tmpfs           1.9G     0  1.9G   0% /dev/shm\n" +
          "/dev/sr0        688M  688M     0 100% /run/dxn1/iso";
        break;
      case "dxn1-pkg":
        out = args[0] === "list" ? PKGS.join("\n") : `dxn1-pkg: subcommands: install remove update search list info\n  try: dxn1-pkg list`;
        break;
      case "cat":
        out = FILES[args[0]] ?? `cat: ${args[0] || ""}: No such file`;
        break;
      case "install":
        out = "opening web installer…";
        setTimeout(() => {
          document.getElementById("install")?.scrollIntoView({ behavior: "smooth" });
        }, 400);
        break;
      case "clear":
        setLines([]);
        return;
      case "whoami":
        out = "lfs";
        break;
      case "pwd":
        out = "/home/lfs";
        break;
      case "echo":
        out = args.join(" ");
        break;
      default:
        out = `dxn1-sh: command not found: ${name}\ntype 'help' for available commands.`;
    }
    if (out) setLines((l) => [...l, { kind: "out", text: out }]);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = hIdx === -1 ? history.length - 1 : Math.max(0, hIdx - 1);
      if (history[idx] !== undefined) {
        setInput(history[idx]);
        setHIdx(idx);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx === -1) return;
      const idx = hIdx + 1;
      if (idx >= history.length) {
        setInput("");
        setHIdx(-1);
      } else {
        setInput(history[idx]);
        setHIdx(idx);
      }
    }
  };

  return (
    <section id="terminal" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="absolute inset-0 dxn1-grid-bg opacity-30 -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="dxn1-mono text-[11px] text-amber-300/80 mb-1">
              $ dxn1-shell --interactive
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              poke around
              <br />
              <span className="dxn1-text-emerald dxn1-text-glow">the live system.</span>
            </h2>
            <p className="text-emerald-100/60 text-base">
              A simulated DXN1-OS shell running right in your browser. Run{" "}
              <span className="dxn1-mono text-emerald-300">neofetch</span>,{" "}
              <span className="dxn1-mono text-emerald-300">lspci</span>,{" "}
              <span className="dxn1-mono text-emerald-300">lsmod</span> or inspect the
              filesystem. Up/down arrows recall history.
            </p>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/20">
              <Image
                src="/dxn1-assets/dxn1-desktop.png"
                alt="DXN1-OS desktop"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-2 left-2 dxn1-mono text-[10px] text-emerald-300/80 bg-black/60 px-2 py-1 rounded">
                desktop preview · tiling wm
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 dxn1-panel dxn1-scanlines rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/15 bg-black/40">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="dxn1-mono text-[10px] text-emerald-500/50 ml-2">
                lfs@oxide: ~
              </span>
              <span className="ml-auto dxn1-mono text-[10px] text-emerald-500/40">
                try: help · neofetch · lspci
              </span>
            </div>
            <div
              ref={scrollRef}
              onClick={() => inputRef.current?.focus()}
              className="bg-black/50 p-4 h-[440px] overflow-y-auto dxn1-scroll cursor-text"
            >
              <div className="dxn1-mono text-xs leading-relaxed">
                {lines.map((l, i) =>
                  l.kind === "in" ? (
                    <div key={i} className="text-emerald-200">
                      <span className="text-amber-300">{BOOT}</span>
                      {l.text}
                    </div>
                  ) : (
                    <pre
                      key={i}
                      className="whitespace-pre-wrap text-emerald-300/85 mb-1"
                    >
                      {l.text}
                    </pre>
                  )
                )}
                <div className="flex items-center text-emerald-200">
                  <span className="text-amber-300">{BOOT}</span>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    className="flex-1 bg-transparent outline-none caret-emerald-400 ml-1"
                    aria-label="terminal input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const NEOFETCH = `       /\\\\\\                  lfs@oxide
      /  \\\\\\                 ----------
     /    \\\\\\                OS: DXN1-OS 1.0 'oxide' x86_64
    /  /\\  \\\\\\               Kernel: 6.10.5
   /  /  \\  \\\\\\              Shell: bash 5.2.32
  /  /    \\  \\\\\\             WM: dxn1-wm (tiling)
 /__/      \\__\\\\\\            Packages: 60 (dxn1-pkg)
                          Terminal: tty1
   D X N 1 - O S           CPU: Intel i7-12700K (16) @ 5.0GHz
                           GPU: AMD Radeon RX 6700 XT [amdgpu]
                           Memory: 2812MiB / 16384MiB
                           Disk: 1.2G / 3.0G (5gb profile)`;
