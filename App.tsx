import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Layout from './components/Layout';
import ProjectList from './components/ProjectList';
import ProjectWorkspace from './components/ProjectWorkspace';
import KeyManagement from './components/KeyManagement';
import PromptManagement from './components/PromptManagement';
import GlassModal from './components/GlassModal';
import { AppRoute } from './types';
import { getCurrentUser, login, saveProject } from './services/store';

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.LANDING);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Check auth
    const user = getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
      if (route === AppRoute.LANDING) {
        setRoute(AppRoute.DASHBOARD);
      }
    }
  }, []);

  const handleLogin = () => {
    login();
    setIsAuthenticated(true);
    setRoute(AppRoute.DASHBOARD);
  };

  const openCreateModal = () => {
    setNewProjectName('');
    setIsCreateModalOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName && newProjectName.length >= 2 && newProjectName.length <= 30) {
      const user = getCurrentUser();
      if (!user) return;
      
      setIsCreating(true);
      try {
        const newId = Date.now().toString();
        await saveProject({
          id: newId,
          userId: user.id,
          name: newProjectName,
          creativePlan: '',
          storyboardZh: [],
          storyboardEn: [],
          grid3x3Zh: '',
          grid3x3En: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        setIsCreating(false);
        setActiveProjectId(newId);
        setRoute(AppRoute.PROJECT_WORKSPACE);
        setIsCreateModalOpen(false);
      } catch (error: any) {
        console.error("Create project failed:", error);
        setIsCreating(false);
        alert(`创建项目失败：${error.message}\n\n如果您在本地运行，请确保使用 Cloudflare Wrangler 启动环境以支持后端 API。\n参考命令: npx wrangler pages dev --d1 DB=storyboard-db -- npm run dev`);
      }
    } else {
      // Optional: Add inline validation error state
    }
  };

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setRoute(AppRoute.PROJECT_WORKSPACE);
  };

  // --- Routing Logic ---

  if (!isAuthenticated || route === AppRoute.LANDING) {
    return <Landing onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (route) {
      case AppRoute.DASHBOARD:
        return <ProjectList onOpenProject={handleOpenProject} onCreateProject={openCreateModal} />;
      case AppRoute.KEYS:
        return <KeyManagement />;
      case AppRoute.PROMPTS:
        return <PromptManagement />;
      case AppRoute.PROJECT_WORKSPACE:
        return activeProjectId ? <ProjectWorkspace projectId={activeProjectId} /> : <ProjectList onOpenProject={handleOpenProject} onCreateProject={openCreateModal} />;
      default:
        return <ProjectList onOpenProject={handleOpenProject} onCreateProject={openCreateModal} />;
    }
  };

  return (
    <>
      <Layout 
        currentRoute={route} 
        onNavigate={setRoute} 
        onCreateProject={openCreateModal}
      >
        {renderContent()}
      </Layout>

      <GlassModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="创建新项目"
      >
        <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">项目名称</label>
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="例如：赛博朋克音乐视频"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-500/50 focus:bg-black/30 focus:outline-none transition-all placeholder:text-slate-600"
              autoFocus
              required
              minLength={2}
              maxLength={30}
              disabled={isCreating}
            />
            <p className="text-[10px] text-slate-500 mt-2">长度需在 2 到 30 个字符之间。</p>
          </div>
          <div className="flex gap-3 mt-2">
            <button 
              type="button" 
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-medium text-sm"
              disabled={isCreating}
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={isCreating}
              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-900/20 transition-all disabled:opacity-50"
            >
              {isCreating ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </GlassModal>
    </>
  );
};

export default App;