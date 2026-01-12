import React, { useRef, useState } from 'react';
import { Step } from './types';
import { LayoutTemplate, FileText, Grid, Film, LayoutGrid, Check, Zap, Loader2, Plus as PlusIcon, Minus, RotateCcw, Maximize2, Save } from 'lucide-react';

interface CanvasViewProps {
  activeStep: Step;
  onStepClick: (step: Step) => void;
  projectData: {
    hasPlan: boolean;
    hasStoryboard: boolean;
    hasGrid: boolean;
    hasNegative: boolean;
    hasSplit: boolean;
    name: string;
  };
  loading: boolean;
  loadingStep: string;
  onGenerateStep: (step: Step) => void;
  isSaving: boolean;
  onSave: () => void;
  onPanelToggle: (open: boolean) => void;
}

const CanvasView: React.FC<CanvasViewProps> = ({
  activeStep,
  onStepClick,
  projectData,
  loading,
  loadingStep,
  onGenerateStep,
  isSaving,
  onSave,
  onPanelToggle
}) => {
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // --- Mouse / Wheel Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    if (!e.altKey) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewState(prev => {
        const newScale = Math.min(Math.max(prev.scale * delta, 0.2), 3.0);
        return { ...prev, scale: newScale };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
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
    setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    const moveDist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
    if (moveDist < 5) {
        // Only close panel if clicked on empty space (not handled by children propagation stop)
        onPanelToggle(false);
    }
  };

  const handleResetView = () => {
    setViewState({ x: 0, y: 0, scale: 1 });
  };

  // --- Sub-components ---
  const Connector = () => (
    <div className="w-16 h-px bg-slate-700 relative flex-shrink-0">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
    </div>
  );

  const SplitConnector = () => (
    <div className="w-16 h-[320px] relative flex-shrink-0">
         <svg className="w-full h-full overflow-visible">
            <path d="M0,160 L24,160" stroke="#334155" strokeWidth="1" fill="none" /> 
            <path d="M24,80 L24,240" stroke="#334155" strokeWidth="1" fill="none" /> 
            <path d="M24,80 L64,80" stroke="#334155" strokeWidth="1" fill="none" />
            <circle cx="64" cy="80" r="2.5" fill="#334155" />
            <path d="M24,240 L64,240" stroke="#334155" strokeWidth="1" fill="none" />
            <circle cx="64" cy="240" r="2.5" fill="#334155" />
         </svg>
    </div>
  );

  const JoinConnector = () => (
    <div className="w-16 h-[320px] relative flex-shrink-0">
         <svg className="w-full h-full overflow-visible">
            <path d="M0,80 L32,80" stroke="#334155" strokeWidth="1" fill="none" />
            <path d="M0,240 L32,240" stroke="#334155" strokeWidth="1" fill="none" />
            <path d="M32,80 L32,240" stroke="#334155" strokeWidth="1" fill="none" />
            <path d="M32,160 L64,160" stroke="#334155" strokeWidth="1" fill="none" />
            <circle cx="64" cy="160" r="2.5" fill="#334155" />
         </svg>
    </div>
  );

  const CanvasNode = ({ 
    id, 
    label, 
    desc,
    icon: Icon, 
    isDone,
    stepId,
    hasAction
  }: { 
    id: number, 
    label: string, 
    desc: string, 
    icon: any, 
    isDone: boolean, 
    stepId: Step,
    hasAction?: boolean
  }) => {
    const isActive = activeStep === stepId;
    const isNodeLoading = loading && loadingStep === stepId;

    return (
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        onClick={(e) => { e.stopPropagation(); onStepClick(stepId); }}
        className={`relative group flex flex-col items-center text-center p-6 w-56 rounded-3xl border cursor-pointer shadow-2xl pb-10 transition-transform duration-300
          ${isActive 
            ? 'bg-slate-800 border-brand-500 ring-2 ring-brand-500/20 shadow-[0_0_50px_rgba(14,165,233,0.15)] z-20' 
            : 'bg-slate-900/80 backdrop-blur-md border-white/10 text-slate-400 hover:border-white/20 hover:bg-slate-800 hover:-translate-y-1 z-10'
          }`}
      >
        <div className="absolute -top-3 -left-3 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-slate-950 z-30 font-mono">
            {id}
        </div>

        {isDone && <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg"><Check size={12} strokeWidth={3} /></div>}
        
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-inner border border-white/5
             ${isActive ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
             <Icon size={26} />
        </div>
        
        <div className={`font-bold text-lg tracking-tight mb-1 ${isActive ? 'text-white' : 'text-slate-200'}`}>{label}</div>
        <div className="text-xs text-slate-500 leading-tight mb-2">{desc}</div>
        
        {hasAction && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onGenerateStep(stepId);
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

  return (
    <div 
        className={`h-full w-full relative overflow-hidden bg-slate-950 font-sans ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none will-change-[background-position,background-size]" 
           style={{ 
             backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
             backgroundPosition: `${viewState.x}px ${viewState.y}px`,
             backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px` 
           }}>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full z-30 px-8 py-6 flex items-center justify-between pointer-events-none" onMouseDown={e => e.stopPropagation()}>
        <div className="pointer-events-auto">
           <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">{projectData.name}</h2>
           <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
             <Maximize2 size={10} /> 自由画布模式
           </p>
        </div>
        <div className="flex gap-3 pointer-events-auto">
             <button 
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/10 shadow-lg"
                >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? '保存中...' : '保存进度'}
            </button>
        </div>
      </div>

      {/* View Controls */}
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

      {/* Nodes Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none will-change-transform"
        style={{
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`
        }}
      >
          <div className="flex items-center gap-0 pointer-events-auto">
            {/* 1. Input */}
            <CanvasNode 
                id={1} 
                stepId="input" 
                label="项目输入" 
                desc="选题与创意方案" 
                icon={LayoutTemplate} 
                isDone={projectData.hasPlan}
            />
            <Connector />

            {/* 2. Storyboard */}
            <CanvasNode 
                id={2} 
                stepId="storyboard" 
                label="视频脚本" 
                desc="9 帧详细画面" 
                icon={FileText} 
                isDone={projectData.hasStoryboard}
                hasAction={true}
            />
            
            <SplitConnector />
            
            <div className="flex flex-col gap-12 justify-center">
                {/* 3. Negative */}
                <CanvasNode 
                    id={3} 
                    stepId="negative" 
                    label="底片" 
                    desc="单张环境/光影设定图" 
                    icon={Film} 
                    isDone={projectData.hasNegative}
                    hasAction={true}
                />

                {/* 4. Grid */}
                <CanvasNode 
                    id={4} 
                    stepId="grid" 
                    label="视觉网格" 
                    desc="3x3 提示词" 
                    icon={Grid} 
                    isDone={projectData.hasGrid}
                    hasAction={true}
                />
            </div>
            
            <JoinConnector />

            {/* 5. Split */}
            <CanvasNode 
                id={5} 
                stepId="split" 
                label="九宫格图片" 
                desc="自动切分 9 张图" 
                icon={LayoutGrid} 
                isDone={projectData.hasSplit} 
            />
          </div>
      </div>
    </div>
  );
};

export default CanvasView;