import { google } from "googleapis";
import { User } from "@/types/user";

const GOOGLE_SHEET_ID = "1cuOGO1UZ3O41zUDrowRlFZ6FCSfUWVsmfVULA0Jx6Tg";
const SHEET_NAME = "user";

async function getSheetsClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL // Or your redirect URI
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  // Handle token refresh if necessary
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      // In a real app, you'd save this back to your DB or .env
      console.log('New refresh token received');
    }
    console.log('New access token received');
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function getUsers(): Promise<User[]> {
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
      username: row[1] || "",
      email: row[2] || "",
      password: row[3] || "",
      phone: row[4] || "",
      role_name: row[5] || "",
      late_long: row[6] || "",
      image_url: row[7] || "",
      dob: row[8] || "",
      office: row[9] || "",
      designation: row[10] || "",
      department: row[11] || "",
      last_active: row[12] || "",
    }));
  } catch (error) {
    console.error("Error fetching users from Google Sheets:", error);
    return [];
  }
}

export async function addUser(user: User): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:M`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          user.id,
          user.username,
          user.email,
          user.password,
          user.phone,
          user.role_name,
          user.late_long,
          user.image_url,
          user.dob,
          user.office || "",
          user.designation || "",
          user.department || "",
          (user as any).last_active || ""
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding user to Google Sheets:", error);
    return false;
  }
}

export async function updateUser(id: string, user: User): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:M${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          user.id,
          user.username,
          user.email,
          user.password,
          user.phone,
          user.role_name,
          user.late_long,
          user.image_url,
          user.dob,
          user.office || "",
          user.designation || "",
          user.department || "",
          (user as any).last_active || ""
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating user in Google Sheets:", error);
    return false;
  }
}

import { globalCache } from "./cache";

const VISIBILITY_SHEET_NAME = "page_visibility";

export async function getPagePermissions(): Promise<Record<string, string[]>> {
  const cacheKey = "page_permissions";
  const cached = globalCache.get<Record<string, string[]>>(cacheKey);
  if (cached) {
    console.log("[CACHE HIT] Permissions");
    return cached;
  }

  try {
    console.log("[API CALL] Fetching Permissions...");
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${VISIBILITY_SHEET_NAME}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return {};

    const headers = rows[0]; // [ "User ID", "users", "delegations", ... ]
    const permissions: Record<string, string[]> = {};

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const userId = row[0];
        const userPerms: string[] = [];
        
        // Skip Index 0 (User ID) and Index 1 (User Name)
        for (let j = 2; j < headers.length; j++) {
            if (row[j] === "TRUE" || row[j] === "true") {
                userPerms.push(headers[j]);
            }
        }
        permissions[userId] = userPerms;
    }

    globalCache.set(cacheKey, permissions, 15 * 60 * 1000); // 15 minutes TTL
    return permissions;
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return {};
  }
}

export async function updateUserPermissions(userId: string, username: string, userPermissions: string[], allPageIds: string[]): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // 1. Get current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${VISIBILITY_SHEET_NAME}!A:Z`,
    });

    let rows = response.data.values || [];
    
    // 2. Initialize headers if empty
    if (rows.length === 0) {
      const initialHeaders = ["User ID", "User Name", ...allPageIds];
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${VISIBILITY_SHEET_NAME}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [initialHeaders] },
      });
      rows = [initialHeaders];
    }

    let headers = rows[0];
    
    // 3. Ensure allPageIds are in headers
    let headersChanged = false;
    for (const pageId of allPageIds) {
      if (!headers.includes(pageId)) {
        headers.push(pageId);
        headersChanged = true;
      }
    }
    
    if (headersChanged) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${VISIBILITY_SHEET_NAME}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });
    }

    // 4. Find user row
    const rowIndex = rows.findIndex(row => row[0] === userId);
    
    // 5. Construct user row
    const newRow = [userId, username];
    for (let i = 2; i < headers.length; i++) {
        const pageId = headers[i];
        newRow.push(userPermissions.includes(pageId) ? "TRUE" : "FALSE");
    }

    if (rowIndex === -1) {
      // Append new user
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${VISIBILITY_SHEET_NAME}!A:A`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRow] },
      });
    } else {
      // Update existing user
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${VISIBILITY_SHEET_NAME}!A${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRow] },
      });
    }

    globalCache.delete("page_permissions");
    return true;
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return false;
  }
}

function getColumnLetter(column: number): string {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // Find row in user sheet
    const userResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const userRows = userResponse.data.values;
    if (!userRows) return false;

    const userRowIndex = userRows.findIndex(row => row[0] === id);
    if (userRowIndex === -1) return false;

    // Get spreadsheet info to get sheet IDs
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID
    });
    
    const userSheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;
    const visibilitySheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === VISIBILITY_SHEET_NAME)?.properties?.sheetId;

    if (userSheetId === undefined) {
      console.error(`Sheet with name ${SHEET_NAME} not found.`);
      return false;
    }

    const requests: any[] = [
      {
        deleteDimension: {
          range: {
            sheetId: userSheetId,
            dimension: "ROWS",
            startIndex: userRowIndex,
            endIndex: userRowIndex + 1
          }
        }
      }
    ];

    // Find row in visibility sheet and delete if exists
    if (visibilitySheetId !== undefined) {
      try {
        const visResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${VISIBILITY_SHEET_NAME}!A:A`,
        });
        const visRows = visResponse.data.values;
        if (visRows) {
          const visRowIndex = visRows.findIndex(row => row[0] === id);
          if (visRowIndex !== -1) {
            requests.push({
              deleteDimension: {
                range: {
                  sheetId: visibilitySheetId,
                  dimension: "ROWS",
                  startIndex: visRowIndex,
                  endIndex: visRowIndex + 1
                }
              }
            });
          }
        }
      } catch (e) {
        console.error("Error fetching visibility rows for deletion:", e);
      }
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting user from Google Sheets:", error);
    return false;
  }
}

export async function getUserByUsernameOrEmail(identifier: string): Promise<User | null> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return null;

    const dataRows = rows.slice(1);
    
    const userRow = dataRows.find(row => 
      row[1] === identifier || row[2] === identifier
    );

    if (!userRow) return null;

    const user: User = {
      id: userRow[0],
      username: userRow[1],
      email: userRow[2],
      password: userRow[3],
      phone: userRow[4],
      role_name: userRow[5],
      late_long: userRow[6],
      image_url: userRow[7],
      dob: userRow[8],
      office: userRow[9],
      designation: userRow[10],
      department: userRow[11],
      last_active: userRow[12] || "",
    } as any;

    // Fetch and attach permissions for this user
    try {
      const allPermissions = await getPagePermissions();
      user.permissions = allPermissions[user.id] || [];
    } catch (permError) {
      console.error("Error fetching permissions for login:", permError);
      user.permissions = [];
    }

    return user;
  } catch (error) {
    console.error("Error fetching user from Google Sheets:", error);
    return null;
  }
}

const DROPDOWN_SHEET_NAME = "Dropdown";

export async function getDropdownData(): Promise<{ departments: string[], designations: string[] }> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${DROPDOWN_SHEET_NAME}!A1:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return { departments: [], designations: [] };

    const headers = (rows[0] || []).map((h: any) => String(h).toLowerCase().trim());
    const deptIndex = headers.indexOf("department");
    const desigIndex = headers.indexOf("designation");

    const dataRows = rows.slice(1);
    const departments = deptIndex !== -1 ? dataRows.map(row => row[deptIndex]).filter(Boolean) : [];
    const designations = desigIndex !== -1 ? dataRows.map(row => row[desigIndex]).filter(Boolean) : [];

    return { departments, designations };
  } catch (error) {
    console.error("Error fetching dropdown data:", error);
    return { departments: [], designations: [] };
  }
}

export async function addDropdownOption(type: 'department' | 'designation', value: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // 1. Fetch current dropdown sheet content to find headers and next empty row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${DROPDOWN_SHEET_NAME}!A1:Z100`, // Scan enough rows
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.error("Dropdown sheet is empty or headers missing.");
      return false;
    }

    const headers = (rows[0] || []).map((h: any) => String(h).toLowerCase().trim());
    const index = headers.indexOf(type.toLowerCase());
    
    if (index === -1) {
      console.error(`Header "${type}" not found. Available headers: ${headers.join(", ")}`);
      return false;
    }

    // 2. Determine the first empty row in the specific target column
    let lastUsedRowIndex = 0; // Row index 0 is headers
    for (let i = 0; i < rows.length; i++) {
      const cellValue = rows[i][index];
      if (cellValue !== undefined && String(cellValue).trim() !== "") {
        lastUsedRowIndex = i;
      }
    }
    const targetRowNumber = lastUsedRowIndex + 2; // Next row (1-based + 1)
    const columnLetter = getColumnLetter(index + 1);
    const targetRange = `${DROPDOWN_SHEET_NAME}!${columnLetter}${targetRowNumber}`;

    // 3. Write specifically to that cell
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: targetRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[value]],
      },
    });

    return true;
  } catch (error) {
    console.error(`Error adding ${type} option:`, error);
    return false;
  }
}
