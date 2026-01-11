import React, { useEffect, useState } from 'react';
import { getProjects, deleteProject } from '../services/store';
import { Project } from '../types';
import { Clock, FolderOpen, Trash2, Search, Plus } from 'lucide-react';

interface ProjectListProps {
  onOpenProject: (id: string) => void;
  onCreateProject?: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onOpenProject, onCreateProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("确认删除此项目？")) {
      deleteProject(id);
      setProjects(getProjects());
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">仪表盘</h2>
           <p className="text-slate-400">管理您的分镜与创意灵感。</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="搜索项目..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-800/40 border border-white/10 text-slate-200 pl-12 pr-6 py-3 rounded-2xl text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-800/60 focus:ring-1 focus:ring-brand-500/50 transition-all backdrop-blur-md w-full md:w-72 shadow-lg"
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/40 backdrop-blur-xl border border-white/5 border-dashed rounded-3xl p-12">
          <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 shadow-inner">
             <FolderOpen size={40} className="opacity-50" />
          </div>
          <p className="text-xl font-bold text-white mb-2">暂无项目</p>
          <p className="text-sm mb-8">创建第一个项目以开始</p>
          {onCreateProject && (
            <button 
              onClick={onCreateProject}
              className="px-6 py-2 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors shadow-lg shadow-brand-900/20"
            >
              创建项目
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {/* Add New Card (Optional visual shortcut) */}
          {onCreateProject && (
              <div 
                onClick={onCreateProject}
                className="group bg-brand-500/5 border border-brand-500/20 border-dashed hover:bg-brand-500/10 hover:border-brand-500/40 rounded-3xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center h-56"
              >
                  <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                  </div>
                  <span className="font-semibold text-brand-200">新建项目</span>
              </div>
          )}

          {filtered.map(project => (
            <div 
              key={project.id}
              onClick={() => onOpenProject(project.id)}
              className="group relative bg-slate-800/40 backdrop-blur-xl border border-white/10 hover:border-brand-500/30 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-900/10 flex flex-col h-56 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <div className="flex-1 relative z-10">
                <h3 className="text-xl font-bold text-white mb-3 line-clamp-1 group-hover:text-brand-300 transition-colors">{project.name}</h3>
                <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                  {project.creativePlan || <span className="italic opacity-50">暂无描述...</span>}
                </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 relative z-10">
                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md">
                  <Clock size={12} />
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, project.id)}
                  className="p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"
                  title="删除项目"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;