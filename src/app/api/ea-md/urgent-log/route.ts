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
    const { data, errors } = await client.models.EaMdUrgentLog.list();
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ items: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    const { __typename, createdAt, updatedAt, ...clean } = item;
    const { data, errors } = await client.models.EaMdUrgentLog.create(clean);
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
    const { errors } = await client.models.EaMdUrgentLog.update({ ...clean, id });
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

    const { errors } = await client.models.EaMdUrgentLog.delete({ id });
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
