import { NextRequest, NextResponse } from "next/server";
import { updateParty, deleteParty } from "@/lib/party-management-sheets";
import { PartyManagement } from "@/types/party-management";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const success = await updateParty(id, body as PartyManagement);
    
    if (success) {
      return NextResponse.json({ message: "Party updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update party" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await deleteParty(id);
    
    if (success) {
      return NextResponse.json({ message: "Party deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete party" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
