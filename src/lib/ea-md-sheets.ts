import { google } from "googleapis";

const EA_MD_SHEET_ID = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";

// Uses the same auth pattern as the rest of the project
async function getSheetsClient() {
  try {
    console.log("[EA-MD Sheets] Initializing OAuth2 client...");
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUrl = process.env.NEXTAUTH_URL;
    
    console.log("[EA-MD Sheets] Config check:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUrl: !!redirectUrl,
      redirectUrl: redirectUrl,
    });

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUrl
    );

    const tokensStr = process.env.GOOGLE_OAUTH_TOKENS;
    console.log("[EA-MD Sheets] Tokens available:", !!tokensStr);
    
    if (!tokensStr) {
      throw new Error("GOOGLE_OAUTH_TOKENS environment variable is not set");
    }

    let tokens;
    try {
      tokens = JSON.parse(tokensStr);
      console.log("[EA-MD Sheets] Tokens parsed. Keys:", Object.keys(tokens));
    } catch (parseErr) {
      console.error("[EA-MD Sheets] Failed to parse tokens:", parseErr);
      throw new Error("Invalid GOOGLE_OAUTH_TOKENS JSON format");
    }

    oauth2Client.setCredentials(tokens);
    console.log("[EA-MD Sheets] OAuth2 client ready");

    return google.sheets({ version: "v4", auth: oauth2Client });
  } catch (error: any) {
    console.error("[EA-MD Sheets] Failed to initialize sheets client:", error.message);
    throw error;
  }
}

// Fetch all weekly update items from the sheet
export async function getWeeklyUpdateItems() {
  try {
    console.log("[EA-MD] Fetching weekly update items from sheet...");
    
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Weekly Update'!A:I",
    });

    const rows = response.data.values || [];
    console.log("[EA-MD] Total rows fetched:", rows.length);

    if (rows.length === 0) {
      return [];
    }

    // Skip header row (row 0)
    const dataRows = rows.slice(1);
    
    // Map rows to items
    const items = dataRows.map((row: any[]) => ({
      id: row[0] || "",
      weekOf: row[1] || "",
      preparedBy: row[2] || "",
      periodCovered: row[3] || "",
      category: row[4] || "",
      description: row[5] || "",
      date: row[6] || "",
      teamMember: row[7] || "",
      timestamp: row[8] || "",
    }));

    console.log("[EA-MD] Processed items count:", items.length);
    console.log("[EA-MD] Sample item:", items[0]);

    return items;
  } catch (error: any) {
    console.error("[EA-MD] Error fetching items:", error?.message);
    return [];
  }
}

// Direct append with ID column
// Sheet headers: id | Week Of | Prepared By | Period Covered | Category | Description | Date / Deadline | Team Member | Timestamp
export async function saveWeeklyUpdateItems(items: any[]) {
  try {
    console.log("[EA-MD] ===== SAVE STARTED =====");
    console.log("[EA-MD] Sheet ID:", EA_MD_SHEET_ID);
    console.log("[EA-MD] Items to save:", items.length);
    
    const sheets = await getSheetsClient();
    console.log("[EA-MD] Sheets client initialized");

    const values = items.map((item, index) => {
      // Generate unique ID: timestamp + index
      const id = `WKU-${Date.now()}-${index}`;
      
      const row = [
        id,
        item.weekOf || "",
        item.preparedBy || "",
        item.periodCovered || "",
        item.category || "",
        item.description || "",
        item.date || "",
        item.teamMember || "",
        new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      ];
      
      console.log(`[EA-MD] Row ${index}:`, row);
      return row;
    });

    console.log("[EA-MD] Prepared", values.length, "rows for insertion");

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Weekly Update'!A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    console.log("[EA-MD] Google Sheets API Response:", {
      spreadsheetId: response.data.spreadsheetId,
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
      updatedColumns: response.data.updates?.updatedColumns,
      updatedCells: response.data.updates?.updatedCells,
    });
    
    console.log("[EA-MD] ===== SAVE SUCCESS =====");
    // Return the generated IDs so the frontend can track them
    const generatedIds = values.map(row => row[0] as string);
    return { success: true, ids: generatedIds };
  } catch (error: any) {
    console.error("[EA-MD] ===== SAVE FAILED =====");
    console.error("[EA-MD] Error message:", error?.message);
    console.error("[EA-MD] Error code:", error?.code);
    console.error("[EA-MD] Error status:", error?.status);
    console.error("[EA-MD] API Error:", error?.response?.data);
    console.error("[EA-MD] Full error:", JSON.stringify(error, null, 2));
    
    return { 
      success: false, 
      error: { 
        message: error?.message || "Unknown error",
        code: error?.code,
        status: error?.status,
        details: error?.response?.data 
      } 
    };
  }
}
