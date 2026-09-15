import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { createHash } from "crypto";
import path from "path";

export const dynamic = "force-dynamic";

const GITHUB_RELEASE_ISO =
  "https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/download/v1.0/dxn1-os-1.0.iso";
const GITHUB_RELEASE_SRC =
  "https://github.com/DXN1-termux/DXN1-OS-TAKE-2/releases/download/v1.0/dxn1-os-source.zip";
const KNOWN_SHA = "3f965f38774dd76fd5d18e45297012a663a8d0c3e750eaaff5529ec971d4c7e4";

export async function GET() {
  let manifest: any = {};
  // Prefer the committed manifest in /public (always reflects the release)
  try {
    const manifestPath = path.join(process.cwd(), "public", "dxn1-assets", "manifest.json");
    manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  } catch {
    manifest = {
      name: "DXN1-OS",
      version: "1.0",
      codename: "oxide",
      arch: "x86_64",
      kernel: "5.10.0-32-amd64 (Debian, EFI_STUB enabled)",
    };
  }

  // Compute the real ISO size from the file on disk (always accurate)
  let isoSize = manifest.iso_size_bytes || 0;
  let isoSizeHuman = manifest.iso_size_human || "15.3 MiB";
  try {
    const isoPath = path.join(process.cwd(), "public", "dxn1-assets", "dxn1-os-1.0.iso");
    const st = await stat(isoPath);
    isoSize = st.size;
    isoSizeHuman = `${(st.size / 1024 / 1024).toFixed(1)} MiB`;
  } catch {}

  return NextResponse.json({
    ok: true,
    os: {
      name: manifest.name || "DXN1-OS",
      version: manifest.version || "1.0",
      codename: manifest.codename || "oxide",
      arch: manifest.arch || "x86_64",
      build_id: manifest.build_id,
      build_date: manifest.build_date,
      kernel: manifest.kernel || "5.10.0-32-amd64",
      base: manifest.base,
      toolchain: manifest.toolchain,
      iso: {
        label: manifest.iso_label || "DXN1OS",
        size_bytes: isoSize,
        size_human: isoSizeHuman,
        sha256: manifest.sha256 || KNOWN_SHA,
      },
      real: manifest.real ?? true,
      bootable: manifest.bootable ?? true,
      features: manifest.features || [
        "REAL Linux 5.10 kernel",
        "REAL busybox 1.35 initramfs",
        "UEFI-bootable via EFI_STUB",
        "Fully installable (3 modes)",
        "Auto-updater built-in",
      ],
    },
    downloads: {
      iso: {
        url: "/api/download/iso",
        github_url: GITHUB_RELEASE_ISO,
        filename: "dxn1-os-1.0.iso",
      },
      source: {
        url: "/api/download/source",
        github_url: GITHUB_RELEASE_SRC,
        filename: "dxn1-os-source.zip",
      },
    },
    repo: "DXN1-termux/DXN1-OS-TAKE-2",
  });
}
