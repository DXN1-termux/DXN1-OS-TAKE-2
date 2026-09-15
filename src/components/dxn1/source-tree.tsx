"use client";

import { useState } from "react";
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, FileCode } from "lucide-react";
import { SOURCE_TREE, type TreeNode } from "@/lib/dxn1-data";

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "dir";

  return (
    <div>
      <button
        onClick={() => isDir && setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-emerald-500/[0.06] rounded text-left group"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isDir ? (
          <>
            {open ? (
              <ChevronDown className="w-3 h-3 text-emerald-500/50 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-emerald-500/50 shrink-0" />
            )}
            {open ? (
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {node.name.endsWith(".sh") || node.name.endsWith(".py") ? (
              <FileCode className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-emerald-300/60 shrink-0" />
            )}
          </>
        )}
        <span
          className={`dxn1-mono text-xs ${
            isDir ? "text-emerald-200 font-medium" : "text-emerald-100/70"
          }`}
        >
          {node.name}
        </span>
        {node.size && (
          <span className="dxn1-mono text-[10px] text-emerald-500/40 ml-auto">
            {node.size}
          </span>
        )}
      </button>
      {node.desc && !isDir && (
        <div
          className="dxn1-mono text-[10px] text-emerald-500/40 pl-7 pr-2 pb-1"
          style={{ paddingLeft: `${depth * 14 + 28}px` }}
        >
          {node.desc}
        </div>
      )}
      {isDir && open && node.children && (
        <div>
          {node.children.map((c) => (
            <TreeRow key={c.name} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SourceTree() {
  return (
    <section id="source" className="relative py-20 sm:py-28 dxn1-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <div className="dxn1-mono text-[11px] text-amber-300/80 mb-3">
            $ tree -L 3 dxn1-os/source/
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            the full
            <span className="dxn1-text-emerald dxn1-text-glow"> source tree.</span>
          </h2>
          <p className="text-emerald-100/60 text-base">
            33 files, 332 KiB of real LFS build scripts. Every file in the
            downloadable zip — the orchestrator, kernel config, 9-stage
            pipeline, init system, installer, drivers and package manager.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 dxn1-panel dxn1-scanlines rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/15 bg-black/40">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="dxn1-mono text-[10px] text-emerald-500/50 ml-2">
                ~/dxn1-os/source
              </span>
            </div>
            <div className="p-2 max-h-[520px] overflow-y-auto dxn1-scroll">
              <TreeRow node={SOURCE_TREE} depth={0} />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="dxn1-panel rounded-xl p-5">
              <h3 className="dxn1-mono text-xs text-emerald-300 uppercase tracking-wide mb-3">
                build pipeline
              </h3>
              <ol className="space-y-2">
                {[
                  ["00", "prepare host", "verify tools, create lfs user"],
                  ["01", "partition", "5gb / full / manual profiles"],
                  ["02", "bootstrap", "LFS two-stage toolchain"],
                  ["03", "kernel", "configure & build 6.10.5"],
                  ["04", "base system", "chrooted native build"],
                  ["05", "drivers", "gpu/net/audio/input/wifi"],
                  ["06", "install", "rootfs + GRUB to disk"],
                  ["07", "iso", "xorriso hybrid bootable"],
                  ["08", "flash", "dd → USB / DriveDroid"],
                ].map(([n, t, d]) => (
                  <li key={n} className="flex items-start gap-3">
                    <span className="dxn1-mono text-[10px] text-amber-300/80 border border-amber-500/30 bg-amber-500/5 rounded px-1.5 py-0.5 mt-0.5">
                      {n}
                    </span>
                    <div>
                      <div className="dxn1-mono text-xs text-emerald-200">{t}</div>
                      <div className="dxn1-mono text-[10px] text-emerald-500/50">{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="dxn1-panel rounded-xl p-5">
              <h3 className="dxn1-mono text-xs text-emerald-300 uppercase tracking-wide mb-3">
                key artifacts
              </h3>
              <ul className="space-y-2 dxn1-mono text-[11px]">
                <li className="flex justify-between"><span className="text-emerald-100/70">kernel.config</span><span className="text-amber-300/70">200+ CONFIG lines</span></li>
                <li className="flex justify-between"><span className="text-emerald-100/70">packages.list</span><span className="text-amber-300/70">60+ pinned pkgs</span></li>
                <li className="flex justify-between"><span className="text-emerald-100/70">dxn1-installer</span><span className="text-amber-300/70">8-step TUI</span></li>
                <li className="flex justify-between"><span className="text-emerald-100/70">dxn1-pkg</span><span className="text-amber-300/70">.dxpkg manager</span></li>
                <li className="flex justify-between"><span className="text-emerald-100/70">isolinux.cfg</span><span className="text-amber-300/70">8 boot entries</span></li>
              </ul>
              <a
                href="/api/download/source"
                className="mt-4 flex items-center justify-center gap-2 dxn1-mono text-xs text-amber-200 border border-amber-500/40 hover:bg-amber-500/10 px-4 py-2 rounded transition-colors"
              >
                download source.zip ▸
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
