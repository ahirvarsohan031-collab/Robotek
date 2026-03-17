export default function Footer() {
  return (
    <footer 
      style={{ 
        backgroundColor: 'var(--panel-bg)',
        borderTop: '1px solid var(--panel-border)'
      }}
      className="h-12 flex items-center justify-between px-8 text-[10px] font-bold text-gray-400 uppercase tracking-tight transition-all duration-300"
    >
      <div>
        &copy; 2026 <span className="text-gray-900 dark:text-white font-black">Robotek Industries</span>
      </div>
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-[#CE2029] transition-colors">Privacy</a>
        <a href="#" className="hover:text-[#CE2029] transition-colors">Terms</a>
        <a href="#" className="hover:text-[#CE2029] transition-colors">Support</a>
      </div>
    </footer>
  );
}
