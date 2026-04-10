
const { google } = require("googleapis");

const GOOGLE_SHEET_ID = "1cuOGO1UZ3O41zUDrowRlFZ6FCSfUWVsmfVULA0Jx6Tg";
const DROPDOWN_SHEET_NAME = "Dropdown";

async function verifyDynamicMapping() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  
  // 1. Fetch headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${DROPDOWN_SHEET_NAME}!A1:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    console.log("Sheet is empty");
    return;
  }

  const headers = (rows[0] || []).map(h => String(h).toLowerCase().trim());
  console.log("Headers detected:", headers);

  const deptIndex = headers.indexOf("department");
  const desigIndex = headers.indexOf("designation");

  console.log(`Mapping: department -> Index ${deptIndex}, designation -> Index ${desigIndex}`);

  if (deptIndex === -1 || desigIndex === -1) {
    console.error("CRITICAL: One or more headers missing!");
  }

  // 2. Sample Data
  const dataRows = rows.slice(1);
  const departments = deptIndex !== -1 ? dataRows.map(row => row[deptIndex]).filter(Boolean) : [];
  const designations = desigIndex !== -1 ? dataRows.map(row => row[desigIndex]).filter(Boolean) : [];

  console.log("Departments found:", departments);
  console.log("Designations found:", designations);
}

function getColumnLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

verifyDynamicMapping().catch(console.error);
