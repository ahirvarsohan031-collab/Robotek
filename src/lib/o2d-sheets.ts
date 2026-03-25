import { BaseSheetsService } from "./sheets/base-service";
import { O2D, O2DStepConfig } from "@/types/o2d";
import { broadcast } from "@/app/api/sse/route";
import { google } from "googleapis";

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";
const SHEET_NAME = "O2D";
const CONFIG_SHEET_NAME = "O2D_Config";

class O2DService extends BaseSheetsService<O2D> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:BG";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): O2D {
    return {
      id: row[0] || "",
      order_no: row[1] || "",
      party_name: row[2] || "",
      item_name: row[3] || "",
      item_qty: row[4] || "",
      est_amount: row[5] || "",
      remark: row[6] || "",
      order_screenshot: row[7] || "",
      filled_by: row[8] || "",
      created_at: row[9] || "",
      updated_at: row[10] || "",
      planned_1: row[11] || "", actual_1: row[12] || "", status_1: row[13] || "",
      final_amount_1: row[14] || "", so_number_1: row[15] || "", merge_order_with_1: row[16] || "", upload_so_1: row[17] || "",
      planned_2: row[18] || "", actual_2: row[19] || "", status_2: row[20] || "",
      planned_3: row[21] || "", actual_3: row[22] || "", status_3: row[23] || "",
      planned_4: row[24] || "", actual_4: row[25] || "", status_4: row[26] || "",
      planned_5: row[27] || "", actual_5: row[28] || "", status_5: row[29] || "",
      planned_6: row[30] || "", actual_6: row[31] || "", status_6: row[32] || "",
      num_of_parcel_6: row[33] || "", upload_pi_6: row[34] || "", actual_date_of_order_packed_6: row[35] || "",
      planned_7: row[36] || "", actual_7: row[37] || "", status_7: row[38] || "",
      voucher_num_7: row[39] || "",
      planned_8: row[40] || "", actual_8: row[41] || "", status_8: row[42] || "",
      order_details_checked_8: row[43] || "", voucher_num_51_8: row[44] || "", t_amt_8: row[45] || "",
      planned_9: row[46] || "", actual_9: row[47] || "", status_9: row[48] || "",
      attach_bilty_9: row[49] || "", num_of_parcel_9: row[50] || "",
      planned_10: row[51] || "", actual_10: row[52] || "", status_10: row[53] || "",
      planned_11: row[54] || "", actual_11: row[55] || "", status_11: row[56] || "",
      hold: row[57] || "",
      cancelled: row[58] || "",
    };
  }

  mapItemToRow(o2d: O2D): any[] {
    return [
      o2d.id,
      o2d.order_no,
      o2d.party_name,
      o2d.item_name,
      o2d.item_qty,
      o2d.est_amount,
      o2d.remark,
      o2d.order_screenshot,
      o2d.filled_by,
      o2d.created_at,
      o2d.updated_at,
      // Step 1
      o2d.planned_1, o2d.actual_1, o2d.status_1, o2d.final_amount_1 || "", o2d.so_number_1 || "", o2d.merge_order_with_1 || "", o2d.upload_so_1 || "",
      // Step 2
      o2d.planned_2, o2d.actual_2, o2d.status_2,
      // Step 3
      o2d.planned_3, o2d.actual_3, o2d.status_3,
      // Step 4
      o2d.planned_4, o2d.actual_4, o2d.status_4,
      // Step 5
      o2d.planned_5, o2d.actual_5, o2d.status_5,
      // Step 6
      o2d.planned_6, o2d.actual_6, o2d.status_6, o2d.num_of_parcel_6 || "", o2d.upload_pi_6 || "", o2d.actual_date_of_order_packed_6 || "",
      // Step 7
      o2d.planned_7, o2d.actual_7, o2d.status_7, o2d.voucher_num_7 || "",
      // Step 8
      o2d.planned_8, o2d.actual_8, o2d.status_8, o2d.order_details_checked_8 || "", o2d.voucher_num_51_8 || "", o2d.t_amt_8 || "",
      // Step 9
      o2d.planned_9, o2d.actual_9, o2d.status_9, o2d.attach_bilty_9 || "", o2d.num_of_parcel_9 || "",
      // Step 10
      o2d.planned_10, o2d.actual_10, o2d.status_10,
      // Step 11
      o2d.planned_11, o2d.actual_11, o2d.status_11,
      // Final
      o2d.hold || "",
      o2d.cancelled || ""
    ];
  }

  // Override to handle multi-row updates and broadcast all affected items
  async updateOrder(orderNo: string, o2ds: O2D[]): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!B:B`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const indicesToUpdate = rows
        .map((row, index) => (row[0] === orderNo ? index : -1))
        .filter(index => index !== -1)
        .sort((a, b) => a - b);

      if (indicesToUpdate.length === 0) {
         return await this.addMany(o2ds);
      }

      // Perform update
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: indicesToUpdate.map((idx, i) => ({
            range: `${this.sheetName}!A${idx + 1}:BG${idx + 1}`,
            values: [this.mapItemToRow(o2ds[i] || o2ds[0])] // Fallback if o2ds array is shorter
          }))
        }
      });

      this.invalidateCache();
      // Broadcast all updated items
      o2ds.forEach(item => this.broadcastChange('UPDATE', item));
      return true;
    } catch (error) {
      console.error("Error updating order:", error);
      return false;
    }
  }

  async addMany(o2ds: O2D[]): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:BG`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: o2ds.map(o => this.mapItemToRow(o)),
        },
      });
      this.invalidateCache();
      o2ds.forEach(item => this.broadcastChange('ADD', item));
      return true;
    } catch (error) {
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
      broadcast({ module: this.sheetName, action: 'DELETE', data: { id } });
      return true;
    } catch (error) {
      console.error("Error deleting O2D:", error);
      return false;
    }
  }

  async updateOrderToggleStatus(orderNo: string, action: 'hold' | 'cancelled', value: string): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!B:B`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const indicesToUpdate = rows
        .map((row, index) => (row[0] === orderNo ? index : -1))
        .filter(index => index !== -1);

      if (indicesToUpdate.length === 0) return false;

      const updatedLoc = action === "hold" ? "BF" : "BG";
      const timestamp = new Date().toISOString();

      const data = indicesToUpdate.flatMap(index => [
        { range: `${this.sheetName}!${updatedLoc}${index + 1}`, values: [[value]] },
        { range: `${this.sheetName}!K${index + 1}`, values: [[timestamp]] }
      ]);

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data }
      });

      this.invalidateCache();
      // Since toggle updates multiple rows, we send a generic refresh for the order
      broadcast({ module: this.sheetName, action: 'REFRESH_ORDER', data: { orderNo, action, value } });
      return true;
    } catch (error) {
       return false;
    }
  }

  async removeFollowUp(orderNo: string, startStep: number, onlyThisStep: boolean): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:BG`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const indicesToUpdate = rows
        .map((row, index) => (row[1] === orderNo ? index : -1))
        .filter(index => index !== -1);

      if (indicesToUpdate.length === 0) return false;

      const endStep = onlyThisStep ? startStep : 11;
      const timestamp = new Date().toISOString();

      const data = indicesToUpdate.map(index => {
        const row = [...rows[index]];
        while (row.length < 59) row.push("");
        for (let s = startStep; s <= endStep; s++) {
          let baseIdx = s === 1 ? 11 : (s <= 6 ? 18 + (s - 2) * 3 : (s === 7 ? 36 : (s === 8 ? 40 : (s === 9 ? 46 : (s === 10 ? 51 : 54)))));
          if (s > startStep) row[baseIdx] = ""; 
          row[baseIdx + 1] = ""; row[baseIdx + 2] = "";
        }
        row[10] = timestamp;
        return { range: `${this.sheetName}!A${index + 1}:BG${index + 1}`, values: [row] };
      });

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data }
      });

      this.invalidateCache();
      broadcast({ module: this.sheetName, action: 'REFRESH_ORDER', data: { orderNo } });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStepConfig(): Promise<O2DStepConfig[]> {
     const sheets = await this.getSheetsClient();
     const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${CONFIG_SHEET_NAME}!A2:C`,
     });
     return response.data.values?.map(row => ({
        step_name: row[0] || "", tat: row[1] || "", responsible_person: row[2] || ""
     })) || [];
  }

  async getDetails(): Promise<{ parties: string[]; items: { name: string; amount: string }[] }> {
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `Details!A2:C`,
      });
      const rows = response.data.values || [];
      const parties = Array.from(new Set(rows.map(row => row[0]).filter(Boolean)));
      const items = rows.map(row => ({ name: row[1] || "", amount: row[2] || "" })).filter(item => item.name);
      return { parties, items };
    } catch (error) {
      return { parties: [], items: [] };
    }
  }

  async deleteOrderByNo(orderNo: string): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!B:B`,
      });

      const rows = response.data.values;
      if (!rows) return false;

      const indicesToDelete: number[] = [];
      rows.forEach((row, idx) => {
        if (String(row[0]).trim() === orderNo.trim()) {
          indicesToDelete.push(idx);
        }
      });

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
      this.broadcastChange('DELETE', { order_no: orderNo } as any);
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
    return true;
  } catch (error) {
    return false;
  }
}
