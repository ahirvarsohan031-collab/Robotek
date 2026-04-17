import { NextRequest, NextResponse } from "next/server";
import {
  getI2RItems,
  addI2RItem,
  updateI2RItem,
  deleteI2RItem,
  getNextIndentNum,
} from "@/lib/i2r-sheets";
import { I2R } from "@/types/i2r";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "next-indent") {
      const indentNum = await getNextIndentNum();
      return NextResponse.json({ indentNum });
    }

    const items = await getI2RItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching I2R items:", error);
    return NextResponse.json(
      { error: "Failed to fetch I2R items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const success = await addI2RItem(data);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Failed to add I2R item" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error adding I2R item:", error);
    return NextResponse.json(
      { error: "Failed to add I2R item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data: I2R = await request.json();
    const success = await updateI2RItem(data.id, data);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Failed to update I2R item" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error updating I2R item:", error);
    return NextResponse.json(
      { error: "Failed to update I2R item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    const success = await deleteI2RItem(id);
    if (success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { error: "Failed to delete I2R item" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error deleting I2R item:", error);
    return NextResponse.json(
      { error: "Failed to delete I2R item" },
      { status: 500 }
    );
  }
}
