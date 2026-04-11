import { NextRequest, NextResponse } from "next/server";
import { groupService, updateGroup, deleteGroup } from "@/lib/chat-sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allGroups = await groupService.getAll();
    const existingGroup = allGroups.find(g => g.id === id);

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(existingGroup);
  } catch (error) {
    console.error("GET Group Error:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Fetch existing group to ensure integrity
    const allGroups = await groupService.getAll();
    const existingGroup = allGroups.find(g => g.id === id);

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Merge updates
    const updatedGroup = {
      ...existingGroup,
      ...body,
      id: existingGroup.id, // Ensure ID cannot be changed
    };

    const success = await updateGroup(id, updatedGroup);
    if (success) {
      return NextResponse.json(updatedGroup);
    } else {
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }
  } catch (error) {
    console.error("PATCH Group Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteGroup(id);
    if (success) {
      return NextResponse.json({ message: "Group deleted successfully" });
    } else {
      return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
    }
  } catch (error) {
    console.error("DELETE Group Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
