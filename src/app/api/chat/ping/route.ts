import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByUsernameOrEmail, updateUser } from "@/lib/google-sheets";

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUsername = (session.user as any).username as string;
    const user = await getUserByUsernameOrEmail(currentUsername);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update last_active with current ISO string
    const updatedUser = {
      ...user,
      last_active: new Date().toISOString(),
    };

    const success = await updateUser(user.id, updatedUser);

    if (!success) {
      return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
    }

    return NextResponse.json({ success: true, last_active: updatedUser.last_active });
  } catch (error) {
    console.error("Error updating user activity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
