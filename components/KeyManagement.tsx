import React, { useEffect, useState } from 'react';
import { getApiKeys, saveApiKey, deleteApiKey, getModels, saveModel, deleteModel } from '../services/store';
import { KeyItem, ModelItem, ModelType } from '../types';
import { getCurrentUser } from '../services/store';
import { Plus, Trash2, CheckCircle, Eye, EyeOff, ShieldCheck, Loader2, Bot, Cpu, Image as ImageIcon, Type as TypeIcon } from 'lucide-react';

const KeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  
  // Key Form
  const [newKey, setNewKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  // Model Form
  const [newModelId, setNewModelId] = useState('');
  const [newModelType, setNewModelType] = useState<ModelType>('text');

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [savingModel, setSavingModel] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [kData, mData] = await Promise.all([getApiKeys(), getModels()]);
    setKeys(kData);
    setModels(mData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Key Handlers ---
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey) return;
    
    const user = getCurrentUser();
    if (!user) return;
    setSavingKey(true);

    const newItem: KeyItem = {
      id: Date.now().toString(),
      userId: user.id,
      key: newKey,
      isDefault: keys.length === 0,
      createdAt: Date.now()
    };
    
    await saveApiKey(newItem);
    const kData = await getApiKeys();
    setKeys(kData);
    setNewKey('');
    setSavingKey(false);
  };

  const handleDeleteKey = async (id: string) => {
    if (window.confirm("确认删除此 API 密钥？")) {
      await deleteApiKey(id);
      const kData = await getApiKeys();
      setKeys(kData);
    }
  };

  const handleSetDefaultKey = async (keyItem: KeyItem) => {
    const updated = { ...keyItem, isDefault: true };
    await saveApiKey(updated);
    const kData = await getApiKeys();
    setKeys(kData);
  };

  // --- Model Handlers ---
  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelId) return;

    const user = getCurrentUser();
    if (!user) return;
    setSavingModel(true);

    // Check if this is the first model of this type
    const existingTypeModels = models.filter(m => (m.type || 'text') === newModelType);

    const newItem: ModelItem = {
      id: Date.now().toString(),
      userId: user.id,
      modelId: newModelId,
      type: newModelType,
      isDefault: existingTypeModels.length === 0,
      createdAt: Date.now()
    };

    await saveModel(newItem);
    const mData = await getModels();
    setModels(mData);
    setNewModelId('');
    setSavingModel(false);
  };

  const handleDeleteModel = async (id: string) => {
    if (window.confirm("确认删除此模型配置？")) {
      await deleteModel(id);
      const mData = await getModels();
      setModels(mData);
    }
  };

  const handleSetDefaultModel = async (modelItem: ModelItem) => {
    const updated = { ...modelItem, isDefault: true };
    await saveModel(updated);
    const mData = await getModels();
    setModels(mData);
  };

  // Filter models by type
  const textModels = models.filter(m => (m.type || 'text') === 'text');
  const imageModels = models.filter(m => m.type === 'image');

  const ModelList = ({ list, icon: Icon, typeLabel }: { list: ModelItem[], icon: any, typeLabel: string }) => (
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-2">
            <Icon size={14} /> {typeLabel}
        </h4>
        {list.map(m => (
        <div key={m.id} className="group bg-slate-800/40 backdrop-blur-lg border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-slate-800/60 shadow-md">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${m.isDefault ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-slate-900/50 text-slate-600 border border-white/5'}`}>
                    {m.isDefault ? <CheckCircle size={18} /> : <Cpu size={18} className="opacity-30" />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm font-mono">{m.modelId}</span>
                    {m.isDefault && <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase">默认</span>}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
            {!m.isDefault && (
                <button 
                onClick={() => handleSetDefaultModel(m)}
                className="text-[10px] font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                >
                设为默认
                </button>
            )}
            <button 
                onClick={() => handleDeleteModel(m.id)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
                <Trash2 size={16} />
            </button>
            </div>
        </div>
        ))}
        {list.length === 0 && (
            <div className="text-center py-4 text-slate-600 text-xs border border-dashed border-white/5 rounded-xl">暂无{typeLabel}配置</div>
        )}
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg">资源管理</h2>
        <p className="text-slate-400 text-lg">
          管理您的 API 密钥与自定义 AI 模型配置。
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          
          {/* --- SECTION: API KEYS --- */}
          <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                 <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400"><ShieldCheck size={20}/></div>
                 <h3 className="text-xl font-bold text-white">API 密钥</h3>
              </div>
              
              {/* Add Key Form */}
              <form onSubmit={handleAddKey} className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-xl">
                  <div className="space-y-4">
                      <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">添加新密钥</label>
                            <div className="relative">
                                <input 
                                    type={showKeyInput ? "text" : "password"}
                                    value={newKey}
                                    onChange={e => setNewKey(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-500/50 focus:bg-black/40 focus:outline-none pr-10 transition-all placeholder:text-slate-600 font-mono"
                                    placeholder="AIzaSy..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKeyInput(!showKeyInput)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showKeyInput ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                      </div>
                      <button 
                          type="submit"
                          disabled={savingKey || !newKey}
                          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-900/20 hover:shadow-brand-500/20 border border-white/10 disabled:opacity-50"
                      >
                          {savingKey ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          添加密钥
                      </button>
                  </div>
              </form>

              {/* Key List */}
              <div className="space-y-3">
                {loading ? (
                   <div className="flex items-center justify-center py-6 text-slate-500"><Loader2 className="animate-spin mr-2"/> 加载中...</div>
                ) : (
                    <>
                    {keys.map(k => (
                    <div key={k.id} className="group bg-slate-800/40 backdrop-blur-lg border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-slate-800/60 shadow-md">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${k.isDefault ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20' : 'bg-slate-900/50 text-slate-600 border border-white/5'}`}>
                                {k.isDefault ? <CheckCircle size={18} /> : <div className="w-4 h-4 rounded-full border-2 border-current opacity-30" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm font-mono">
                                        {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 6)}
                                    </span>
                                    {k.isDefault && <span className="text-[9px] font-bold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 uppercase">默认</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                        {!k.isDefault && (
                            <button 
                            onClick={() => handleSetDefaultKey(k)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                            >
                            设为默认
                            </button>
                        )}
                        <button 
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                        </div>
                    </div>
                    ))}
                    
                    {keys.length === 0 && !loading && (
                      <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-white/5 rounded-2xl">暂无密钥</div>
                    )}
                    </>
                )}
              </div>
          </div>

          {/* --- SECTION: AI MODELS --- */}
          <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                 <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Bot size={20}/></div>
                 <h3 className="text-xl font-bold text-white">AI 模型管理</h3>
              </div>

              {/* Add Model Form */}
              <form onSubmit={handleAddModel} className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-xl">
                  <div className="space-y-4">
                      <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">添加模型</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input 
                                        type="text"
                                        value={newModelId}
                                        onChange={e => setNewModelId(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500/50 focus:bg-black/40 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                                        placeholder="例如: gemini-3-flash"
                                    />
                                </div>
                                <div className="flex bg-black/20 rounded-xl p-1 border border-white/10 shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => setNewModelType('text')}
                                        className={`px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${newModelType === 'text' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                        title="文本模型"
                                    >
                                        <TypeIcon size={14} /> 文本
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setNewModelType('image')}
                                        className={`px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${newModelType === 'image' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                        title="图像模型"
                                    >
                                        <ImageIcon size={14} /> 图像
                                    </button>
                                </div>
                            </div>
                      </div>
                      <button 
                          type="submit"
                          disabled={savingModel || !newModelId}
                          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-900/20 hover:shadow-purple-500/20 border border-white/10 disabled:opacity-50"
                      >
                          {savingModel ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          添加模型
                      </button>
                  </div>
              </form>

              {/* Model Lists */}
              <div className="space-y-6">
                {loading ? (
                   <div className="flex items-center justify-center py-6 text-slate-500"><Loader2 className="animate-spin mr-2"/> 加载中...</div>
                ) : (
                    <>
                        <ModelList list={textModels} icon={TypeIcon} typeLabel="文本生成模型 (Text)" />
                        <ModelList list={imageModels} icon={ImageIcon} typeLabel="图片生成模型 (Image)" />
                        
                        {models.length === 0 && !loading && (
                            <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-white/5 rounded-2xl">
                                暂无模型配置，将使用系统默认模型
                            </div>
                        )}
                    </>
                )}
              </div>
          </div>

      </div>
    </div>
  );
};

export default KeyManagement;