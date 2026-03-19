import { google } from "googleapis";
import { Delegation, DelegationRevision, DelegationRemark } from "@/types/delegation";

const GOOGLE_SHEET_ID = "1kqX1fWoTyk2Y7IUCpO5PrrcF0fvGSj0n3xZaNdmm3Iw";
const SHEET_NAME = "delegation";
const REVISION_SHEET = "delegation_revision_history";
const REMARK_SHEET = "delegation_remarks";

async function getSheetsClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function getDelegations(): Promise<Delegation[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:N`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      title: row[1] || "",
      description: row[2] || "",
      assigned_by: row[3] || "",
      assigned_to: row[4] || "",
      department: row[5] || "",
      priority: row[6] || "",
      due_date: row[7] || "",
      status: row[8] || "",
      voice_note_url: row[9] || "",
      reference_docs: row[10] || "",
      evidence_required: row[11] || "",
      created_at: row[12] || "",
      updated_at: row[13] || "",
    }));
  } catch (error) {
    console.error("Error fetching delegations from Google Sheets:", error);
    return [];
  }
}

export async function addDelegation(delegation: Delegation): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:N`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          delegation.id,
          delegation.title,
          delegation.description,
          delegation.assigned_by,
          delegation.assigned_to,
          delegation.department,
          delegation.priority,
          delegation.due_date,
          delegation.status,
          delegation.voice_note_url,
          delegation.reference_docs,
          delegation.evidence_required,
          delegation.created_at,
          delegation.updated_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding delegation to Google Sheets:", error);
    return false;
  }
}

export async function updateDelegation(id: string, delegation: Delegation): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) {
      console.error("No rows found in sheet for matching");
      return false;
    }

    // Use robust matching for IDs (both as strings)
    const searchId = String(id).trim();
    const searchIdNum = parseInt(searchId); // Try to get number part if it is a number
    
    const rowIndex = rows.findIndex(row => {
      if (!row[0]) return false;
      const cellValue = String(row[0]).trim();
      // Direct match
      if (cellValue === searchId) return true;
      // Strip # if searchId doesn't have it but cell does
      if (cellValue === `#${searchId}`) return true;
      // Numeric match (helps if sheet stores "1.00" but we search for "1")
      if (!isNaN(searchIdNum) && (cellValue === searchIdNum.toString() || cellValue === `${searchIdNum}.00`)) return true;
      return false;
    });
    
    if (rowIndex === -1) {
      console.error(`ID ${searchId} not found in sheet. Rows:`, rows.length);
      throw new Error(`Delegation ID ${searchId} not found in spreadsheet.`);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:N${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          String(delegation.id),
          delegation.title,
          delegation.description,
          delegation.assigned_by,
          delegation.assigned_to,
          delegation.department,
          delegation.priority,
          delegation.due_date,
          delegation.status,
          delegation.voice_note_url,
          delegation.reference_docs,
          delegation.evidence_required,
          delegation.created_at,
          delegation.updated_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating delegation in Google Sheets:", error);
    return false;
  }
}

export async function deleteDelegation(id: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // First find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });
    
    const rows = response.data.values;
    if (!rows) {
      console.error("No rows found in sheet for matching");
      throw new Error("No data found in spreadsheet.");
    }

    const searchId = String(id).trim();
    const searchIdNum = parseInt(searchId);
    
    const rowIndex = rows.findIndex(row => {
      if (!row[0]) return false;
      const cellValue = String(row[0]).trim();
      if (cellValue === searchId) return true;
      if (cellValue === `#${searchId}`) return true;
      if (!isNaN(searchIdNum) && (cellValue === searchIdNum.toString() || cellValue === `${searchIdNum}.00`)) return true;
      return false;
    });

    if (rowIndex === -1) {
      console.error(`ID ${searchId} not found in sheet for deletion. Rows:`, rows.length);
      throw new Error(`Delegation ID ${searchId} not found in spreadsheet.`);
    }
    
    // In V4 API, to delete a row we use batchUpdate
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID
    });
    
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;
    
    if (sheetId === undefined) {
      console.error(`Sheet with name ${SHEET_NAME} not found.`);
      return false;
    }
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting delegation from Google Sheets:", error);
    return false;
  }
}
export async function addDelegationRevision(revision: DelegationRevision): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REVISION_SHEET}!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          revision.id,
          revision.delegation_id,
          revision.old_status,
          revision.new_status,
          revision.old_due_date,
          revision.new_due_date,
          revision.reason,
          revision.created_at,
          revision.evidence_urls
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding revision history:", error);
    return false;
  }
}

export async function addDelegationRemark(remark: DelegationRemark): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REMARK_SHEET}!A:F`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          remark.id,
          remark.delegation_id,
          remark.user_id,
          remark.username,
          remark.remark,
          remark.created_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding remark:", error);
    return false;
  }
}

export async function getDelegationHistory(delegationId: string): Promise<any[]> {
  try {
    const sheets = await getSheetsClient();
    
    // Fetch revisions
    const revResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REVISION_SHEET}!A:I`,
    });
    
    // Fetch remarks
    const remResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REMARK_SHEET}!A:F`,
    });

    const revRows = revResponse.data.values || [];
    const remRows = remResponse.data.values || [];

    const history: any[] = [];

    // Parse revisions
    if (revRows.length > 1) {
      revRows.slice(1).forEach(row => {
        if (String(row[1]) === String(delegationId)) {
          history.push({
            type: 'revision',
            id: row[0],
            old_status: row[2],
            new_status: row[3],
            old_due_date: row[4],
            new_due_date: row[5],
            reason: row[6],
            created_at: row[7],
            evidence_urls: row[8]
          });
        }
      });
    }

    // Parse remarks
    if (remRows.length > 1) {
      remRows.slice(1).forEach(row => {
        if (String(row[1]) === String(delegationId)) {
          history.push({
            type: 'remark',
            id: row[0],
            user_id: row[2],
            username: row[3],
            remark: row[4],
            created_at: row[5]
          });
        }
      });
    }

    // Sort by date latest to oldest
    return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
}
