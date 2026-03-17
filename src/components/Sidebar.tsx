import Link from "next/link";
import { 
  HomeIcon, 
  UsersIcon, 
  Cog6ToothIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  InformationCircleIcon 
} from "@heroicons/react/24/outline";

const navigation = [
  { name: 'Users', href: '/users', icon: UsersIcon },
];

export default function Sidebar() {
  return (
    <aside className="w-16 hover:w-56 bg-transparent text-gray-800 dark:text-slate-400 flex flex-col h-screen fixed left-0 top-0 z-20 transition-all duration-300 ease-in-out group overflow-x-hidden peer">
      <div className="pt-6 pb-2 px-3 flex items-center gap-4 group/logo">
        <div className="w-10 h-10 min-w-[40px] rounded-xl overflow-hidden shadow-lg transform group-hover/logo:-rotate-6 transition-transform duration-500 ring-1 ring-black/5 dark:ring-white/10">
          <img src="/logo_compact.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
          Robotek
        </span>
      </div>
      
      <nav className="flex-1 px-3 pt-1 pb-4 space-y-2 overflow-y-auto overflow-x-hidden invisible-scrollbar">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-4 px-4 py-3 text-gray-600 dark:text-slate-500 hover:text-[#CE2029] dark:hover:text-[#FFD500] hover:bg-white/40 dark:hover:bg-white/5 rounded-2xl transition-all group/item font-bold overflow-hidden"
          >
            <item.icon className="w-6 h-6 min-w-[24px] group-hover/item:text-[#CE2029] dark:group-hover/item:text-[#FFD500] group-hover/item:scale-110 transition-all font-bold" />
            <span className="text-sm tracking-wide opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
