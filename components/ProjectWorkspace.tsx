import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import { getProjectById, saveProject, getSystemPrompt } from '../services/store';
import { generateStoryboardContent, generate3x3GridInstructions } from '../services/geminiService';
import { GRID_PREFIX_CN, GRID_PREFIX_EN } from '../constants';
import { Save, Zap, Grid, Copy, Check, Loader2, RotateCw, LayoutTemplate, FileText, ArrowRight, X, ChevronRight, Maximize2, Minus, Plus as PlusIcon, RotateCcw, Play } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface WorkspaceProps {
  projectId?: string; // Optional if not used directly
}

type Step = 'input' | 'storyboard' | 'grid';

const ProjectWorkspace: React.FC<WorkspaceProps> = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); // 'storyboard' | 'grid'
  const [saving, setSaving] = useState(false);
  
  // Navigation State
  const [activeStep, setActiveStep] = useState<Step>('input');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Canvas View State
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for drag logic
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Local state for edits
  const [plan, setPlan] = useState('');
  const [sbCn, setSbCn] = useState<string[]>([]);
  const [sbEn, setSbEn] = useState<string[]>([]);
  const [gridCn, setGridCn] = useState('');
  const [gridEn, setGridEn] = useState('');

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

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
            if (!p.creativePlan) {
                setActiveStep('input');
                setIsPanelOpen(true);
            }
            else if (p.storyboardZh.length === 0) {
                setActiveStep('storyboard');
                setIsPanelOpen(true);
            }
            else {
                 setActiveStep('grid');
                 setIsPanelOpen(false); 
            }
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
    if (!plan.trim()) {
        if (!isPanelOpen) setIsPanelOpen(true);
        setActiveStep('input');
        return alert("请输入创意方案。");
    }
    setLoading(true);
    setLoadingStep('storyboard');
    
    try {
      const systemPrompt = await getSystemPrompt();
      const res = await generateStoryboardContent(plan, systemPrompt);
      setSbCn(res.cn);
      setSbEn(res.en);
      
      if(project) {
        const updated = { ...project, creativePlan: plan, storyboardZh: res.cn, storyboardEn: res.en, updatedAt: Date.now() };
        await saveProject(updated);
        setProject(updated);
      }
      setActiveStep('storyboard');
      setIsPanelOpen(true); // Open panel to show result
    } catch (e: any) {
      alert("生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleGenerateGrid = async () => {
    if (sbCn.length === 0) {
        if (!isPanelOpen) setIsPanelOpen(true);
        setActiveStep('storyboard');
        return alert("请先生成分镜列表。");
    }
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
      setIsPanelOpen(true); // Open panel to show result
    } catch (e: any) {
      alert("网格生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleStepClick = (step: Step) => {
    setActiveStep(step);
    setIsPanelOpen(true);
  };

  // --- Canvas Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom only when Shift is pressed
    if (!e.shiftKey) return;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewState(prev => {
        const newScale = Math.min(Math.max(prev.scale * delta, 0.2), 3.0);
        return { ...prev, scale: newScale };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left click only for panning
    if (e.button !== 0) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    setViewState(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
    }));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);

    // Check if it was a click (not a drag)
    const moveDist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
    if (moveDist < 5) {
        // It's a click on the background -> Close Panel
        setIsPanelOpen(false);
    }
  };

  const handleResetView = () => {
    setViewState({ x: 0, y: 0, scale: 1 });
  };

  if (!projectId) return <div className="p-8 text-center text-slate-400">错误：未找到项目ID</div>;
  if (!project) return <div className="p-8 text-center text-slate-400 flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2"/>正在加载项目数据...</div>;

  // Render Step Node (Canvas Item)
  const CanvasNode = ({ 
    id, 
    label, 
    desc,
    icon: Icon, 
    isDone,
    stepId,
    onGenerate
  }: { 
    id: number, 
    label: string, 
    desc: string, 
    icon: any, 
    isDone: boolean, 
    stepId: Step,
    onGenerate?: () => void
  }) => {
    const isActive = activeStep === stepId && isPanelOpen;
    const isNodeLoading = loading && loadingStep === stepId;

    return (
      <div 
        onMouseDown={(e) => e.stopPropagation()} // Prevent pan start when interacting with node
        onClick={(e) => { e.stopPropagation(); handleStepClick(stepId); }}
        className={`relative group flex flex-col items-center text-center p-6 w-56 rounded-3xl border cursor-pointer shadow-2xl pb-10
          ${isActive 
            ? 'bg-slate-800 border-brand-500 ring-2 ring-brand-500/20 shadow-[0_0_50px_rgba(14,165,233,0.15)] z-20 scale-105' 
            : 'bg-slate-900/80 backdrop-blur-md border-white/10 text-slate-400 hover:border-white/20 hover:bg-slate-800 hover:-translate-y-1 z-10'
          }`}
      >
        {/* Status Dot */}
        {isDone && <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg"><Check size={12} strokeWidth={3} /></div>}
        
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-inner border border-white/5
             ${isActive ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
             <Icon size={26} />
        </div>
        
        <div className={`font-bold text-lg tracking-tight mb-1 ${isActive ? 'text-white' : 'text-slate-200'}`}>{label}</div>
        <div className="text-xs text-slate-500 leading-tight mb-2">{desc}</div>
        
        {/* Step Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/10 text-slate-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            STEP 0{id}
        </div>

        {/* Generate Button (Bottom Right) */}
        {onGenerate && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onGenerate();
                }}
                disabled={loading}
                className={`absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-lg border border-white/10
                    ${isNodeLoading 
                        ? 'bg-brand-500/20 text-brand-300 cursor-wait' 
                        : 'bg-brand-600 hover:bg-brand-500 text-white hover:scale-105 active:scale-95'
                    }`}
            >
                {isNodeLoading ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                {isNodeLoading ? '生成中' : '立刻生成'}
            </button>
        )}
      </div>
    );
  };

  const Connector = () => (
    <div className="w-16 h-px bg-slate-700 relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
    </div>
  );

  return (
    <div 
        className={`h-full w-full relative overflow-hidden bg-slate-950 font-sans ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
    >
      
      {/* Dynamic Background with Grid */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none transition-all duration-75 ease-out will-change-[background-position,background-size]" 
           style={{ 
             backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
             backgroundPosition: `${viewState.x}px ${viewState.y}px`,
             backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px` 
           }}>
      </div>

      {/* Top Bar (Overlay) */}
      <div className="absolute top-0 left-0 w-full z-30 px-8 py-6 flex items-center justify-between pointer-events-none" onMouseDown={e => e.stopPropagation()}>
        <div className="pointer-events-auto">
           <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">{project.name}</h2>
           <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
             <Maximize2 size={10} /> 自由画布模式
           </p>
        </div>
        <div className="flex gap-3 pointer-events-auto">
             <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/10 shadow-lg"
                >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? '保存中...' : '保存进度'}
            </button>
        </div>
      </div>

      {/* View Controls (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-2 pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
          <div className="flex flex-col bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-xl">
             <button 
                onClick={() => setViewState(p => ({...p, scale: Math.min(p.scale + 0.1, 3.0)}))}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
             >
                <PlusIcon size={16} />
             </button>
             <div className="h-px bg-white/5 w-full"></div>
             <button 
                onClick={() => setViewState(p => ({...p, scale: Math.max(p.scale - 0.1, 0.2)}))}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
             >
                <Minus size={16} />
             </button>
          </div>
          <button 
            onClick={handleResetView}
            className="p-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shadow-xl"
            title="重置视图"
          >
             <RotateCcw size={16} />
          </button>
          <div className="text-[10px] font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded border border-white/5 text-center">
             {Math.round(viewState.scale * 100)}%
          </div>
      </div>

      {/* Main Canvas Area (Transformed) */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none will-change-transform"
        style={{
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`
        }}
      >
          <div className="flex items-center gap-2 pointer-events-auto">
            <CanvasNode 
                id={1} 
                stepId="input" 
                label="项目输入" 
                desc="选题与创意方案" 
                icon={LayoutTemplate} 
                isDone={!!plan}
                // Step 1 is the start, no "Generate" button needed
            />
            <Connector />
            <CanvasNode 
                id={2} 
                stepId="storyboard" 
                label="视频脚本" 
                desc="9 帧详细画面" 
                icon={FileText} 
                isDone={sbCn.length > 0} 
                onGenerate={handleGenerateStoryboard}
            />
            <Connector />
            <CanvasNode 
                id={3} 
                stepId="grid" 
                label="视觉网格" 
                desc="3x3 提示词" 
                icon={Grid} 
                isDone={!!gridCn} 
                onGenerate={handleGenerateGrid}
            />
          </div>
      </div>

      {/* Right Drawer Panel (Overlay) */}
      {/* Width increased from 350px to 420px */}
      <div 
        onMouseDown={e => e.stopPropagation()} // Prevent events from bubbling to canvas
        onClick={(e) => e.stopPropagation()} 
        className={`absolute top-0 right-0 h-full w-full md:w-[420px] bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transition-transform duration-500 ease-out z-40 flex flex-col
          ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
         {/* Panel Header */}
         <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 shrink-0">
             <div className="flex items-center gap-2 overflow-hidden">
                 {activeStep === 'input' && <LayoutTemplate size={18} className="text-brand-400 shrink-0"/>}
                 {activeStep === 'storyboard' && <FileText size={18} className="text-brand-400 shrink-0"/>}
                 {activeStep === 'grid' && <Grid size={18} className="text-brand-400 shrink-0"/>}
                 <span className="font-bold text-white tracking-tight truncate text-sm">
                    {activeStep === 'input' && '创意方案输入'}
                    {activeStep === 'storyboard' && '分镜脚本 (9帧)'}
                    {activeStep === 'grid' && '视觉网格 (3x3)'}
                 </span>
             </div>
             <button onClick={() => setIsPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
                 <X size={20} />
             </button>
         </div>

         {/* Panel Content */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
            
            {/* INPUT EDITOR */}
            {activeStep === 'input' && (
                <div className="h-full flex flex-col animate-fade-in">
                    <p className="text-sm text-slate-400 mb-4">
                        输入您的视频创意、剧情大纲或视觉风格，AI 将自动拆解为 9 个关键帧。
                    </p>
                    <div className="flex-1 bg-black/20 rounded-2xl border border-white/10 p-4 mb-4 relative focus-within:ring-1 focus-within:ring-brand-500/50 transition-all">
                        <textarea 
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder="例如：一个赛博朋克风格的雨夜，霓虹灯闪烁，主角独自走在街道上..."
                            className="w-full h-full bg-transparent text-slate-200 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed text-sm"
                            autoFocus
                        />
                    </div>
                    <button 
                      onClick={handleGenerateStoryboard}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading && loadingStep === 'storyboard' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      生成视频分镜
                    </button>
                </div>
            )}

            {/* STORYBOARD EDITOR */}
            {activeStep === 'storyboard' && (
                <div className="flex flex-col gap-6 animate-fade-in pb-10">
                     <p className="text-sm text-slate-400">检查并编辑生成的分镜。</p>
                     
                     {sbCn.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                            <Zap size={24} className="mb-3 opacity-50" />
                            <p className="text-sm">暂无分镜数据</p>
                            <button onClick={() => setActiveStep('input')} className="mt-2 text-brand-400 text-xs hover:underline">去生成</button>
                        </div>
                     ) : (
                         <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
                             <table className="w-full text-left border-collapse table-fixed">
                                 <thead>
                                     <tr className="bg-white/5 border-b border-white/10">
                                         <th className="p-3 w-12 text-center text-xs font-bold text-slate-500">#</th>
                                         <th className="p-3 border-l border-white/10 text-xs font-bold text-slate-500">
                                            <div className="flex items-center justify-between">
                                                <span>中文</span>
                                                <button 
                                                    onClick={() => handleCopy(sbCn.join('\n'), 'col_cn')}
                                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                                    title="复制整列"
                                                >
                                                    {copied === 'col_cn' ? <Check size={12}/> : <Copy size={12}/>}
                                                </button>
                                            </div>
                                         </th>
                                         <th className="p-3 border-l border-white/10 text-xs font-bold text-slate-500">
                                             <div className="flex items-center justify-between">
                                                <span>英文</span>
                                                <button 
                                                    onClick={() => handleCopy(sbEn.join('\n'), 'col_en')}
                                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                                    title="复制整列"
                                                >
                                                    {copied === 'col_en' ? <Check size={12}/> : <Copy size={12}/>}
                                                </button>
                                            </div>
                                         </th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/5">
                                     {sbCn.map((frame, i) => (
                                         <tr key={i} className="group hover:bg-white/[0.02]">
                                             <td className="p-3 text-center text-xs font-mono text-slate-500 bg-black/10">
                                                 {i + 1}
                                             </td>
                                             <td className="p-3 border-l border-white/5 align-top">
                                                 <div 
                                                    className="text-xs text-slate-300 outline-none focus:text-white focus:bg-white/5 rounded p-1 transition-all leading-relaxed whitespace-pre-wrap"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => {
                                                        const newArr = [...sbCn];
                                                        newArr[i] = e.currentTarget.textContent || '';
                                                        setSbCn(newArr);
                                                    }}
                                                 >{frame}</div>
                                             </td>
                                             <td className="p-3 border-l border-white/5 align-top">
                                                 <div 
                                                    className="text-xs text-slate-400 font-mono outline-none focus:text-white focus:bg-white/5 rounded p-1 transition-all leading-relaxed whitespace-pre-wrap"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => {
                                                        const newArr = [...sbEn];
                                                        newArr[i] = e.currentTarget.textContent || '';
                                                        setSbEn(newArr);
                                                    }}
                                                 >{sbEn[i]}</div>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     )}

                     {sbCn.length > 0 && (
                        <button 
                            onClick={handleGenerateGrid}
                            disabled={loading}
                            className="sticky bottom-0 mt-4 w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-200 py-3 rounded-xl text-sm font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading && loadingStep === 'grid' ? <Loader2 size={16} className="animate-spin" /> : <Grid size={16} />}
                            生成 3x3 网格指令
                        </button>
                     )}
                </div>
            )}

            {/* GRID EDITOR */}
            {activeStep === 'grid' && (
                <div className="h-full flex flex-col animate-fade-in">
                    <p className="text-sm text-slate-400 mb-4">
                        已格式化的 3x3 网格生成指令，可直接复制使用。
                    </p>
                    
                    <div className="flex-1 space-y-4 overflow-y-auto pb-4">
                        {/* CN Block */}
                        <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <span className="text-xs font-bold text-slate-500">中文指令 (CN)</span>
                                <button onClick={() => handleCopy(gridCn, 'grid_cn')} className="text-slate-400 hover:text-white transition-colors">
                                    {copied === 'grid_cn' ? <Check size={14}/> : <Copy size={14}/>}
                                </button>
                            </div>
                            <textarea 
                                value={gridCn}
                                onChange={e => setGridCn(e.target.value)}
                                className="w-full h-40 bg-transparent p-4 text-xs font-mono text-slate-300 resize-none focus:outline-none leading-relaxed"
                                placeholder="等待生成..."
                            />
                        </div>

                        {/* EN Block */}
                        <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <span className="text-xs font-bold text-slate-500">英文指令 (EN)</span>
                                <button onClick={() => handleCopy(gridEn, 'grid_en')} className="text-slate-400 hover:text-white transition-colors">
                                    {copied === 'grid_en' ? <Check size={14}/> : <Copy size={14}/>}
                                </button>
                            </div>
                            <textarea 
                                value={gridEn}
                                onChange={e => setGridEn(e.target.value)}
                                className="w-full h-40 bg-transparent p-4 text-xs font-mono text-slate-300 resize-none focus:outline-none leading-relaxed"
                                placeholder="等待生成..."
                            />
                        </div>
                    </div>
                    
                    <button 
                     onClick={handleGenerateGrid}
                     disabled={loading || sbCn.length === 0}
                     className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold transition-all border border-white/10"
                   >
                     <RotateCw size={14} />
                     重新生成网格
                   </button>
                </div>
            )}

         </div>
      </div>
      
      {/* Floating Toggle Button (Visible when panel is closed) */}
      {!isPanelOpen && (
        <button 
            onClick={() => setIsPanelOpen(true)}
            onMouseDown={e => e.stopPropagation()} // Stop propagation to avoid drag
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-900/30 transition-all hover:scale-110 z-20 animate-fade-in"
        >
            <ChevronRight size={24} className="rotate-180" />
        </button>
      )}

    </div>
  );
};

export default ProjectWorkspace;