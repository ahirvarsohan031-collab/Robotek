import { NextRequest, NextResponse } from "next/server";
import { updateUser, deleteUser } from "@/lib/google-sheets";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const user = await req.json();
    const success = await updateUser(id, user);
    if (success) {
      return NextResponse.json({ message: "User updated successfully" });
    } else {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const success = await deleteUser(id);
  if (success) {
    return NextResponse.json({ message: "User deleted successfully" });
  } else {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
