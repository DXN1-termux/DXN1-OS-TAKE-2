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
      "dxn1-os-1.0.iso"
    );
    const data = await readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="dxn1-os-1.0.iso"',
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "iso not found: " + String(e) },
      { status: 404 }
    );
  }
}
