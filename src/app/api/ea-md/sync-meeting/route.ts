import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "@/../amplify_outputs.json";
import type { Schema } from "@/../amplify/data/resource";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, errors } = await client.models.EaMdSyncMeeting.list();
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ items: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const { __typename, createdAt, updatedAt, id, ...clean } = item;

    // agenda and actionItems are arrays — store as JSON strings
    const payload = {
      ...clean,
      agenda: typeof clean.agenda === "string" ? clean.agenda : JSON.stringify(clean.agenda || []),
      actionItems: typeof clean.actionItems === "string" ? clean.actionItems : JSON.stringify(clean.actionItems || []),
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    };

    const { data, errors } = await client.models.EaMdSyncMeeting.create(payload);
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const body = await req.json();
    const { __typename, createdAt, updatedAt, ...clean } = body;
    const payload = {
      ...clean,
      id,
      agenda: typeof clean.agenda === "string" ? clean.agenda : JSON.stringify(clean.agenda || []),
      actionItems: typeof clean.actionItems === "string" ? clean.actionItems : JSON.stringify(clean.actionItems || []),
    };

    const { errors } = await client.models.EaMdSyncMeeting.update(payload);
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { errors } = await client.models.EaMdSyncMeeting.delete({ id });
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
