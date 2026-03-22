import { NextResponse } from 'next/server';
import { updateTicket, deleteTicket, Ticket } from '@/lib/ticket-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

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

    const success = await updateTicket(id, data);
    
    if (success) {
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
    const success = await deleteTicket(id);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to delete ticket" }, { status: 404 });
    }
  } catch (error) {
    console.error("DELETE /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Delete operation failed" }, { status: 500 });
  }
}
