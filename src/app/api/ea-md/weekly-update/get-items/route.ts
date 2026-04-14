import { NextResponse } from "next/server";
import { getWeeklyUpdateItems } from "@/lib/ea-md-sheets";

export async function GET() {
  try {
    console.log("[Weekly Update API GET] Fetching items...");
    
    const items = await getWeeklyUpdateItems();

    console.log("[Weekly Update API GET] Retrieved", items.length, "items");

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("[Weekly Update API GET] Error:", error.message);
    return NextResponse.json(
      { 
        error: "Failed to fetch items",
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
