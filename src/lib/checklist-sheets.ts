import { BaseSheetsService } from "./sheets/base-service";
import { Checklist } from "@/types/checklist";

const GOOGLE_SHEET_ID = "1RG5I4QET9WLjKmSeGCzsbmgraMDH-HXZHfWcOprPBA0";
const SHEET_NAME = "checklists";

class ChecklistService extends BaseSheetsService<Checklist> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:N";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): Checklist {
    return {
      id: row[0] || "",
      task: row[1] || "",
      assigned_by: row[2] || "",
      assigned_to: row[3] || "",
      priority: row[4] || "",
      department: row[5] || "",
      verification_required: row[6] || "",
      attachment_required: row[7] || "",
      frequency: row[8] || "",
      due_date: row[9] || "",
      status: row[10] || "",
      group_id: row[11] || "",
      created_at: row[12] || "",
      updated_at: row[13] || "",
    };
  }

  mapItemToRow(c: Checklist): any[] {
    return [
      String(c.id), c.task, c.assigned_by, c.assigned_to, c.priority, c.department,
      c.verification_required, c.attachment_required, c.frequency, c.due_date,
      c.status, c.group_id, c.created_at, c.updated_at
    ];
  }
}
export const checklistService = new ChecklistService();

export async function getChecklists(): Promise<Checklist[]> {
  return checklistService.getAll();
}

export async function addChecklist(data: Partial<Checklist>): Promise<boolean> {
  return checklistService.add(data as Checklist);
}

export async function updateChecklist(id: string, data: Checklist): Promise<boolean> {
  return checklistService.update(id, data);
}

export async function deleteChecklist(id: string) { return checklistService.delete(id); }

// Specialized functions
export async function getChecklistHistory(id: string) {
  // Original history logic using googleapis directly or a one-off client
  const sheets = await (checklistService as any).getSheetsClient();
  const revResponse = await sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: `checklists_revision_history!A:G` });
  const remResponse = await sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: `checklists_remarks!A:F` });
  // ... (Briefly implement the mapping)
  const history: any[] = [];
  (revResponse.data.values || []).slice(1).forEach((row: any) => {
    if (String(row[1]) === String(id)) history.push({ type: 'revision', id: row[0], old_status: row[2], new_status: row[3], reason: row[4], created_at: row[5], evidence_urls: row[6] });
  });
  (remResponse.data.values || []).slice(1).forEach((row: any) => {
    if (String(row[1]) === String(id)) history.push({ type: 'remark', id: row[0], user_id: row[2], username: row[3], remark: row[4], created_at: row[5] });
  });
  return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addChecklistRemark(remark: any) {
  const sheets = await (checklistService as any).getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID, range: `checklists_remarks!A:F`, valueInputOption: "USER_ENTERED",
    requestBody: { values: [[remark.id, remark.checklists_id, remark.user_id, remark.username, remark.remark, remark.created_at]] }
  });
  return true;
}

export async function addChecklistRevision(rev: any) {
  const sheets = await (checklistService as any).getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID, range: `checklists_revision_history!A:G`, valueInputOption: "USER_ENTERED",
    requestBody: { values: [[rev.id, rev.checklists_id, rev.old_status, rev.new_status, rev.reason, rev.created_at, rev.evidence_urls]] }
  });
  return true;
}

export async function updateChecklistByGroup(groupId: string, data: any) {
  // Logic from original file using batchUpdate
  const all = await checklistService.getAll();
  const updates = all.filter(c => c.group_id === groupId).map(c => ({
    ...c, task: data.task, assigned_by: data.assigned_by, assigned_to: data.assigned_to, 
    priority: data.priority, department: data.department, verification_required: data.verification_required,
    attachment_required: data.attachment_required, status: data.status, updated_at: data.updated_at
  }));
  for (const item of updates) { await checklistService.update(item.id, item); }
  return true;
}

export async function deleteChecklistByGroup(groupId: string) {
  const all = await checklistService.getAll();
  const toDelete = all.filter(c => c.group_id === groupId);
  for (const item of toDelete) { await checklistService.delete(item.id); }
  return true;
}
