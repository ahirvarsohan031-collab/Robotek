import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getO2Ds, addO2D, addO2Ds, getO2DDetails, addItem } from "@/lib/o2d-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { O2D } from "@/types/o2d";

const O2D_FOLDER_ID = "19ZqWS5zYD2P4SIpcGNQR8gXcDiagH2rq";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  
  if (type === "details") {
    const details = await getO2DDetails();
    return NextResponse.json(details);
  }

  const o2ds = await getO2Ds();
  return NextResponse.json(o2ds);
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "item") {
      const { name, price } = await req.json();
      const success = await addItem(name, price);
      if (success) {
        return NextResponse.json({ message: "Item added successfully" });
      } else {
        return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
      }
    }

    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const o2dDataArray = JSON.parse(formData.get("o2dData") as string) as Partial<O2D>[];
      const screenshotFile = formData.get("order_screenshot") as File;

      let screenshotId = "";
      if (screenshotFile && screenshotFile.size > 0) {
        screenshotId = await uploadFileToDrive(screenshotFile, O2D_FOLDER_ID) || "";
      }

      const o2dsToSave = o2dDataArray.map(item => ({
        ...item,
        order_screenshot: screenshotId,
      } as O2D));

      const success = await addO2Ds(o2dsToSave);
      if (!success) throw new Error("Failed to add O2D records");

      return NextResponse.json({ message: "O2D records added successfully" });
    } else {
      const o2dData = await req.json();
      const success = await addO2D(o2dData as O2D);
      if (success) {
        return NextResponse.json({ message: "O2D record added successfully" });
      } else {
        return NextResponse.json({ error: "Failed to add O2D" }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
