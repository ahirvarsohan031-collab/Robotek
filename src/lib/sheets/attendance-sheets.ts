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
  inPhoto?: string;
  outPhoto?: string;
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Sheet1!A:I",
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
      inPhoto: row[7] || "",
      outPhoto: row[8] || "",
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
      range: "Sheet1!A:I",
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
          record.inPhoto,
          record.outPhoto,
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding attendance record:", error);
    return false;
  }
}

export async function updateAttendanceRecord(id: string, outTime: string, status: string, outPhoto?: string): Promise<boolean> {
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

    if (outPhoto) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
        range: `Sheet1!I${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[outPhoto]],
        },
      });
    }

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
  responsibility1?: string;
  responsibility2?: string;
  responsibility3?: string;
  acceptedBy?: string;
  updatedAt?: string;
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: "Leave!A:L",
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
      responsibility1: row[7] || "",
      responsibility2: row[8] || "",
      responsibility3: row[9] || "",
      acceptedBy: row[10] || "",
      updatedAt: row[11] || "",
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
      range: "Leave!A:L",
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
          req.responsibility1 || "",
          req.responsibility2 || "",
          req.responsibility3 || "",
          req.acceptedBy || "",
          req.updatedAt || new Date().toISOString(),
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding leave request:", error);
    return false;
  }
}

export async function updateLeaveStatus(id: string, status: string, acceptedBy?: string): Promise<boolean> {
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

    const range = acceptedBy 
      ? `Leave!G${rowIndex + 1}:K${rowIndex + 1}` 
      : `Leave!G${rowIndex + 1}`;
    
    const values = acceptedBy 
      ? [[status, "", "", "", acceptedBy]] // Just to reach K, we keep H, I, J as they are if we use specific range
      // Wait, update range to only G and K separately if needed, or update the whole row segment.
      // Better to update specifically.
      : [[status]];

    if (acceptedBy) {
        // Update Status (G) and AcceptedBy (K)
        await sheets.spreadsheets.values.update({
            spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
            range: `Leave!G${rowIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[status]] },
        });
        await sheets.spreadsheets.values.update({
            spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
            range: `Leave!K${rowIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[acceptedBy]] },
        });
    } else {
        await sheets.spreadsheets.values.update({
            spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
            range: `Leave!G${rowIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[status]] },
        });
    }

    return true;
  } catch (error) {
    console.error("Error updating leave status:", error);
    return false;
  }
}

export async function updateLeaveRequest(id: string, req: Partial<LeaveRequest>): Promise<boolean> {
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

    // Get existing row to merge
    const fullRowRes = await sheets.spreadsheets.values.get({
        spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
        range: `Leave!A${rowIndex + 1}:L${rowIndex + 1}`,
    });
    const existing = fullRowRes.data.values?.[0] || [];

    const updatedRow = [
      existing[0], // id
      existing[1], // userId
      existing[2], // userName
      req.startDate || existing[3],
      req.endDate || existing[4],
      req.reason || existing[5],
      req.status || existing[6],
      req.responsibility1 !== undefined ? req.responsibility1 : existing[7],
      req.responsibility2 !== undefined ? req.responsibility2 : existing[8],
      req.responsibility3 !== undefined ? req.responsibility3 : existing[9],
      req.acceptedBy !== undefined ? req.acceptedBy : existing[10],
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      range: `Leave!A${rowIndex + 1}:L${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating leave request:", error);
    return false;
  }
}

export async function deleteLeaveRequest(id: string): Promise<boolean> {
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

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: ATTENDANCE_SPREADSHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === "Leave")?.properties?.sheetId;

    if (sheetId === undefined) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });

    return true;
  } catch (error) {
    console.error("Error deleting leave request:", error);
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
export async function deleteLeaveRemarks(leaveId: string): Promise<boolean> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
            range: "leave_remark!B:B",
        });

        const rows = response.data.values;
        if (!rows) return true;

        const indicesToDelete = rows
            .map((row, index) => row[0] === leaveId ? index : -1)
            .filter(index => index !== -1)
            .reverse(); // Delete from bottom to top to preserve indices

        if (indicesToDelete.length === 0) return true;

        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: ATTENDANCE_SPREADSHEET_ID });
        const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === "leave_remark")?.properties?.sheetId;

        if (sheetId === undefined) return false;

        const requests = indicesToDelete.map(index => ({
            deleteDimension: {
                range: {
                    sheetId: sheetId,
                    dimension: "ROWS",
                    startIndex: index,
                    endIndex: index + 1
                }
            }
        }));

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
            requestBody: { requests }
        });

        return true;
    } catch (error) {
        console.error("Error deleting leave remarks:", error);
        return false;
    }
}
