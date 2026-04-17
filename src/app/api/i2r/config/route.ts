import { NextRequest, NextResponse } from "next/server";
import { getI2RStepConfig, updateI2RStepConfig } from "@/lib/i2r-sheets";
import { I2RStepConfig } from "@/types/i2r";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await getI2RStepConfig();
    return NextResponse.json(configs);
  } catch (error) {
    console.error("I2R config GET error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const configs: I2RStepConfig[] = await req.json();
    const success = await updateI2RStepConfig(configs);
    if (success) {
      return NextResponse.json({ message: "Config updated successfully" });
    }
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  } catch (error) {
    console.error("I2R config POST error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
