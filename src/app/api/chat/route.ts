import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Returning empty array as we are moving to a messages-only system
    // and Sidebar will use /api/chat/users instead.
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Post is no longer needed since chats are created implicitly by sending messages
  return NextResponse.json({ success: true });
}
