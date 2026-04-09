import { NextRequest, NextResponse } from "next/server";
import { updateDelegation, deleteDelegation, getDelegations } from "@/lib/delegation-sheets";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { Delegation } from "@/types/delegation";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

const DELEGATION_FOLDER_ID = "1Rz8tFgUBfLI0WBEXXdZplJJ2zsk0H4l6";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";
    let delegationData: Partial<Delegation>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      delegationData = JSON.parse(formData.get("delegationData") as string);
      
      const voiceNoteFile = formData.get("voice_note") as File;
      const refDocFile = formData.get("reference_doc") as File;

      if (voiceNoteFile && voiceNoteFile.size > 0) {
        const fileId = await uploadFileToDrive(voiceNoteFile, DELEGATION_FOLDER_ID);
        if (fileId) {
          delegationData.voice_note_url = fileId;
        }
      }

      if (refDocFile && refDocFile.size > 0) {
        const fileId = await uploadFileToDrive(refDocFile, DELEGATION_FOLDER_ID);
        if (fileId) {
          delegationData.reference_docs = fileId;
        }
      }
    } else {
      delegationData = await req.json();
    }

    // Pass the merged object back to Google Sheets updating
    await updateDelegation(id, delegationData as Delegation);

    // Send WhatsApp Notification for Update
    try {
      const assignedUser = await getUserByUsernameOrEmail(delegationData.assigned_to || "");
      if (assignedUser && assignedUser.phone) {
        const formattedDueDate = formatDate(delegationData.due_date || "");
        const message = `📝 *Delegation Updated*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${delegationData.title}\n🎯 *Priority:* ${delegationData.priority}\n⏳ *Due Date:* ${formattedDueDate}\n👨‍💼 *Assigned By:* ${delegationData.assigned_by}\n📝 *Description:* ${delegationData.description}`;
        await sendWhatsAppMessage(assignedUser.phone, message);
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification:", err);
    }

    return NextResponse.json({ message: "Delegation updated successfully" });
  } catch (error: any) {
    console.error("API Error updating delegation:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update delegation" 
    }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const delegations = await getDelegations();
    const current = delegations.find(d => String(d.id) === String(id));

    const success = await deleteDelegation(id);
    if (success) {
      // Send WhatsApp Notification for Deletion
      if (current) {
        try {
          const assignedUser = await getUserByUsernameOrEmail(current.assigned_to || "");
          if (assignedUser && assignedUser.phone) {
            const message = `🗑️ *Delegation Deleted*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${current.title}\n👤 *Assigned To:* ${current.assigned_to}\n\n_This task has been removed from the system._`;
            await sendWhatsAppMessage(assignedUser.phone, message);
          }
        } catch (err) {
          console.error("Error sending WhatsApp notification:", err);
        }
      }
      return NextResponse.json({ message: "Delegation deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete delegation" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error deleting delegation:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
