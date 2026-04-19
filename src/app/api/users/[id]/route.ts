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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Update in DynamoDB - sanitize to remove UI-only fields
    const { data: updatedUser, errors } = await client.models.User.update({
      ...sanitizeUser(userData),
      id: id, // Ensure we use the ID from params
    });

    if (errors) throw new Error(errors[0].message);

    return NextResponse.json({ message: "User updated successfully in AWS", user: updatedUser });
  } catch (error: any) {
    console.error("AWS PUT User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { errors } = await client.models.User.delete({ id });
    if (errors) throw new Error(errors[0].message);

    return NextResponse.json({ message: "User deleted successfully from AWS" });
  } catch (error: any) {
    console.error("AWS DELETE User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
