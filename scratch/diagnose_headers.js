
const { google } = require("googleapis");

const GOOGLE_SHEET_ID = "1cuOGO1UZ3O41zUDrowRlFZ6FCSfUWVsmfVULA0Jx6Tg";
const DROPDOWN_SHEET_NAME = "Dropdown";

async function checkHeadersPrecisely() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${DROPDOWN_SHEET_NAME}!1:1`,
  });

  const headers = response.data.values?.[0] || [];
  console.log("EXACT HEADERS:", JSON.stringify(headers));
  
  const response2 = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${DROPDOWN_SHEET_NAME}!A:B`,
  });
  console.log("FIRST 5 ROWS:", JSON.stringify(response2.data.values?.slice(0, 5)));
}

checkHeadersPrecisely().catch(console.error);
