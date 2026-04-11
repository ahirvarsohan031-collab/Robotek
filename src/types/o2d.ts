export interface O2D {
  id: string;
  order_no: string;
  party_name: string;
  item_name: string;
  item_qty: string;
  est_amount: string;
  item_specification: string;
  remark: string;
  order_screenshot: string; // File ID or URL
  filled_by: string;
  created_at: string;
  updated_at: string;
  // Step 1
  planned_1?: string; actual_1?: string; status_1?: string;
  final_amount_1?: string;
  so_number_1?: string;
  merge_order_with_1?: string;
  upload_so_1?: string;

  // Step 2
  planned_2?: string; actual_2?: string; status_2?: string;

  // Step 3
  planned_3?: string; actual_3?: string; status_3?: string;

  // Step 4
  planned_4?: string; actual_4?: string; status_4?: string;

  // Step 5
  planned_5?: string; actual_5?: string; status_5?: string;

  // Step 6
  planned_6?: string; actual_6?: string; status_6?: string;
  num_of_parcel_6?: string;
  upload_pi_6?: string;
  actual_date_of_order_packed_6?: string;

  // Step 7
  planned_7?: string; actual_7?: string; status_7?: string;
  voucher_num_7?: string;

  // Step 8
  planned_8?: string; actual_8?: string; status_8?: string;
  order_details_checked_8?: string;
  voucher_num_51_8?: string;
  t_amt_8?: string;

  // Step 9
  planned_9?: string; actual_9?: string; status_9?: string;
  attach_bilty_9?: string;
  num_of_parcel_9?: string;

  // Step 10
  planned_10?: string; actual_10?: string; status_10?: string;

  // Step 11
  planned_11?: string; actual_11?: string; status_11?: string;

  hold?: string;
  cancelled?: string;
}

export interface O2DItem {
  id?: string;
  item_name: string;
  item_qty: string;
  est_amount: string;
  item_specification: string;
}

export interface O2DStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const O2D_STEPS = [
  "Make SO",
  "Cross verify SO with Actual Order and inform to Shubham",
  "DISPATCHED AND PACKING APPROVAL",
  "SHARE PI TO CUSTOMER",
  "RECONFIRM APPROVAL",
  "PACK ITEM",
  "GENERATE INVOICE BILL AND DISPATCHED GOODS",
  "BILL UPDATE In 51",
  "SEND BILTY TO CRM",
  "DELIVERY DOCUMENT",
  "Clear Payment"
];

export const O2D_STEP_SHORTS = [
  "Make SO",
  "Verify SO",
  "Pack Appr.",
  "Share PI",
  "Reconfirm",
  "Pack Item",
  "Invoice & Disp.",
  "Bill Update",
  "Send Bilty to CRM",
  "Delivery Doc",
  "Clear Pay."
];
