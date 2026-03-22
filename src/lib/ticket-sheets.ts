import { google } from "googleapis";

const GOOGLE_SHEET_ID = "1SSWWCTVanxELVZdBagShBuALzVLkYUeb5CK-ETmw_18";
const SHEET_NAME = "tickets";
const HISTORY_SHEET = "tickets_history";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  raised_by: string;
  solver_person: string;
  planned_resolution: string;
  status: string;
  created_at: string;
  updated_at: string;
  attachment_url: string;
  voice_note: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  action_type: string; // 'STATUS_CHANGE' | 'COMMENT'
  actor_username: string;
  old_status: string;
  new_status: string;
  comment_text: string;
  created_at: string;
  attachment_url: string;
  voice_note: string;
}

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

export async function getTickets(): Promise<Ticket[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:M`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      title: row[1] || "",
      description: row[2] || "",
      category: row[3] || "",
      priority: row[4] || "",
      raised_by: row[5] || "",
      solver_person: row[6] || "",
      planned_resolution: row[7] || "",
      status: row[8] || "",
      created_at: row[9] || "",
      updated_at: row[10] || "",
      attachment_url: row[11] || "",
      voice_note: row[12] || "",
    }));
  } catch (error) {
    console.error("Error fetching tickets from Google Sheets:", error);
    return [];
  }
}

export async function addTicket(ticket: Ticket): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:M`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          ticket.id,
          ticket.title,
          ticket.description,
          ticket.category,
          ticket.priority,
          ticket.raised_by,
          ticket.solver_person,
          ticket.planned_resolution,
          ticket.status,
          ticket.created_at,
          ticket.updated_at,
          ticket.attachment_url || "",
          ticket.voice_note || ""
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding ticket to Google Sheets:", error);
    return false;
  }
}

export async function updateTicket(id: string, ticket: Ticket): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    const searchId = String(id).trim();
    const rowIndex = rows.findIndex(row => row[0]?.toString().trim() === searchId);
    
    if (rowIndex === -1) throw new Error(`Ticket ID ${searchId} not found.`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:M${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          ticket.id,
          ticket.title,
          ticket.description,
          ticket.category,
          ticket.priority,
          ticket.raised_by,
          ticket.solver_person,
          ticket.planned_resolution,
          ticket.status,
          ticket.created_at,
          ticket.updated_at,
          ticket.attachment_url || "",
          ticket.voice_note || ""
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating ticket:", error);
    return false;
  }
}

export async function deleteTicket(id: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });
    
    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0]?.toString().trim() === id.trim());
    if (rowIndex === -1) return false;
    
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;
    if (sheetId === undefined) return false;
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          { deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }
        ]
      }
    });
    return true;
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return false;
  }
}

export async function getTicketHistory(ticketId: string): Promise<TicketHistory[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${HISTORY_SHEET}!A:J`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1)
      .filter((row) => String(row[1]) === String(ticketId))
      .map((row) => ({
        id: row[0] || "",
        ticket_id: row[1] || "",
        action_type: row[2] || "",
        actor_username: row[3] || "",
        old_status: row[4] || "",
        new_status: row[5] || "",
        comment_text: row[6] || "",
        created_at: row[7] || "",
        attachment_url: row[8] || "",
        voice_note: row[9] || "",
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error("Error fetching ticket history:", error);
    return [];
  }
}

export async function addTicketHistory(history: TicketHistory): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${HISTORY_SHEET}!A:J`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          history.id,
          history.ticket_id,
          history.action_type,
          history.actor_username,
          history.old_status,
          history.new_status,
          history.comment_text,
          history.created_at,
          history.attachment_url || "",
          history.voice_note || ""
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding ticket history:", error);
    return false;
  }
}
