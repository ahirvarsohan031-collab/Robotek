import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMessages, addMessage } from "@/lib/chat-sheets";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("chatId"); // Keeping chatId as query param for compatibility with URL
    const currentUsername = (session.user as any).username as string;

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId (chatId) is required" }, { status: 400 });
    }

    const messages = await getMessages(currentUsername, partnerId);

    // Sort by created_at ascending
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const body = await req.json();
    const { chat_id, text, type, media_url } = body; // chat_id used here as receiver_id from frontend

    if (!chat_id) {
      return NextResponse.json({ error: "receiver_id (chat_id) is required" }, { status: 400 });
    }

    const newMessage = {
      id: uuidv4(),
      sender_id: currentUsername,
      receiver_id: chat_id,
      text: text || "",
      type: type || "text",
      media_url: media_url || "",
      read_by: currentUsername, // Mark as read by sender initially
      created_at: new Date().toISOString(),
    };

    const success = await addMessage(newMessage as any);
    if (!success) {
       return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
