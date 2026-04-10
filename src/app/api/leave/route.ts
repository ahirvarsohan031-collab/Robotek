import { NextRequest, NextResponse } from "next/server";
import { getLeaveRequests, addLeaveRequest, updateLeaveStatus, getLeaveRemarks, addLeaveRemark, updateLeaveRequest, deleteLeaveRequest, deleteLeaveRemarks, LeaveRequest } from "@/lib/sheets/attendance-sheets";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate, formatDateMMM } from "@/lib/dateUtils";
import { getUsers } from "@/lib/google-sheets";

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
      leaves = allLeaves.filter(l => 
        String(l.userId) === String(userId) || 
        String(l.responsibility1) === String(userId) ||
        String(l.responsibility2) === String(userId) ||
        String(l.responsibility3) === String(userId)
      );
    }

    return NextResponse.json({ leaves });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { action, userId, userName, leaveId, status, comment, responsibility1, responsibility2, responsibility3, acceptedBy } = data;

    const allUsers = await getUsers();
    const getUserPhone = (id: string) => allUsers.find(u => String(u.id) === String(id))?.phone;

    if (action === 'UPDATE_STATUS') {
      if (!leaveId || !status) return NextResponse.json({ error: "Missing data" }, { status: 400 });
      await updateLeaveStatus(leaveId, status);
      
      // Notify Applicant
      const allLeaves = await getLeaveRequests();
      const lv = allLeaves.find(l => l.id === leaveId);
      if (lv) {
        const applicantPhone = getUserPhone(lv.userId);
        if (applicantPhone) {
          const message = `🔄 *Leave Status Changed*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n📅 *Period:* ${formatDateMMM(lv.startDate)} to ${formatDateMMM(lv.endDate)}\n🏷️ *New Status:* *${status}*\n\n_System generated notification_`;
          await sendWhatsAppMessage(applicantPhone, message);
        }
      }
      return NextResponse.json({ success: true });

    } else if (action === 'ACCEPT_RESPONSIBILITY') {
        if (!leaveId || !acceptedBy) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        await updateLeaveStatus(leaveId, "Pending", acceptedBy);
        
        // Notify Applicant
        const allLeaves = await getLeaveRequests();
        const lv = allLeaves.find(l => l.id === leaveId);
        if (lv) {
            const applicantPhone = getUserPhone(lv.userId);
            if (applicantPhone) {
                const message = `✅ *Responsibility Accepted*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n🤝 *Accepted By:* ${acceptedBy}\n📅 *Leave Period:* ${formatDateMMM(lv.startDate)} to ${formatDateMMM(lv.endDate)}\n\n_The colleague has confirmed they will handle your work._`;
                await sendWhatsAppMessage(applicantPhone, message);
            }
        }
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

      const allLeaves = await getLeaveRequests();
      const lv = allLeaves.find(l => l.id === leaveId);
      if (!lv) return NextResponse.json({ success: true });

      const template = `💬 *New Remark Added*\n━━━━━━━━━━━━━━━━━\n👤 *By:* ${userName}\n📝 *Comment:* ${comment}\n📄 *Ref Leave:* ${formatDateMMM(lv.startDate)} - ${formatDateMMM(lv.endDate)}\n\n_Please check your dashboard for details._`;

      if (lv.userName !== userName) {
          const applicantPhone = getUserPhone(lv.userId);
          if (applicantPhone) {
              await sendWhatsAppMessage(applicantPhone, template);
          }
      } else {
          const phones = [lv.responsibility1, lv.responsibility2, lv.responsibility3]
            .filter(Boolean)
            .map(id => getUserPhone(id!))
            .filter(Boolean);
          
          for (const phone of phones) {
            await sendWhatsAppMessage(phone!, template);
          }
      }
      return NextResponse.json({ success: true });

    } else {
      // Create new leave request
      const { startDate, endDate, reason } = data;
      if (!userId || !startDate || !endDate || !reason) return NextResponse.json({ error: "Missing data" }, { status: 400 });

      const newLeave: LeaveRequest = {
        id: `LV-${Date.now()}`,
        userId: String(userId),
        userName,
        startDate,
        endDate,
        reason,
        status: "Pending",
        responsibility1,
        responsibility2,
        responsibility3,
        updatedAt: new Date().toISOString()
      };

      await addLeaveRequest(newLeave);

      const getRName = (id?: string) => id ? allUsers.find(u => String(u.id) === String(id))?.username || id : '';
      const rNames = [responsibility1, responsibility2, responsibility3].filter(Boolean).map(getRName).join(', ');

      // Notify Applicant
      const applicantPhone = getUserPhone(userId);
      if (applicantPhone) {
        const message = `🔔 *Leave Application Submitted*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${userName}\n📅 *From:* ${formatDateMMM(startDate)}\n📅 *To:* ${formatDateMMM(endDate)}\n📝 *Reason:* ${reason}\n👥 *Responsibilities:* ${rNames || 'None'}\n\n_Your request is now pending review._`;
        await sendWhatsAppMessage(applicantPhone, message);
      }

      // Notify Responsibility selected
      const responsibilityIds = [responsibility1, responsibility2, responsibility3].filter(Boolean);
      for (const rId of responsibilityIds) {
          const rPhone = getUserPhone(rId!);
          if (rPhone) {
              const message = `📋 *New Responsibility Assigned*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${userName}\n📅 *From:* ${formatDateMMM(startDate)}\n📅 *To:* ${formatDateMMM(endDate)}\n🤝 *Your Role:* Responsibility Person\n\n_You have been marked to handle the work in their absence._`;
              await sendWhatsAppMessage(rPhone, message);
          }
      }

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    try {
        const data = await req.json();
        const { leaveId, ...updates } = data;
        if (!leaveId) return NextResponse.json({ error: "Missing leaveId" }, { status: 400 });

        await updateLeaveRequest(leaveId, updates);

        // Notify Applicant
        const allLeaves = await getLeaveRequests();
        const lv = allLeaves.find(l => l.id === leaveId);
        if (lv) {
            const allUsers = await getUsers();
            const applicantPhone = allUsers.find(u => String(u.id) === String(lv.userId))?.phone;
            if (applicantPhone) {
                const message = `📝 *Leave Request Updated*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n📅 *Updated To:* ${formatDateMMM(lv.startDate)} - ${formatDateMMM(lv.endDate)}\n📝 *Reason:* ${lv.reason}\n\n_Please check the dashboard for the latest details._`;
                await sendWhatsAppMessage(applicantPhone, message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const leaveId = searchParams.get('leaveId');
        if (!leaveId) return NextResponse.json({ error: "Missing leaveId" }, { status: 400 });

        // Get info before deleting for notification
        const allLeaves = await getLeaveRequests();
        const lv = allLeaves.find(l => l.id === leaveId);

        await deleteLeaveRequest(leaveId);
        await deleteLeaveRemarks(leaveId);

        if (lv) {
            const allUsers = await getUsers();
            const applicantPhone = allUsers.find(u => String(u.id) === String(lv.userId))?.phone;
            if (applicantPhone) {
                const message = `🗑️ *Leave Request Deleted*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n📅 *Was For:* ${formatDateMMM(lv.startDate)}\n\n_This leave request has been removed from the system._`;
                await sendWhatsAppMessage(applicantPhone, message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
    }
}
