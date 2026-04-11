import { BaseSheetsService } from "./sheets/base-service";

const CHAT_SHEET_ID = "1G0o9W5ImXNAPjhdFXMtPuHnFTdU_rRkWmSRcaqu9kxM";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string; // This can be a username (1-on-1) or a group_id
  text: string;
  type: "text" | "image" | "file" | "audio";
  media_url: string;
  read_by: string; // Comma-separated usernames
  created_at: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  participants: string; // Comma-separated usernames
  admins: string; // Comma-separated usernames
  created_by: string;
  created_at: string;
}

class MessageService extends BaseSheetsService<ChatMessage> {
  protected spreadsheetId = CHAT_SHEET_ID;
  protected sheetName = "messages";
  protected range = "A:H";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): ChatMessage {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      sender_id: get("sender_id") || get("senderid"),
      receiver_id: get("receiver_id") || get("receiverid"),
      text: get("text"),
      type: get("type") as "text" | "image" | "file" | "audio",
      media_url: get("media_url") || get("mediaurl"),
      read_by: get("read_by") || get("readby"),
      created_at: get("created_at") || get("createdat"),
    };
  }

  mapItemToRow(m: ChatMessage): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", m.id);
    set("sender_id", m.sender_id);
    set("receiver_id", m.receiver_id);
    set("text", m.text || "");
    set("type", m.type);
    set("media_url", m.media_url || "");
    set("read_by", m.read_by || "");
    set("created_at", m.created_at || "");

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
        if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

class GroupService extends BaseSheetsService<ChatGroup> {
  protected spreadsheetId = CHAT_SHEET_ID;
  protected sheetName = "chat_groups";
  protected range = "A:F";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): ChatGroup {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      name: get("name"),
      participants: get("participants"),
      admins: get("admins"),
      created_by: get("created_by") || get("createdby"),
      created_at: get("created_at") || get("createdat"),
    };
  }

  mapItemToRow(g: ChatGroup): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };

    set("id", g.id);
    set("name", g.name);
    set("participants", g.participants);
    set("admins", g.admins);
    set("created_by", g.created_by);
    set("created_at", g.created_at);

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
        if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

export const messageService = new MessageService();
export const groupService = new GroupService();

/**
 * Get messages between two users (1-on-1) or for a group
 */
export async function getMessages(currentUserId: string, partnerId: string): Promise<ChatMessage[]> {
  const all = await messageService.getAll();
  
  if (partnerId.startsWith("group_")) {
    return all.filter(m => String(m.receiver_id) === String(partnerId));
  }

  return all.filter((m) => 
    (String(m.sender_id) === String(currentUserId) && String(m.receiver_id) === String(partnerId)) ||
    (String(m.sender_id) === String(partnerId) && String(m.receiver_id) === String(currentUserId))
  );
}

export async function addMessage(message: ChatMessage): Promise<boolean> {
  return messageService.add(message);
}

export async function updateMessage(id: string, message: ChatMessage): Promise<boolean> {
  return messageService.update(id, message);
}

/**
 * Group specific functions
 */
export async function getGroupsForUser(username: string): Promise<ChatGroup[]> {
  const all = await groupService.getAll();
  return all.filter(g => 
    g.participants.split(",").map(p => p.trim()).includes(username)
  );
}

export async function createGroup(group: ChatGroup): Promise<boolean> {
  return groupService.add(group);
}

export async function updateGroup(id: string, group: ChatGroup): Promise<boolean> {
  return groupService.update(id, group);
}

export async function deleteGroup(id: string): Promise<boolean> {
  return groupService.delete(id);
}
