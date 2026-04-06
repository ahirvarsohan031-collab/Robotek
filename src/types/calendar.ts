export type CalendarEventType = 'delegation' | 'checklist' | 'ticket' | 'o2d' | 'meeting';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  start: Date;
  end?: Date;
  allDay?: boolean;
  status?: string;
  priority?: string;
  assignedTo?: string;  // Username or list
  assignedBy?: string;
  link?: string;        // External link (e.g., meeting link or app link)
  itemData?: any;       // Original item data
}
