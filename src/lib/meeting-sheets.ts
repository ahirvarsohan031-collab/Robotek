import { BaseSheetsService } from "./sheets/base-service";
import { Meeting } from "@/types/meeting";

const GOOGLE_SHEET_ID = "1J5RoNSnDvYXn8m1aUXrm5S87XNgtZTa6xrHibN9Qvq8";
const SHEET_NAME = "Meeting";

class MeetingService extends BaseSheetsService<Meeting> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:I";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): Meeting {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      title: get("title"),
      description: get("description"),
      attendees: get("attendees"),
      meeting_link: get("meeting_link"),
      start_time: get("start_time"),
      end_time: get("end_time"),
      created_by: get("created_by"),
      created_at: get("created_at"),
    };
  }

  mapItemToRow(m: Meeting): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", m.id);
    set("title", m.title);
    set("description", m.description);
    set("attendees", m.attendees);
    set("meeting_link", m.meeting_link);
    set("start_time", m.start_time);
    set("end_time", m.end_time);
    set("created_by", m.created_by);
    set("created_at", m.created_at);

    // Fill gaps
    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
      if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

export const meetingService = new MeetingService();

export async function getMeetings(): Promise<Meeting[]> {
  return meetingService.getAll();
}

export async function addMeeting(meeting: Meeting): Promise<boolean> {
  return meetingService.add(meeting);
}

export async function updateMeeting(id: string, meeting: Meeting): Promise<boolean> {
  return meetingService.update(id, meeting);
}

export async function deleteMeeting(id: string): Promise<boolean> {
  return meetingService.delete(id);
}
