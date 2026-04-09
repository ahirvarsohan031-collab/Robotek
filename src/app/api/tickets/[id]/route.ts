import { NextResponse } from 'next/server';
import { updateTicket, deleteTicket, getTickets, Ticket } from '@/lib/ticket-sheets';
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { uploadFileToDrive } from '@/lib/google-drive';
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

const TICKET_FOLDER_ID = "1zNEIi62bxuCP2g5KadniAWp4hSNpfVzq";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};
    let voiceNoteFile: File | null = null;
    let docFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = JSON.parse(formData.get("ticketData") as string);
      voiceNoteFile = formData.get("voice_note") as File;
      docFile = formData.get("reference_doc") as File;
    } else {
      data = await request.json();
    }

    // Merge with existing ticket data if needed, or just use what's provided
    // The sheet update handles partial updates if we only send what's changed, 
    // but here we usually send the whole object from the frontend.

    if (voiceNoteFile && voiceNoteFile.size > 0) {
      const fileId = await uploadFileToDrive(voiceNoteFile, TICKET_FOLDER_ID);
      if (fileId) data.voice_note = fileId;
    }

    if (docFile && docFile.size > 0) {
      const fileId = await uploadFileToDrive(docFile, TICKET_FOLDER_ID);
      if (fileId) data.attachment_url = fileId;
    }

    const existingTickets = await getTickets();
    const current = existingTickets.find(t => String(t.id) === String(id));

    const success = await updateTicket(id, data);
    
    if (success) {
      // Send WhatsApp Notification for Ticket Update/Status Change
      try {
        if (current) {
          const isStatusChange = data.status && data.status !== current.status;
          const branding = isStatusChange ? "🔄 *Ticket Status Changed*" : "📝 *Ticket Details Updated*";
          const formattedUpdate = formatDate(new Date().toISOString());
          const oldStatus = current.status;
          const newStatus = data.status || current.status;
          const statusLine = isStatusChange ? `📉 *Status Changed:* ${oldStatus} ➡️ ${newStatus}\n` : `📊 *Status:* ${newStatus}\n`;
          const commentLine = data.comment_text ? `🗣️ *Comment:* _${data.comment_text}_\n` : '';

          const message = `${branding}\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${current.id}\n📌 *Title:* ${data.title || current.title}\n🏷️ *Category:* ${data.category || current.category}\n🎯 *Priority:* ${data.priority || current.priority}\n👤 *Raised By:* ${data.raised_by || current.raised_by}\n👨‍🔧 *Assigned To:* ${data.solver_person || current.solver_person || 'Unassigned'}\n${statusLine}${commentLine}⏱️ *Updated At:* ${formattedUpdate}`;

          const parties = [data.raised_by || current.raised_by, data.solver_person || current.solver_person];
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
        console.error("Error sending WhatsApp notification:", err);
      }

      return NextResponse.json({ success: true, ticket: data });
    } else {
      return NextResponse.json({ error: "Failed to update ticket" }, { status: 404 });
    }
  } catch (error) {
    console.error("PUT /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Update operation failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingTickets = await getTickets();
    const current = existingTickets.find(t => String(t.id) === String(id));

    const success = await deleteTicket(id);
    if (success) {
      // Send WhatsApp Notification for Deletion
      try {
        if (current) {
          const solver = await getUserByUsernameOrEmail(current.solver_person || "");
          if (solver && solver.phone) {
            const message = `🗑️ *Help Ticket Deleted*\n━━━━━━━━━━━━━━━━━\n🔖 *Ticket ID:* ${current.id}\n📌 *Title:* ${current.title}\n\n_This ticket has been removed from the system._`;
            await sendWhatsAppMessage(solver.phone, message);
          }
        }
      } catch (err) {
        console.error("Error sending WhatsApp notification:", err);
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to delete ticket" }, { status: 404 });
    }
  } catch (error) {
    console.error("DELETE /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Delete operation failed" }, { status: 500 });
  }
}
