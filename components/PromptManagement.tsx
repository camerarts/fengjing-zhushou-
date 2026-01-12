import React, { useEffect, useState } from 'react';
import { getSystemPrompt, saveSystemPrompt } from '../services/store';
import { DEFAULT_SYSTEM_PROMPT } from '../constants';
import { RotateCcw, Save, Sparkles, Loader2 } from 'lucide-react';

const PromptManagement: React.FC = () => {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSystemPrompt().then(data => {
      setContent(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveSystemPrompt('storyboard_generate', content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if(window.confirm("重置为默认提示词？")) {
      setSaving(true);
      setContent(DEFAULT_SYSTEM_PROMPT);
      await saveSystemPrompt('storyboard_generate', DEFAULT_SYSTEM_PROMPT);
      setSaving(false);
    }
  };

  if (loading) {
     return <div className="flex h-full items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> 加载配置...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col pb-6">
       <div className="mb-8">
          <h2 className="text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg">系统提示词</h2>
          <p className="text-slate-400 text-lg">配置 AI 角色与生成规则。</p>
      </div>

      <div className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
           <div className="flex items-center gap-2">
               <Sparkles size={16} className="text-purple-400" />
               <h3 className="font-bold text-white text-sm uppercase tracking-wide">全局分镜提示词</h3>
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

        {/* Editor Area */}
        <div className="flex-1 p-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
            <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-full bg-transparent border-0 text-sm md:text-base font-mono text-slate-300 leading-relaxed focus:ring-0 resize-none p-2 placeholder:text-slate-700"
            spellCheck={false}
            placeholder="输入系统提示词指令..."
            />
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-3 bg-black/20 border-t border-white/5 text-xs text-slate-500 flex justify-between">
             <span>模块: storyboard_generate</span>
             <span>存储: Cloudflare Workers KV</span>
        </div>
      </div>
    </div>
  );
};

export default PromptManagement;