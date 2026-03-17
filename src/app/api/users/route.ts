import { NextRequest, NextResponse } from "next/server";
import { getUsers, addUser } from "@/lib/google-sheets";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    const user = await req.json();
    const success = await addUser(user);
    if (success) {
      return NextResponse.json({ message: "User added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
