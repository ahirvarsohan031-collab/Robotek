import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFileToDrive } from "@/lib/google-drive";

const CHAT_UPLOADS_FOLDER_ID = "1Ce_cdrXz6V02nu0eceGwUJu9N0o3f3DZ";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file found in request" },
        { status: 400 }
      );
    }

    const fileId = await uploadFileToDrive(file, CHAT_UPLOADS_FOLDER_ID);

    if (!fileId) {
      throw new Error("Failed to upload to Google Drive");
    }

    return NextResponse.json({ 
      success: true, 
      fileId: fileId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

