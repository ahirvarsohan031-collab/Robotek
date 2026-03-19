export interface Delegation {
  id: string;
  title: string;
  description: string;
  assigned_by: string;
  assigned_to: string;
  department: string;
  priority: string;
  due_date: string;
  status: string;
  voice_note_url: string;
  reference_docs: string;
  evidence_required: string;
  created_at: string;
  updated_at: string;
}

export interface DelegationRevision {
  id: string;
  delegation_id: string;
  old_status: string;
  new_status: string;
  old_due_date: string;
  new_due_date: string;
  reason: string;
  created_at: string;
  evidence_urls: string;
}

export interface DelegationRemark {
  id: string;
  delegation_id: string;
  user_id: string;
  username: string;
  remark: string;
  created_at: string;
}
