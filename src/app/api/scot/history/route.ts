import { NextRequest, NextResponse } from "next/server";
import { getFollowUpData, getScotData } from "@/lib/scot-sheets";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const partyName = searchParams.get('partyName');
  const mobileNum = searchParams.get('mobileNum');

  if (!partyName) {
    return NextResponse.json({ error: "Party name is required" }, { status: 400 });
  }

  try {
    const allFollowUps = await getFollowUpData();
    const history = allFollowUps
      .filter(f => f.partyName.trim().toLowerCase() === partyName.trim().toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let feederLogs: any[] = [];
    if (mobileNum) {
      const allFeederData = await getScotData();
      feederLogs = allFeederData
        .filter(f => f.toNumber?.replace(/\D/g, '').endsWith(mobileNum.replace(/\D/g, '')))
        .sort((a, b) => new Date(`${b.callDate} ${b.callTime}`).getTime() - new Date(`${a.callDate} ${a.callTime}`).getTime());
    }

    return NextResponse.json({ history, feederLogs });
  } catch (error) {
    console.error("Error fetching follow-up history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
