import { google } from "googleapis";

const ATTENDANCE_SPREADSHEET_ID = "1Gl782jnYBytGTZ-vMj5CgppfJHUPRF6lcCdH-pmj5w8";

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

// --- Attendance (Sheet1) ---

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string;
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Sheet1!A:G",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      userId: row[1] || "",
      userName: row[2] || "",
      date: row[3] || "",
      inTime: row[4] || "",
      outTime: row[5] || "",
      status: row[6] || "",
    }));
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return [];
  }
}

export async function addAttendanceRecord(record: AttendanceRecord): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Sheet1!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          record.id,
          record.userId,
          record.userName,
          record.date,
          record.inTime,
          record.outTime,
          record.status,
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding attendance record:", error);
    return false;
  }
}

export async function updateAttendanceRecord(id: string, outTime: string, status: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Sheet1!A:A",
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    await sheets.spreadsheets.values.update({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: `Sheet1!F${rowIndex + 1}:G${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[outTime, status]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return false;
  }
}

// --- Leave ---

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Leave!A:G",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      userId: row[1] || "",
      userName: row[2] || "",
      startDate: row[3] || "",
      endDate: row[4] || "",
      reason: row[5] || "",
      status: row[6] || "",
    }));
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return [];
  }
}

export async function addLeaveRequest(req: LeaveRequest): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Leave!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          req.id,
          req.userId,
          req.userName,
          req.startDate,
          req.endDate,
          req.reason,
          req.status,
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding leave request:", error);
    return false;
  }
}

export async function updateLeaveStatus(id: string, status: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Leave!A:A",
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    await sheets.spreadsheets.values.update({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: `Leave!G${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[status]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating leave status:", error);
    return false;
  }
}

// --- Leave Remarks ---

export interface LeaveRemark {
  id: string;
  leaveId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

export async function getLeaveRemarks(): Promise<LeaveRemark[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "leave_remark!A:E",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      leaveId: row[1] || "",
      userName: row[2] || "",
      comment: row[3] || "",
      createdAt: row[4] || "",
    }));
  } catch (error) {
    console.error("Error fetching leave remarks:", error);
    return [];
  }
}

export async function addLeaveRemark(remark: LeaveRemark): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "leave_remark!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          remark.id,
          remark.leaveId,
          remark.userName,
          remark.comment,
          remark.createdAt,
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding leave remark:", error);
    return false;
  }
}
