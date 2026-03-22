import { NextResponse } from 'next/server';
import { getTickets, addTicket } from '@/lib/ticket-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

const TICKET_FOLDER_ID = "1zNEIi62bxuCP2g5KadniAWp4hSNpfVzq";

export async function GET() {
  try {
    const tickets = await getTickets();
    return NextResponse.json(tickets);
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const existingTickets = await getTickets();
    const nextNumber = existingTickets.length + 1;
    const newId = `TKT-${nextNumber.toString().padStart(2, '0')}`;
    
    // Create new ticket object
    const newTicket = {
      id: newId,
      title: data.title || "",
      description: data.description || "",
      category: data.category || "Other",
      priority: data.priority || "Medium",
      raised_by: data.raised_by || "",
      solver_person: data.solver_person || "",
      planned_resolution: data.planned_resolution || "",
      status: data.status || "Open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachment_url: data.attachment_url || "",
      voice_note: data.voice_note || "",
    };

    if (voiceNoteFile && voiceNoteFile.size > 0) {
      const fileId = await uploadFileToDrive(voiceNoteFile, TICKET_FOLDER_ID);
      if (fileId) newTicket.voice_note = fileId;
    }

    if (docFile && docFile.size > 0) {
      const fileId = await uploadFileToDrive(docFile, TICKET_FOLDER_ID);
      if (fileId) newTicket.attachment_url = fileId;
    }

    const success = await addTicket(newTicket);
    
    if (success) {
      return NextResponse.json({ success: true, ticket: newTicket });
    } else {
      return NextResponse.json({ error: "Failed to save ticket" }, { status: 500 });
    }
  } catch (error) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }
}
