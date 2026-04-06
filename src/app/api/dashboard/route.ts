import { NextRequest, NextResponse } from "next/server";
import { getAttendanceRecords, getLeaveRequests } from "@/lib/sheets/attendance-sheets";
import { getUsers } from "@/lib/google-sheets";
import { getTickets } from "@/lib/ticket-sheets";
import { getDelegations } from "@/lib/delegation-sheets";
import { getChecklists } from "@/lib/checklist-sheets";
import { getMeetings } from "@/lib/meeting-sheets";
import { getO2Ds, getO2DStepConfig } from "@/lib/o2d-sheets";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  if (dateStr.includes("/")) {
    const parts = dateStr.split(" ");
    const dateParts = parts[0].split("/");
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts;
      const timePart = parts[1] || "00:00:00";
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`;
      return new Date(iso);
    }
  }
  return null;
}

function normalizeDateStr(dStr: string | undefined): string {
    if (!dStr) return '';
    const trimmed = dStr.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const [dd, mm, yyyy] = trimmed.split('/');
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts[2]?.length === 4) {
           return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return trimmed.split('T')[0];
}

function calculateMetrics(tasks: any[], from: Date, to: Date) {
  // Filter for Current Month tasks (matching score page logic)
  const inRange = tasks.filter(t => {
      if (!t.plannedDate) return false;
      const pd = new Date(t.plannedDate);
      const ad = t.actualDate ? new Date(t.actualDate) : null;
      return (pd >= from && pd <= to) || (ad && ad >= from && ad <= to);
  });

  const completed = inRange.filter(t => t.isCompleted);
  const onTime = completed.filter(t => !t.isLate);
  
  const totalCount = inRange.length;
  const completedCount = completed.length;
  const onTimeCount = onTime.length;
  
  const score = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const onTimeRate = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 0;
  
  return {
    total: totalCount,
    completed: completedCount,
    onTime: onTimeCount,
    score,
    onTimeRate
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session?.user as any)?.role?.toUpperCase();
    const userId = session?.user?.id;
    const username = (session?.user as any)?.username;
    const isAdmin = userRole === "ADMIN" || userRole === "EA";

    // 1. Define Range (Current Month) to match Score Page
    const now = new Date();
    
    // Robust IST calculation using Intl
    const istFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = istFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    
    const istYear = parseInt(getPart('year'));
    const istMonth = parseInt(getPart('month'));
    const istDay = parseInt(getPart('day'));
    const istHour = parseInt(getPart('hour'));
    const istMinute = parseInt(getPart('minute'));
    const istSecond = parseInt(getPart('second'));

    const istNow = new Date(istYear, istMonth - 1, istDay, istHour, istMinute, istSecond);
    const todayStrRaw = `${istYear}-${String(istMonth).padStart(2, '0')}-${String(istDay).padStart(2, '0')}`;
    const tMM = String(istMonth).padStart(2, '0');
    const tDD = String(istDay).padStart(2, '0');

    // Start of current month (IST relative)
    const from = new Date(istYear, istMonth - 1, 1, 0, 0, 0, 0);
    // End of current month
    const to = new Date(istYear, istMonth, 0, 23, 59, 59, 999);

    const [users, attendance, leaves, tickets, delegations, checklists, o2ds, stepConfigs, meetings] = await Promise.all([
      getUsers(),
      getAttendanceRecords(),
      getLeaveRequests(),
      getTickets(),
      getDelegations(),
      getChecklists(),
      getO2Ds(),
      getO2DStepConfig(),
      getMeetings()
    ]);

    const attendanceToday = attendance.filter((r: any) => normalizeDateStr(r.date) === todayStrRaw);

    // 2. Summary Counts
    const totalUsersCount = users.length;
    const inTodayCount = attendanceToday.length;
    
    const onLeaveToday = leaves.filter((l: any) => {
        if (l.status.toLowerCase() !== 'approved') return false;
        const start = new Date(normalizeDateStr(l.startDate));
        const end = new Date(normalizeDateStr(l.endDate));
        const today = new Date(todayStrRaw);
        return today >= start && today <= end;
    });
    const leaveTodayCount = onLeaveToday.length;
    const outOfOfficeCount = Math.max(0, totalUsersCount - inTodayCount);

    // 3. Birthdays
    const birthdays = users.filter((u: any) => {
      if (!u.dob) return false;
      const normalized = normalizeDateStr(u.dob);
      if (!normalized) return false;
      const [y, m, d] = normalized.split('-');
      return m === tMM && d === tDD;
    });

    // 4. Persistence: Non-resolved tickets
    const openTickets = tickets
        .filter((t: any) => t.status !== 'Resolved' && t.status !== 'Closed')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 5. Leave Dates for Calendar (User Specific)
    const userLeaves = leaves.filter((l: any) => (l.userName === username) && l.status.toLowerCase() === 'approved');
    const leaveDates: string[] = [];
    userLeaves.forEach((l: any) => {
       const startStr = normalizeDateStr(l.startDate);
       const endStr = normalizeDateStr(l.endDate);
       if (startStr && endStr) {
           let curr = new Date(startStr);
           const end = new Date(endStr);
           while (curr <= end) {
              leaveDates.push(curr.toISOString().split('T')[0]);
              curr.setDate(curr.getDate() + 1);
           }
       }
    });

    // 6. Score Data (Overall Company - MONTHLY)
    const allTasks: any[] = [];
    delegations.forEach((d: any) => {
      const planned = parseDate(d.due_date);
      const actual = d.status === "Completed" || d.status === "Approved" ? parseDate(d.updated_at) : null;
      allTasks.push({
        plannedDate: planned,
        actualDate: actual,
        isCompleted: !!actual,
        isLate: planned && actual ? actual > planned : false,
      });
    });
    checklists.forEach((c: any) => {
      const planned = parseDate(c.due_date);
      const actual = c.status === "Completed" ? parseDate(c.updated_at) : null;
      allTasks.push({
        plannedDate: planned,
        actualDate: actual,
        isCompleted: !!actual,
        isLate: planned && actual ? actual > planned : false,
      });
    });
    o2ds.forEach((order: any) => {
      if (order.hold || order.cancelled) return;
      for (let i = 1; i <= 11; i++) {
        const plannedStr = (order as any)[`planned_${i}`];
        if (!plannedStr) continue;
        const actualStr = (order as any)[`actual_${i}`] || (order as any)[`acual_${i}`];
        const status = (order as any)[`status_${i}`];
        const isDone = status === "Yes" || status === "Done";
        const planned = parseDate(plannedStr);
        const actual = isDone ? parseDate(actualStr) : null;
        allTasks.push({
          plannedDate: planned,
          actualDate: actual,
          isCompleted: !!actual,
          isLate: planned && actual ? actual > planned : false,
        });
      }
    });

    const companyMetrics = calculateMetrics(allTasks, from, to);

    // 7. Upcoming Meetings
    const upcomingMeetings = meetings
      .filter((m: any) => {
        const start = parseDate(m.start_time);
        if (!start) return false;
        return start >= new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate()); // Today and onwards
      })
      .sort((a: any, b: any) => parseDate(a.start_time)!.getTime() - parseDate(b.start_time)!.getTime())
      .slice(0, 10);

    return NextResponse.json({
      attendanceToday: attendanceToday.map((r: any) => ({
          ...r,
          role: users.find((u: any) => String(u.id) === String(r.userId))?.role_name || 'User'
      })).slice(0, 10),
      summary: {
        totalIn: inTodayCount,
        onLeave: leaveTodayCount,
        outOfOffice: outOfOfficeCount
      },
      leaveDates: Array.from(new Set(leaveDates)),
      birthdays: birthdays.map((u: any) => ({ username: u.username, role: u.role_name, image: u.image_url })),
      openTickets: (isAdmin ? openTickets : openTickets.filter((t: any) => t.raised_by === username || t.solver_person === username)).slice(0, 15),
      recentLeaves: (isAdmin ? leaves : leaves.filter((l: any) => l.userName === username)).slice(0, 5),
      upcomingMeetings,
      teamMembers: users.map((u: any) => ({ username: u.username, image_url: u.image_url })),
      score: companyMetrics,
      isAdmin
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
