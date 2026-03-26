export interface PartyManagement {
  id: string; // Used internally as unique identifier
  customerType: string;
  partyName: string;
  partyType: string;
  salesFunnelUniqueNum: string;
  salePersonName: string;
  firstOrderItems: string;
  detailsAndInstructions: string;
  remarks: string;
  filledBy: string;
  timestamp: string;
}
