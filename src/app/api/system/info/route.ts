import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "..",
      "dxn1-os",
      "iso-tree",
      "manifest.json"
    );
    let manifest;
    try {
      const raw = await readFile(manifestPath, "utf-8");
      manifest = JSON.parse(raw);
    } catch {
      manifest = {
        name: "DXN1-OS",
        version: "1.0",
        codename: "oxide",
        arch: "x86_64",
        kernel: "6.10.5",
      };
    }

    return NextResponse.json({
      ok: true,
      os: {
        name: manifest.name,
        version: manifest.version,
        codename: manifest.codename,
        arch: manifest.arch,
        build_id: manifest.build_id,
        build_date: manifest.build_date,
        kernel: manifest.kernel,
        base: manifest.base,
        toolchain: manifest.toolchain,
        iso: {
          label: manifest.iso_label,
          size_bytes: manifest.iso_size_bytes,
          size_human: manifest.iso_size_human,
          sha256: manifest.sha256,
        },
        install_profiles: manifest.install_profiles,
        boot: manifest.boot,
        boot_menu: manifest.boot_menu,
        driver_classes: manifest.driver_classes,
        features: manifest.features,
      },
      downloads: {
        iso: { url: "/api/download/iso", filename: "dxn1-os-1.0.iso" },
        source: { url: "/api/download/source", filename: "dxn1-os-source.zip" },
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
