import { NextRequest, NextResponse } from "next/server";
import { getGroupsForUser, createGroup, messageService } from "@/lib/chat-sheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const [groups, allMessages] = await Promise.all([
      getGroupsForUser(username),
      messageService.getAll()
    ]);
    
    allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const groupsWithMessages = groups.map(g => {
      const lastMessage = allMessages.find(m => m.receiver_id === g.id);
      
      const unreadCount = allMessages.filter(m => 
        m.receiver_id === g.id && 
        !(m.read_by || "").includes(username) &&
        m.sender_id !== username
      ).length;

      return {
        ...g,
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

    return NextResponse.json(groupsWithMessages);
  } catch (error) {
    console.error("GET Groups Error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, participants, creator } = body;

    if (!name || !participants || !creator) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newGroup = {
      id: `group_${Date.now()}`,
      name,
      participants,
      admins: creator, // Creator is the first admin
      created_by: creator,
      created_at: new Date().toISOString(),
    };

    const success = await createGroup(newGroup);
    if (success) {
      return NextResponse.json(newGroup);
    } else {
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }
  } catch (error) {
    console.error("POST Group Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
