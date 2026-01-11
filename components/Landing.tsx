import React from 'react';
import { ArrowRight, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';

interface LandingProps {
  onLogin: () => void;
}

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="p-8 rounded-2xl bg-slate-800/40 backdrop-blur-xl border border-white/10 hover:border-brand-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-900/20">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-white/5 text-brand-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-[0_0_20px_rgba(14,165,233,0.1)]">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

const Landing: React.FC<LandingProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full z-10">
        <div className="font-bold text-2xl tracking-tight flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_10px_#0ea5e9]"></div>
           <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">视频分镜助手</span>
        </div>
        <button 
          onClick={onLogin}
          className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all text-sm font-medium hover:border-white/20"
        >
          登录
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 mt-10 md:mt-0 relative">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold tracking-wide uppercase mb-8 shadow-[0_0_15px_rgba(14,165,233,0.15)] animate-fade-in">
          <Sparkles size={12} />
          <span>基于 Gemini 3.0 驱动</span>
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white mb-8 leading-tight drop-shadow-2xl">
          将创意转化为 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-purple-300 to-brand-400 animate-pulse">
             视觉奇迹
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-12 leading-relaxed">
          从创意方案到 9 帧分镜仅需几秒钟。<br className="hidden md:block"/>
          一键生成适用于 AI 视频工作流的专业提示词。
        </p>

        <button 
          onClick={onLogin}
          className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white transition-all duration-300 bg-brand-600 rounded-full focus:outline-none hover:bg-brand-500 hover:scale-105 shadow-[0_0_40px_rgba(14,165,233,0.3)] hover:shadow-[0_0_60px_rgba(14,165,233,0.5)] border border-white/20"
        >
          <span className="relative z-10 flex items-center">
            免费开始创作
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        </button>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-32 mb-16 px-4">
          <FeatureCard 
            icon={Layers}
            title="项目工作区"
            desc="在专用的玻璃拟态工作区组织您的创意。高效管理多个分镜项目。"
          />
          <FeatureCard 
            icon={ImageIcon}
            title="9 帧分镜生成"
            desc="即时生成 9 个专为视频定制的中英文分镜画面描述。"
          />
          <FeatureCard 
            icon={Sparkles}
            title="3x3 网格就绪"
            desc="一键格式化提示词（3x3 网格），兼容主流生图模型。"
          />
        </div>
      </main>
      
      <footer className="py-8 text-center text-slate-500 text-xs border-t border-white/5 bg-slate-950/30 backdrop-blur-sm">
        <p>© 2024 视频分镜助手 (Storyboard Assistant). 保留所有权利。</p>
      </footer>
    </div>
  );
};

export default Landing;