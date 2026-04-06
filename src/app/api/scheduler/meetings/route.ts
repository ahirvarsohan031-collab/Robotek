import { NextResponse } from "next/server";
import { getMeetings, addMeeting, updateMeeting, deleteMeeting } from "@/lib/meeting-sheets";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";

export async function GET() {
  try {
    const meetings = await getMeetings();
    return NextResponse.json(meetings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const newMeeting = {
      ...data,
      id: data.id || uuidv4(),
      created_by: (session.user as any).username || session.user.email,
      created_at: new Date().toISOString(),
    };

    const success = await addMeeting(newMeeting);
    if (!success) return NextResponse.json({ error: "Failed to add meeting" }, { status: 500 });

    return NextResponse.json(newMeeting);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add meeting" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const success = await updateMeeting(data.id, data);
    if (!success) return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const success = await deleteMeeting(id);
    if (!success) return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
