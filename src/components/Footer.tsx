export default function Footer() {
  return (
    <footer 
      style={{ 
        backgroundColor: 'var(--panel-bg)',
        borderTop: '1px solid var(--panel-border)'
      }}
      className="h-12 flex items-center justify-between px-4 md:px-8 text-[10px] font-bold text-gray-400 uppercase tracking-tight"
    >
      <div className="flex-1 md:flex-none shrink-0 whitespace-nowrap">
        &copy; 2026 <span className="text-gray-900 dark:text-white font-black">Robotek Industries</span>
      </div>

      <div className="flex-1 overflow-hidden pointer-events-none mx-4">
        <div className="inline-block animate-marquee text-[#CE2029] font-black uppercase tracking-[0.2em] whitespace-nowrap">
          Developed by Sohan Ph. 7217685179
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-4 shrink-0">
        <a href="#" className="hover:text-[#CE2029] transition-colors">Privacy</a>
        <a href="#" className="hover:text-[#CE2029] transition-colors">Terms</a>
        <a href="#" className="hover:text-[#CE2029] transition-colors">Support</a>
      </div>
    </footer>
  );
}
