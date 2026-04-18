import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getO2DSummary } from "@/lib/o2d-sheets";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUser = (session?.user as any)?.username || "";
    const userRole = (session?.user as any)?.role || "User";

    const summary = await getO2DSummary(currentUser, userRole);
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error("Error fetching O2D summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
