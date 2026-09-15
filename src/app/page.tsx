"use client";

import { useEffect, useState } from "react";
import BootSequence from "@/components/dxn1/boot-sequence";
import Nav from "@/components/dxn1/nav";
import Hero from "@/components/dxn1/hero";
import Features from "@/components/dxn1/features";
import DownloadCenter from "@/components/dxn1/download-center";
import InstallerWizard from "@/components/dxn1/installer-wizard";
import AppShowcase from "@/components/dxn1/app-showcase";
import DriverMatrix from "@/components/dxn1/driver-matrix";
import SourceTree from "@/components/dxn1/source-tree";
import TerminalDemo from "@/components/dxn1/terminal-demo";
import Footer from "@/components/dxn1/footer";

type OsInfo = {
  name: string;
  version: string;
  codename: string;
  arch: string;
  kernel: string;
  iso: { size_human: string; sha256: string };
};

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [os, setOs] = useState<OsInfo | null>(null);

  useEffect(() => {
    fetch("/api/system/info")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setOs(d.os);
      })
      .catch(() => {});
  }, []);

  const scrollToDownloads = () => {
    document.getElementById("downloads")?.scrollIntoView({ behavior: "smooth" });
  };
  const downloadIso = () => {
    window.location.href = "/api/download/iso";
  };
  const downloadSource = () => {
    window.location.href = "/api/download/source";
  };

  return (
    <div className="min-h-screen flex flex-col dxn1-surface text-emerald-50">
      {!booted && <BootSequence onDone={() => setBooted(true)} />}

      <Nav onDownload={scrollToDownloads} />

      <main className="flex-1">
        <Hero
          os={os}
          onDownloadIso={downloadIso}
          onDownloadSource={downloadSource}
        />
        <Features />
        <DownloadCenter os={os} />
        <InstallerWizard />
        <AppShowcase />
        <DriverMatrix />
        <SourceTree />
        <TerminalDemo />

        {/* CTA band */}
        <section className="relative py-16 border-y border-emerald-500/15 dxn1-surface overflow-hidden">
          <div className="absolute inset-0 dxn1-grid-bg opacity-40" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
              $ echo &quot;ready when you are&quot;
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              boot it. install it.{" "}
              <span className="dxn1-text-emerald dxn1-text-glow">own it.</span>
            </h2>
            <p className="text-emerald-100/60 text-base mb-8 max-w-xl mx-auto">
              Grab the ISO and flash it to a USB stick or DriveDroid, or pull the
              full source tree and rebuild the entire distribution the LFS way.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={downloadIso}
                className="dxn1-mono text-sm text-[#060a08] bg-emerald-400 hover:bg-emerald-300 font-semibold px-6 py-3 rounded-lg transition-colors dxn1-glow"
              >
                ▸ download dxn1-os-1.0.iso
              </button>
              <button
                onClick={downloadSource}
                className="dxn1-mono text-sm text-amber-200 border border-amber-500/50 hover:bg-amber-500/10 px-6 py-3 rounded-lg transition-colors"
              >
                download source.zip
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
