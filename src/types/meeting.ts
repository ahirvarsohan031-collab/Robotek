import { SheetItem } from "@/lib/sheets/base-service";

export interface Meeting extends SheetItem {
  id: string;
  title: string;
  description: string;
  attendees: string; // Comma separated usernames
  meeting_link: string;
  start_time: string; // ISO string or similar
  end_time: string;   // ISO string or similar
  created_by: string; // Username
  created_at: string;
}
