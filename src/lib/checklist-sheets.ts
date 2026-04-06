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
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      task: get("task"),
      assigned_by: get("assigned_by"),
      assigned_to: get("assigned_to"),
      priority: get("priority"),
      department: get("department"),
      verification_required: get("verification_required"),
      attachment_required: get("attachment_required"),
      frequency: get("frequency"),
      due_date: get("due_date"),
      status: get("status"),
      group_id: get("group_id"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
    };
  }

  mapItemToRow(c: Checklist): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };
    
    set("id", String(c.id));
    set("task", c.task);
    set("assigned_by", c.assigned_by);
    set("assigned_to", c.assigned_to);
    set("priority", c.priority);
    set("department", c.department);
    set("verification_required", c.verification_required);
    set("attachment_required", c.attachment_required);
    set("frequency", c.frequency);
    set("due_date", c.due_date);
    set("status", c.status);
    set("group_id", c.group_id);
    set("created_at", c.created_at);
    set("updated_at", c.updated_at);

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
        if (row[i] === undefined) row[i] = "";
    }
    return row;
   }
 
   async getNextNumericalId(): Promise<number> {
     const ids = await this.getLatestIds();
     const numericIds = ids.map(id => parseInt(String(id)) || 0);
     return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
   }
 }
 export const checklistService = new ChecklistService();
 
 export async function getChecklists(): Promise<Checklist[]> {
   return checklistService.getAll();
 }
 
 let checklistLock: Promise<any> = Promise.resolve();
 
 export async function addChecklist(data: Partial<Checklist>): Promise<boolean> {
   return checklistLock = checklistLock.then(async () => {
     if (!data.id) {
       data.id = (await checklistService.getNextNumericalId()).toString();
     }
     return checklistService.add(data as Checklist);
   }).catch(err => {
     console.error("Error in addChecklist lock:", err);
     return false;
   });
 }

export async function updateChecklist(id: string, data: Checklist): Promise<boolean> {
  return checklistService.update(id, data);
}

async function deleteRelatedChecklistRows(id: string) {
  try {
    const sheets = await (checklistService as any).getSheetsClient();

    const subSheets = [
      { name: "checklists_revision_history", idCol: 1 }, // column B = checklists_id
      { name: "checklists_remarks", idCol: 1 },           // column B = checklists_id
    ];

    for (const sub of subSheets) {
      const fullRes = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${sub.name}!A:Z`,
      });

      const rows = fullRes.data.values || [];
      const toDelete: number[] = [];
      rows.forEach((row: any[], i: number) => {
        if (i === 0) return;
        if (String(row[sub.idCol] || "").trim() === String(id).trim()) {
          toDelete.push(i);
        }
      });

      if (toDelete.length === 0) continue;

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
      const sheetId = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sub.name)?.properties?.sheetId;
      if (sheetId === undefined) continue;

      const requests = toDelete
        .sort((a, b) => b - a)
        .map((rowIdx) => ({
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIdx, endIndex: rowIdx + 1 },
          },
        }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        requestBody: { requests },
      });
    }
  } catch (err) {
    console.error("Error cascade-deleting checklist sub-rows:", err);
  }
}

export async function deleteChecklist(id: string) {
  const result = await checklistService.delete(id);
  if (result) await deleteRelatedChecklistRows(id);
  return result;
}

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
