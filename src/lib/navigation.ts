import { 
  UsersIcon, 
  DocumentTextIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  TicketIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon
} from "@heroicons/react/24/outline";

export const navigation = [
  { name: 'Dashboard', id: 'dashboard', href: '/', icon: Squares2X2Icon },
  { name: 'Users', id: 'users', href: '/users', icon: UsersIcon },
  { name: 'Delegations', id: 'delegations', href: '/delegations', icon: DocumentTextIcon },
  { name: 'Checklists', id: 'checklists', href: '/checklists', icon: ClipboardDocumentListIcon },
  { name: 'Help Tickets', id: 'tickets', href: '/tickets', icon: TicketIcon },
  { name: 'O2D', id: 'o2d', href: '/o2d', icon: ShoppingBagIcon },
  { name: 'Party Management', id: 'party-management', href: '/party-management', icon: UserGroupIcon },
  { name: 'Attendance', id: 'attendance', href: '/attendance', icon: ClipboardDocumentListIcon },
  { name: 'Score', id: 'score', href: '/score', icon: ChartBarIcon },
  { name: 'Chat', id: 'chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Scheduler', id: 'scheduler', href: '/scheduler', icon: CalendarIcon },
];
