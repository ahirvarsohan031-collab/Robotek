import { NextRequest, NextResponse } from "next/server";
import { updateChecklist, deleteChecklist, getChecklists } from "@/lib/checklist-sheets";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { Checklist } from "@/types/checklist";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing checklist ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    const checklistData: Checklist = await req.json();

    let success;
    if (groupId) {
      const { updateChecklistByGroup } = await import("@/lib/checklist-sheets");
      success = await updateChecklistByGroup(groupId, checklistData);
    } else {
      success = await updateChecklist(id, checklistData);
    }

    if (success) {
      // Send WhatsApp Notification for Update
      try {
        const assignedUser = await getUserByUsernameOrEmail(checklistData.assigned_to || "");
        if (assignedUser && assignedUser.phone) {
          const formattedDueDate = formatDate(checklistData.due_date || "");
          const message = `📝 *Checklist Updated*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${checklistData.task}\n🎯 *Priority:* ${checklistData.priority}\n🏢 *Department:* ${checklistData.department}\n⏳ *Due Date:* ${formattedDueDate}\n👨‍💼 *Assigned By:* ${checklistData.assigned_by}`;
          await sendWhatsAppMessage(assignedUser.phone, message);
        }
      } catch (err) {
        console.error("Error sending WhatsApp notification:", err);
      }

      return NextResponse.json({ message: "Checklist updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API Error updating checklist:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update checklist" 
    }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing checklist ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    let success;
    if (groupId) {
      const { deleteChecklistByGroup } = await import("@/lib/checklist-sheets");
      success = await deleteChecklistByGroup(groupId);
    } else {
      success = await deleteChecklist(id);
    }

    const checklists = await getChecklists();
    const current = checklists.find(d => String(d.id) === String(id));

    if (success) {
      // Send WhatsApp Notification for Deletion
      if (current) {
        try {
          const assignedUser = await getUserByUsernameOrEmail(current.assigned_to || "");
          if (assignedUser && assignedUser.phone) {
            const message = `🗑️ *Checklist Deleted*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${current.task}\n👤 *Assigned To:* ${current.assigned_to}\n\n_This checklist has been removed._`;
            await sendWhatsAppMessage(assignedUser.phone, message);
          }
        } catch (err) {
          console.error("Error sending WhatsApp notification:", err);
        }
      }
      return NextResponse.json({ message: "Checklist deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete checklist" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error deleting checklist:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
