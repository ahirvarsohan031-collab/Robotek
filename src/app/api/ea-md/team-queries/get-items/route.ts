import { NextRequest, NextResponse } from "next/server";
import { getTeamQueryItems } from "@/lib/team-queries-sheets";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const items = await getTeamQueryItems();
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
