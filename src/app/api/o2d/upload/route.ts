import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive } from "@/lib/google-drive";

const O2D_FOLDER_ID = "19ZqWS5zYD2P4SIpcGNQR8gXcDiagH2rq";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderNo = formData.get("orderNo") as string;
    const step = formData.get("step") as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Explicitly upload to the O2D folder
    const fileId = await uploadFileToDrive(file, O2D_FOLDER_ID);
    
    if (!fileId) {
      throw new Error("Failed to upload file to Google Drive");
    }

    return NextResponse.json({ fileId });
  } catch (error: any) {
    console.error("Upload Step Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
