import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });

    const formData = await req.formData();
    const newStatus = formData.get("status") as string;
    const reason = formData.get("reason") as string || "";
    const revisedDueDate = formData.get("revised_due_date") as string || "";
    const evidenceFile = formData.get("evidence") as File;

    // Get current delegation
    const { data: current } = await client.models.Delegation.get({ id });

    if (!current) {
      return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
    }

    let evidenceUrl = "";
    if (evidenceFile && evidenceFile.size > 0) {
      const result = await uploadData({
        path: `delegations/${Date.now()}_evidence_${evidenceFile.name}`,
        data: evidenceFile,
      }).result;
      const { url } = await getUrl({ path: result.path });
      evidenceUrl = url.toString();
    }

    // Update main delegation
    const updatedDelegation = {
      ...current,
      status: newStatus,
      // If a revised date is given, use it, otherwise keep old
      due_date: revisedDueDate || current.due_date,
      updated_at: new Date().toISOString()
    };
    
    // AWS Update doesn't like passing __typename or createdAt if it was pulled raw
    const { __typename, createdAt, updatedAt, ...cleanUpdate } = updatedDelegation as any;

    const { errors: updateErr } = await client.models.Delegation.update({
        ...cleanUpdate,
        id 
    });

    if (updateErr) throw new Error(updateErr[0].message);

    // Add revision history
    const payloadRevision = {
      delegation_id: id,
      old_status: current.status || '',
      new_status: newStatus || '',
      old_due_date: current.due_date || '',
      new_due_date: revisedDueDate || current.due_date || '',
      reason: reason || '',
      created_at: new Date().toISOString(),
      evidence_urls: evidenceUrl || ''
    };

    const { errors: revErr } = await client.models.DelegationRevision.create(payloadRevision);
    if (revErr) throw new Error(revErr[0].message);

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
      message: "Status updated and revision logged via AWS",
      delegation: updatedDelegation
    });
  } catch (error: any) {
    console.error("API Error updating status in AWS:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
