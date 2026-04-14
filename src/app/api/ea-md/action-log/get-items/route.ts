import { NextResponse } from "next/server";
import { getActionLogItems } from "@/lib/action-log-sheets";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await getActionLogItems();
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("[Action Log API] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch action log items" }, { status: 500 });
  }
}
