import { google } from "googleapis";
import { User } from "@/types/user";

const GOOGLE_SHEET_ID = "1cuOGO1UZ3O41zUDrowRlFZ6FCSfUWVsmfVULA0Jx6Tg";
const SHEET_NAME = "user";

async function getSheetsClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL // Or your redirect URI
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  // Handle token refresh if necessary
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      // In a real app, you'd save this back to your DB or .env
      console.log('New refresh token received');
    }
    console.log('New access token received');
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function getUsers(): Promise<User[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:I`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      username: row[1] || "",
      email: row[2] || "",
      password: row[3] || "",
      phone: row[4] || "",
      role_name: row[5] || "",
      late_long: row[6] || "",
      image_url: row[7] || "",
      dob: row[8] || "",
    }));
  } catch (error) {
    console.error("Error fetching users from Google Sheets:", error);
    return [];
  }
}

export async function addUser(user: User): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          user.id,
          user.username,
          user.email,
          user.password,
          user.phone,
          user.role_name,
          user.late_long,
          user.image_url,
          user.dob
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding user to Google Sheets:", error);
    return false;
  }
}

export async function updateUser(id: string, user: User): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:I${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          user.id,
          user.username,
          user.email,
          user.password,
          user.phone,
          user.role_name,
          user.late_long,
          user.image_url,
          user.dob
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating user in Google Sheets:", error);
    return false;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    // To "delete" in sheets without complex row manipulation, we often just clear the row
    // or use batchUpdate to actually remove the row index.
    // For simplicity, we'll clear the row data first.
    await sheets.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:I${rowIndex + 1}`,
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting user from Google Sheets:", error);
    return false;
  }
}

export async function getUserByUsernameOrEmail(identifier: string): Promise<User | null> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:I`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return null;

    const dataRows = rows.slice(1);
    
    const userRow = dataRows.find(row => 
      row[1] === identifier || row[2] === identifier
    );

    if (!userRow) return null;

    return {
      id: userRow[0],
      username: userRow[1],
      email: userRow[2],
      password: userRow[3],
      phone: userRow[4],
      role_name: userRow[5],
      late_long: userRow[6],
      image_url: userRow[7],
      dob: userRow[8],
    };
  } catch (error) {
    console.error("Error fetching user from Google Sheets:", error);
    return null;
  }
}
