import { NextRequest, NextResponse } from "next/server";
import { getDelegations, updateDelegation, addDelegationRevision } from "@/lib/delegation-sheets";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { DelegationRevision } from "@/types/delegation";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";
import { v4 as uuidv4 } from "uuid";

const DELEGATION_FOLDER_ID = "1Rz8tFgUBfLI0WBEXXdZplJJ2zsk0H4l6";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const formData = await req.formData();
    const newStatus = formData.get("status") as string;
    const reason = formData.get("reason") as string || "";
    const revisedDueDate = formData.get("revised_due_date") as string || "";
    const evidenceFile = formData.get("evidence") as File;

    // Get current delegation to have old values
    const delegations = await getDelegations();
    const current = delegations.find(d => String(d.id) === String(id));

    if (!current) {
      return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
    }

    let evidenceUrl = "";
    if (evidenceFile && evidenceFile.size > 0) {
      evidenceUrl = await uploadFileToDrive(evidenceFile, DELEGATION_FOLDER_ID) || "";
    }

    // Update main delegation
    const updatedDelegation = {
      ...current,
      status: newStatus,
      due_date: revisedDueDate || current.due_date,
      updated_at: new Date().toISOString()
    };

    await updateDelegation(id, updatedDelegation);

    // Add revision history
    const revision: DelegationRevision = {
      id: uuidv4(),
      delegation_id: id,
      old_status: current.status,
      new_status: newStatus,
      old_due_date: current.due_date,
      new_due_date: revisedDueDate || current.due_date,
      reason: reason,
      created_at: new Date().toISOString(),
      evidence_urls: evidenceUrl
    };

    await addDelegationRevision(revision);

    // Send WhatsApp Notifications for Status Change
    try {
      const formattedNow = formatDate(new Date().toISOString());
      const message = `🔄 *Delegation Status Updated*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${current.title}\n🎯 *Priority:* ${current.priority}\n👤 *Assigned To:* ${current.assigned_to}\n👨‍💼 *Assigned By:* ${current.assigned_by}\n📉 *From:* ${current.status}\n📈 *To:* ${newStatus}\n📝 *Reason:* ${reason || "N/A"}\n⏱️ *Updated At:* ${formattedNow}`;
      
      // Notify both parties
      const parties = [current.assigned_to, current.assigned_by];
      const uniqueParties = [...new Set(parties)];

      for (const username of uniqueParties) {
        if (!username) continue;
        const user = await getUserByUsernameOrEmail(username);
        if (user && user.phone) {
          await sendWhatsAppMessage(user.phone, message);
        }
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification:", err);
    }

    return NextResponse.json({ 
      message: "Status updated and revision logged",
      delegation: updatedDelegation
    });
  } catch (error) {
    console.error("API Error updating status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
