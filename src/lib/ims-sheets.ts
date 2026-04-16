import { BaseSheetsService } from "./sheets/base-service";
import { IMS } from "@/types/ims";

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";
const SHEET_NAME = "Details";

class IMSService extends BaseSheetsService<IMS> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:E";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): IMS {
    // Use hMap lookup with direct index fallback for known column positions
    const get = (h: string, fallbackIdx: number) => {
      const idx = this.hMap[h.toLowerCase()];
      return (idx !== undefined ? row[idx] : row[fallbackIdx]) || "";
    };
    return {
      id: get("id", 0),
      item_name: get("item name", 1),
      est_amount_item: get("est._amount/item", 2),
      gst: get("gst", 3),
      final_amount: get("final_amount", 4),
    };
  }

  mapItemToRow(ims: IMS): any[] {
    // Use hMap when available, otherwise fall back to known column order:
    // A(0)=ID, B(1)=item name, C(2)=est._amount/item, D(3)=gst, E(4)=final_amount
    const row: any[] = ["", "", "", "", ""];
    const set = (h: string, fallbackIdx: number, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      row[idx !== undefined ? idx : fallbackIdx] = val ?? "";
    };

    set("id", 0, String(ims.id));
    set("item name", 1, ims.item_name);
    set("est._amount/item", 2, ims.est_amount_item);
    set("gst", 3, ims.gst);
    set("final_amount", 4, ims.final_amount);

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

export const imsService = new IMSService();

export async function getIMSItems(): Promise<IMS[]> {
  return imsService.getAll();
}

let imsLock: Promise<any> = Promise.resolve();

export async function addIMSItem(data: Partial<IMS>): Promise<boolean> {
  return (imsLock = imsLock
    .then(async () => {
      if (!data.id) {
        data.id = (await imsService.getNextNumericalId()).toString();
      }
      return imsService.add(data as IMS);
    })
    .catch((err) => {
      console.error("Error in addIMSItem lock:", err);
      return false;
    }));
}

export async function updateIMSItem(id: string, data: IMS): Promise<boolean> {
  return imsService.update(id, data);
}

export async function deleteIMSItem(id: string): Promise<boolean> {
  return imsService.delete(id);
}
