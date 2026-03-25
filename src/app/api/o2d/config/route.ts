import { NextRequest, NextResponse } from "next/server";
import { getO2DStepConfig, updateO2DStepConfig } from "@/lib/o2d-sheets";
import { O2DStepConfig } from "@/types/o2d";

export async function GET() {
  try {
    const configs = await getO2DStepConfig();
    return NextResponse.json(configs);
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const configs: O2DStepConfig[] = await req.json();
    const success = await updateO2DStepConfig(configs);
    
    if (success) {
      return NextResponse.json({ message: "Config updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
  } catch (error) {
    console.error("API POST Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
