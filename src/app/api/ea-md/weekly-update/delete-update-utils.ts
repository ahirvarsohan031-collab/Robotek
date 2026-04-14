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

    let tokens;
    try {
      tokens = JSON.parse(tokensStr);
    } catch (parseErr) {
      throw new Error("Invalid GOOGLE_OAUTH_TOKENS JSON format");
    }

    oauth2Client.setCredentials(tokens);
    return google.sheets({ version: "v4", auth: oauth2Client });
  } catch (error: any) {
    console.error("[EA-MD Sheets] Failed to initialize sheets client:", error.message);
    throw error;
  }
}

// Delete item by ID (clears the row)
export async function deleteWeeklyUpdateItem(itemId: string) {
  try {
    console.log("[EA-MD] Deleting item:", itemId);

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Weekly Update'!A:I",
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    // Find the row with matching ID
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === itemId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      console.error("[EA-MD] Item not found:", itemId);
      return { success: false, error: { message: "Item not found in sheet" } };
    }

    console.log("[EA-MD] Found item at row:", rowIndex);

    // Clear the entire row (all columns A-I)
    const clearRange = `'Weekly Update'!A${rowIndex + 1}:I${rowIndex + 1}`;
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId: EA_MD_SHEET_ID,
      range: clearRange,
    });

    console.log("[EA-MD] Item deleted successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[EA-MD] Error deleting item:", error?.message);
    return {
      success: false,
      error: { message: error?.message || "Unknown error" },
    };
  }
}

// Update item by ID
export async function updateWeeklyUpdateItem(itemId: string, updates: any) {
  try {
    console.log("[EA-MD] Updating item:", itemId);

    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: EA_MD_SHEET_ID,
      range: "'Weekly Update'!A:I",
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    // Find the row with matching ID
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === itemId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      console.error("[EA-MD] Item not found:", itemId);
      return { success: false, error: { message: "Item not found in sheet" } };
    }

    console.log("[EA-MD] Found item at row:", rowIndex);

    // Prepare updated row
    const updatedRow = [
      itemId, // Keep existing ID
      updates.weekOf || rows[rowIndex][1] || "",
      updates.preparedBy || rows[rowIndex][2] || "",
      updates.periodCovered || rows[rowIndex][3] || "",
      updates.category || rows[rowIndex][4] || "",
      updates.description || rows[rowIndex][5] || "",
      updates.date || rows[rowIndex][6] || "",
      updates.teamMember || rows[rowIndex][7] || "",
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // Update timestamp
    ];

    console.log("[EA-MD] Updated row:", updatedRow);

    // Update the row
    const updateRange = `'Weekly Update'!A${rowIndex + 1}:I${rowIndex + 1}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: EA_MD_SHEET_ID,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });

    console.log("[EA-MD] Item updated successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[EA-MD] Error updating item:", error?.message);
    return {
      success: false,
      error: { message: error?.message || "Unknown error" },
    };
  }
}
