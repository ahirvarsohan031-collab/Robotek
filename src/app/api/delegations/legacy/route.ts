import { NextResponse } from "next/server";
import { getDelegations } from "@/lib/delegation-sheets";

export async function GET() {
  try {
    const delegations = await getDelegations();
    return NextResponse.json(delegations);
  } catch (error: any) {
    console.error("Failed to fetch legacy delegations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
