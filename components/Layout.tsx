import React from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Key, 
  MessageSquare, 
  LogOut, 
  Menu,
  Video
} from 'lucide-react';
import { AppRoute } from '../types';
import { logout } from '../services/store';

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
  onCreateProject: () => void;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`group w-full flex flex-col items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium transition-all duration-300 rounded-xl mb-2 relative overflow-hidden
      ${active 
        ? 'text-white bg-white/5 border border-brand-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
  >
    {active && <div className="absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 w-8 bg-brand-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.8)]"></div>}
    <Icon size={22} className={`transition-transform duration-300 ${active ? 'scale-110 text-brand-400' : 'group-hover:text-slate-200'}`} />
    <span className="relative z-10">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ 
  currentRoute, 
  onNavigate, 
  children,
  onCreateProject
}) => {
  const handleLogout = () => {
    logout();
    onNavigate(AppRoute.LANDING);
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-transparent">
      {/* Glass Sidebar - Width reduced by 50% (w-72 -> w-36) */}
      <aside className="w-36 hidden md:flex flex-col relative z-20">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 shadow-2xl"></div>
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="p-6 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20 border border-white/10">
                    <Video size={20} className="text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    视频分镜
                </span>
            </div>

            {/* Create Button */}
            <div className="px-4 mb-4">
            <button
                onClick={onCreateProject}
                className="w-full group relative flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 px-2 rounded-xl font-semibold transition-all shadow-lg shadow-brand-900/20 active:scale-95 border border-white/10 overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
                <Plus size={20} className="relative z-10" />
                <span className="relative z-10 text-xs">新建</span>
            </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-3 overflow-y-auto">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">菜单</div>
            <SidebarItem 
                icon={LayoutDashboard} 
                label="项目" 
                active={currentRoute === AppRoute.DASHBOARD} 
                onClick={() => onNavigate(AppRoute.DASHBOARD)} 
            />
            <SidebarItem 
                icon={Key} 
                label="密钥" 
                active={currentRoute === AppRoute.KEYS} 
                onClick={() => onNavigate(AppRoute.KEYS)} 
            />
            <SidebarItem 
                icon={MessageSquare} 
                label="提示词" 
                active={currentRoute === AppRoute.PROMPTS} 
                onClick={() => onNavigate(AppRoute.PROMPTS)} 
            />
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-black/10 flex flex-col items-center gap-3">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-2 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <LogOut size={14} />
                    <span>退出</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="md:hidden h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="font-bold text-white">视频分镜助手</div>
          <button className="text-slate-400" onClick={() => {}}><Menu size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full flex flex-col animate-fade-in">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;