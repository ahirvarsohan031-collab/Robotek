import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsers } from "@/lib/google-sheets";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const allUsers = await getUsers();

    // Filter out the current user and return only necessary fields for UI
    const contacts = allUsers
      .filter(u => u.username !== currentUsername)
      .map(u => ({
        id: u.id,
        username: u.username,
        image_url: u.image_url,
        role_name: u.role_name
      }));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching chat users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
