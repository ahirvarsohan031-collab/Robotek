import { BaseSheetsService } from "./sheets/base-service";
import { PartyManagement } from "@/types/party-management";

const GOOGLE_SHEET_ID = "1Ij4rFY_uL6JaAbCyCnGGZY9CsNvrgL05BVDPu0rB2Bw";
const SHEET_NAME = "party_management";

class PartyManagementService extends BaseSheetsService<PartyManagement> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:K";
  protected idColumnIndex = 0;


  mapRowToItem(row: any[]): PartyManagement {
    const get = (h: string) => {
      h = h.toLowerCase().trim();
      const idx = this.hMap[h] ?? this.hMap[h + ":"];
      return row[idx] || "";
    };
    return {
      id: get("id"),
      customerType: get("customer type") || get("customertype"),
      partyName: get("party name") || get("partyname"),
      partyType: get("party type") || get("partytype"),
      salesFunnelUniqueNum: get("sales funnel unique num") || get("salesfunneluniquenum"),
      salePersonName: get("sale person name") || get("salepersonname"),
      firstOrderItems: get("add following items with first order") || get("firstorderitems"),
      detailsAndInstructions: get("details and instructions") || get("detailsandinstructions"),
      remarks: get("remarks"),
      filledBy: get("filled by") || get("filledby"),
      timestamp: get("timestamp"),
    };
  }

  mapItemToRow(p: PartyManagement): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      h = h.toLowerCase().trim();
      const idx = this.hMap[h] ?? this.hMap[h + ":"];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", p.id || Date.now().toString());
    set("customer type", p.customerType);
    set("party name", p.partyName);
    set("party type", p.partyType);
    set("sales funnel unique num", p.salesFunnelUniqueNum);
    set("sale person name", p.salePersonName);
    set("add following items with first order", p.firstOrderItems);
    set("details and instructions", p.detailsAndInstructions);
    set("remarks", p.remarks);
    set("filled by", p.filledBy);
    set("timestamp", p.timestamp || new Date().toISOString());

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
        if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

export const partyManagementService = new PartyManagementService();

export async function getParties(): Promise<PartyManagement[]> {
  return partyManagementService.getAll();
}

export async function addParty(party: PartyManagement): Promise<boolean> {
  return partyManagementService.add(party);
}

export async function updateParty(id: string, party: PartyManagement): Promise<boolean> {
  return partyManagementService.update(id, party);
}

export async function deleteParty(id: string): Promise<boolean> {
  return partyManagementService.delete(id);
}
