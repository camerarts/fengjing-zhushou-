import React, { useEffect, useState } from 'react';
import { getApiKeys, saveApiKey, deleteApiKey } from '../services/store';
import { KeyItem } from '../types';
import { getCurrentUser } from '../services/store';
import { Plus, Trash2, CheckCircle, AlertTriangle, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

const KeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const data = await getApiKeys();
    setKeys(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newKey) return;
    
    const user = getCurrentUser();
    if (!user) return;
    setSaving(true);

    const newItem: KeyItem = {
      id: Date.now().toString(),
      userId: user.id,
      label: newLabel,
      key: newKey,
      isDefault: keys.length === 0,
      createdAt: Date.now()
    };
    
    await saveApiKey(newItem);
    await fetchKeys();
    setNewLabel('');
    setNewKey('');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("确认删除此 API 密钥？")) {
      await deleteApiKey(id);
      fetchKeys();
    }
  };

  const handleSetDefault = async (keyItem: KeyItem) => {
    const updated = { ...keyItem, isDefault: true };
    await saveApiKey(updated);
    fetchKeys();
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg">密钥管理</h2>
        <p className="text-slate-400 text-lg">
          安全管理您的 Gemini API 密钥，用于生成任务。
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 backdrop-blur-md rounded-2xl p-5 mb-8 flex gap-4 items-start shadow-lg shadow-amber-900/10">
        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500">
           <AlertTriangle size={24} />
        </div>
        <div className="text-sm text-amber-100/80 leading-relaxed">
          <p className="font-bold text-amber-500 mb-1 text-base">安全提示</p>
          您的密钥现在存储在 Cloudflare Workers KV 中。
          应用程序将优先使用您的默认密钥。
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Key Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleAddKey} className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl sticky top-6">
                <div className="flex items-center gap-2 mb-6">
                    <ShieldCheck className="text-brand-500" size={20} />
                    <h3 className="text-lg font-bold text-white">添加新密钥</h3>
                </div>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">名称</label>
                        <input 
                        type="text" 
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-500/50 focus:bg-black/40 focus:outline-none transition-all placeholder:text-slate-600"
                        placeholder="例如：我的个人密钥"
                        required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">API 密钥</label>
                        <div className="relative">
                        <input 
                            type={showKeyInput ? "text" : "password"}
                            value={newKey}
                            onChange={e => setNewKey(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-500/50 focus:bg-black/40 focus:outline-none pr-10 transition-all placeholder:text-slate-600 font-mono"
                            placeholder="AIzaSy..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowKeyInput(!showKeyInput)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                            {showKeyInput ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-900/20 hover:shadow-brand-500/20 border border-white/10 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        {saving ? '保存中...' : '安全保存'}
                    </button>
                </div>
            </form>
          </div>

          {/* Key List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
               <div className="flex items-center justify-center py-10 text-slate-500"><Loader2 className="animate-spin mr-2"/> 加载密钥中...</div>
            ) : (
                <>
                {keys.map(k => (
                <div key={k.id} className="group bg-slate-800/40 backdrop-blur-lg border border-white/5 hover:border-white/10 rounded-2xl p-5 flex items-center justify-between transition-all hover:bg-slate-800/60 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${k.isDefault ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20' : 'bg-slate-900/50 text-slate-600 border border-white/5'}`}>
                            <KeyItemIcon active={k.isDefault} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-lg">{k.label}</span>
                            {k.isDefault && (
                                <span className="text-[10px] font-bold bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/20 uppercase tracking-wide">使用中</span>
                            )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-1 bg-black/20 px-2 py-1 rounded inline-block">
                            {k.key.substring(0, 8)} •••• {k.key.substring(k.key.length - 4)}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                    {!k.isDefault && (
                        <button 
                        onClick={() => handleSetDefault(k)}
                        className="text-xs font-semibold text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                        >
                        设为默认
                        </button>
                    )}
                    <button 
                        onClick={() => handleDelete(k.id)}
                        className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                    </div>
                </div>
                ))}
                
                {keys.length === 0 && (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-3xl bg-slate-900/20">
                    <p>未找到密钥。请添加一个以开始生成。</p>
                </div>
                )}
                </>
            )}
          </div>
      </div>
    </div>
  );
};

const KeyItemIcon = ({ active }: { active: boolean }) => {
  if (active) return <CheckCircle size={24} />;
  return <div className="w-5 h-5 rounded-full border-2 border-current opacity-50" />;
};

export default KeyManagement;