import React, { useEffect, useState } from 'react';
import { getProjects, deleteProject } from '../services/store';
import { Project } from '../types';
import { Clock, FolderOpen, Trash2, Search, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectListProps {
  onCreateProject?: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onCreateProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("确认删除此项目？")) {
      await deleteProject(id);
      fetchProjects();
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading && projects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mb-2" />
        <span className="ml-2">加载项目中...</span>
      </div>
    );
  }

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
          <p className="text-sm">请点击左侧边栏“新建项目”开始创作</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
           <div className="overflow-x-auto h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">项目名称</th>
                  <th className="px-6 py-4 w-1/3">创意摘要</th>
                  <th className="px-6 py-4">最后更新</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(project => (
                  <tr 
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform shadow-lg">
                           <FileText size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-brand-300 transition-colors">{project.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {project.id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                        {project.creativePlan || <span className="italic opacity-30">暂无描述...</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/20 px-3 py-1.5 rounded-full w-fit">
                        <Clock size={12} />
                        <span>{new Date(project.updatedAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => handleDelete(e, project.id)}
                          className="p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors group/del"
                          title="删除项目"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="p-2 text-slate-600 group-hover:text-white transition-colors">
                           <ChevronRight size={16} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;