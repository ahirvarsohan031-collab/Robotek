import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsers } from "@/lib/google-sheets";
import { messageService } from "@/lib/chat-sheets";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const [allUsers, allMessages] = await Promise.all([
      getUsers(),
      messageService.getAll()
    ]);

    // Sort messages descending to find the latest easily
    allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Filter out the current user and return necessary fields plus last message
    const contacts = allUsers
      .filter(u => u.username !== currentUsername)
      .map(u => {
        const lastMessage = allMessages.find(m => 
          (m.sender_id === currentUsername && m.receiver_id === u.username) || 
          (m.receiver_id === currentUsername && m.sender_id === u.username)
        );

        const unreadCount = allMessages.filter(m => 
          m.sender_id === u.username && 
          m.receiver_id === currentUsername && 
          !(m.read_by || "").includes(currentUsername)
        ).length;

        return {
          id: u.id,
          username: u.username,
          image_url: u.image_url,
          role_name: u.role_name,
          unreadCount,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            type: lastMessage.type,
            sender_id: lastMessage.sender_id,
            read_by: lastMessage.read_by,
            created_at: lastMessage.created_at
          } : null
        };
      });

    // Sort contacts: those with recent messages first, then alphabetically
    contacts.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.username.localeCompare(b.username);
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching chat users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
