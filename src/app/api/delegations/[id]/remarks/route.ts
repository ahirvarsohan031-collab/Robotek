import { NextRequest, NextResponse } from "next/server";
import { addDelegationRemark } from "@/lib/delegation-sheets";
import { auth } from "@/auth";
import { DelegationRemark } from "@/types/delegation";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { remark } = await req.json();

    if (!remark) {
      return NextResponse.json({ error: "Remark is required" }, { status: 400 });
    }

    const newRemark: DelegationRemark = {
      id: uuidv4(),
      delegation_id: id,
      user_id: session.user.id || "unknown",
      // @ts-ignore
      username: session.user.username || session.user.name || "Unknown User",
      remark: remark,
      created_at: new Date().toISOString(),
    };

    const success = await addDelegationRemark(newRemark);

    if (success) {
      return NextResponse.json({ message: "Remark added successfully", remark: newRemark });
    } else {
      return NextResponse.json({ error: "Failed to add remark" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error adding remark:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
