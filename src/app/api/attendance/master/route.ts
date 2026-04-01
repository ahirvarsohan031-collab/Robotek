import { NextRequest, NextResponse } from "next/server";
import { getAttendanceRecords, getLeaveRequests } from "@/lib/sheets/attendance-sheets";
import { getUsers } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  try {
    const [users, attendance, leaves] = await Promise.all([
      getUsers(),
      getAttendanceRecords(),
      getLeaveRequests()
    ]);

    return NextResponse.json({
      users,
      attendance,
      leaves
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch master data" }, { status: 500 });
  }
}
