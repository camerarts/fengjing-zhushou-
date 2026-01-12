import React, { useEffect, useRef } from 'react';
import { Loader2, Zap } from 'lucide-react';

interface InputEditorProps {
  plan: string;
  setPlan: (val: string) => void;
  loading: boolean;
  loadingStep: string;
  onGenerate: () => void;
}

const InputEditor: React.FC<InputEditorProps> = ({ plan, setPlan, loading, loadingStep, onGenerate }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
        <p className="text-sm text-slate-400 mb-4">
            输入您的视频创意、剧情大纲或视觉风格，AI 将自动拆解为 9 个关键帧。
        </p>
        <div className="flex-1 bg-black/20 rounded-2xl border border-white/10 p-4 mb-4 relative focus-within:ring-1 focus-within:ring-brand-500/50 transition-all">
            <textarea 
                ref={inputRef}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="例如：一个赛博朋克风格的雨夜，霓虹灯闪烁，主角独自走在街道上..."
                className="w-full h-full bg-transparent text-slate-200 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed text-sm"
            />
        </div>
        <button 
          onClick={onGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading && loadingStep === 'storyboard' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          生成视频分镜
        </button>
    </div>
  );
};

export default InputEditor;
