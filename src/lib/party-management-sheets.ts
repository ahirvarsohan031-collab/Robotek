import { BaseSheetsService } from "./sheets/base-service";
import { PartyManagement } from "@/types/party-management";

const GOOGLE_SHEET_ID = "1Ij4rFY_uL6JaAbCyCnGGZY9CsNvrgL05BVDPu0rB2Bw";
const SHEET_NAME = "party_management";

class PartyManagementService extends BaseSheetsService<PartyManagement> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:L";
  protected idColumnIndex = 0;


  mapRowToItem(row: any[]): PartyManagement {
    return {
      id: row[0] || "",
      customerType: row[1] || "",
      partyName: row[2] || "",
      dateOfBirth: row[3] || "",
      partyType: row[4] || "",
      salesFunnelUniqueNum: row[5] || "",
      salePersonName: row[6] || "",
      firstOrderItems: row[7] || "",
      detailsAndInstructions: row[8] || "",
      remarks: row[9] || "",
      filledBy: row[10] || "",
      timestamp: row[11] || "",
    };
  }

  mapItemToRow(p: PartyManagement): any[] {
    const row: any[] = new Array(12).fill("");
    row[0] = p.id || Date.now().toString();
    row[1] = p.customerType || "";
    row[2] = p.partyName || "";
    row[3] = p.dateOfBirth || "";
    row[4] = p.partyType || "";
    row[5] = p.salesFunnelUniqueNum || "";
    row[6] = p.salePersonName || "";
    row[7] = p.firstOrderItems || "";
    row[8] = p.detailsAndInstructions || "";
    row[9] = p.remarks || "";
    row[10] = p.filledBy || "";
    row[11] = p.timestamp || new Date().toISOString();
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
