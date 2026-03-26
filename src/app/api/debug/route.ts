import { NextResponse } from "next/server";
import { o2dService } from "@/lib/o2d-sheets";

export async function GET() {
  try {
    const client = await (o2dService as any).getSheetsClient();
    const res = await client.spreadsheets.values.get({
      spreadsheetId: "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc",
      range: "O2D!A1:CE1"
    });
    const headers = res.data.values?.[0] || [];
    const mapped = headers.map((h: string, i: number) => ({ index: i, header: h }));
    return NextResponse.json(mapped);
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
