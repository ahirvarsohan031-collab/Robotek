import { NextRequest, NextResponse } from "next/server";
import { updateOrder, deleteOrderByNo } from "@/lib/o2d-sheets";
import { O2D } from "@/types/o2d";

const O2D_FOLDER_ID = "19ZqWS5zYD2P4SIpcGNQR8gXcDiagH2rq";
import { uploadFileToDrive } from "@/lib/google-drive";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const contentType = req.headers.get("content-type") || "";
    
    let updatedItems: O2D[] = [];
    let screenshotId = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      updatedItems = JSON.parse(formData.get("o2dData") as string) as O2D[];
      const screenshotFile = formData.get("order_screenshot") as File;

      if (screenshotFile && screenshotFile.size > 0) {
        screenshotId = await uploadFileToDrive(screenshotFile, O2D_FOLDER_ID) || "";
      } else {
        // Keep existing screenshot if not provided
        screenshotId = updatedItems[0]?.order_screenshot || "";
      }
    } else {
      updatedItems = await req.json();
      screenshotId = updatedItems[0]?.order_screenshot || "";
    }

    // Apply screenshot ID to all items in the order
    const finalItems = updatedItems.map(item => ({
      ...item,
      order_screenshot: screenshotId
    }));

    const success = await updateOrder(orderNo, finalItems);
    if (success) {
      return NextResponse.json({ message: "Order updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const success = await deleteOrderByNo(orderNo);
    if (success) {
      return NextResponse.json({ message: "Order deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
