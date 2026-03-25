import { BaseSheetsService } from "./sheets/base-service";
import { Delegation } from "@/types/delegation";

const GOOGLE_SHEET_ID = "1kqX1fWoTyk2Y7IUCpO5PrrcF0fvGSj0n3xZaNdmm3Iw";
const SHEET_NAME = "delegation";

class DelegationService extends BaseSheetsService<Delegation> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:N";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): Delegation {
    return {
      id: row[0] || "",
      title: row[1] || "",
      description: row[2] || "",
      assigned_by: row[3] || "",
      assigned_to: row[4] || "",
      department: row[5] || "",
      priority: row[6] || "",
      due_date: row[7] || "",
      status: row[8] || "",
      voice_note_url: row[9] || "",
      reference_docs: row[10] || "",
      evidence_required: row[11] || "",
      created_at: row[12] || "",
      updated_at: row[13] || "",
    };
  }

  mapItemToRow(d: Delegation): any[] {
    return [
      String(d.id), d.title, d.description, d.assigned_by, d.assigned_to, d.department,
      d.priority, d.due_date, d.status, d.voice_note_url, d.reference_docs,
      d.evidence_required, d.created_at, d.updated_at
    ];
  }
}

export const delegationService = new DelegationService();

export async function getDelegations(): Promise<Delegation[]> {
  return delegationService.getAll();
}

export async function addDelegation(data: Partial<Delegation>): Promise<boolean> {
  return delegationService.add(data as Delegation);
}

export async function updateDelegation(id: string, d: Delegation) { return delegationService.update(id, d); }
export async function deleteDelegation(id: string) { return delegationService.delete(id); }

export async function getDelegationHistory(id: string) {
  const sheets = await (delegationService as any).getSheetsClient();
  const revResponse = await sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: `delegation_revision_history!A:I` });
  const remResponse = await sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: `delegation_remarks!A:F` });
  const history: any[] = [];
  (revResponse.data.values || []).slice(1).forEach((row: any) => {
    if (String(row[1]) === String(id)) history.push({ type: 'revision', id: row[0], old_status: row[2], new_status: row[3], old_due_date: row[4], new_due_date: row[5], reason: row[6], created_at: row[7], evidence_urls: row[8] });
  });
  (remResponse.data.values || []).slice(1).forEach((row: any) => {
    if (String(row[1]) === String(id)) history.push({ type: 'remark', id: row[0], user_id: row[2], username: row[3], remark: row[4], created_at: row[5] });
  });
  return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addDelegationRemark(remark: any) {
  const sheets = await (delegationService as any).getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID, range: `delegation_remarks!A:F`, valueInputOption: "USER_ENTERED",
    requestBody: { values: [[remark.id, remark.delegation_id, remark.user_id, remark.username, remark.remark, remark.created_at]] }
  });
  return true;
}

export async function addDelegationRevision(rev: any) {
  const sheets = await (delegationService as any).getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID, range: `delegation_revision_history!A:I`, valueInputOption: "USER_ENTERED",
    requestBody: { values: [[rev.id, rev.delegation_id, rev.old_status, rev.new_status, rev.old_due_date, rev.new_due_date, rev.reason, rev.created_at, rev.evidence_urls]] }
  });
  return true;
}
