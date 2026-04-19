import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';

// Configure Amplify for Server-side
Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function GET() {
  try {
    const { data: dropdowns, errors } = await client.models.Dropdown.list();
    if (errors) throw new Error(errors[0].message);

    const data = {
      departments: dropdowns.filter(d => d.type === 'department').map(d => d.value),
      designations: dropdowns.filter(d => d.type === 'designation').map(d => d.value),
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("AWS GET Dropdowns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, value } = await req.json();
    
    if (!type || !value) {
      return NextResponse.json({ error: "Missing type or value" }, { status: 400 });
    }

    const { data: newOption, errors } = await client.models.Dropdown.create({ type, value });
    if (errors) throw new Error(errors[0].message);

    return NextResponse.json({ message: "Option added successfully to AWS", option: newOption });
  } catch (error: any) {
    console.error("AWS POST Dropdowns Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
