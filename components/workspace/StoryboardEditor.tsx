import React, { useState } from 'react';
import { Loader2, Zap, Copy, Check, Grid } from 'lucide-react';
import { Step } from './types';

interface StoryboardEditorProps {
  sbCn: string[];
  setSbCn: (val: string[]) => void;
  sbEn: string[];
  setSbEn: (val: string[]) => void;
  loading: boolean;
  loadingStep: string;
  onGenerateGrid: () => void;
  onGoBack: () => void;
}

const StoryboardEditor: React.FC<StoryboardEditorProps> = ({ 
  sbCn, setSbCn, sbEn, setSbEn, loading, loadingStep, onGenerateGrid, onGoBack 
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (sbCn.length === 0) {
    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            <p className="text-sm text-slate-400">检查并编辑生成的分镜。</p>
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                <Zap size={24} className="mb-3 opacity-50" />
                <p className="text-sm">暂无分镜数据</p>
                <button onClick={onGoBack} className="mt-2 text-brand-400 text-xs hover:underline">去生成</button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
         <p className="text-sm text-slate-400">检查并编辑生成的分镜。</p>
         
         <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
             <table className="w-full text-left border-collapse table-fixed">
                 <thead>
                     <tr className="bg-white/5 border-b border-white/10">
                         <th className="p-3 w-12 text-center text-xs font-bold text-slate-500">#</th>
                         <th className="p-3 border-l border-white/10 text-xs font-bold text-slate-500">
                            <div className="flex items-center justify-between">
                                <span>中文</span>
                                <button 
                                    onClick={() => handleCopy(sbCn.join('\n'), 'col_cn')}
                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    title="复制整列"
                                >
                                    {copied === 'col_cn' ? <Check size={12}/> : <Copy size={12}/>}
                                </button>
                            </div>
                         </th>
                         <th className="p-3 border-l border-white/10 text-xs font-bold text-slate-500">
                             <div className="flex items-center justify-between">
                                <span>英文</span>
                                <button 
                                    onClick={() => handleCopy(sbEn.join('\n'), 'col_en')}
                                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    title="复制整列"
                                >
                                    {copied === 'col_en' ? <Check size={12}/> : <Copy size={12}/>}
                                </button>
                            </div>
                         </th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                     {sbCn.map((frame, i) => (
                         <tr key={i} className="group hover:bg-white/[0.02]">
                             <td className="p-3 text-center text-xs font-mono text-slate-500 bg-black/10">
                                 {i + 1}
                             </td>
                             <td className="p-3 border-l border-white/5 align-top">
                                 <div 
                                    className="text-xs text-slate-300 outline-none focus:text-white focus:bg-white/5 rounded p-1 transition-all leading-relaxed whitespace-pre-wrap"
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                        const newArr = [...sbCn];
                                        newArr[i] = e.currentTarget.textContent || '';
                                        setSbCn(newArr);
                                    }}
                                 >{frame}</div>
                             </td>
                             <td className="p-3 border-l border-white/5 align-top">
                                 <div 
                                    className="text-xs text-slate-400 font-mono outline-none focus:text-white focus:bg-white/5 rounded p-1 transition-all leading-relaxed whitespace-pre-wrap"
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                        const newArr = [...sbEn];
                                        newArr[i] = e.currentTarget.textContent || '';
                                        setSbEn(newArr);
                                    }}
                                 >{sbEn[i]}</div>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>

         <button 
            onClick={onGenerateGrid}
            disabled={loading}
            className="sticky bottom-0 mt-4 w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-200 py-3 rounded-xl text-sm font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
            {loading && loadingStep === 'grid' ? <Loader2 size={16} className="animate-spin" /> : <Grid size={16} />}
            生成 3x3 网格指令
        </button>
    </div>
  );
};

export default StoryboardEditor;
