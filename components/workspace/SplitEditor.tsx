import React from 'react';
import { Loader2, LayoutGrid, Download, AlertTriangle, Scissors } from 'lucide-react';

interface SplitEditorProps {
  splitImgs: string[];
  loading: boolean;
  onResplit: () => void;
  onGoBack: () => void;
  hasGridComposite: boolean;
}

const SplitEditor: React.FC<SplitEditorProps> = ({ 
    splitImgs, loading, onResplit, onGoBack, hasGridComposite 
}) => {
  const isBase64 = (str: string) => str.startsWith('data:');

  return (
    <div className="h-full flex flex-col animate-fade-in">
        <p className="text-sm text-slate-400 mb-4 flex justify-between">
            <span>已切割的 9 张独立分镜图。</span>
            <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/20">9:16</span>
        </p>

        {splitImgs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <LayoutGrid size={32} className="mb-2 opacity-50" />
                <span className="text-sm">暂无切片数据</span>
                <button onClick={onGoBack} className="mt-2 text-brand-400 text-xs hover:underline">返回上一部切割</button>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-3 pb-4">
                    {splitImgs.map((img, i) => (
                        <div key={i} className="relative group aspect-[9/16] bg-black/50 rounded-lg overflow-hidden border border-white/10">
                            <img src={img} alt={`Frame ${i+1}`} className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-mono px-1.5 rounded backdrop-blur-sm">
                                #{i + 1}
                            </div>
                            <a 
                                href={img} 
                                download={`storyboard_${i+1}.jpg`}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute bottom-1 right-1 p-1.5 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                title="下载图片"
                            >
                                <Download size={12} />
                            </a>
                            {isBase64(img) && (
                                <div className="absolute top-1 right-1 text-orange-500 bg-black/50 rounded-full p-0.5" title="未上传">
                                    <AlertTriangle size={10} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        <div className="mt-4 space-y-2">
            <button 
                onClick={onResplit}
                disabled={loading || !hasGridComposite}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-white/20"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Scissors size={16} />}
                重新切割 (基于上一步大图)
            </button>
        </div>
    </div>
  );
};

export default SplitEditor;
