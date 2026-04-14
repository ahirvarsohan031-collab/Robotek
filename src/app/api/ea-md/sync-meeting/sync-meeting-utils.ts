import { updateSheetRow, deleteSheetRow } from '@/lib/sheet-utils';

const EA_MD_SHEET_ID = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";
const SHEET_NAME = "Sync Meeting";

export async function updateSyncMeetingRow(itemId: string, updatedData: any) {
  const rowData = [
    itemId,
    updatedData.date || "",
    updatedData.time || "",
    updatedData.location || "",
    JSON.stringify(updatedData.agenda || []),
    updatedData.decisions || "",
    JSON.stringify(updatedData.actionItems || []),
    updatedData.notes || "",
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  ];

  return await updateSheetRow(EA_MD_SHEET_ID, SHEET_NAME, itemId, rowData);
}

export async function deleteSyncMeetingRow(itemId: string) {
  return await deleteSheetRow(EA_MD_SHEET_ID, SHEET_NAME, itemId);
}
