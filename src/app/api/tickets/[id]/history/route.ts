import { NextResponse } from 'next/server';
import { getTicketHistory, addTicketHistory, getTickets, TicketHistory } from '@/lib/ticket-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';
import { sendWhatsAppMessage } from '@/lib/maytapi';
import { getUserByUsernameOrEmail } from '@/lib/google-sheets';
import { formatDate } from '@/lib/dateUtils';

const TICKET_FOLDER_ID = "1zNEIi62bxuCP2g5KadniAWp4hSNpfVzq";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const history = await getTicketHistory(id);
    return NextResponse.json(history);
  } catch (error) {
    console.error(`GET /api/tickets/${id}/history error:`, error);
    return NextResponse.json({ error: "Failed to fetch ticket history" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};
    let voiceNoteFile: File | null = null;
    let docFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = JSON.parse(formData.get("historyData") as string);
      voiceNoteFile = formData.get("voice_note") as File;
      docFile = formData.get("reference_doc") as File;
    } else {
      data = await request.json();
    }

    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const newId = `LOG-${timestamp}-${randomSuffix}`;
    
    const newHistory: TicketHistory = {
      id: newId,
      ticket_id: id,
      action_type: data.action_type || "COMMENT", // 'STATUS_CHANGE' | 'COMMENT'
      actor_username: data.actor_username || "System",
      old_status: data.old_status || "",
      new_status: data.new_status || "",
      comment_text: data.comment_text || "",
      created_at: new Date().toISOString(),
      attachment_url: data.attachment_url || "",
      voice_note: data.voice_note || "",
    };

    if (voiceNoteFile && voiceNoteFile.size > 0) {
      const fileId = await uploadFileToDrive(voiceNoteFile, TICKET_FOLDER_ID);
      if (fileId) newHistory.voice_note = fileId;
    }

    if (docFile && docFile.size > 0) {
      const fileId = await uploadFileToDrive(docFile, TICKET_FOLDER_ID);
      if (fileId) newHistory.attachment_url = fileId;
    }

    const success = await addTicketHistory(newHistory);
    
    if (success) {
      // Send WhatsApp Notification for comment/status change
      try {
        const allTickets = await getTickets();
        const ticket = allTickets.find(t => String(t.id) === String(id));
        if (ticket) {
          const formattedNow = formatDate(new Date().toISOString());
          const isStatusChange = newHistory.action_type === 'STATUS_CHANGE';
          const header = isStatusChange ? '🔄 *Ticket Status Updated*' : '💬 *New Ticket Comment*';
          const statusLine = isStatusChange
            ? `📉 *Status Changed:* ${newHistory.old_status} ➡️ ${newHistory.new_status}\n`
            : '';
          const commentLine = newHistory.comment_text
            ? `🗣️ *Comment:* _${newHistory.comment_text}_\n`
            : '';
          const message = `${header}\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${ticket.id}\n📌 *Title:* ${ticket.title}\n🏷️ *Category:* ${ticket.category}\n🎯 *Priority:* ${ticket.priority}\n👤 *Raised By:* ${ticket.raised_by}\n👨‍🔧 *Assigned To:* ${ticket.solver_person || 'Unassigned'}\n📊 *Current Status:* ${isStatusChange ? newHistory.new_status : ticket.status}\n${statusLine}${commentLine}👤 *Updated By:* ${newHistory.actor_username}\n⏱️ *Updated At:* ${formattedNow}`;

          const parties = [ticket.raised_by, ticket.solver_person];
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
        console.error('Error sending WhatsApp notification for history:', err);
      }

      return NextResponse.json({ success: true, history: newHistory });
    } else {
      return NextResponse.json({ error: "Failed to add ticket history" }, { status: 500 });
    }
  } catch (error) {
    console.error(`POST /api/tickets/${id}/history error:`, error);
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }
}
