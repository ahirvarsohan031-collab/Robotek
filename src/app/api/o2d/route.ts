import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getO2Ds, addO2D, addO2Ds, getO2DDetails, addItem, getO2DsPaginated, getO2DSummary, getScotDashboardMetrics } from "@/lib/o2d-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { O2D } from "@/types/o2d";
import { auth } from "@/auth";

const O2D_FOLDER_ID = "19ZqWS5zYD2P4SIpcGNQR8gXcDiagH2rq";

export async function GET(req: NextRequest) {
  const session = await auth();
  const currentUser = (session?.user as any)?.username || "";
  const userRole = (session?.user as any)?.role || "User";

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const allData = searchParams.get("all");
  
  if (type === "details") {
    const details = await getO2DDetails();
    return NextResponse.json(details);
  }

  if (type === "scotDashboard") {
    const metrics = await getScotDashboardMetrics();
    return NextResponse.json(metrics, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  }

  // Return all unique order numbers for filter dropdowns
  if (type === "ordernumbers") {
    const o2ds = await getO2Ds();
    const orderNumbers = Array.from(new Set(o2ds.map((o) => o.order_no).filter(Boolean))).sort((a, b) => b.localeCompare(a));
    return NextResponse.json(orderNumbers, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  }

  // If ?all=true is passed, return all data without pagination (for sidebar counting)
  if (allData === "true") {
    const o2ds = await getO2Ds();
    return NextResponse.json(o2ds, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  }

  // Get pagination params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const search = searchParams.get("search") || "";
  
  // Get filter params
  const dateFiltersStr = searchParams.get("dateFilters") || "[]";
  const stepFiltersStr = searchParams.get("stepFilters") || "[]";
  const partyFilter = searchParams.get("partyFilter") || "";
  const orderFilter = searchParams.get("orderFilter") || "";
  const itemNameFilter = searchParams.get("itemNameFilter") || "";
  const pendingFilter = searchParams.get("pendingFilter") === "true";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  try {
    const dateFilters = JSON.parse(dateFiltersStr);
    const stepFilters = JSON.parse(stepFiltersStr);

    // Return paginated data with metadata (with all filters applied server-side)
    const result = await getO2DsPaginated(
      page,
      limit,
      search,
      dateFilters,
      stepFilters,
      partyFilter,
      orderFilter,
      itemNameFilter,
      pendingFilter,
      startDate,
      endDate,
      currentUser,
      userRole
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error("Pagination error:", error);
    return NextResponse.json({ error: "Pagination failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "item") {
      const { name, price, gst, finalPrice } = await req.json();
      const success = await addItem(name, price, gst, finalPrice);
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
