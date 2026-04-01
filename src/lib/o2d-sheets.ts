import { BaseSheetsService, getColumnLetter } from "./sheets/base-service";
import { O2D, O2DStepConfig } from "@/types/o2d";
import { google } from "googleapis";
import { globalCache } from "./cache";

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";
const SHEET_NAME = "O2D";
const CONFIG_SHEET_NAME = "Step Configuration";

class O2DService extends BaseSheetsService<O2D> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:ZZ"; // Wide range for fetching to be safe
  protected idColumnIndex = 0;


  mapRowToItem(row: any[]): O2D {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";

    const item: any = {
      id: get("id"),
      order_no: get("order_no."),
      party_name: get("party_name"),
      item_name: get("item_name"),
      item_qty: get("item_qty"),
      est_amount: get("est._amount"),
      item_specification: get("item_specification"),
      remark: get("remark"),
      order_screenshot: get("order_screenshot"),
      filled_by: get("filled_by"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      hold: get("hold"),
      cancelled: get("cancelled"),
    };

    // Map steps 1-11
    for (let i = 1; i <= 11; i++) {
      item[`planned_${i}`] = get(`planned_${i}`);
      item[`actual_${i}`] = get(`acual_${i}`); // Note the typo "acual" from sheet
      item[`status_${i}`] = get(`status_${i}`);

      if (i === 1) {
        item.final_amount_1 = get("final_amount_1");
        item.so_number_1 = get("so_number_1");
        item.merge_order_with_1 = get("merge_order_with_1");
        item.upload_so_1 = get("upload_so_(attachment)_1");
      } else if (i === 6) {
        item.num_of_parcel_6 = get("num_of_parcel_6");
        item.upload_pi_6 = get("upoad_pi_(attachment)_6"); // Note typo "upoad"
        item.actual_date_of_order_packed_6 = get("actual_date_of_order_packed_6");
      } else if (i === 7) {
        item.voucher_num_7 = get("voucher_num_7");
      } else if (i === 8) {
        item.order_details_checked_8 = get("order_details_checked_in_order_sheet_(yes,no)_8");
        item.voucher_num_51_8 = get("voucher_num_(51)_8");
        item.t_amt_8 = get("t._amt_8");
      } else if (i === 9) {
        item.attach_bilty_9 = get("attach_billty_(attachment)_9"); // Note typo "billty"
        item.num_of_parcel_9 = get("num_of_parcel_9");
      }
    }

    return item as O2D;
  }

  mapItemToRow(o2d: O2D): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", o2d.id);
    set("order_no.", o2d.order_no);
    set("party_name", o2d.party_name);
    set("item_name", o2d.item_name);
    set("item_qty", o2d.item_qty);
    set("est._amount", o2d.est_amount);
    set("item_specification", o2d.item_specification);
    set("remark", o2d.remark);
    set("order_screenshot", o2d.order_screenshot);
    set("filled_by", o2d.filled_by);
    set("created_at", o2d.created_at);
    set("updated_at", o2d.updated_at);
    set("hold", o2d.hold || "");
    set("cancelled", o2d.cancelled || "");

    for (let i = 1; i <= 11; i++) {
      set(`planned_${i}`, (o2d as any)[`planned_${i}`]);
      set(`acual_${i}`, (o2d as any)[`actual_${i}`]);
      set(`status_${i}`, (o2d as any)[`status_${i}`]);

      if (i === 1) {
        set("final_amount_1", o2d.final_amount_1);
        set("so_number_1", o2d.so_number_1);
        set("merge_order_with_1", o2d.merge_order_with_1);
        set("upload_so_(attachment)_1", o2d.upload_so_1);
      } else if (i === 6) {
        set("num_of_parcel_6", o2d.num_of_parcel_6);
        set("upoad_pi_(attachment)_6", o2d.upload_pi_6);
        set("actual_date_of_order_packed_6", o2d.actual_date_of_order_packed_6);
      } else if (i === 7) {
        set("voucher_num_7", o2d.voucher_num_7);
      } else if (i === 8) {
        set("order_details_checked_in_order_sheet_(yes,no)_8", o2d.order_details_checked_8);
        set("voucher_num_(51)_8", o2d.voucher_num_51_8);
        set("t._amt_8", o2d.t_amt_8);
      } else if (i === 9) {
        set("attach_billty_(attachment)_9", o2d.attach_bilty_9);
        set("num_of_parcel_9", o2d.num_of_parcel_9);
      }
    }

    // Fill gaps with empty string
    const maxIdx = Math.max(...Object.values(this.hMap));
    for (let i = 0; i <= maxIdx; i++) {
      if (row[i] === undefined) row[i] = "";
    }

    return row;
  }

  // Override to handle multi-row updates and broadcast all affected items
  async updateOrder(orderNo: string, o2ds: O2D[]): Promise<boolean> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();

      // 1. Find all existing rows for this order
      const orderNoColIdx = this.hMap["order_no."];
      const colLetter = getColumnLetter(orderNoColIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${colLetter}:${colLetter}`,
      });
      const rows = response.data.values;
      if (!rows) return await this.addMany(o2ds);

      const indices = rows
        .map((row, index) => (row[0] === orderNo ? index : -1))
        .filter(index => index !== -1);

      if (indices.length === 0) return await this.addMany(o2ds);

      const startRowIdx = Math.min(...indices);
      const oldCount = indices.length;
      const newCount = o2ds.length;

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === this.sheetName)?.properties?.sheetId;
      if (sheetId === undefined) return false;

      const requests: any[] = [];

      // 2. Adjust row count at the exact position to maintain order's place
      if (newCount > oldCount) {
        // Insert rows after the existing block
        requests.push({
          insertDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: startRowIdx + oldCount, endIndex: startRowIdx + newCount },
            inheritFromBefore: true
          }
        });
      } else if (newCount < oldCount) {
        // Delete extra rows from the block
        requests.push({
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: startRowIdx + newCount, endIndex: startRowIdx + oldCount }
          }
        });
      }

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests }
        });
      }

      const maxColIdx = Math.max(...Object.values(this.hMap));
      const lastCol = getColumnLetter(maxColIdx);

      // 3. Overwrite the resulting range with the new data
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${startRowIdx + 1}:${lastCol}${startRowIdx + newCount}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: o2ds.map(o => this.mapItemToRow(o))
        }
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error("Error updating order:", error);
      return false;
    }
  }

  async addMany(o2ds: O2D[]): Promise<boolean> {
    const maxColIdx = Math.max(...Object.values(this.hMap));
    const lastCol = getColumnLetter(maxColIdx);
    try {
      const sheets = await this.getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:${lastCol}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: o2ds.map(o => this.mapItemToRow(o)),
        },
      });
      this.invalidateCache();
      return true;
    } catch (error) {
      return false;
    }
  }


  async delete(id: string | number): Promise<boolean> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const idColIdx = this.hMap["id"];
      const idColLetter = getColumnLetter(idColIdx);
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
      console.error("Error deleting O2D:", error);
      return false;
    }
  }

  async updateOrderToggleStatus(orderNo: string, action: 'hold' | 'cancelled', value: string): Promise<boolean> {
    await this.ensureHeaders();
    const sheets = await this.getSheetsClient();

    // Guard: check column exists
    const updatedColIdx = this.hMap[action];
    if (updatedColIdx === undefined) {
      console.error(`[toggleStatus] Column '${action}' not found in hMap. Keys:`, Object.keys(this.hMap));
      return false;
    }

    // Always read row positions directly from sheet (avoids cache double-offset bugs)
    const orderNoColIdx = this.hMap["order_no."];
    const colLetter = String.fromCharCode(65 + orderNoColIdx);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!${colLetter}:${colLetter}`,
    });
    const rows = response.data.values;
    if (!rows) return false;

    // rows[0] = header row; get 1-based sheet row numbers for matching data rows
    const sheetRows: number[] = rows
      .map((row, index) => (String(row[0]).trim() === String(orderNo).trim() ? index + 1 : -1))
      .filter(n => n !== -1);

    if (sheetRows.length === 0) {
      console.error(`[toggleStatus] Order '${orderNo}' not found`);
      return false;
    }

    const updatedLoc = getColumnLetter(updatedColIdx);
    const updatedAtColIdx = this.hMap["updated_at"];
    const timestamp = new Date().toISOString();

    const data: any[] = sheetRows.flatMap(sheetRow => {
      const updates: any[] = [
        { range: `${this.sheetName}!${updatedLoc}${sheetRow}`, values: [[value]] },
      ];
      if (updatedAtColIdx !== undefined) {
        const updatedAtLoc = getColumnLetter(updatedAtColIdx);
        updates.push({ range: `${this.sheetName}!${updatedAtLoc}${sheetRow}`, values: [[timestamp]] });
      }
      return updates;
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { valueInputOption: "USER_ENTERED", data }
    });

    this.invalidateCache();
    return true;
  }

  async removeFollowUp(orderNo: string, startStep: number, onlyThisStep: boolean): Promise<boolean> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      let indicesToUpdate: number[] = [];
      const cacheKey = `${this.spreadsheetId}_${this.sheetName}`;
      const cachedData = globalCache.get<O2D[]>(cacheKey);

      if (cachedData) {
        indicesToUpdate = cachedData
          .map((item: O2D, index: number) => (item.order_no === orderNo ? index + 1 : -1))
          .filter((index: number) => index !== -1);
      }

      if (indicesToUpdate.length === 0) {
        const orderNoColIdx = this.hMap["order_no."];
        const colLetter = getColumnLetter(orderNoColIdx);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!${colLetter}:${colLetter}`,
        });
        const rows = response.data.values;
        if (!rows) return false;
        indicesToUpdate = rows
          .map((row, index) => (row[0] === orderNo ? index : -1))
          .filter(index => index !== -1);
      }
      if (indicesToUpdate.length === 0) return false;

      const maxColIdx = Math.max(...Object.values(this.hMap));
      const lastCol = getColumnLetter(maxColIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:${lastCol}`,
      });
      const rows = response.data.values;
      if (!rows) return false;

      const endStep = onlyThisStep ? startStep : 11;
      const timestamp = new Date().toISOString();
      const updatedAtColIdx = this.hMap["updated_at"];

      const data = indicesToUpdate.map(index => {
        const row = [...rows[index]];
        const maxIdx = Math.max(...Object.values(this.hMap));
        while (row.length <= maxIdx) row.push("");

        for (let s = startStep; s <= endStep; s++) {
          const pIdx = this.hMap[`planned_${s}`];
          const aIdx = this.hMap[`acual_${s}`];
          const stIdx = this.hMap[`status_${s}`];

          if (pIdx !== undefined && s > startStep) row[pIdx] = "";
          if (aIdx !== undefined) row[aIdx] = "";
          if (stIdx !== undefined) row[stIdx] = "";

          // Clear step-specific extra fields
          if (s === 1) {
            const fields = ["final_amount_1", "so_number_1", "merge_order_with_1", "upload_so_(attachment)_1"];
            fields.forEach(f => { const idx = this.hMap[f]; if (idx !== undefined) row[idx] = ""; });
          } else if (s === 6) {
            const fields = ["num_of_parcel_6", "upoad_pi_(attachment)_6", "actual_date_of_order_packed_6"];
            fields.forEach(f => { const idx = this.hMap[f]; if (idx !== undefined) row[idx] = ""; });
          } else if (s === 7) {
            const idx = this.hMap["voucher_num_7"]; if (idx !== undefined) row[idx] = "";
          } else if (s === 8) {
            const fields = ["order_details_checked_in_order_sheet_(yes,no)_8", "voucher_num_(51)_8", "t._amt_8"];
            fields.forEach(f => { const idx = this.hMap[f]; if (idx !== undefined) row[idx] = ""; });
          } else if (s === 9) {
            const fields = ["attach_billty_(attachment)_9", "num_of_parcel_9"];
            fields.forEach(f => { const idx = this.hMap[f]; if (idx !== undefined) row[idx] = ""; });
          }
        }

        if (updatedAtColIdx !== undefined) row[updatedAtColIdx] = timestamp;
        const rowRange = `${this.sheetName}!A${index + 1}:${lastCol}${index + 1}`;
        return { range: rowRange, values: [row] };
      });

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data }
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStepConfig(): Promise<O2DStepConfig[]> {
    const cacheKey = `${this.spreadsheetId}_step_config`;
    const cached = globalCache.get<O2DStepConfig[]>(cacheKey);
    if (cached) return cached;

    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CONFIG_SHEET_NAME}!A2:C`,
    });
    const data = response.data.values?.map(row => ({
      step_name: row[0] || "", tat: row[1] || "", responsible_person: row[2] || ""
    })) || [];
    
    globalCache.set(cacheKey, data, 60 * 60 * 1000); // 1 hour TTL
    return data;
  }

  async getDetails(): Promise<{ parties: string[]; items: { name: string; amount: string }[] }> {
    const cacheKey = `${this.spreadsheetId}_details`;
    const cached = globalCache.get<{ parties: string[]; items: { name: string; amount: string }[] }>(cacheKey);
    if (cached) return cached;

    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `Details!A2:C`,
      });
      const rows = response.data.values || [];
      const parties = Array.from(new Set(rows.map(row => row[0]).filter(Boolean)));
      const items = rows.map(row => ({ name: row[1] || "", amount: row[2] || "" })).filter(item => item.name);
      const data = { parties, items };
      
      globalCache.set(cacheKey, data, 30 * 60 * 1000); // 30 mins TTL
      return data;
    } catch (error) {
      return { parties: [], items: [] };
    }
  }

  async deleteOrderByNo(orderNo: string): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      let indicesToDelete: number[] = [];
      const cacheKey = `${this.spreadsheetId}_${this.sheetName}`;
      const cachedData = globalCache.get<O2D[]>(cacheKey);

      if (cachedData) {
        indicesToDelete = cachedData
          .map((item: O2D, index: number) => (item.order_no === orderNo ? index + 1 : -1))
          .filter((index: number) => index !== -1);
      }

      if (indicesToDelete.length === 0) {
        const orderNoColIdx = this.hMap["order_no."];
        const colLetter = getColumnLetter(orderNoColIdx);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!${colLetter}:${colLetter}`,
        });
        const rows = response.data.values;
        if (!rows) return false;
        rows.forEach((row, idx) => {
          if (String(row[0]).trim() === orderNo.trim()) {
            indicesToDelete.push(idx);
          }
        });
      }

      if (indicesToDelete.length === 0) return false;

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === this.sheetName)?.properties?.sheetId;
      if (sheetId === undefined) return false;

      // Delete from bottom to top to preserve indices
      const requests = indicesToDelete.reverse().map(idx => ({
        deleteDimension: {
          range: { sheetId, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 }
        }
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const o2dService = new O2DService();

// Legacy function bridges
export async function getO2Ds() { return o2dService.getAll(); }
export async function addO2D(o2d: O2D) { return o2dService.add(o2d); }
export async function addO2Ds(o2ds: O2D[]) { return o2dService.addMany(o2ds); }
export async function updateO2D(id: string, o2d: O2D) { return o2dService.update(id, o2d); }
export async function deleteO2D(id: string) { return o2dService.delete(id); }
export async function deleteOrderByNo(orderNo: string) { return o2dService.deleteOrderByNo(orderNo); }
export async function updateOrder(orderNo: string, o2ds: O2D[]) { return o2dService.updateOrder(orderNo, o2ds); }
export async function updateOrderToggleStatus(oNo: string, act: 'hold' | 'cancelled', val: string) { return o2dService.updateOrderToggleStatus(oNo, act, val); }
export async function removeFollowUp(oNo: string, sS: number, oTS: boolean) { return o2dService.removeFollowUp(oNo, sS, oTS); }
export async function getO2DStepConfig() { return o2dService.getStepConfig(); }
export async function getO2DDetails() { return o2dService.getDetails(); }

export async function updateO2DStepConfig(configs: O2DStepConfig[]): Promise<boolean> {
  try {
    const sheets = await (o2dService as any).getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A2:C${configs.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: configs.map(c => [c.step_name, c.tat, c.responsible_person]),
      },
    });
    globalCache.delete(`${GOOGLE_SHEET_ID}_step_config`);
    return true;
  } catch (error) {
    return false;
  }
}
