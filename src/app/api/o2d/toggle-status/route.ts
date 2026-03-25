import { NextRequest, NextResponse } from "next/server";
import { updateOrderToggleStatus } from "@/lib/o2d-sheets";

export async function POST(req: NextRequest) {
  try {
    const { orderNo, action, value } = await req.json();

    if (!orderNo || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (action !== "hold" && action !== "cancelled") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const timestamp = value ? new Date().toISOString() : "";
    const success = await updateOrderToggleStatus(orderNo, action, timestamp);

    if (success) {
      return NextResponse.json({ message: `Order ${action} state updated successfully` });
    } else {
      return NextResponse.json({ error: "Order not found or update failed" }, { status: 404 });
    }
  } catch (error) {
    console.error("Status Toggle API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
