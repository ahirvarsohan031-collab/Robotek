import { getSheetsClient } from "./sheet-utils";

const SCOT_SPREADSHEET_ID = "1DUWUB_vySOgV3gWg_Vsz-jt4Ws_B4SBSj1pIfhqEfh0";
const SCOT_SHEET_NAME = "Data Feeder";

export interface ScotRecord {
  employeeName: string;
  employeeNumber: string;
  toName: string;
  countryCode: string;
  toNumber: string;
  callType: string;
  duration: string;
  callDate: string;
  callTime: string;
  notes: string;
  uniqueId: string;
  audioUrl: string;
}

export interface CallRecord {
  partyName: string;
  concernPerson: string;
  mobileNum: string;
  firmName: string;
  district: string;
  state: string;
  region: string;
  creditDaysNew: string;
  limit: string;
  collectionRating: string;
  customerType: string;
  salesPerson: string;
  salesCoordinator: string;
  averageOrderSize: string;
  targetAvgOrderSize: string;
  usuallyNoOfOrderMonthly: string;
  frequencyOfCallingAfterOrderPlaced: string;
  specialRemarkJSON: string;
}

export interface FollowUpRecord {
  partyName: string;
  status: string;
  nextFollowUpDate: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  lastFollowUpDate: string;
}

export async function getScotData(): Promise<ScotRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'${SCOT_SHEET_NAME}'!A2:L`,
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      employeeName: row[0] || "",
      employeeNumber: row[1] || "",
      toName: row[2] || "",
      countryCode: row[3] || "",
      toNumber: row[4] || "",
      callType: row[5] || "",
      duration: row[6] || "",
      callDate: row[7] || "",
      callTime: row[8] || "",
      notes: row[9] || "",
      uniqueId: row[10] || "",
      audioUrl: row[11] || "",
    }));
  } catch (error) {
    console.error("Error fetching Scot data:", error);
    return [];
  }
}

export async function getCallData(): Promise<CallRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'Calls'!A2:R`,
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      partyName: row[0] || "",
      concernPerson: row[1] || "",
      mobileNum: row[2] || "",
      firmName: row[3] || "",
      district: row[4] || "",
      state: row[5] || "",
      region: row[6] || "",
      creditDaysNew: row[7] || "",
      limit: row[8] || "",
      collectionRating: row[9] || "",
      customerType: row[10] || "",
      salesPerson: row[11] || "",
      salesCoordinator: row[12] || "",
      averageOrderSize: row[13] || "",
      targetAvgOrderSize: row[14] || "",
      usuallyNoOfOrderMonthly: row[15] || "",
      frequencyOfCallingAfterOrderPlaced: row[16] || "",
      specialRemarkJSON: row[17] || "[]",
    }));
  } catch (error) {
    console.error("Error fetching Call data:", error);
    return [];
  }
}

export async function updateCallData(partyName: string, data: Partial<CallRecord>): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // Fetch all rows to find the matching party name
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'Calls'!A:R`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === partyName);

    if (rowIndex === -1) {
      console.error(`Party ${partyName} not found in Calls sheet`);
      return false;
    }

    // Prepare updated row
    const currentRow = rows[rowIndex];
    const updatedRow = [...currentRow];
    
    // Map keys back to indices (0-16)
    const keys: (keyof CallRecord)[] = [
      'partyName', 'concernPerson', 'mobileNum', 'firmName', 'district', 'state', 'region',
      'creditDaysNew', 'limit', 'collectionRating', 'customerType', 'salesPerson', 'salesCoordinator',
      'averageOrderSize', 'targetAvgOrderSize', 'usuallyNoOfOrderMonthly', 'frequencyOfCallingAfterOrderPlaced',
      'specialRemarkJSON'
    ];

    keys.forEach((key, index) => {
      if (data[key] !== undefined) {
        updatedRow[index] = data[key];
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'Calls'!A${rowIndex + 1}:R${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return true;
  } catch (error) {
    console.error("Error updating Call data:", error);
    return false;
  }
}

export async function addCallRecord(data: CallRecord): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    const row = [
      data.partyName,
      data.concernPerson,
      data.mobileNum,
      data.firmName,
      data.district,
      data.state,
      data.region,
      data.creditDaysNew,
      data.limit,
      data.collectionRating,
      data.customerType,
      data.salesPerson,
      data.salesCoordinator,
      data.averageOrderSize,
      data.targetAvgOrderSize,
      data.usuallyNoOfOrderMonthly,
      data.frequencyOfCallingAfterOrderPlaced,
      data.specialRemarkJSON || "[]"
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'Calls'!A:R`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    return true;
  } catch (error) {
    console.error("Error adding Call record:", error);
    return false;
  }
}

export async function appendScotData(records: any[][]): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'${SCOT_SHEET_NAME}'!A:L`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: records,
      },
    });
    return true;
  } catch (error) {
    console.error("Error appending Scot data:", error);
    return false;
  }
}

export async function saveFollowUpData(record: FollowUpRecord): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'Follow Up'!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          record.partyName,
          record.status,
          record.nextFollowUpDate,
          record.remarks,
          record.createdBy,
          record.createdAt,
          record.lastFollowUpDate
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error saving Follow Up data:", error);
    return false;
  }
}

export async function getFollowUpData(): Promise<FollowUpRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SCOT_SPREADSHEET_ID,
      range: `'Follow Up'!A2:G`,
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      partyName: row[0] || "",
      status: row[1] || "",
      nextFollowUpDate: row[2] || "",
      remarks: row[3] || "",
      createdBy: row[4] || "",
      createdAt: row[5] || "",
      lastFollowUpDate: row[6] || "",
    }));
  } catch (error) {
    console.error("Error fetching Follow Up data:", error);
    return [];
  }
}
