import { updateSheetRow, deleteSheetRow } from '@/lib/sheet-utils';

const EA_MD_SHEET_ID = "1JFidQmJ00mDGZXkqjtGz19g-5Pe3-1IBWGaGtzzaau4";
const SHEET_NAME = "Team Queries";

export async function updateTeamQueryRow(itemId: string, updatedData: any) {
  const rowData = [
    itemId,
    updatedData.teamMember || "",
    updatedData.query || "",
    updatedData.category || "",
    updatedData.eaResolve || "",
    updatedData.status || "",
    updatedData.eaNotes || "",
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  ];

  return await updateSheetRow(EA_MD_SHEET_ID, SHEET_NAME, itemId, rowData);
}

export async function deleteTeamQueryRow(itemId: string) {
  return await deleteSheetRow(EA_MD_SHEET_ID, SHEET_NAME, itemId);
}
