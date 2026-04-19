import { NextRequest, NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';

// Configure Amplify for Server-side
Amplify.configure(outputs);
const client = generateClient<Schema>();

// Strip out fields that don't exist in the AWS schema (UI-only fields)
function sanitizeUser(userData: any) {
  const { locations, __typename, createdAt, updatedAt, ...clean } = userData;
  return clean;
}

export async function GET() {
  try {
    const { data: users, errors } = await client.models.User.list();
    if (errors) throw new Error(errors[0].message);
    
    // The UI expects permissions to be on the user object, which they are in our AWS model
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("AWS GET Users Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let userData: any;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      userData = JSON.parse(formData.get("userData") as string);
      const file = formData.get("image") as File;

      if (file && file.size > 0) {
        // Upload to AWS S3 specifically in the users/ folder
        const result = await uploadData({
          path: `users/${Date.now()}_${file.name}`,
          data: file,
        }).result;
        
        const { url } = await getUrl({ path: result.path });
        userData.image_url = url.toString();
      }
    } else {
      userData = await req.json();
    }

    const { data: newUser, errors } = await client.models.User.create(sanitizeUser(userData));
    if (errors) throw new Error(errors[0].message);

    return NextResponse.json({ message: "User added successfully to AWS", user: newUser });
  } catch (error: any) {
    console.error("AWS POST User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
