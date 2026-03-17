export default function Footer() {
  return (
    <footer className="h-12 bg-[#FFF9E6] border-t border-orange-100/20 flex items-center justify-between px-8 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
      <div>
        &copy; 2026 <span className="text-gray-900 font-black">Robotec Industries</span>
      </div>
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-[#CE2029] transition-colors">Privacy</a>
        <a href="#" className="hover:text-[#CE2029] transition-colors">Terms</a>
        <a href="#" className="hover:text-[#CE2029] transition-colors">Support</a>
      </div>
    </footer>
  );
}
