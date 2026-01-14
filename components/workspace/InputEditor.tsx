import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Zap, History, Trash2, ChevronDown, Sparkles, Copy, Check } from 'lucide-react';

interface InputEditorProps {
  plan: string;
  setPlan: (val: string) => void;
  loading: boolean;
  loadingStep: string;
  onGenerate: () => void;
}

// 预设选项
const STYLES = [
  { value: '', label: '默认风格 (Default)' },
  { value: 'Cinematic, Photorealistic, 8k', label: '写实电影 (Cinematic)' },
  { value: 'Cyberpunk, Neon lights, Futuristic', label: '赛博朋克 (Cyberpunk)' },
  { value: 'Japanese Anime style, Studio Ghibli', label: '日系动漫 (Anime)' },
  { value: 'Pixar style, 3D render, C4D', label: '皮克斯 3D (Pixar)' },
  { value: 'Chinese Ink painting, Watercolor', label: '水墨国风 (Ink)' },
  { value: 'Black and white photography, Noir', label: '黑白摄影 (B&W)' },
];

const VIEWS = [
  { value: '', label: '默认视角 (Default)' },
  { value: 'Wide angle shot', label: '广角远景 (Wide)' },
  { value: 'Medium shot', label: '中景 (Medium)' },
  { value: 'Close-up shot', label: '特写 (Close-up)' },
  { value: 'Drone view, Aerial shot', label: '航拍俯视 (Aerial)' },
  { value: 'Low angle shot', label: '低角度仰视 (Low Angle)' },
];

const LIGHTING = [
  { value: '', label: '默认光影 (Default)' },
  { value: 'Natural lighting, Sunlight', label: '自然光 (Natural)' },
  { value: 'Cinematic lighting, Volumetric fog', label: '电影布光 (Cinematic)' },
  { value: 'Rembrandt lighting', label: '伦勃朗光 (Rembrandt)' },
  { value: 'Neon lighting, Glowing', label: '霓虹发光 (Neon)' },
];

const InputEditor: React.FC<InputEditorProps> = ({ plan, setPlan, loading, loadingStep, onGenerate }) => {
  // 本地状态管理
  const [header, setHeader] = useState('High quality, Masterpiece, 8k resolution');
  const [body, setBody] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedView, setSelectedView] = useState('');
  const [selectedLight, setSelectedLight] = useState('');
  
  // 历史记录状态
  const [history, setHistory] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 初始化：如果已有 plan，尝试回填到 Body (简化处理，不反向解析)
  useEffect(() => {
    if (plan && !body) {
        // 简单的判断：如果 plan 看起来像是一个完整的组合提示词，我们尽量保留它在 body 或 plan 中
        // 这里为了用户体验，首次加载时将 plan 视为 body
        setBody(plan);
    }
    
    // 加载本地历史记录
    const savedHistory = localStorage.getItem('sb_prompt_history');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history");
        }
    }
  }, []);

  // 监听输入变化，实时合成最终 Prompt
  useEffect(() => {
    const parts = [
        header.trim(),
        body.trim(),
        selectedStyle,
        selectedView,
        selectedLight
    ].filter(Boolean); // 过滤空字符串

    const combined = parts.join(', ');
    
    // 只有当组合后的内容与当前的 plan 不同时才更新，避免循环
    if (combined !== plan) {
        setPlan(combined);
    }
  }, [header, body, selectedStyle, selectedView, selectedLight]);

  // 生成处理
  const handleGenerateClick = () => {
    if (!plan.trim()) return;
    
    // 保存到历史记录
    const newHistory = [plan, ...history].slice(0, 10); // 只保留最近10条
    setHistory(newHistory);
    localStorage.setItem('sb_prompt_history', JSON.stringify(newHistory));

    onGenerate();
  };

  const handleDeleteHistory = (index: number) => {
      const newHistory = history.filter((_, i) => i !== index);
      setHistory(newHistory);
      localStorage.setItem('sb_prompt_history', JSON.stringify(newHistory));
  };

  const handleUseHistory = (text: string) => {
      setBody(text);
      // 重置其他选项以免冲突，或者保留由用户决定？这里重置参数以匹配"恢复"的感觉
      setHeader('');
      setSelectedStyle('');
      setSelectedView('');
      setSelectedLight('');
  };
  
  const handleCopy = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in">
        
        {/* 左侧：配置与输入 */}
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* 参数设置 (下拉菜单) */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-4 text-slate-300 font-bold text-sm">
                    <Sparkles size={16} className="text-purple-400" />
                    参数设置
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <div className="relative group">
                        <select 
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className="w-full appearance-none bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 focus:bg-black/40 transition-all cursor-pointer hover:border-white/20"
                        >
                            {STYLES.map(opt => <option key={opt.label} value={opt.value} className="bg-slate-900">{opt.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-slate-300" size={16} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                            <select 
                                value={selectedView}
                                onChange={(e) => setSelectedView(e.target.value)}
                                className="w-full appearance-none bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 focus:bg-black/40 transition-all cursor-pointer hover:border-white/20"
                            >
                                {VIEWS.map(opt => <option key={opt.label} value={opt.value} className="bg-slate-900">{opt.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-slate-300" size={16} />
                        </div>
                        <div className="relative group">
                            <select 
                                value={selectedLight}
                                onChange={(e) => setSelectedLight(e.target.value)}
                                className="w-full appearance-none bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 focus:bg-black/40 transition-all cursor-pointer hover:border-white/20"
                            >
                                {LIGHTING.map(opt => <option key={opt.label} value={opt.value} className="bg-slate-900">{opt.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-slate-300" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 输入区域 */}
            <div className="flex-1 flex flex-col gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">提示词抬头 (Header)</label>
                    <input 
                        type="text"
                        value={header}
                        onChange={(e) => setHeader(e.target.value)}
                        placeholder="例如：Cinematic, 8k resolution..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-brand-300 focus:outline-none focus:border-brand-500/50 transition-all placeholder:text-slate-600"
                    />
                </div>
                
                <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">正文描述 (Body)</label>
                    <textarea 
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="输入您的视频创意、剧情大纲或视觉风格，例如：一个赛博朋克风格的雨夜，霓虹灯闪烁，主角独自走在街道上..."
                        className="w-full flex-1 min-h-[160px] bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 transition-all placeholder:text-slate-600 resize-none leading-relaxed custom-scrollbar"
                    />
                </div>
            </div>
        </div>

        {/* 右侧：预览与历史 */}
        <div className="w-full md:w-[320px] lg:w-[380px] flex flex-col gap-4 border-l border-white/5 pl-0 md:pl-6 pt-6 md:pt-0 border-t md:border-t-0">
            
            {/* 最终提示词预览 */}
            <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-brand-400 mb-1">创意提示词 (预览)</label>
                <div className="bg-brand-900/10 border border-brand-500/20 rounded-2xl p-4 min-h-[100px] max-h-[150px] overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-brand-100 leading-relaxed font-mono break-words">
                        {plan || <span className="opacity-30 italic">等待输入...</span>}
                    </p>
                </div>
            </div>

            {/* 生成按钮 */}
            <button 
                onClick={handleGenerateClick}
                disabled={loading || !plan.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-4 rounded-xl text-sm font-bold shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                {loading && loadingStep === 'storyboard' ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                {loading ? '正在分析...' : '生成视频分镜'}
            </button>

            {/* 历史记录 */}
            <div className="flex-1 flex flex-col overflow-hidden mt-2">
                <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <History size={14} /> 最近创作
                </div>
                
                {history.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs border border-dashed border-white/5 rounded-2xl">
                        暂无历史记录
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {history.map((item, idx) => (
                            <div key={idx} className="group bg-slate-800/40 hover:bg-slate-700/50 border border-white/5 rounded-xl p-3 transition-all">
                                <p className="text-[11px] text-slate-300 line-clamp-3 mb-2 leading-relaxed">
                                    {item}
                                </p>
                                <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2 mt-1">
                                    <button 
                                        onClick={() => handleCopy(item, idx)}
                                        className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title="复制"
                                    >
                                        {copiedIndex === idx ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                                    </button>
                                    <button 
                                        onClick={() => handleUseHistory(item)}
                                        className="text-[10px] bg-white/5 hover:bg-brand-500/20 text-slate-400 hover:text-brand-300 px-2 py-1 rounded transition-colors"
                                    >
                                        应用
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteHistory(idx)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="删除"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default InputEditor;
