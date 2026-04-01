import { NextRequest, NextResponse } from "next/server";
import { getLeaveRequests, addLeaveRequest, updateLeaveStatus, getLeaveRemarks, addLeaveRemark } from "@/lib/sheets/attendance-sheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const type = searchParams.get('type');
    const leaveId = searchParams.get('leaveId');

    if (type === 'remarks' && leaveId) {
      const allRemarks = await getLeaveRemarks();
      const remarks = allRemarks.filter(r => r.leaveId === leaveId);
      return NextResponse.json({ remarks });
    }

    const allLeaves = await getLeaveRequests();
    let leaves = allLeaves;

    if (role !== 'Admin' && userId) {
      leaves = allLeaves.filter(l => String(l.userId) === String(userId));
    }

    return NextResponse.json({ leaves });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { action, userId, userName, leaveId, status, comment } = data;

    if (action === 'UPDATE_STATUS') {
      if (!leaveId || !status) return NextResponse.json({ error: "Missing data" }, { status: 400 });
      await updateLeaveStatus(leaveId, status);
      return NextResponse.json({ success: true });

    } else if (action === 'ADD_REMARK') {
      if (!leaveId || !comment) return NextResponse.json({ error: "Missing data" }, { status: 400 });
      const newRemark = {
        id: `REM-${Date.now()}`,
        leaveId,
        userName,
        comment,
        createdAt: new Date().toISOString()
      };
      await addLeaveRemark(newRemark);
      return NextResponse.json({ success: true });

    } else {
      // Create new leave request
      const { startDate, endDate, reason } = data;
      if (!userId || !startDate || !endDate || !reason) return NextResponse.json({ error: "Missing data" }, { status: 400 });

      const newLeave = {
        id: `LV-${Date.now()}`,
        userId: String(userId),
        userName,
        startDate,
        endDate,
        reason,
        status: "Pending"
      };

      await addLeaveRequest(newLeave);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
