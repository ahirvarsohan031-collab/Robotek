import { NextResponse } from "next/server";
import { saveWeeklyUpdateItems } from "@/lib/ea-md-sheets";
import { deleteWeeklyUpdateItem, updateWeeklyUpdateItem } from "./delete-update-utils";

export async function POST(req: Request) {
  try {
    console.log("[Weekly Update API] ===== REQUEST RECEIVED =====");
    
    // Check environment variables
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasTokens = !!process.env.GOOGLE_OAUTH_TOKENS;
    
    console.log("[Weekly Update API] Env Check:", {
      hasClientId,
      hasClientSecret,
      hasTokens,
      clientIdLength: process.env.GOOGLE_CLIENT_ID?.length,
      clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length,
      tokensLength: process.env.GOOGLE_OAUTH_TOKENS?.length,
    });

    const body = await req.json();
    const { items } = body;

    console.log("[Weekly Update API] Received", items?.length, "items");
    console.log("[Weekly Update API] First item sample:", items?.[0]);

    if (!items || !Array.isArray(items)) {
      const errMsg = "Invalid payload - items must be an array";
      console.error("[Weekly Update API]", errMsg);
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    if (items.length === 0) {
      const errMsg = "No items to save";
      console.error("[Weekly Update API]", errMsg);
      return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }

    console.log("[Weekly Update API] Calling saveWeeklyUpdateItems...");
    const result = await saveWeeklyUpdateItems(items);

    console.log("[Weekly Update API] Save result:", result);

    if (result.success) {
      console.log("[Weekly Update API] ===== SUCCESS =====");
      return NextResponse.json({ success: true, ids: result.ids });
    } else {
      console.error("[Weekly Update API] Save failed:", result.error);
      return NextResponse.json(
        { 
          error: "Failed to save to sheets", 
          details: result.error,
          message: result.error?.message 
        }, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Weekly Update API] ===== EXCEPTION =====");
    console.error("[Weekly Update API] Error:", error.message);
    console.error("[Weekly Update API] Stack:", error.stack);
    console.error("[Weekly Update API] Full error:", error);
    
    return NextResponse.json(
      { 
        error: "Server error: " + error.message,
        details: error.message,
        stack: error.stack
      }, 
      { status: 500 }
    );
  }
}

// PUT /api/ea-md/weekly-update?id=xxx  — update a single item
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    const updates = await req.json();
    console.log("[Weekly Update API] PUT - updating item:", itemId, updates);

    const result = await updateWeeklyUpdateItem(itemId, updates);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to update item", details: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Weekly Update API] PUT error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/ea-md/weekly-update?id=xxx  — delete a single item
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    console.log("[Weekly Update API] DELETE - removing item:", itemId);

    const result = await deleteWeeklyUpdateItem(itemId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to delete item", details: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Weekly Update API] DELETE error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
