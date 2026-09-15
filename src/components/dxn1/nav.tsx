"use client";

import { useEffect, useState } from "react";
import { Download, Terminal, Github, ChevronDown } from "lucide-react";

const LINKS = [
  { href: "#features", label: "features" },
  { href: "#downloads", label: "downloads" },
  { href: "#install", label: "install" },
  { href: "#drivers", label: "drivers" },
  { href: "#source", label: "source" },
  { href: "#terminal", label: "terminal" },
];

export default function Nav({ onDownload }: { onDownload: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#060a08]/85 backdrop-blur-xl border-b border-emerald-500/15"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-md border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-center dxn1-glow">
            <span className="dxn1-mono font-bold text-emerald-400 text-sm">D1</span>
          </div>
          <div className="leading-none">
            <div className="dxn1-mono font-bold text-sm text-emerald-300">
              DXN1<span className="text-emerald-500/60">-OS</span>
            </div>
            <div className="dxn1-mono text-[10px] text-emerald-500/50">v1.0 oxide</div>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="dxn1-mono text-xs text-emerald-200/70 hover:text-emerald-300 hover:bg-emerald-500/10 px-3 py-1.5 rounded transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            className="hidden sm:flex items-center gap-2 dxn1-mono text-xs text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-4 py-2 rounded transition-colors dxn1-glow"
          >
            <Download className="w-3.5 h-3.5" />
            get iso
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden dxn1-mono text-xs text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded"
            aria-label="menu"
          >
            {open ? "✕" : "menu"}
          </button>
        </div>
      </nav>
      {open && (
        <div className="md:hidden border-t border-emerald-500/15 bg-[#060a08]/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block dxn1-mono text-xs text-emerald-200/80 hover:text-emerald-300 px-3 py-2 rounded hover:bg-emerald-500/10"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => {
              onDownload();
              setOpen(false);
            }}
            className="w-full mt-2 dxn1-mono text-xs text-[#060a08] bg-emerald-400 font-semibold px-4 py-2 rounded"
          >
            get iso
          </button>
        </div>
      )}
    </header>
  );
}
