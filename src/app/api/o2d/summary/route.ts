import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getO2DSummary } from "@/lib/o2d-sheets";

export async function GET(req: NextRequest) {
  try {
    const summary = await getO2DSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching O2D summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
