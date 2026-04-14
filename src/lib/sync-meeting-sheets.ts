import { google } from "googleapis";

const EA_MD_SHEET_ID = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";

async function getSheetsClient() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUrl = process.env.NEXTAUTH_URL;
    
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUrl
    );

    const tokensStr = process.env.GOOGLE_OAUTH_TOKENS;
    if (!tokensStr) {
      throw new Error("GOOGLE_OAUTH_TOKENS environment variable is not set");
    }

    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);

    return google.sheets({ version: "v4", auth: oauth2Client });
  } catch (error: any) {
    console.error("[Sync Meeting Sheets] Failed to initialize sheets client:", error.message);
    throw error;
  }
}

// Fetch all sync meeting items from the sheet
export async function getSyncMeetings() {
  try {
    console.log("[Sync Meeting] Fetching items from sheet...");
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Sync Meeting'!A:I",
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map((row: any[]) => ({
      id: row[0] || "",
      date: row[1] || "",
      time: row[2] || "",
      location: row[3] || "",
      agenda: JSON.parse(row[4] || "[]"),
      decisions: row[5] || "",
      actionItems: JSON.parse(row[6] || "[]"),
      notes: row[7] || "",
      timestamp: row[8] || "",
    }));
  } catch (error: any) {
    console.error("[Sync Meeting] Error fetching items:", error?.message);
    return [];
  }
}

// Save new sync meeting item
export async function saveSyncMeeting(item: any) {
  try {
    const sheets = await getSheetsClient();

    const id = `SM-${Date.now()}`;
    const values = [[
      id,
      item.date || "",
      item.time || "",
      item.location || "",
      JSON.stringify(item.agenda || []),
      item.decisions || "",
      JSON.stringify(item.actionItems || []),
      item.notes || "",
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Sync Meeting'!A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    return { success: true, id };
  } catch (error: any) {
    console.error("[Sync Meeting] Error saving item:", error?.message);
    return { success: false, error: error?.message };
  }
}
