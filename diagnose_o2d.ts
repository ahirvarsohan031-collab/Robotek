
import { google } from 'googleapis';
import * as path from 'path';

// Note: Ensure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are set in your environment
// Next.js handles .env.local automatically when running via npm run dev

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";

async function diagnostic() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    console.log("Fetching spreadsheet metadata...");
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title);
    console.log("Sheet Titles:", sheetTitles);

    const configSheetName = sheetTitles?.find(t => t?.includes("Configuration") || t?.includes("Config"));
    console.log("Likely Config Sheet:", configSheetName);

    if (configSheetName) {
      console.log(`Fetching data from ${configSheetName}!A1:C12...`);
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${configSheetName}!A1:C12`,
      });
      console.log("Data retrieved:", JSON.stringify(data.data.values, null, 2));
    }
  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", (err as any).message);
  }
}

diagnostic();
