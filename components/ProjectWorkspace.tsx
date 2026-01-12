import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { getProjectById, saveProject, getSystemPrompt } from '../services/store';
import { generateStoryboardContent, generate3x3GridInstructions } from '../services/geminiService';
import { GRID_PREFIX_CN, GRID_PREFIX_EN } from '../constants';
import { Save, Zap, Grid, Copy, Check, Loader2, RotateCw, LayoutTemplate, FileText, ArrowRight } from 'lucide-react';

interface WorkspaceProps {
  projectId: string;
}

type Step = 'input' | 'storyboard' | 'grid';

const ProjectWorkspace: React.FC<WorkspaceProps> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); // 'storyboard' | 'grid'
  const [saving, setSaving] = useState(false);
  
  // Navigation State
  const [activeStep, setActiveStep] = useState<Step>('input');

  // Local state for edits
  const [plan, setPlan] = useState('');
  const [sbCn, setSbCn] = useState<string[]>([]);
  const [sbEn, setSbEn] = useState<string[]>([]);
  const [gridCn, setGridCn] = useState('');
  const [gridEn, setGridEn] = useState('');

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setProject(null); // Clear previous
    getProjectById(projectId).then(p => {
        if (p) {
            setProject(p);
            setPlan(p.creativePlan || '');
            setSbCn(p.storyboardZh || []);
            setSbEn(p.storyboardEn || []);
            setGridCn(p.grid3x3Zh || '');
            setGridEn(p.grid3x3En || '');
            
            // Auto navigate to the furthest empty step
            if (!p.creativePlan) setActiveStep('input');
            else if (p.storyboardZh.length === 0) setActiveStep('storyboard');
            else setActiveStep('grid');
        }
    });
  }, [projectId]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    const updated: Project = {
      ...project,
      creativePlan: plan,
      storyboardZh: sbCn,
      storyboardEn: sbEn,
      grid3x3Zh: gridCn,
      grid3x3En: gridEn,
      updatedAt: Date.now()
    };
    await saveProject(updated);
    setProject(updated);
    setSaving(false);
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
      const systemPrompt = await getSystemPrompt();
      const res = await generateStoryboardContent(plan, systemPrompt);
      setSbCn(res.cn);
      setSbEn(res.en);
      
      // Auto save after gen
      if(project) {
        const updated = { ...project, creativePlan: plan, storyboardZh: res.cn, storyboardEn: res.en, updatedAt: Date.now() };
        await saveProject(updated);
        setProject(updated);
      }
      setActiveStep('storyboard');
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
        const updated = { ...project, grid3x3Zh: finalCn, grid3x3En: finalEn, updatedAt: Date.now() };
        await saveProject(updated);
        setProject(updated);
      }
      setActiveStep('grid');

    } catch (e: any) {
      alert("网格生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  if (!project) return <div className="p-8 text-center text-slate-400 flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2"/>正在加载项目数据...</div>;

  // Render Step Node
  const StepNode = ({ 
    id, 
    label, 
    desc,
    icon: Icon, 
    isDone,
    stepId
  }: { id: number, label: string, desc: string, icon: any, isDone: boolean, stepId: Step }) => {
    const isActive = activeStep === stepId;
    return (
      <button 
        onClick={() => setActiveStep(stepId)}
        className={`relative group flex flex-col items-start text-left p-5 rounded-3xl border transition-all duration-300 w-64
          ${isActive 
            ? 'bg-white text-slate-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.15)] scale-105 z-10' 
            : 'bg-slate-900/60 backdrop-blur-md border-white/10 text-slate-400 hover:border-white/20 hover:bg-slate-800/60'
          }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors
             ${isActive ? 'bg-brand-100 text-brand-600' : 'bg-white/5 text-slate-500'}`}>
             <Icon size={20} />
          </div>
          {isDone && (
            <div className={`rounded-full p-1 ${isActive ? 'bg-green-100 text-green-600' : 'bg-green-500/20 text-green-500'}`}>
               <Check size={14} strokeWidth={3} />
            </div>
          )}
          {!isDone && isActive && (
             <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
          )}
        </div>
        <div className="font-bold text-lg tracking-tight mb-1">{label}</div>
        <div className={`text-xs ${isActive ? 'text-slate-500' : 'text-slate-500'}`}>{desc}</div>
        
        {/* Step Number Badge */}
        <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center font-bold text-xs
          ${isActive ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
          {id}
        </div>
      </button>
    );
  };

  const Connector = ({ active }: { active: boolean }) => (
    <div className="hidden md:flex flex-1 items-center justify-center px-4 opacity-50">
        <ArrowRight size={24} className={active ? 'text-brand-500' : 'text-slate-700'} />
    </div>
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-slate-950">
      {/* Canvas Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{ 
             backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
           }}>
      </div>
      
      {/* Header */}
      <div className="relative z-10 px-8 py-6 flex items-center justify-between bg-gradient-to-b from-slate-950 to-transparent">
        <div>
           <h2 className="text-2xl font-black text-white tracking-tight">{project.name}</h2>
           <p className="text-xs text-slate-500 font-mono">画布模式</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? '保存中...' : '保存进度'}
        </button>
      </div>

      {/* Flow Visualization (Canvas Top) */}
      <div className="relative z-10 px-8 py-4 flex-none">
        <div className="flex flex-col md:flex-row items-center justify-center max-w-5xl mx-auto gap-4 md:gap-0">
          <StepNode 
            id={1} 
            stepId="input"
            label="项目输入" 
            desc="选题与创意方案" 
            icon={LayoutTemplate} 
            isDone={!!plan}
          />
          <Connector active={!!plan} />
          <StepNode 
            id={2} 
            stepId="storyboard"
            label="视频脚本" 
            desc="生成 9 帧详细画面" 
            icon={FileText} 
            isDone={sbCn.length > 0}
          />
          <Connector active={sbCn.length > 0} />
          <StepNode 
            id={3} 
            stepId="grid"
            label="视觉网格" 
            desc="生成 3x3 提示词" 
            icon={Grid} 
            isDone={!!gridCn}
          />
        </div>
      </div>

      {/* Editor Stage (Bottom) */}
      <div className="flex-1 relative z-10 p-4 md:p-8 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-5xl mx-auto w-full animate-fade-in relative">
            
            {/* Step 1: Input Editor */}
            {activeStep === 'input' && (
               <div className="flex-1 flex flex-col h-full">
                  <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <LayoutTemplate size={18} className="text-brand-400"/> 创意方案输入
                    </h3>
                    <button 
                      onClick={handleGenerateStoryboard}
                      disabled={loading}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/20 transition-all hover:scale-105"
                    >
                      {loading && loadingStep === 'storyboard' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      生成视频分镜
                    </button>
                  </div>
                  <div className="flex-1 p-6 relative">
                     <textarea 
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        placeholder="在此描述您的视频创意、剧情、视觉风格和关键场景..."
                        className="w-full h-full bg-transparent text-slate-200 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed text-base font-medium"
                        autoFocus
                     />
                     <div className="absolute bottom-6 right-6 text-xs text-slate-500 bg-black/20 px-3 py-1 rounded-full pointer-events-none">
                        支持 Markdown 格式
                     </div>
                  </div>
               </div>
            )}

            {/* Step 2: Storyboard Editor */}
            {activeStep === 'storyboard' && (
                <div className="flex-1 flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <FileText size={18} className="text-brand-400"/> 分镜脚本 (9帧)
                            </h3>
                            <div className="h-4 w-px bg-white/10"></div>
                            <div className="flex gap-2">
                                <button onClick={() => handleCopy(sbCn.join('\n'), 'sb_cn')} className="text-xs bg-black/20 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                                    {copied === 'sb_cn' ? <Check size={12}/> : <Copy size={12}/>} 中文
                                </button>
                                <button onClick={() => handleCopy(sbEn.join('\n'), 'sb_en')} className="text-xs bg-black/20 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                                    {copied === 'sb_en' ? <Check size={12}/> : <Copy size={12}/>} 英文
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerateGrid}
                            disabled={loading || sbCn.length === 0}
                            className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading && loadingStep === 'grid' ? <Loader2 size={16} className="animate-spin" /> : <Grid size={16} />}
                            下一步：生成网格
                        </button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/50">
                         {sbCn.length === 0 ? (
                            <div className="col-span-2 flex flex-col items-center justify-center text-slate-500 h-64 border-2 border-dashed border-white/5 rounded-2xl">
                                <Zap size={32} className="mb-2 opacity-50" />
                                <p>请先在“项目输入”步骤生成分镜</p>
                                <button onClick={() => setActiveStep('input')} className="mt-4 text-brand-400 text-sm hover:underline">返回上一步</button>
                            </div>
                         ) : (
                             <>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">中文脚本</h4>
                                    {sbCn.map((frame, i) => (
                                        <div key={i} className="flex gap-3 bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <span className="text-slate-500 font-mono font-bold text-sm pt-0.5">{i+1}</span>
                                            <p className="text-sm text-slate-300 leading-relaxed outline-none focus:text-white" contentEditable suppressContentEditableWarning 
                                               onBlur={(e) => {
                                                  const newArr = [...sbCn];
                                                  newArr[i] = e.currentTarget.textContent || '';
                                                  setSbCn(newArr);
                                               }}
                                            >{frame}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">英文提示词</h4>
                                    {sbEn.map((frame, i) => (
                                        <div key={i} className="flex gap-3 bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                            <span className="text-slate-500 font-mono font-bold text-sm pt-0.5">{i+1}</span>
                                            <p className="text-sm text-slate-300 leading-relaxed outline-none focus:text-white" contentEditable suppressContentEditableWarning
                                               onBlur={(e) => {
                                                  const newArr = [...sbEn];
                                                  newArr[i] = e.currentTarget.textContent || '';
                                                  setSbEn(newArr);
                                               }}
                                            >{frame}</p>
                                        </div>
                                    ))}
                                </div>
                             </>
                         )}
                    </div>
                </div>
            )}

            {/* Step 3: Grid Editor */}
            {activeStep === 'grid' && (
                 <div className="flex-1 flex flex-col h-full">
                 <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                   <h3 className="font-bold text-white flex items-center gap-2">
                     <Grid size={18} className="text-brand-400"/> 视觉网格 (3x3)
                   </h3>
                   <button 
                     onClick={handleGenerateGrid}
                     disabled={loading || sbCn.length === 0}
                     className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/10"
                   >
                     <RotateCw size={14} />
                     重新生成
                   </button>
                 </div>
                 <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* CN */}
                    <div className="flex flex-col bg-black/20 rounded-2xl border border-white/5 overflow-hidden h-full">
                       <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">中文 Prompt</span>
                          <button onClick={() => handleCopy(gridCn, 'grid_cn')} className="text-slate-400 hover:text-brand-400 transition-colors">
                              {copied === 'grid_cn' ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                       </div>
                       <textarea 
                          value={gridCn}
                          onChange={e => setGridCn(e.target.value)}
                          className="flex-1 bg-transparent p-4 text-sm font-mono text-slate-300 resize-none focus:outline-none leading-relaxed"
                          placeholder="等待生成..."
                       />
                    </div>
                    {/* EN */}
                    <div className="flex flex-col bg-black/20 rounded-2xl border border-white/5 overflow-hidden h-full">
                       <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">英文 Prompt</span>
                          <button onClick={() => handleCopy(gridEn, 'grid_en')} className="text-slate-400 hover:text-brand-400 transition-colors">
                              {copied === 'grid_en' ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                       </div>
                       <textarea 
                          value={gridEn}
                          onChange={e => setGridEn(e.target.value)}
                          className="flex-1 bg-transparent p-4 text-sm font-mono text-slate-300 resize-none focus:outline-none leading-relaxed"
                          placeholder="等待生成..."
                       />
                    </div>
                 </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProjectWorkspace;