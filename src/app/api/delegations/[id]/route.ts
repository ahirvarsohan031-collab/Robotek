import { NextRequest, NextResponse } from "next/server";
import { updateDelegation, deleteDelegation } from "@/lib/delegation-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { Delegation } from "@/types/delegation";

const DELEGATION_FOLDER_ID = "1Rz8tFgUBfLI0WBEXXdZplJJ2zsk0H4l6";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";
    let delegationData: Partial<Delegation>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      delegationData = JSON.parse(formData.get("delegationData") as string);
      
      const voiceNoteFile = formData.get("voice_note") as File;
      const refDocFile = formData.get("reference_doc") as File;

      if (voiceNoteFile && voiceNoteFile.size > 0) {
        const fileId = await uploadFileToDrive(voiceNoteFile, DELEGATION_FOLDER_ID);
        if (fileId) {
          delegationData.voice_note_url = fileId;
        }
      }

      if (refDocFile && refDocFile.size > 0) {
        const fileId = await uploadFileToDrive(refDocFile, DELEGATION_FOLDER_ID);
        if (fileId) {
          delegationData.reference_docs = fileId;
        }
      }
    } else {
      delegationData = await req.json();
    }

    // Pass the merged object back to Google Sheets updating
    await updateDelegation(id, delegationData as Delegation);
    return NextResponse.json({ message: "Delegation updated successfully" });
  } catch (error: any) {
    console.error("API Error updating delegation:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update delegation" 
    }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing delegation ID" }, { status: 400 });
    }

    const success = await deleteDelegation(id);
    if (success) {
      return NextResponse.json({ message: "Delegation deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete delegation" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error deleting delegation:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
