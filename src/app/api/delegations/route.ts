import { NextRequest, NextResponse } from "next/server";
import { getDelegations, addDelegation } from "@/lib/delegation-sheets";
import { uploadFileToDrive } from "@/lib/google-drive";
import { Delegation } from "@/types/delegation";

const DELEGATION_FOLDER_ID = "1Rz8tFgUBfLI0WBEXXdZplJJ2zsk0H4l6";

export async function GET() {
  const delegations = await getDelegations();
  return NextResponse.json(delegations);
}

export async function POST(req: NextRequest) {
  try {
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
          delegationData.voice_note_url = fileId; // Storing actual file ID
        }
      }

      if (refDocFile && refDocFile.size > 0) {
        const fileId = await uploadFileToDrive(refDocFile, DELEGATION_FOLDER_ID);
        if (fileId) {
          delegationData.reference_docs = fileId; // Storing actual file ID
        }
      }
    } else {
      delegationData = await req.json();
    }

    const success = await addDelegation(delegationData as Delegation);
    if (success) {
      return NextResponse.json({ message: "Delegation added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add delegation" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
