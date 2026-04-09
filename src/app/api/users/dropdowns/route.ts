import { NextRequest, NextResponse } from "next/server";
import { getDropdownData, addDropdownOption } from "@/lib/google-sheets";

export async function GET() {
  try {
    const data = await getDropdownData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dropdowns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, value } = await req.json();
    if (!type || !value) {
      return NextResponse.json({ error: "Missing type or value" }, { status: 400 });
    }

    const success = await addDropdownOption(type, value);
    if (success) {
      return NextResponse.json({ message: "Option added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add option" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
