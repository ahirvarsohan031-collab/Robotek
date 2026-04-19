import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { formatDate } from "@/lib/dateUtils";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { remark } = await req.json();

    if (!remark) {
      return NextResponse.json({ error: "Remark is required" }, { status: 400 });
    }

    const usernameStr = (session.user as any).username || session.user.name || "Unknown User";

    const payload = {
      delegation_id: id,
      user_id: session.user.id || "unknown",
      username: usernameStr,
      remark: remark,
      created_at: new Date().toISOString(),
    };

    const { data: newRemark, errors } = await client.models.DelegationRemark.create(payload);
    
    if (errors) throw new Error(errors[0].message);

    // Send WhatsApp notification for new remark
    try {
      const { data: delegation } = await client.models.Delegation.get({ id });
      
      if (delegation) {
        const formattedNow = formatDate(payload.created_at);
        const message = `💬 *New Delegation Comment*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${delegation.title}\n🎯 *Priority:* ${delegation.priority}\n👤 *Assigned To:* ${delegation.assigned_to}\n👨‍💼 *Assigned By:* ${delegation.assigned_by}\n📊 *Status:* ${delegation.status}\n\n🗣️ *Comment By:* ${usernameStr}\n📝 *Comment:* _${remark}_\n⏱️ *At:* ${formattedNow}`;

        const parties = [delegation.assigned_to, delegation.assigned_by];
        const uniqueParties = [...new Set(parties)];
        for (const username of uniqueParties) {
          if (!username) continue;
          const user = await getUserByUsernameOrEmail(username);
          if (user && user.phone) {
            await sendWhatsAppMessage(user.phone, message);
          }
        }
      }
    } catch (err) {
      console.error("Error sending WhatsApp notification for remark:", err);
    }

    return NextResponse.json({ message: "Remark added successfully via AWS", remark: newRemark });
  } catch (error: any) {
    console.error("API Error adding remark to AWS:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
