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
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/store';

interface LayoutProps {
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
    className={`group w-full flex flex-col items-center justify-center gap-1 px-1 py-3 transition-all duration-300 rounded-xl mb-3 relative overflow-hidden
      ${active 
        ? 'text-white bg-white/5 border border-brand-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    title={label}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(14,165,233,0.8)]"></div>}
    <Icon size={20} className={`transition-transform duration-300 ${active ? 'text-brand-400' : 'group-hover:text-slate-200'}`} />
    <span className="relative z-10 text-[10px] font-medium scale-90 origin-top">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ 
  children,
  onCreateProject
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Check for project detail pages to highlight Dashboard
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname.startsWith('/project/');
  
  // Detect if we are in the workspace view to remove padding constraints
  const isWorkspaceView = location.pathname.startsWith('/project/');

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-transparent">
      {/* Glass Sidebar - Width reduced to w-20 (compact mode) */}
      <aside className="w-20 hidden md:flex flex-col relative z-20">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 shadow-2xl"></div>
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full items-center py-4">
            {/* Header */}
            <div className="mb-6 flex flex-col items-center gap-3">
                <div 
                    onClick={() => navigate('/dashboard')}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20 border border-white/10 group cursor-pointer hover:scale-105 transition-transform" 
                    title="视频分镜助手"
                >
                    <Video size={20} className="text-white" />
                </div>
            </div>

            {/* Create Button */}
            <div className="px-2 mb-6 w-full flex justify-center">
            <button
                onClick={onCreateProject}
                className="w-10 h-10 group relative flex items-center justify-center bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl transition-all shadow-lg shadow-brand-900/20 active:scale-95 border border-white/10 overflow-hidden"
                title="新建项目"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
                <Plus size={22} className="relative z-10" />
            </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 w-full px-2 overflow-y-auto flex flex-col items-center">
            <SidebarItem 
                icon={LayoutDashboard} 
                label="项目" 
                active={isDashboardActive} 
                onClick={() => navigate('/dashboard')} 
            />
            <SidebarItem 
                icon={Key} 
                label="密钥" 
                active={isActive('/keys')} 
                onClick={() => navigate('/keys')} 
            />
            <SidebarItem 
                icon={MessageSquare} 
                label="提示词" 
                active={isActive('/prompts')} 
                onClick={() => navigate('/prompts')} 
            />
            </nav>

            {/* Footer */}
            <div className="p-4 w-full border-t border-white/5 bg-black/10 flex flex-col items-center gap-3">
                <button 
                    onClick={handleLogout}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="退出"
                >
                    <LogOut size={18} />
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
        
        {isWorkspaceView ? (
             <div className="flex-1 relative w-full h-full overflow-hidden animate-fade-in">
                 {children}
             </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth">
              <div className="max-w-7xl mx-auto h-full flex flex-col animate-fade-in">
                 {children}
              </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default Layout;