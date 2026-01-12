import React, { useRef } from 'react';
import { Loader2, Wand2, Upload, Clipboard, Scissors, AlertTriangle, CheckCircle } from 'lucide-react';

interface NegativeEditorProps {
  negativeImg: string;
  loading: boolean;
  loadingStep: string;
  hasPlanOrStoryboard: boolean;
  isBackgroundUploading: boolean;
  onGenerate: () => void;
  onImageSelected: (base64: string) => void;
  onSplit: () => void;
}

const NegativeEditor: React.FC<NegativeEditorProps> = ({ 
  negativeImg, loading, loadingStep, hasPlanOrStoryboard, isBackgroundUploading, 
  onGenerate, onImageSelected, onSplit 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBase64 = (str: string) => str.startsWith('data:');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            onImageSelected(base64);
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePaste = async () => {
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const type = item.types.find(t => t.startsWith('image/'));
            if (type) {
                const blob = await item.getType(type);
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target?.result as string;
                    onImageSelected(base64);
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
        alert("剪切板中没有找到图片。");
    } catch (err) {
        console.error("Paste error:", err);
        alert("无法访问剪切板，请检查浏览器权限设置。");
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
        <p className="text-sm text-slate-400 mb-4">
            生成或上传单张<span className="text-white font-bold">锚点图 (9:16)</span>，用于固定相机的参数、光线与房间几何结构。<br/>
            <span className="text-xs text-brand-400">图片将自动上传至 R2 云端存储。</span>
        </p>

        {/* Generate Button Row */}
        <div className="mb-4 space-y-2">
                <button 
                    onClick={onGenerate}
                    disabled={loading || !hasPlanOrStoryboard}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                >
                    {loading && loadingStep === 'negative' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    AI 生成锚点图 (单张)
                </button>
                {!hasPlanOrStoryboard && <p className="text-[10px] text-red-400 mt-1 text-center">需先输入创意方案</p>}
        </div>
        
        <div 
            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all relative overflow-hidden
                ${negativeImg ? 'border-white/20 bg-black/40' : 'border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer'}
            `}
            onClick={() => !negativeImg && fileInputRef.current?.click()}
        >
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
            />

            {negativeImg ? (
                <div className="w-full h-full relative group">
                    {/* Added crossOrigin="anonymous" to detect CORS issues visually */}
                    <img 
                        src={negativeImg} 
                        alt="Negative" 
                        crossOrigin="anonymous" 
                        className="w-full h-full object-contain" 
                        onError={(e) => {
                            // Optional: could add visual indicator of error here
                            // e.currentTarget.style.opacity = '0.5';
                        }}
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                        >
                            本地上传 (覆盖)
                        </button>
                    </div>
                    <div className={`absolute top-2 right-2 backdrop-blur rounded px-2 py-1 text-[10px] text-white flex items-center gap-1 ${
                        isBackgroundUploading ? 'bg-blue-500/80' : 
                        isBase64(negativeImg) ? 'bg-orange-500/80' : 'bg-green-500/90'
                    }`}>
                        {isBackgroundUploading ? <Loader2 size={10} className="animate-spin" /> : 
                            isBase64(negativeImg) ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                        
                        {isBackgroundUploading ? '同步中' : 
                            isBase64(negativeImg) ? '未同步' : '已存云端'}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center text-slate-500">
                    <Upload size={32} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium">点击上传图片</span>
                    <span className="text-xs opacity-50 mt-1">支持 JPG, PNG</span>
                </div>
            )}
        </div>
        
        {/* Paste Button */}
        <button 
            onClick={handlePaste}
            disabled={loading}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10"
            title="粘贴剪切板中的图片"
        >
            <Clipboard size={14} />
            粘贴剪切板图片
        </button>

        <button 
            onClick={onSplit}
            disabled={!negativeImg}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Scissors size={16} />
            去切分图片
        </button>
    </div>
  );
};

export default NegativeEditor;