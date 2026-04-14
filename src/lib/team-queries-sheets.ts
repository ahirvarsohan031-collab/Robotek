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
    console.error("[Team Queries Sheets] Failed to initialize sheets client:", error.message);
    throw error;
  }
}

// Fetch all team query items from the sheet
export async function getTeamQueryItems() {
  try {
    console.log("[Team Queries] Fetching items from sheet...");
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Team Queries'!A:I",
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    // Skip header row
    const dataRows = rows.slice(1);
    
    return dataRows.map((row: any[]) => ({
      id: row[0] || "",
      teamMember: row[1] || "",
      query: row[2] || "",
      category: row[3] || "",
      eaResolve: row[4] || "",
      status: row[5] || "",
      eaNotes: row[6] || "",
      timestamp: row[7] || "",
    }));
  } catch (error: any) {
    console.error("[Team Queries] Error fetching items:", error?.message);
    return [];
  }
}

// Save new team query items
export async function saveTeamQueryItems(items: any[]) {
  try {
    const sheets = await getSheetsClient();

    const values = items.map((item, index) => {
      const id = `TQ-${Date.now()}-${index}`;
      return [
        id,
        item.teamMember || "",
        item.query || "",
        item.category || "",
        item.eaResolve || "",
        item.status || "New",
        item.eaNotes || "",
        new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Team Queries'!A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    return { success: true, ids: values.map(row => row[0]) };
  } catch (error: any) {
    console.error("[Team Queries] Error saving items:", error?.message);
    return { success: false, error: error?.message };
  }
}
