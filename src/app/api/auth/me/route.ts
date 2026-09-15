import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Returns the current session user (or null).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, user: null });
  }
  return NextResponse.json({
    ok: true,
    user: {
      email: session.user.email,
      name: session.user.name,
      role: (session.user as any).role,
      setupComplete: (session.user as any).setupComplete,
    },
  });
}
