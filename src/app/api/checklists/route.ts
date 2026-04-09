import { NextRequest, NextResponse } from "next/server";
import { getChecklists, addChecklist } from "@/lib/checklist-sheets";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { Checklist } from "@/types/checklist";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

export async function GET() {
  const checklists = await getChecklists();
  return NextResponse.json(checklists);
}

export async function POST(req: NextRequest) {
  try {
    const checklistData: Checklist = await req.json();

    const success = await addChecklist(checklistData);
    if (success) {
      // Send WhatsApp Notification
      try {
        const assignedUser = await getUserByUsernameOrEmail(checklistData.assigned_to || "");
        if (assignedUser && assignedUser.phone) {
          const formattedDueDate = formatDate(checklistData.due_date || "");
          const message = `🔔 *New Checklist Assigned*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${checklistData.task}\n🎯 *Priority:* ${checklistData.priority}\n🏢 *Department:* ${checklistData.department}\n⏳ *Due Date:* ${formattedDueDate}\n👨‍💼 *Assigned By:* ${checklistData.assigned_by}`;
          await sendWhatsAppMessage(assignedUser.phone, message);
        }
      } catch (err) {
        console.error("Error sending WhatsApp notification:", err);
      }

      return NextResponse.json({ message: "Checklist added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add checklist" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
