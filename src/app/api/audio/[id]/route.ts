import { NextRequest, NextResponse } from "next/server";
import { getFileStream } from "@/lib/google-drive";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse("Missing file ID", { status: 400 });
    }

    const fileData = await getFileStream(id);
    if (!fileData) {
      return new NextResponse("File not found or unauthorized", { status: 404 });
    }

    // Set headers for audio streaming
    const headers = new Headers();
    if (fileData.mimeType) headers.set("Content-Type", fileData.mimeType);
    if (fileData.size) headers.set("Content-Length", fileData.size.toString());
    headers.set("Content-Disposition", `inline; filename="${fileData.name}"`);
    headers.set("Accept-Ranges", "bytes");

    // Return the stream as a response
    return new NextResponse(fileData.stream as any, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Audio Proxy Error:", error);
    return new NextResponse("Error streaming audio", { status: 500 });
  }
}
