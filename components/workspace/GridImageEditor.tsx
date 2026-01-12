import React from 'react';
import { Loader2, Wand2, Scissors, Image as ImageIcon, AlertTriangle, CheckCircle } from 'lucide-react';

interface GridImageEditorProps {
  gridCompositeImg: string;
  loading: boolean;
  loadingStep: string;
  hasNegative: boolean;
  hasGridInstructions: boolean;
  isBackgroundUploading: boolean;
  onGenerate: () => void;
  onSlice: () => void;
}

const GridImageEditor: React.FC<GridImageEditorProps> = ({ 
    gridCompositeImg, loading, loadingStep, hasNegative, hasGridInstructions, 
    isBackgroundUploading, onGenerate, onSlice 
}) => {
  
  const isBase64 = (str: string) => str.startsWith('data:');

  return (
    <div className="h-full flex flex-col animate-fade-in">
        <p className="text-sm text-slate-400 mb-4">
            根据 <span className="text-white font-bold">底片 (参考图)</span> 和 <span className="text-white font-bold">网格指令</span>，生成一张包含 9 个画面的 3x3 大图。
        </p>

        {/* Action Button */}
        <div className="mb-4">
            <button 
                onClick={onGenerate}
                disabled={loading || !hasNegative || !hasGridInstructions}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                title={!hasNegative ? "缺少底片" : !hasGridInstructions ? "缺少网格指令" : ""}
            >
                {loading && loadingStep === 'grid_image' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                AI 生成 3x3 九宫格大图
            </button>
            {(!hasNegative || !hasGridInstructions) && (
                <p className="text-[10px] text-red-400 mt-1 text-center">
                    {!hasNegative && "需先上传/生成底片(Module 3) "} 
                    {!hasGridInstructions && "需先生成网格指令(Module 4)"}
                </p>
            )}
        </div>

        {/* Image Display */}
        <div className={`flex-1 flex flex-col items-center justify-center bg-black/40 border-2 rounded-3xl relative overflow-hidden transition-all
             ${gridCompositeImg ? 'border-white/20' : 'border-dashed border-white/10'}`}>
            
            {gridCompositeImg ? (
                <div className="w-full h-full relative group">
                    <img src={gridCompositeImg} alt="Grid Composite" className="w-full h-full object-contain" />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={onGenerate} // Regenerate
                            className="bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 px-4 py-2 rounded-full font-bold text-sm transition-all"
                         >
                            重新生成
                         </button>
                    </div>

                    {/* Status Badge */}
                    <div className={`absolute top-2 right-2 backdrop-blur rounded px-2 py-1 text-[10px] text-white flex items-center gap-1 ${
                        isBackgroundUploading ? 'bg-blue-500/80' : 
                        isBase64(gridCompositeImg) ? 'bg-orange-500/80' : 'bg-green-500/90'
                    }`}>
                        {isBackgroundUploading ? <Loader2 size={10} className="animate-spin" /> : 
                            isBase64(gridCompositeImg) ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                        
                        {isBackgroundUploading ? '同步中' : 
                            isBase64(gridCompositeImg) ? '未同步' : '已存云端'}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center text-slate-500">
                    <ImageIcon size={32} className="mb-2 opacity-30" />
                    <span className="text-sm">暂无生成的网格图</span>
                </div>
            )}
        </div>

        {/* Slice Button */}
        <button 
            onClick={onSlice}
            disabled={loading || !gridCompositeImg}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
        >
            <Scissors size={16} />
            切割为 9 张图片 (下一步)
        </button>
    </div>
  );
};

export default GridImageEditor;
