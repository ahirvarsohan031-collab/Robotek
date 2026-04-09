import { NextResponse } from "next/server";
import { getDelegations } from "@/lib/delegation-sheets";
import { getChecklists } from "@/lib/checklist-sheets";
import { getO2Ds, getO2DStepConfig } from "@/lib/o2d-sheets";
import { getUsers } from "@/lib/google-sheets";
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
      return new Date(`${year}-${month}-${day}T${timePart}`);
    }
  }
  return null;
}

function isDateInRange(date: Date | null, from: Date, to: Date): boolean {
  if (!date) return false;
  return date >= from && date <= to;
}

function calculateMetrics(tasks: any[], from: Date, to: Date) {
  const inRange = tasks.filter(t => isDateInRange(t.plannedDate, from, to) || (t.actualDate && isDateInRange(t.actualDate, from, to)));
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
    onTimeRate,
    finalScore: Math.round((score + onTimeRate) / 2)
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const filterType = searchParams.get("type") || "month";

  const now = new Date();
  const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const session = await auth();
  const userRole = (session?.user as any)?.role?.toUpperCase();
  const userId = session?.user?.id;
  const isPrivileged = userRole === "ADMIN" || userRole === "EA";

  try {
    const [delegations, checklists, o2ds, stepConfigs, users] = await Promise.all([
      getDelegations(),
      getChecklists(),
      getO2Ds(),
      getO2DStepConfig(),
      getUsers()
    ]);

    const allTasks: any[] = [];

    // Process Delegations
    delegations.forEach(d => {
      const planned = parseDate(d.due_date);
      const actual = d.status === "Completed" || d.status === "Approved" ? parseDate(d.updated_at) : null;
      allTasks.push({
        category: "delegation",
        user: d.assigned_to,
        plannedDate: planned,
        actualDate: actual,
        isCompleted: !!actual,
        isLate: planned && actual ? actual > planned : false,
        title: d.title,
        id: d.id,
        status: d.status
      });
    });

    // Process Checklists
    checklists.forEach(c => {
      const planned = parseDate(c.due_date);
      const actual = c.status === "Completed" ? parseDate(c.updated_at) : null;
      allTasks.push({
        category: "checklist",
        user: c.assigned_to,
        plannedDate: planned,
        actualDate: actual,
        isCompleted: !!actual,
        isLate: planned && actual ? actual > planned : false,
        title: c.task,
        id: c.id,
        status: c.status
      });
    });

    // Process O2D
    o2ds.forEach(order => {
      if (order.hold || order.cancelled) return;
      for (let i = 1; i <= 11; i++) {
        const plannedStr = (order as any)[`planned_${i}`];
        if (!plannedStr) continue;
        const config = stepConfigs.find(sc => sc.step_name.includes(`Step ${i}`) || stepConfigs.indexOf(sc) === i - 1);
        const responsible = config?.responsible_person;
        if (!responsible) continue;

        const actualStr = (order as any)[`actual_${i}`] || (order as any)[`acual_${i}`];
        const status = (order as any)[`status_${i}`];
        const isDone = status === "Yes" || status === "Done";
        
        const planned = parseDate(plannedStr);
        const actual = isDone ? parseDate(actualStr) : null;

        allTasks.push({
          category: "o2d",
          user: responsible,
          plannedDate: planned,
          actualDate: actual,
          isCompleted: !!actual,
          isLate: planned && actual ? actual > planned : false,
          title: `${order.party_name} - Step ${i}: ${config.step_name}`,
          id: `${order.order_no}-S${i}`,
          status: status
        });
      }
    });

    // Trend Periods
    const periods: { from: Date; to: Date; label: string }[] = [];
    if (filterType === 'week') {
      // Day-wise for the 7 days of the week
      for (let i = 0; i < 7; i++) {
        const d = new Date(from);
        d.setDate(from.getDate() + i);
        const start = new Date(d); start.setHours(0,0,0,0);
        const end = new Date(d); end.setHours(23,59,59,999);
        periods.push({ from: start, to: end, label: d.toLocaleDateString('en-US', { weekday: 'short' }) });
      }
    } else if (filterType === 'month') {
      // Week-wise blocks (W1–W5) for the month
      let curr = new Date(from);
      let count = 1;
      while (curr <= to && count <= 6) {
        const start = new Date(curr);
        const end = new Date(curr);
        end.setDate(curr.getDate() + 6);
        if (end > to) end.setTime(to.getTime());
        end.setHours(23,59,59,999);
        periods.push({ from: start, to: end, label: `W${count}` });
        curr.setDate(curr.getDate() + 7);
        count++;
      }
    } else {
      // Custom / Till Date: Day-wise buckets
      let curr = new Date(from);
      while (curr <= to) {
        const start = new Date(curr); start.setHours(0,0,0,0);
        const end = new Date(curr); end.setHours(23,59,59,999);
        periods.push({
          from: start,
          to: end,
          label: curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    const userResult = users.map((u: any) => {
      const userTasks = allTasks.filter(t => {
        if (t.category === 'o2d') {
          return t.user.split(",").map((s: string) => s.trim()).includes(u.username);
        }
        return t.user === u.username;
      });
      const metrics = calculateMetrics(userTasks, from, to);
      
      const delegation = calculateMetrics(userTasks.filter(t => t.category === 'delegation'), from, to);
      const checklist = calculateMetrics(userTasks.filter(t => t.category === 'checklist'), from, to);
      const o2d = calculateMetrics(userTasks.filter(t => t.category === 'o2d'), from, to);

      const trendData = periods.map(p => {
        const pMetrics = calculateMetrics(userTasks, p.from, p.to);
        return { label: p.label, score: pMetrics.score, onTime: pMetrics.onTimeRate, finalScore: pMetrics.finalScore };
      });

      return {
        user: { id: u.id, username: u.username, roleName: u.role_name || u.role, image_url: u.image_url },
        ...metrics,
        delegationStats: { ...delegation, items: userTasks.filter(t => t.category === 'delegation' && (isDateInRange(t.plannedDate, from, to) || (t.actualDate && isDateInRange(t.actualDate, from, to)))) },
        checklistStats: { ...checklist, items: userTasks.filter(t => t.category === 'checklist' && (isDateInRange(t.plannedDate, from, to) || (t.actualDate && isDateInRange(t.actualDate, from, to)))) },
        o2dStats: { ...o2d, items: userTasks.filter(t => t.category === 'o2d' && (isDateInRange(t.plannedDate, from, to) || (t.actualDate && isDateInRange(t.actualDate, from, to)))) },
        trendData
      };
    });

    // Filter users based on privilege
    const filteredUsers = isPrivileged 
      ? userResult 
      : userResult.filter(u => u.user.id === userId);

    const company = calculateMetrics(allTasks, from, to);

    // Company-level trend data for the chart
    const companyTrend = periods.map(p => {
      const pMetrics = calculateMetrics(allTasks, p.from, p.to);
      return { label: p.label, score: pMetrics.score, onTime: pMetrics.onTimeRate, finalScore: pMetrics.finalScore };
    });

    return NextResponse.json({ 
      company: isPrivileged ? company : null, 
      companyTrend: isPrivileged ? companyTrend : [], 
      users: filteredUsers 
    });
  } catch (error) {
    console.error("Score aggregation error:", error);
    return NextResponse.json({ error: "Failed to aggregate score data" }, { status: 500 });
  }
}
