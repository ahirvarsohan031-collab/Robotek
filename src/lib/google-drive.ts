import { google } from "googleapis";
import { Readable } from "stream";

const IMAGE_FOLDER_ID = "1WJiXLo7XVy8YDoSN1pNPCRatGzDA7yb9";

async function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function uploadFileToDrive(file: File, folderId?: string): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    
    // Convert File to Buffer then to Readable Stream
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: `${Date.now()}-${file.name}`,
      parents: [folderId || IMAGE_FOLDER_ID],
    };

    const media = {
      mimeType: file.type,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = response.data.id;
    if (!fileId) return null;

    // Set permission to anyone with the link can view
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Return the direct download link or webViewLink
    // Note: To display directly in <img>, we often use a proxy or the webContentLink
    return fileId; 
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    return null;
  }
}

export function getDriveImageUrl(fileId: string) {
  // Use the thumbnail endpoint which is much more reliable for direct embedding
  return `https://drive.google.com/thumbnail?sz=w400&id=${fileId}`;
}

export async function getFileStream(fileId: string) {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "stream" }
    );
    
    // Also get metadata for MIME type
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: "mimeType, size, name"
    });

    return {
      stream: response.data,
      mimeType: metadata.data.mimeType,
      size: metadata.data.size,
      name: metadata.data.name
    };
  } catch (error) {
    console.error("Error getting file stream from Drive:", error);
    return null;
  }
}
