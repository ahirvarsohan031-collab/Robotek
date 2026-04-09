import { NextRequest, NextResponse } from "next/server";
import { addDelegationRemark, getDelegations } from "@/lib/delegation-sheets";
import { auth } from "@/auth";
import { DelegationRemark } from "@/types/delegation";
import { v4 as uuidv4 } from "uuid";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { formatDate } from "@/lib/dateUtils";

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

    const newRemark: DelegationRemark = {
      id: uuidv4(),
      delegation_id: id,
      user_id: session.user.id || "unknown",
      // @ts-ignore
      username: session.user.username || session.user.name || "Unknown User",
      remark: remark,
      created_at: new Date().toISOString(),
    };

    const success = await addDelegationRemark(newRemark);

    if (success) {
      // Send WhatsApp notification for new remark
      try {
        const delegations = await getDelegations();
        const delegation = delegations.find(d => String(d.id) === String(id));
        if (delegation) {
          const formattedNow = formatDate(new Date().toISOString());
          const message = `💬 *New Delegation Comment*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${delegation.title}\n🎯 *Priority:* ${delegation.priority}\n👤 *Assigned To:* ${delegation.assigned_to}\n👨‍💼 *Assigned By:* ${delegation.assigned_by}\n📊 *Status:* ${delegation.status}\n\n🗣️ *Comment By:* ${newRemark.username}\n📝 *Comment:* _${remark}_\n⏱️ *At:* ${formattedNow}`;

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

      return NextResponse.json({ message: "Remark added successfully", remark: newRemark });
    } else {
      return NextResponse.json({ error: "Failed to add remark" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error adding remark:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
