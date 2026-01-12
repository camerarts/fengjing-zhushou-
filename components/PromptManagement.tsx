import React, { useEffect, useState } from 'react';
import { getSystemPrompt, saveSystemPrompt } from '../services/store';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_NEGATIVE_PROMPT } from '../constants';
import { RotateCcw, Save, Sparkles, Loader2, Film, FileText, Settings2, Edit3 } from 'lucide-react';
import GlassModal from './GlassModal';

const MODULES = [
  { 
    key: 'storyboard_generate', 
    label: '分镜脚本生成', 
    icon: FileText, 
    default: DEFAULT_SYSTEM_PROMPT,
    description: '控制 AI 如何将创意方案拆解为 9 个具体的镜头描述（中英文）。',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  { 
    key: 'negative_generate', 
    label: '底片画面生成', 
    icon: Film, 
    default: DEFAULT_NEGATIVE_PROMPT,
    description: '定义 AI 生成 3x3 网格原图时的风格、宽高比及构图规则。',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  },
];

const PromptManagement: React.FC = () => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModuleKey, setActiveModuleKey] = useState<string | null>(null);
  
  // Editor State
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load prompt when modal opens
  useEffect(() => {
    if (activeModuleKey && isModalOpen) {
        loadPrompt(activeModuleKey);
    }
  }, [activeModuleKey, isModalOpen]);

  const loadPrompt = async (key: string) => {
    setLoading(true);
    setSaved(false);
    const data = await getSystemPrompt(key);
    // If no data exists yet (first time), fall back to the module's default
    const def = MODULES.find(m => m.key === key)?.default || '';
    setContent(data === DEFAULT_SYSTEM_PROMPT && key !== 'storyboard_generate' ? def : data); 
    setLoading(false);
  };

  const handleOpenEditor = (key: string) => {
    setActiveModuleKey(key);
    setIsModalOpen(true);
  };

  const handleCloseEditor = () => {
    if (!saving) {
        setIsModalOpen(false);
        setActiveModuleKey(null);
    }
  };

  const handleSave = async () => {
    if (!activeModuleKey) return;
    setSaving(true);
    await saveSystemPrompt(activeModuleKey, content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if (!activeModuleKey) return;
    if(window.confirm("确认重置为系统默认提示词？当前修改将丢失。")) {
      setSaving(true);
      const def = MODULES.find(m => m.key === activeModuleKey)?.default || '';
      setContent(def);
      await saveSystemPrompt(activeModuleKey, def);
      setSaving(false);
    }
  };

  const activeModule = MODULES.find(m => m.key === activeModuleKey);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-6">
       <div className="mb-10">
          <h2 className="text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg">系统提示词</h2>
          <p className="text-slate-400 text-lg">配置各个功能模块的 AI 角色与生成规则。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULES.map((module) => (
            <div 
                key={module.key}
                onClick={() => handleOpenEditor(module.key)}
                className="group relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 cursor-pointer hover:border-white/20 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
            >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-inner border ${module.bg} ${module.color} ${module.border}`}>
                    <module.icon size={28} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-brand-300 transition-colors">
                    {module.label}
                </h3>
                
                <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-1">
                    {module.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[10px] font-mono text-slate-600 uppercase">Key: {module.key.split('_')[0]}</span>
                    <button className="flex items-center gap-2 text-xs font-bold text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-white/5 group-hover:border-white/20">
                        <Settings2 size={14} />
                        配置
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* Editor Modal */}
      <GlassModal 
        isOpen={isModalOpen} 
        onClose={handleCloseEditor} 
        title={activeModule ? `${activeModule.label}规则配置` : '配置提示词'}
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col h-[60vh]">
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    <Loader2 className="animate-spin mr-2"/> 正在从云端同步配置...
                </div>
            ) : (
                <>
                   {/* Editor Toolbar */}
                   <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Edit3 size={14} />
                            <span>编辑系统指令 (System Instruction)</span>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleReset}
                                disabled={saving}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all disabled:opacity-50"
                            >
                                <RotateCcw size={14} />
                                重置默认
                            </button>
                        </div>
                   </div>

                   {/* Textarea */}
                   <div className="flex-1 bg-black/30 rounded-xl border border-white/10 p-4 relative focus-within:ring-1 focus-within:ring-brand-500/50 transition-all">
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full h-full bg-transparent border-0 text-sm md:text-base font-mono text-slate-300 leading-relaxed focus:ring-0 resize-none p-0 placeholder:text-slate-700"
                            spellCheck={false}
                            placeholder="输入系统提示词..."
                        />
                   </div>

                   {/* Footer Actions */}
                   <div className="mt-6 flex items-center justify-end gap-3">
                        <button 
                            onClick={handleCloseEditor}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg ${
                                saved 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-brand-600 hover:bg-brand-500 border border-white/10 shadow-brand-900/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? '保存中...' : (saved ? '已保存' : '保存修改')}
                        </button>
                   </div>
                </>
            )}
        </div>
      </GlassModal>

    </div>
  );
};

export default PromptManagement;