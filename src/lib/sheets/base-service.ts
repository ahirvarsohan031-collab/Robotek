import { google } from "googleapis";
import { globalCache } from "../cache";

export interface SheetItem {
  id: string | number;
  [key: string]: any;
}

export function getColumnLetter(colIndex: number): string {
  let temp, letter = '';
  let col = colIndex + 1;
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - temp - 1) / 26);
  }
  return letter;
}

export abstract class BaseSheetsService<T extends SheetItem> {
  protected abstract spreadsheetId: string;
  protected abstract sheetName: string;
  protected abstract range: string;
  protected abstract idColumnIndex: number; // 0-based

  protected hMap: Record<string, number> = {};
  private CACHE_TTL = 300000; // 5 minutes
  // Column used to store a last-modified Unix timestamp (a cell unlikely to collide with data)
  private META_COL = 'ZZ';
  private META_ROW = 1;

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
    const cachedData = globalCache.get<T[]>(cacheKey);

    if (cachedData) {
      console.log(`[CACHE HIT] ${this.sheetName}`);
      return cachedData;
    }

    try {
      console.log(`[API CALL] Fetching ${this.sheetName}...`);
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.range}`,
      });

      const rows = response.data.values;
      if (rows && rows.length > 0) {
        const headers = rows[0].map((h: any) => h.toString().toLowerCase().trim());
        globalCache.set(`${this.spreadsheetId}_${this.sheetName}_headers`, headers, 24 * 60 * 60 * 1000); // Cache headers for 24 hours
      }
      
      const data = rows ? rows.slice(1).map((row) => this.mapRowToItem(row)) : [];
      globalCache.set(cacheKey, data, this.CACHE_TTL);
      return data;
    } catch (error) {
       console.error(`Error fetching ${this.sheetName}:`, error);
       return [];
     }
   }
 
  async getLatestIds(): Promise<(string | number)[]> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const idColLetter = getColumnLetter(this.idColumnIndex);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${idColLetter}:${idColLetter}`,
      });
      return response.data.values?.slice(1).map(row => row[0]) || [];
    } catch (error) {
      console.error(`Error fetching latest IDs for ${this.sheetName}:`, error);
      return [];
    }
  }

  /**
   * Returns the last-modified Unix timestamp (ms) stored in the meta cell.
   * Returns 0 if not yet written.
   */
  async getLastModified(): Promise<number> {
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.META_COL}${this.META_ROW}`,
      });
      const val = response.data.values?.[0]?.[0];
      return val ? Number(val) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Writes the current Unix timestamp (ms) into the meta cell.
   * Called internally after every add / update / delete.
   */
  /**
   * Manually trigger a synchronization event for this module.
   */
  public async triggerSync(): Promise<void> {
    return this.writeLastModified();
  }

  protected async writeLastModified(): Promise<void> {
    try {
      const sheets = await this.getSheetsClient();
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${this.META_COL}${this.META_ROW}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[Date.now()]] },
      });
    } catch {
      // Non-critical — silently ignore if meta-write fails
    }
  }

  async getHeaders(): Promise<string[]> {
    const cacheKey = `${this.spreadsheetId}_${this.sheetName}_headers`;
    const cachedHeaders = globalCache.get<string[]>(cacheKey);
    if (cachedHeaders) {
      return cachedHeaders;
    }
    
    try {
      console.log(`[API CALL] Fetching headers for ${this.sheetName}...`);
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!1:1`,
      });
      
      const headers = response.data.values?.[0]?.map((h: any) => h.toString().toLowerCase().trim()) || [];
      
      // AUTO-PROVISIONING: If updated_at is missing, add it to the sheet
      if (headers.length > 0 && !headers.includes("updated_at")) {
        console.log(`[AUTO-PROVISION] Adding updated_at column to ${this.sheetName}`);
        try {
          const nextColLetter = getColumnLetter(headers.length);
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!${nextColLetter}1`,
            valueInputOption: "RAW",
            requestBody: { values: [["updated_at"]] },
          });
          headers.push("updated_at");
        } catch (e) {
          console.error(`Failed to auto-provision updated_at for ${this.sheetName}`, e);
        }
      }

      globalCache.set(cacheKey, headers, 24 * 60 * 60 * 1000); // Cache headers for 24 hours
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
      console.log(`[API CALL] Adding to ${this.sheetName}...`);
      const sheets = await this.getSheetsClient();

      // Auto-timestamp if column exists
      if (this.hMap['updated_at'] !== undefined) {
        (item as any).updated_at = new Date().toISOString();
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`, // Append to start of data
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [this.mapItemToRow(item)],
        },
      });

      this.invalidateCache();
      void this.writeLastModified(); // meta-level heartbeat
      return true;
    } catch (error) {
      console.error(`Error adding to ${this.sheetName}:`, error);
      return false;
    }
  }

  async update(id: string | number, item: T): Promise<boolean> {
    await this.ensureHeaders();
    try {
      console.log(`[API CALL] Updating ${this.sheetName} ID: ${id}...`);
      const sheets = await this.getSheetsClient();
      
      const idColLetter = getColumnLetter(this.idColumnIndex);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${idColLetter}:${idColLetter}`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const searchId = String(id).trim();
      const rowIndex = rows.findIndex(row => String(row[0]).trim() === searchId);
      
      if (rowIndex === -1) return false;

      const endCol = getColumnLetter(Math.max(...Object.values(this.hMap)));

      // Auto-timestamp if column exists
      if (this.hMap['updated_at'] !== undefined) {
        (item as any).updated_at = new Date().toISOString();
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${rowIndex + 1}:${endCol}${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [this.mapItemToRow(item)],
        },
      });

      this.invalidateCache();
      void this.writeLastModified(); // meta-level heartbeat
      return true;
    } catch (error) {
      console.error(`Error updating ${this.sheetName}:`, error);
      return false;
    }
  }

  async delete(id: string | number): Promise<boolean> {
    try {
      console.log(`[API CALL] Deleting from ${this.sheetName} ID: ${id}...`);
      const sheets = await this.getSheetsClient();
      const idColLetter = getColumnLetter(this.idColumnIndex);
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
      void this.writeLastModified(); // stamp timestamp — non-blocking
      return true;
    } catch (error) {
      console.error(`Error deleting from ${this.sheetName}:`, error);
      return false;
    }
  }

  async getChanges(sinceTimestamp: string): Promise<{ upserts: T[], currentIds: (string | number)[], timestamp: string }> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const idIdx = this.idColumnIndex;
      const updateIdx = this.hMap['updated_at'];

      // If no updated_at column, fallback to full fetch
      if (updateIdx === undefined) {
        const all = await this.getAll();
        return { 
          upserts: all, 
          currentIds: all.map(i => i.id), 
          timestamp: new Date().toISOString() 
        };
      }

      // 1. Fetch ONLY the ID and updated_at columns for efficiency
      const idCol = getColumnLetter(idIdx);
      const updateCol = getColumnLetter(updateIdx);
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: [`${this.sheetName}!${idCol}:${idCol}`, `${this.sheetName}!${updateCol}:${updateCol}`],
      });

      const idRows = response.data.valueRanges?.[0].values || [];
      const updateRows = response.data.valueRanges?.[1].values || [];
      
      const upsertIndices: number[] = [];
      const currentIds: (string | number)[] = [];
      const sinceTime = new Date(sinceTimestamp).getTime();

      // Skip header row
      const maxLength = Math.max(idRows.length, updateRows.length);
      for (let i = 1; i < maxLength; i++) {
        const id = idRows[i]?.[0];
        const updatedAt = updateRows[i]?.[0];
        
        if (id !== undefined) currentIds.push(id);
        
        if (updatedAt) {
          const rowTime = new Date(updatedAt).getTime();
          if (rowTime > sinceTime) {
            upsertIndices.push(i + 1); // 1-based index (e.g. index 1 is row 2)
          }
        }
      }

      let upserts: T[] = [];
      if (upsertIndices.length > 0) {
        // Fallback to full fetch if too many changes (prevents 413 error)
        if (upsertIndices.length > 50) {
          console.log(`[SYNC] Too many changes (${upsertIndices.length}), falling back to full fetch`);
          const all = await this.getAll();
          const upsertIds = new Set(upsertIndices.map(idx => {
            const rowData = idRows[idx - 1]; // idRows is 0-indexed, upsertIndices is 1-indexed (sheet row num)
            return rowData?.[0];
          }).filter(Boolean));
          
          upserts = all.filter(item => upsertIds.has(String(item.id)));
        } else {
          // Fetch specific rows for efficiency
          const maxColIdx = Math.max(...Object.values(this.hMap));
          const endCol = getColumnLetter(maxColIdx);
          const ranges = upsertIndices.map(rowNum => `${this.sheetName}!A${rowNum}:${endCol}${rowNum}`);
          
          const batchResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: this.spreadsheetId,
            ranges,
          });
          
          upserts = batchResponse.data.valueRanges?.map(vr => {
            const row = vr.values?.[0] || [];
            return this.mapRowToItem(row);
          }) || [];
        }
      }

      return {
        upserts,
        currentIds,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching changes for ${this.sheetName}:`, error);
      return { upserts: [], currentIds: [], timestamp: sinceTimestamp };
    }
  }

  protected invalidateCache() {
    const cacheKey = `${this.spreadsheetId}_${this.sheetName}`;
    globalCache.delete(cacheKey);
    // Also clear header cache so structural changes (added/removed columns) are picked up
    const headerCacheKey = `${this.spreadsheetId}_${this.sheetName}_headers`;
    globalCache.delete(headerCacheKey);
    // Reset in-memory hMap so ensureHeaders() re-fetches on next request
    this.hMap = {};
  }
}
