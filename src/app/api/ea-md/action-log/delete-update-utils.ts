import { updateSheetRow, deleteSheetRow } from '@/lib/sheet-utils';

const EA_MD_SHEET_ID = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";

export { updateSheetRow, deleteSheetRow };

export async function deleteActionLogItem(itemId: string) {
  return deleteSheetRow(EA_MD_SHEET_ID, 'Action Log', itemId);
}

export async function updateActionLogItem(itemId: string, updates: any) {
  try {
    const updatedRow = [
      itemId,
      updates.task || "",
      updates.owner || "",
      updates.priority || "",
      updates.status || "",
      updates.due || "",
      updates.updates || updates.notes || "", // Support both field names
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    ];

    return updateSheetRow(EA_MD_SHEET_ID, 'Action Log', itemId, updatedRow);
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}
