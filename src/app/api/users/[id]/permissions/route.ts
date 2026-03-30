import { NextRequest, NextResponse } from "next/server";
import { getPagePermissions } from "@/lib/google-sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const allPermissions = await getPagePermissions();
    const userPermissions = allPermissions[id] || [];

    return NextResponse.json({ permissions: userPermissions });
  } catch (error) {
    console.error("API Error fetching permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
