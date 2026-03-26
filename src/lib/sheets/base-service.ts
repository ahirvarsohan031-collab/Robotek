import { google } from "googleapis";

export interface SheetItem {
  id: string | number;
  [key: string]: any;
}

export abstract class BaseSheetsService<T extends SheetItem> {
  protected abstract spreadsheetId: string;
  protected abstract sheetName: string;
  protected abstract range: string;
  protected abstract idColumnIndex: number; // 0-based

  // Memory cache (per instance)
  protected static cacheMap: Record<string, { data: any[]; timestamp: number }> = {};
  protected static headerCache: Record<string, string[]> = {};
  protected hMap: Record<string, number> = {};
  private CACHE_TTL = 10000; // 10 seconds for real-time sync

  protected abstract mapRowToItem(row: any[]): T;
  protected abstract mapItemToRow(item: T): any[];

  protected async ensureHeaders() {
    if (Object.keys(this.hMap).length > 0) return;
    this.hMap = await this.getHeaderMap();
  }

  protected async getSheetsClient() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
    oauth2Client.setCredentials(tokens);

    return google.sheets({ version: "v4", auth: oauth2Client });
  }

  async getAll(): Promise<T[]> {
    await this.ensureHeaders();
    const cacheKey = `${this.spreadsheetId}_${this.sheetName}`;
    const now = Date.now();
    const cached = BaseSheetsService.cacheMap[cacheKey];

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.range}`,
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        BaseSheetsService.headerCache[cacheKey] = rows[0].map((h: any) => h.toString().toLowerCase().trim());
      }
      
      const data = rows ? rows.slice(1).map((row) => this.mapRowToItem(row)) : [];
      BaseSheetsService.cacheMap[cacheKey] = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error(`Error fetching ${this.sheetName}:`, error);
      return cached ? cached.data : [];
    }
  }

  async getHeaders(): Promise<string[]> {
    const cacheKey = `${this.spreadsheetId}_${this.sheetName}`;
    if (BaseSheetsService.headerCache[cacheKey]) {
      return BaseSheetsService.headerCache[cacheKey];
    }
    
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!1:1`,
      });
      
      const headers = response.data.values?.[0]?.map((h: any) => h.toString().toLowerCase().trim()) || [];
      BaseSheetsService.headerCache[cacheKey] = headers;
      return headers;
    } catch (error) {
      console.error(`Error fetching headers for ${this.sheetName}:`, error);
      return [];
    }
  }

  async getHeaderMap(): Promise<Record<string, number>> {
    const headers = await this.getHeaders();
    const map: Record<string, number> = {};
    headers.forEach((h, i) => {
      map[h] = i;
    });
    return map;
  }

  async add(item: T): Promise<boolean> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.range}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [this.mapItemToRow(item)],
        },
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error(`Error adding to ${this.sheetName}:`, error);
      return false;
    }
  }

  async update(id: string | number, item: T): Promise<boolean> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      
      // Efficient read for column IDs only
      const idColLetter = String.fromCharCode(65 + this.idColumnIndex);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${idColLetter}:${idColLetter}`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const searchId = String(id).trim();
      const rowIndex = rows.findIndex(row => String(row[0]).trim() === searchId);
      
      if (rowIndex === -1) return false;

      // Extract the end column letter from the range (e.g., "A:BG" -> "BG")
      const endCol = this.range.split(':')[1] || 'Z';

      // Update the specific row within the full range
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${rowIndex + 1}:${endCol}${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [this.mapItemToRow(item)],
        },
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error(`Error updating ${this.sheetName}:`, error);
      return false;
    }
  }

  async delete(id: string | number): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      const idColLetter = String.fromCharCode(65 + this.idColumnIndex);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${idColLetter}:${idColLetter}`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const rowIndex = rows.findIndex(row => String(row[0]).trim() === String(id).trim());
      if (rowIndex === -1) return false;

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === this.sheetName)?.properties?.sheetId;

      if (sheetId === undefined) return false;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 }
            }
          }]
        }
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error(`Error deleting from ${this.sheetName}:`, error);
      return false;
    }
  }

  protected invalidateCache() {
    const cacheKey = `${this.spreadsheetId}_${this.sheetName}`;
    delete BaseSheetsService.cacheMap[cacheKey];
    delete BaseSheetsService.headerCache[cacheKey];
  }
}
