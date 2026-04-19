import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { Amplify } from "aws-amplify";
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { Delegation } from "@/types/delegation";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function GET() {
  try {
    const { data: delegations, errors } = await client.models.Delegation.list();
    if (errors) throw new Error(errors[0].message);
    
    // Sort logic from existing app (usually happens client-side or implicit in getDelegations)
    return NextResponse.json(delegations, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    console.error("AWS GET Delegations Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let delegationData: Partial<Delegation> = {};

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

    // Assign numerical ID equivalent
    if (!delegationData.id) {
       // A robust system would use a counter or UUID, keeping String for now to match interface
       delegationData.id = Date.now().toString(); 
    }

    // Strip UI helpers if any
    const { createdAt, updatedAt, ...cleanData } = delegationData as any;
    
    const payload = {
       ...cleanData,
       id: String(delegationData.id),
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
    };

    const { data: newDelegation, errors } = await client.models.Delegation.create(payload);
    if (errors) throw new Error(errors[0].message);

    // Send WhatsApp Notification
    try {
      const assignedUser = await getUserByUsernameOrEmail(delegationData.assigned_to || "");
      if (assignedUser && assignedUser.phone) {
        const formattedDueDate = formatDate(delegationData.due_date || "");
        const message = `🔔 *New Delegation Assigned*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${delegationData.title}\n🎯 *Priority:* ${delegationData.priority}\n⏳ *Due Date:* ${formattedDueDate}\n👨‍💼 *Assigned By:* ${delegationData.assigned_by}\n📝 *Description:* ${delegationData.description}`;
        await sendWhatsAppMessage(assignedUser.phone, message);
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification:", err);
    }

    return NextResponse.json({ message: "Delegation added successfully to AWS", delegation: newDelegation });

  } catch (error: any) {
    console.error("AWS POST Delegation Error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
