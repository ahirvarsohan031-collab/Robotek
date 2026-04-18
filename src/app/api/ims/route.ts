import { NextRequest, NextResponse } from "next/server";
import {
  getIMSItems,
  addIMSItem,
  updateIMSItem,
  deleteIMSItem,
} from "@/lib/ims-sheets";
import { IMS } from "@/types/ims";

export async function GET(request: NextRequest) {
  try {
    const items = await getIMSItems();
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error("Error fetching IMS items:", error);
    return NextResponse.json(
      { error: "Failed to fetch IMS items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const success = await addIMSItem(data);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Failed to add IMS item" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error adding IMS item:", error);
    return NextResponse.json(
      { error: "Failed to add IMS item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data: IMS = await request.json();
    const success = await updateIMSItem(data.id, data);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Failed to update IMS item" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error updating IMS item:", error);
    return NextResponse.json(
      { error: "Failed to update IMS item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }
    const success = await deleteIMSItem(id);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Failed to delete IMS item" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error deleting IMS item:", error);
    return NextResponse.json(
      { error: "Failed to delete IMS item" },
      { status: 500 }
    );
  }
}
