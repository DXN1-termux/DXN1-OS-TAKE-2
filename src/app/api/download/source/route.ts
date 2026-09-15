import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "dxn1-assets",
      "dxn1-os-source.zip"
    );
    const data = await readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="dxn1-os-source.zip"',
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "source archive not found: " + String(e) },
      { status: 404 }
    );
  }
}
