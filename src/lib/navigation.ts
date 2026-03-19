import { 
  UsersIcon, 
  DocumentTextIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";

export const navigation = [
  { name: 'Dashboard', id: 'dashboard', href: '/', icon: Squares2X2Icon },
  { name: 'Users', id: 'users', href: '/users', icon: UsersIcon },
  { name: 'Delegations', id: 'delegations', href: '/delegations', icon: DocumentTextIcon },
];
