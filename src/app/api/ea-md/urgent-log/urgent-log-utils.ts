import { updateSheetRow, deleteSheetRow } from '@/lib/sheet-utils';

const EA_MD_SHEET_ID = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";
const SHEET_NAME = "Urgent Log";

export async function updateUrgentLogRow(itemId: string, updatedData: any) {
  const rowData = [
    itemId,
    updatedData.issueSummary || "",
    updatedData.urgencyLevel || "",
    updatedData.channelUsed || "",
    updatedData.requiredFromMD || "",
    updatedData.deadline || "",
    updatedData.status || "Open",
  ];

  return await updateSheetRow(EA_MD_SHEET_ID, SHEET_NAME, itemId, rowData);
}

export async function deleteUrgentLogRow(itemId: string) {
  return await deleteSheetRow(EA_MD_SHEET_ID, SHEET_NAME, itemId);
}
