import { NextResponse } from 'next/server';
import { saveFollowUpData } from '@/lib/scot-sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partyName, status, nextFollowUpDate, remarks, createdBy, lastFollowUpDate } = body;

    if (!partyName || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const record = {
      partyName,
      status,
      nextFollowUpDate: nextFollowUpDate || "",
      remarks: remarks || "",
      createdBy: createdBy || "Unknown",
      createdAt: body.createdAt || new Date().toISOString(),
      lastFollowUpDate: lastFollowUpDate || ""
    };

    const success = await saveFollowUpData(record);

    if (success) {
      return NextResponse.json({ message: "Follow-up saved successfully" });
    } else {
      return NextResponse.json({ error: "Failed to save follow-up to sheet" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in follow-up API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
