import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { getProjectById, saveProject, getSystemPrompt } from '../services/store';
import { generateStoryboardContent, generate3x3GridInstructions } from '../services/geminiService';
import { GRID_PREFIX_CN, GRID_PREFIX_EN } from '../constants';
import { Save, Zap, Grid, Copy, Check, Loader2, Edit2, RotateCw } from 'lucide-react';

interface WorkspaceProps {
  projectId: string;
}

const ProjectWorkspace: React.FC<WorkspaceProps> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); // 'storyboard' | 'grid'
  
  // Local state for edits
  const [plan, setPlan] = useState('');
  const [sbCn, setSbCn] = useState<string[]>([]);
  const [sbEn, setSbEn] = useState<string[]>([]);
  const [gridCn, setGridCn] = useState('');
  const [gridEn, setGridEn] = useState('');

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const p = getProjectById(projectId);
    if (p) {
      setProject(p);
      setPlan(p.creativePlan || '');
      setSbCn(p.storyboardZh || []);
      setSbEn(p.storyboardEn || []);
      setGridCn(p.grid3x3Zh || '');
      setGridEn(p.grid3x3En || '');
    }
  }, [projectId]);

  const handleSave = () => {
    if (!project) return;
    const updated: Project = {
      ...project,
      creativePlan: plan,
      storyboardZh: sbCn,
      storyboardEn: sbEn,
      grid3x3Zh: gridCn,
      grid3x3En: gridEn
    };
    saveProject(updated);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateStoryboard = async () => {
    if (!plan.trim()) return alert("请输入创意方案。");
    setLoading(true);
    setLoadingStep('storyboard');
    
    try {
      const systemPrompt = getSystemPrompt();
      const res = await generateStoryboardContent(plan, systemPrompt);
      setSbCn(res.cn);
      setSbEn(res.en);
      
      // Auto save after gen
      if(project) {
        saveProject({ ...project, creativePlan: plan, storyboardZh: res.cn, storyboardEn: res.en });
      }
    } catch (e: any) {
      alert("生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleGenerateGrid = async () => {
    if (sbCn.length === 0) return alert("请先生成分镜列表。");
    setLoading(true);
    setLoadingStep('grid');

    try {
      const res = await generate3x3GridInstructions(sbCn, sbEn);
      
      const finalCn = `${GRID_PREFIX_CN}\n${res.cn}`;
      const finalEn = `${GRID_PREFIX_EN}\n${res.en}`;
      
      setGridCn(finalCn);
      setGridEn(finalEn);

      if(project) {
        saveProject({ ...project, grid3x3Zh: finalCn, grid3x3En: finalEn });
      }

    } catch (e: any) {
      alert("网格生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  if (!project) return <div className="p-8 text-center text-slate-400">正在加载项目数据...</div>;

  return (
    <div className="h-full flex flex-col gap-6 pb-6">
      {/* Workspace Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
           <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">{project.name}</h2>
           <p className="text-xs text-slate-400 font-mono mt-1">ID: {project.id} • 更新时间: {new Date(project.updatedAt).toLocaleTimeString()}</p>
        </div>
        <button 
          onClick={handleSave}
          className="group flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/80 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border border-white/10 shadow-lg hover:shadow-xl"
        >
          <Save size={16} className="text-slate-300 group-hover:text-white transition-colors" />
          保存工作区
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-0">
        
        {/* Left Column: Creative Plan & Storyboard */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-1 scroll-smooth">
          {/* Input Section */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-xl">
            <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-xl">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                  创意方案
              </h3>
              <button 
                onClick={handleGenerateStoryboard}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-brand-900/20"
              >
                {loading && loadingStep === 'storyboard' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                生成视频分镜
              </button>
            </div>
            <textarea 
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="在此描述您的视频创意、剧情、视觉风格和关键场景..."
              className="w-full h-48 bg-transparent p-5 text-sm text-slate-200 focus:outline-none resize-none leading-relaxed placeholder:text-slate-600"
            />
          </div>

          {/* Storyboard Output */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-xl flex-1 flex flex-col">
             <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-xl">
               <h3 className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                 9 帧分镜列表
               </h3>
               <div className="flex gap-2">
                 <button 
                    onClick={() => handleCopy(sbCn.map((t, i) => `${i+1}. ${t}`).join('\n'), 'sb_cn')}
                    className="text-[10px] font-bold bg-black/30 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-lg text-slate-300 flex gap-1.5 items-center transition-colors"
                 >
                   {copied === 'sb_cn' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} 中文
                 </button>
                 <button 
                    onClick={() => handleCopy(sbEn.map((t, i) => `${i+1}. ${t}`).join('\n'), 'sb_en')}
                    className="text-[10px] font-bold bg-black/30 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-lg text-slate-300 flex gap-1.5 items-center transition-colors"
                 >
                   {copied === 'sb_en' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} 英文
                 </button>
               </div>
             </div>

             <div className="flex-1 p-5 overflow-y-auto min-h-[400px]">
             {sbCn.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-xl bg-slate-900/20">
                 <p className="text-sm font-medium">尚未生成分镜</p>
               </div>
             ) : (
               <div className="flex flex-col gap-6">
                 {/* Chinese Block */}
                 <div className="bg-black/20 rounded-xl p-5 border border-white/5 relative group hover:border-white/10 transition-colors">
                    <div className="absolute top-3 right-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900">中文</div>
                    <div className="space-y-3 text-sm text-slate-300 font-mono leading-relaxed">
                      {sbCn.map((frame, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-slate-600 select-none font-bold pt-0.5">{i+1}.</span>
                          <span contentEditable onBlur={(e) => {
                             const newArr = [...sbCn];
                             newArr[i] = e.currentTarget.textContent || '';
                             setSbCn(newArr);
                          }} suppressContentEditableWarning className="outline-none focus:text-brand-400 focus:bg-white/5 rounded px-1 -ml-1 transition-colors">{frame}</span>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* English Block */}
                 <div className="bg-black/20 rounded-xl p-5 border border-white/5 relative group hover:border-white/10 transition-colors">
                    <div className="absolute top-3 right-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900">英文</div>
                    <div className="space-y-3 text-sm text-slate-300 font-mono leading-relaxed">
                      {sbEn.map((frame, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-slate-600 select-none font-bold pt-0.5">{i+1}.</span>
                          <span contentEditable onBlur={(e) => {
                             const newArr = [...sbEn];
                             newArr[i] = e.currentTarget.textContent || '';
                             setSbEn(newArr);
                          }} suppressContentEditableWarning className="outline-none focus:text-brand-400 focus:bg-white/5 rounded px-1 -ml-1 transition-colors">{frame}</span>
                        </div>
                      ))}
                    </div>
                 </div>
               </div>
             )}
             </div>
          </div>
        </div>

        {/* Right Column: 3x3 Grid */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-xl flex-1 flex flex-col h-full">
            <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Grid size={16} className="text-brand-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">3x3 分镜图提示词</h3>
              </div>
              <button 
                onClick={handleGenerateGrid}
                disabled={loading || sbCn.length === 0}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-purple-900/20"
              >
                {loading && loadingStep === 'grid' ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                生成 3x3 描述
              </button>
            </div>

            <div className="flex-1 p-5 flex flex-col gap-6">
              {/* CN Grid Output */}
              <div className="flex-1 bg-black/20 rounded-xl border border-white/5 overflow-hidden flex flex-col hover:border-white/10 transition-colors">
                <div className="bg-slate-950/30 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">中文版本</span>
                   <button onClick={() => handleCopy(gridCn, 'grid_cn')} className="text-slate-400 hover:text-white transition-colors">
                      {copied === 'grid_cn' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                   </button>
                </div>
                <textarea 
                  value={gridCn}
                  onChange={e => setGridCn(e.target.value)}
                  className="flex-1 w-full bg-transparent p-4 text-xs md:text-sm font-mono text-slate-300 resize-none focus:outline-none leading-relaxed"
                  placeholder="生成的网格提示词..."
                />
              </div>

               {/* EN Grid Output */}
               <div className="flex-1 bg-black/20 rounded-xl border border-white/5 overflow-hidden flex flex-col hover:border-white/10 transition-colors">
                <div className="bg-slate-950/30 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">英文版本</span>
                   <button onClick={() => handleCopy(gridEn, 'grid_en')} className="text-slate-400 hover:text-white transition-colors">
                      {copied === 'grid_en' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                   </button>
                </div>
                <textarea 
                  value={gridEn}
                  onChange={e => setGridEn(e.target.value)}
                  className="flex-1 w-full bg-transparent p-4 text-xs md:text-sm font-mono text-slate-300 resize-none focus:outline-none leading-relaxed"
                  placeholder="生成的网格提示词..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWorkspace;