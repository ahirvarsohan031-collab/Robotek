import { NextRequest, NextResponse } from "next/server";
import { getO2Ds } from "@/lib/o2d-sheets";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateCSV(data: any[], selectedSteps: number[], includeDetails: boolean): string {
  const O2D_STEP_SHORTS = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7", "Step 8", "Step 9", "Step 10", "Step 11"];
  
  // Define column groups
  const detailHeaders = [
    "Order No",
    "Party Name",
    "Item Name",
    "Item Qty",
    "Est Amount",
    "Created At",
    "Filled By",
    "Remark",
  ];

  // Dynamic headers based on user selection
  let headers: string[] = [];
  if (includeDetails) headers = [...detailHeaders];

  selectedSteps
    .sort((a, b) => a - b)
    .forEach((stepIdx) => {
      const stepName = O2D_STEP_SHORTS[stepIdx - 1];
      headers.push(`${stepName} (Status)`);
      headers.push(`${stepName} (Actual)`);
      headers.push(`${stepName} (Planned)`);
    });

  const csvRows = [headers.join(",")];

  data.forEach((item) => {
    let row: string[] = [];

    if (includeDetails) {
      row = [
        item.order_no,
        `"${item.party_name.replace(/"/g, '""')}"`,
        `"${item.item_name.replace(/"/g, '""')}"`,
        item.item_qty,
        item.est_amount,
        (() => {
          if (!item.created_at) return "-";
          const d = new Date(item.created_at);
          const pad = (n: number) => n.toString().padStart(2, "0");
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        })(),
        `"${item.filled_by || ""}"`,
        `"${(item.remark || "").replace(/"/g, '""')}"`,
      ];
    }

    selectedSteps
      .sort((a, b) => a - b)
      .forEach((stepIdx) => {
        const status = (item as any)[`status_${stepIdx}`] || "-";
        const actual = (item as any)[`actual_${stepIdx}`]
          ? new Date((item as any)[`actual_${stepIdx}`]).toLocaleString()
          : "-";
        const planned = (item as any)[`planned_${stepIdx}`]
          ? new Date((item as any)[`planned_${stepIdx}`]).toLocaleString()
          : "-";
        row.push(status);
        row.push(`"${actual}"`);
        row.push(`"${planned}"`);
      });

    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selectedSteps = [], includeDetails = true } = body;

    // Fetch all O2D data
    const allO2Ds = await getO2Ds();
    
    if (allO2Ds.length === 0) {
      return NextResponse.json({ error: "No data to export" }, { status: 400 });
    }

    // Generate CSV
    const csvContent = generateCSV(allO2Ds, selectedSteps, includeDetails);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `O2D_Export_${timestamp}.csv`;

    // Return CSV as direct download (works on localhost and AWS)
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
}
