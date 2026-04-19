import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { Delegation } from "@/types/delegation";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });

    const contentType = req.headers.get("content-type") || "";
    let delegationData: Partial<Delegation>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      delegationData = JSON.parse(formData.get("delegationData") as string);
      
      const voiceNoteFile = formData.get("voice_note") as File;
      const refDocFile = formData.get("reference_doc") as File;

      if (voiceNoteFile && voiceNoteFile.size > 0) {
        const result = await uploadData({
          path: `delegations/${Date.now()}_voice_${voiceNoteFile.name}`,
          data: voiceNoteFile,
        }).result;
        const { url } = await getUrl({ path: result.path });
        delegationData.voice_note_url = url.toString();
      }

      if (refDocFile && refDocFile.size > 0) {
        const result = await uploadData({
          path: `delegations/${Date.now()}_ref_${refDocFile.name}`,
          data: refDocFile,
        }).result;
        const { url } = await getUrl({ path: result.path });
        delegationData.reference_docs = url.toString();
      }
    } else {
      delegationData = await req.json();
    }

    const { createdAt, updatedAt, ...cleanData } = delegationData as any;

    const { data: updatedDelegation, errors } = await client.models.Delegation.update({
      ...cleanData,
      id: id,
      updated_at: new Date().toISOString()
    });

    if (errors) throw new Error(errors[0].message);

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

    return NextResponse.json({ message: "Delegation updated successfully in AWS" });
  } catch (error: any) {
    console.error("API Error updating delegation:", error);
    return NextResponse.json({ error: error.message || "Failed to update delegation" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });

    const { data: current } = await client.models.Delegation.get({ id });

    // Cascade delete related records (revisions and remarks)
    try {
        const { data: revisions } = await client.models.DelegationRevision.list({ filter: { delegation_id: { eq: id } } });
        for (const r of revisions) await client.models.DelegationRevision.delete({ id: r.id });
        
        const { data: remarks } = await client.models.DelegationRemark.list({ filter: { delegation_id: { eq: id } } });
        for (const rm of remarks) await client.models.DelegationRemark.delete({ id: rm.id });
    } catch (cleanErr) {
        console.error("Failed to clean up related records:", cleanErr);
    }

    // Delete the task itself
    const { errors } = await client.models.Delegation.delete({ id });
    if (errors) throw new Error(errors[0].message);

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

    return NextResponse.json({ message: "Delegation deleted successfully from AWS" });
  } catch (error: any) {
    console.error("API Error deleting delegation:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
