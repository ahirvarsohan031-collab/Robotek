import { NextRequest, NextResponse } from "next/server";
import { getParties, addParty } from "@/lib/party-management-sheets";
import { PartyManagement } from "@/types/party-management";

export async function GET() {
  try {
    const parties = await getParties();
    return NextResponse.json(parties, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch parties" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const success = await addParty(body as PartyManagement);
    
    if (success) {
      return NextResponse.json({ message: "Party added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add party" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
