import React, { useState } from 'react';
import { View } from '../types';
import { LayoutDashboard, Terminal, Workflow, Database, Settings, Activity, ShieldCheck, Cpu, Menu, X, Disc } from 'lucide-react';

interface LayoutProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
  systemHealth: number;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children, systemHealth }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#030304] text-gray-300 font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black">
      {/* Sidebar - Glassmorphism */}
      <aside className={`
        fixed md:relative z-50 h-full w-20 md:w-64 bg-black/40 backdrop-blur-xl border-r border-omega-border/50 flex flex-col transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-omega-accent to-blue-600 flex items-center justify-center text-black font-bold text-xl shadow-[0_0_15px_rgba(0,240,255,0.5)]">
            Ω
          </div>
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <h1 className="text-xl font-bold tracking-widest text-white">VANTIX</h1>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-4 mt-4">
          <NavItem 
            active={currentView === View.DASHBOARD} 
            onClick={() => handleNavigate(View.DASHBOARD)} 
            icon={<Disc size={22} />} 
            label="LIVE CORE" 
            expanded={isMobileMenuOpen}
          />
          <NavItem 
            active={currentView === View.COMMAND} 
            onClick={() => handleNavigate(View.COMMAND)} 
            icon={<Terminal size={22} />} 
            label="TERMINAL" 
            expanded={isMobileMenuOpen}
          />
          <NavItem 
            active={currentView === View.WORKFLOW} 
            onClick={() => handleNavigate(View.WORKFLOW)} 
            icon={<Workflow size={22} />} 
            label="FABRIC" 
            expanded={isMobileMenuOpen}
          />
          <NavItem 
            active={currentView === View.MEMORY} 
            onClick={() => handleNavigate(View.MEMORY)} 
            icon={<Database size={22} />} 
            label="MEMORY" 
            expanded={isMobileMenuOpen}
          />
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-omega-success">
                 <div className="w-2 h-2 rounded-full bg-omega-success animate-pulse" />
                 SYSTEM OPTIMAL
            </div>
            <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-omega-accent shadow-[0_0_10px_#00f0ff]" style={{width: `${systemHealth}%`}}></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
         <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
        {children}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; expanded: boolean }> = ({ active, onClick, icon, label, expanded }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
      active 
        ? 'bg-white/5 text-omega-accent shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]' 
        : 'text-gray-500 hover:text-white hover:bg-white/5'
    }`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
    </div>
    <span className={`text-xs font-bold tracking-widest uppercase ${expanded ? 'block' : 'hidden md:block'}`}>{label}</span>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-omega-accent rounded-r-full shadow-[0_0_10px_#00f0ff]" />}
  </button>
);