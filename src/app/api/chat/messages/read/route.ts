import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMessages, updateMessage } from "@/lib/chat-sheets";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const body = await req.json();
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    }

    const messages = await getMessages(currentUsername, partnerId);
    
    // We only care about messages SENT BY partnerId TO currentUsername
    const unreadMessages = messages.filter(
      (m) => m.sender_id === partnerId && m.receiver_id === currentUsername && !(m.read_by || "").includes(currentUsername)
    );

    let updatedCount = 0;
    for (const msg of unreadMessages) {
      const newReadBy = msg.read_by ? `${msg.read_by},${currentUsername}` : currentUsername;
      const success = await updateMessage(msg.id, { ...msg, read_by: newReadBy });
      if (success) {
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
}
