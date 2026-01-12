import React, { useState } from 'react';
import { Copy, Check, RotateCw, Loader2 } from 'lucide-react';

interface GridEditorProps {
  gridCn: string;
  setGridCn: (val: string) => void;
  gridEn: string;
  setGridEn: (val: string) => void;
  loading: boolean;
  onRegenerate: () => void;
  hasStoryboard: boolean;
}

const GridEditor: React.FC<GridEditorProps> = ({ 
  gridCn, setGridCn, gridEn, setGridEn, loading, onRegenerate, hasStoryboard 
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
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
            onClick={onRegenerate}
            disabled={loading || !hasStoryboard}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold transition-all border border-white/10"
        >
            <RotateCw size={14} />
            重新生成网格
        </button>
    </div>
  );
};

export default GridEditor;
