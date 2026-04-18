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
    console.error("[Urgent Log Sheets] Failed to initialize sheets client:", error.message);
    throw error;
  }
}

// Fetch all urgent log items from the sheet
export async function getUrgentLogs() {
  try {
    console.log("[Urgent Log] Fetching items from sheet...");
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Urgent Log'!A:G",
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map((row: any[]) => ({
      id: row[0] || "",
      issueSummary: row[1] || "",
      urgencyLevel: row[2] || "",
      channelUsed: row[3] || "",
      requiredFromMD: row[4] || "",
      deadline: row[5] || "",
      status: row[6] || "Open",
    }));
  } catch (error: any) {
    console.error("[Urgent Log] Error fetching items:", error?.message);
    return [];
  }
}

// Save new urgent log item
export async function saveUrgentLog(item: any) {
  try {
    const sheets = await getSheetsClient();

    const id = `UL-${Date.now()}`;
    const values = [[
      id,
      item.issueSummary || "",
      item.urgencyLevel || "",
      item.channelUsed || "",
      item.requiredFromMD || "",
      item.deadline || "",
      item.status || "Open",
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Urgent Log'!A:G",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    return { success: true, id };
  } catch (error: any) {
    console.error("[Urgent Log] Error saving item:", error?.message);
    return { success: false, error: error?.message };
  }
}
