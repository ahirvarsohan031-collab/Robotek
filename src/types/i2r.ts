export interface I2R {
  id: string;
  indend_num: string;
  item_name: string;
  quantity: string;
  category: string;
  filled_by: string;
  created_at: string;
  updated_at: string;
  cancelled: string;
  // Steps (note: "acual" typo matches the actual sheet header)
  planned_1: string; acual_1: string; status_1: string;
  planned_2: string; acual_2: string; status_2: string;
  planned_3: string; acual_3: string; status_3: string;
  planned_4: string; acual_4: string; status_4: string;
  planned_5: string; acual_5: string; status_5: string;
  planned_6: string; acual_6: string; status_6: string;
  planned_7: string; acual_7: string; status_7: string;
  planned_8: string; acual_8: string; status_8: string;
  planned_9: string; acual_9: string; status_9: string;
}

export interface I2RStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const I2R_STEPS = [
  "Get quotation from three vendors (NA, if vendor is only one / regular vendor)",
  "Finalize Vendor and Rates",
  "Received PI",
  "Check Physical Sample",
  "Make PO",
  "Check Packing Status in warehouse and Order Packing",
  "Delivered to cargo",
  "Fill Receive material Form",
  "Follow up till Full material received or waive off Qty",
];
