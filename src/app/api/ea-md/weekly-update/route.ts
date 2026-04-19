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
    const { data, errors } = await client.models.EaMdWeeklyUpdate.list();
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ items: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Weekly Update also uses batch POST (array of items)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid or empty items array" }, { status: 400 });
    }

    const ids: string[] = [];
    for (const item of items) {
      const { __typename, createdAt, updatedAt, id, ...clean } = item;
      const { data, errors } = await client.models.EaMdWeeklyUpdate.create({
        ...clean,
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      });
      if (errors) throw new Error(errors[0].message);
      if (data?.id) ids.push(data.id);
    }

    return NextResponse.json({ success: true, ids });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    const updates = await req.json();
    const { __typename, createdAt, updatedAt, ...clean } = updates;
    const { errors } = await client.models.EaMdWeeklyUpdate.update({ ...clean, id });
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

    const { errors } = await client.models.EaMdWeeklyUpdate.delete({ id });
    if (errors) throw new Error(errors[0].message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
