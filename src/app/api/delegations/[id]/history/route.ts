import { NextRequest, NextResponse } from "next/server";
import { getDelegationHistory } from "@/lib/delegation-sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const history = await getDelegationHistory(id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("API Error fetching history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
