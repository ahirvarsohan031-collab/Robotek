import { BaseSheetsService } from "./sheets/base-service";
import { I2R, I2RStepConfig } from "@/types/i2r";
import { globalCache } from "./cache";

const GOOGLE_SHEET_ID = "1xOumI7LUWcde8C2PZv3Yd0pA6r0eJXdUOkJ_DiTFmZs";
const SHEET_NAME = "I2R";

class I2RService extends BaseSheetsService<I2R> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:AJ"; // A-H base cols + 9 steps * 3 cols each + Cancelled
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): I2R {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("id"),
      indend_num: get("indend_num"),
      item_name: get("item_name"),
      quantity: get("quantity"),
      category: get("category"),
      filled_by: get("filled_by"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      cancelled: get("cancelled"),
    };
    for (let i = 1; i <= 9; i++) {
      item[`planned_${i}`] = get(`planned_${i}`);
      item[`acual_${i}`] = get(`acual_${i}`);
      item[`status_${i}`] = get(`status_${i}`);
    }
    return item as I2R;
  }

  mapItemToRow(item: I2R): any[] {
    const totalCols = Object.keys(this.hMap).length || 35;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("indend_num", item.indend_num);
    set("item_name", item.item_name);
    set("quantity", item.quantity);
    set("category", item.category);
    set("filled_by", item.filled_by);
    set("created_at", item.created_at);
    set("updated_at", item.updated_at);
    set("cancelled", item.cancelled);

    for (let i = 1; i <= 9; i++) {
      set(`planned_${i}`, (item as any)[`planned_${i}`]);
      set(`acual_${i}`, (item as any)[`acual_${i}`]);
      set(`status_${i}`, (item as any)[`status_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }

  async getNextIndentNum(): Promise<string> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const indentColIdx = this.hMap["indend_num"];
      if (indentColIdx === undefined) return "INDT- 1";

      // Import getColumnLetter inline since it's exported from base-service
      const letter = this.getColLetter(indentColIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${letter}:${letter}`,
      });

      const values = response.data.values?.slice(1) || [];
      let maxNum = 0;
      for (const row of values) {
        const val = String(row[0] || "");
        const match = val.match(/INDT-\s*(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      return `INDT- ${maxNum + 1}`;
    } catch (error) {
      console.error("Error generating indent num:", error);
      return "INDT- 1";
    }
  }

  private getColLetter(colIndex: number): string {
    let temp,
      letter = "";
    let col = colIndex + 1;
    while (col > 0) {
      temp = (col - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      col = Math.floor((col - temp - 1) / 26);
    }
    return letter;
  }

  /**
   * Ensures the given column names exist as headers in row 1.
   * If any are missing they are appended to the right of the last used column.
   * The hMap is refreshed afterwards so subsequent reads/writes work immediately.
   */
  async ensureColumns(names: string[]): Promise<void> {
    await this.ensureHeaders();
    const sheets = await this.getSheetsClient();

    // Find missing headers (case-insensitive)
    const missing = names.filter((n) => this.hMap[n.toLowerCase()] === undefined);
    if (missing.length === 0) return;

    // Determine the next free column index (right after the last known header)
    const maxIdx = Object.values(this.hMap).reduce((m, v) => Math.max(m, v), -1);
    let nextIdx = maxIdx + 1;

    for (const name of missing) {
      const colLetter = this.getColLetter(nextIdx);
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${colLetter}1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[name]] },
      });
      // Update local hMap immediately so the caller can use it
      this.hMap[name.toLowerCase()] = nextIdx;
      nextIdx++;
    }

    // Invalidate header cache so next full fetch picks up the new columns
    const headerCacheKey = `${this.spreadsheetId}_${this.sheetName}_headers`;
    globalCache.delete(headerCacheKey);
  }

  async getStepConfig(): Promise<I2RStepConfig[]> {
    const cacheKey = `${this.spreadsheetId}_i2r_step_config`;
    const cached = globalCache.get<I2RStepConfig[]>(cacheKey);
    if (cached) return cached;

    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `Step Configuration!A2:C`,
    });
    const data: I2RStepConfig[] =
      response.data.values?.map((row) => ({
        step_name: row[0] || "",
        tat: row[1] || "",
        responsible_person: row[2] || "",
      })) || [];

    globalCache.set(cacheKey, data, 60 * 60 * 1000);
    return data;
  }
}

export const i2rService = new I2RService();

export async function getI2RItems(): Promise<I2R[]> {
  return i2rService.getAll();
}

let i2rLock: Promise<any> = Promise.resolve();

export async function addI2RItem(data: Partial<I2R>): Promise<boolean> {
  return (i2rLock = i2rLock
    .then(async () => {
      if (!data.id) {
        data.id = (await i2rService.getNextNumericalId()).toString();
      }
      if (!data.indend_num) {
        data.indend_num = await i2rService.getNextIndentNum();
      }
      const now = new Date().toISOString();
      data.created_at = now;
      data.updated_at = now;
      return i2rService.add(data as I2R);
    })
    .catch((err) => {
      console.error("Error in addI2RItem lock:", err);
      return false;
    }));
}

export async function updateI2RItem(id: string, data: I2R): Promise<boolean> {
  data.updated_at = new Date().toISOString();
  // Ensure the cancelled column exists in the sheet before writing
  await i2rService.ensureColumns(["cancelled"]);
  return i2rService.update(id, data);
}

export async function deleteI2RItem(id: string): Promise<boolean> {
  return i2rService.delete(id);
}

export async function getNextIndentNum(): Promise<string> {
  return i2rService.getNextIndentNum();
}

export async function getI2RStepConfig(): Promise<I2RStepConfig[]> {
  return i2rService.getStepConfig();
}

export async function updateI2RStepConfig(configs: I2RStepConfig[]): Promise<boolean> {
  try {
    const sheets = await (i2rService as any).getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Step Configuration!A2:C${configs.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: configs.map((c) => [c.step_name, c.tat, c.responsible_person]),
      },
    });
    globalCache.delete(`${GOOGLE_SHEET_ID}_i2r_step_config`);
    return true;
  } catch (error) {
    console.error("Error updating I2R step config:", error);
    return false;
  }
}
