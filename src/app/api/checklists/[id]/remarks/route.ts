import { NextRequest, NextResponse } from "next/server";
import { addChecklistRemark, getChecklists } from "@/lib/checklist-sheets";
import { auth } from "@/auth";
import { ChecklistRemark } from "@/types/checklist";
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

    const newRemark: ChecklistRemark = {
      id: uuidv4(),
      checklists_id: id,
      user_id: session.user.id || "unknown",
      // @ts-ignore
      username: session.user.username || session.user.name || "Unknown User",
      remark: remark,
      created_at: new Date().toISOString(),
    };

    const success = await addChecklistRemark(newRemark);

    if (success) {
      // Send WhatsApp notification for new remark
      try {
        const checklists = await getChecklists();
        const checklist = checklists.find(d => String(d.id) === String(id));
        if (checklist) {
          const formattedNow = formatDate(new Date().toISOString());
          const message = `💬 *New Checklist Comment*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${checklist.task}\n🎯 *Priority:* ${checklist.priority}\n👤 *Assigned To:* ${checklist.assigned_to}\n👨‍💼 *Assigned By:* ${checklist.assigned_by}\n📊 *Status:* ${checklist.status}\n\n🗣️ *Comment By:* ${newRemark.username}\n📝 *Comment:* _${remark}_\n⏱️ *At:* ${formattedNow}`;

          const parties = [checklist.assigned_to, checklist.assigned_by];
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
        console.error("Error sending WhatsApp notification for checklist remark:", err);
      }

      return NextResponse.json({ message: "Remark added successfully", remark: newRemark });
    } else {
      return NextResponse.json({ error: "Failed to add remark" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error adding checklist remark:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
