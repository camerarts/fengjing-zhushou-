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
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.LANDING);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // 3.1 状态机: idle | submitting
  const [isCreating, setIsCreating] = useState(false);
  // 3.4 错误显示: UI 错误信息状态
  const [createError, setCreateError] = useState<string | null>(null);

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
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // 3.2 输入校验
    const trimmedName = newProjectName.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 30) {
      setCreateError("项目名称长度必须在 2 到 30 个字符之间");
      return;
    }

    const user = getCurrentUser();
    if (!user) {
        setCreateError("未登录，无法创建项目");
        return;
    }
    
    // 3.1 进入提交状态
    setIsCreating(true);

    try {
      const newId = Date.now().toString();
      const newProject = {
        id: newId,
        userId: user.id,
        name: trimmedName,
        creativePlan: '',
        storyboardZh: [],
        storyboardEn: [],
        grid3x3Zh: '',
        grid3x3En: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 4.1 调用 API (forceCreate = true)
      await saveProject(newProject, true);
      
      // 成功处理
      setActiveProjectId(newId);
      setRoute(AppRoute.PROJECT_WORKSPACE);
      setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error("Create project failed:", error);
      // 3.4 错误显示到 UI
      setCreateError(error.message || "创建失败，请稍后重试");
    } finally {
      // 3.1 恢复空闲状态，确保 loading 结束
      setIsCreating(false);
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
        onClose={() => !isCreating && setIsCreateModalOpen(false)} 
        title="创建新项目"
      >
        <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
          {/* Error Banner */}
          {createError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 text-red-200 text-sm animate-fade-in">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{createError}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">项目名称</label>
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => {
                  setNewProjectName(e.target.value);
                  if(createError) setCreateError(null);
              }}
              placeholder="例如：赛博朋克音乐视频"
              className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all placeholder:text-slate-600 ${
                  createError 
                  ? 'border-red-500/50 focus:bg-red-900/10' 
                  : 'border-white/10 focus:border-brand-500/50 focus:bg-black/30'
              }`}
              autoFocus
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
              disabled={isCreating || !newProjectName.trim()}
              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    创建中...
                  </>
              ) : '立即创建'}
            </button>
          </div>
        </form>
      </GlassModal>
    </>
  );
};

export default App;