import React, { useEffect, useState } from 'react';
import { getSystemPrompt, saveSystemPrompt } from '../services/store';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_NEGATIVE_PROMPT } from '../constants';
import { RotateCcw, Save, Sparkles, Loader2, Film, FileText } from 'lucide-react';

const MODULES = [
  { key: 'storyboard_generate', label: '分镜脚本生成', icon: FileText, default: DEFAULT_SYSTEM_PROMPT },
  { key: 'negative_generate', label: '底片画面生成', icon: Film, default: DEFAULT_NEGATIVE_PROMPT },
];

const PromptManagement: React.FC = () => {
  const [activeModuleKey, setActiveModuleKey] = useState(MODULES[0].key);
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrompt(activeModuleKey);
  }, [activeModuleKey]);

  const loadPrompt = async (key: string) => {
    setLoading(true);
    const data = await getSystemPrompt(key);
    // If no data exists yet (first time), fall back to the module's default
    const def = MODULES.find(m => m.key === key)?.default || '';
    setContent(data === DEFAULT_SYSTEM_PROMPT && key !== 'storyboard_generate' ? def : data); 
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSystemPrompt(activeModuleKey, content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if(window.confirm("重置为默认提示词？")) {
      setSaving(true);
      const def = MODULES.find(m => m.key === activeModuleKey)?.default || '';
      setContent(def);
      await saveSystemPrompt(activeModuleKey, def);
      setSaving(false);
    }
  };

  const activeModule = MODULES.find(m => m.key === activeModuleKey) || MODULES[0];

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-6">
       <div className="mb-8">
          <h2 className="text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg">系统提示词</h2>
          <p className="text-slate-400 text-lg">配置各个功能模块的 AI 角色与生成规则。</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Sidebar Navigation */}
        <div className="w-64 flex flex-col gap-2 shrink-0">
            {MODULES.map(m => (
                <button
                    key={m.key}
                    onClick={() => setActiveModuleKey(m.key)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all border
                        ${activeModuleKey === m.key 
                            ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20' 
                            : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
                        }`}
                >
                    <m.icon size={18} />
                    {m.label}
                </button>
            ))}
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl flex flex-col overflow-hidden">
            {loading ? (
                 <div className="flex-1 flex items-center justify-center text-slate-500">
                    <Loader2 className="animate-spin mr-2"/> 加载配置...
                 </div>
            ) : (
                <>
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">{activeModule.label}规则</h3>
                </div>
                <div className="flex gap-3">
                    <button 
                    onClick={handleReset}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all disabled:opacity-50"
                    >
                    <RotateCcw size={14} />
                    重置
                    </button>
                    <button 
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-xl transition-all shadow-lg ${
                        saved 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-brand-600 hover:bg-brand-500 border border-white/10 shadow-brand-900/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? '保存中' : (saved ? '保存成功' : '保存修改')}
                    </button>
                </div>
                </div>

                {/* Editor */}
                <div className="flex-1 p-6 relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full h-full bg-transparent border-0 text-sm md:text-base font-mono text-slate-300 leading-relaxed focus:ring-0 resize-none p-2 placeholder:text-slate-700"
                        spellCheck={false}
                        placeholder={`输入${activeModule.label}的指令...`}
                    />
                </div>
                
                {/* Footer info */}
                <div className="px-6 py-3 bg-black/20 border-t border-white/5 text-xs text-slate-500 flex justify-between">
                    <span>Key: {activeModuleKey}</span>
                    <span>Storage: Cloudflare KV</span>
                </div>
                </>
            )}
        </div>

      </div>
    </div>
  );
};

export default PromptManagement;