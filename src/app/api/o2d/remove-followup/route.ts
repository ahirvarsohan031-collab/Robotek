import { NextRequest, NextResponse } from "next/server";
import { removeFollowUp } from "@/lib/o2d-sheets";

export async function POST(req: NextRequest) {
  try {
    const { orderNo, startStep, onlyThisStep } = await req.json();
    
    if (!orderNo || typeof startStep !== 'number') {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const success = await removeFollowUp(orderNo, startStep, onlyThisStep);
    
    if (success) {
      return NextResponse.json({ message: "Follow-up removed successfully" });
    } else {
      return NextResponse.json({ error: "Failed to remove follow-up" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
