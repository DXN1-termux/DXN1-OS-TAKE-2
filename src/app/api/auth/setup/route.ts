import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Complete the first-run setup: set role + mark setupComplete.
// Body: { role: "student" | "developer", experience?, interests? }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const body = await req.json();
    const role = body.role === "student" || body.role === "developer" ? body.role : "user";
    const experience = String(body.experience || "").slice(0, 64);

    const user = await db.user.update({
      where: { email: session.user.email },
      data: { role, setupComplete: true },
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role, setupComplete: user.setupComplete },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
