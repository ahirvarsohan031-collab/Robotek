import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * DEBUG ENDPOINT - Check Google Sheets connection
 * Call this with: GET /api/ea-md/debug
 */
export async function GET() {
  try {
    console.log("[EA-MD Debug] Starting diagnosis...");

    // Check environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const tokens = process.env.GOOGLE_OAUTH_TOKENS;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    const envCheck = {
      GOOGLE_CLIENT_ID: clientId ? `${clientId.substring(0, 20)}...` : "NOT SET",
      GOOGLE_CLIENT_SECRET: clientSecret ? `${clientSecret.substring(0, 20)}...` : "NOT SET",
      GOOGLE_OAUTH_TOKENS: tokens ? `SET (${tokens.length} chars)` : "NOT SET",
      NEXTAUTH_URL: nextAuthUrl,
      NODE_ENV: process.env.NODE_ENV,
    };

    console.log("[EA-MD Debug] Environment:", envCheck);

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Missing Google OAuth credentials in environment",
          details: envCheck,
        },
        { status: 400 }
      );
    }

    if (!tokens) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Missing GOOGLE_OAUTH_TOKENS in environment",
          details: envCheck,
        },
        { status: 400 }
      );
    }

    // Try to parse tokens
    let parsedTokens;
    try {
      parsedTokens = JSON.parse(tokens);
      console.log("[EA-MD Debug] Tokens parsed successfully. Keys:", Object.keys(parsedTokens));
    } catch (e) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Failed to parse GOOGLE_OAUTH_TOKENS as JSON",
          details: envCheck,
          error: String(e),
        },
        { status: 400 }
      );
    }

    // Try to create OAuth2 client
    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, nextAuthUrl);
      oauth2Client.setCredentials(parsedTokens);
      console.log("[EA-MD Debug] OAuth2 client created successfully");

      // Try to get sheets service
      const sheets = google.sheets({ version: "v4", auth: oauth2Client });

      // Try to list sheets in the workbook
      const sheetId = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      return NextResponse.json({
        status: "SUCCESS",
        message: "Google Sheets connection is working!",
        details: {
          spreadsheetTitle: response.data.properties?.title,
          sheets: response.data.sheets?.map((s: any) => ({
            title: s.properties?.title,
            sheetId: s.properties?.sheetId,
            gridProperties: s.properties?.gridProperties,
          })),
          environment: envCheck,
        },
      });
    } catch (error: any) {
      console.error("[EA-MD Debug] OAuth/Sheets error:", error.message);
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Failed to connect to Google Sheets",
          details: envCheck,
          error: error.message,
          code: error.code,
          status: error.status,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[EA-MD Debug] Unexpected error:", error);
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Unexpected error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
