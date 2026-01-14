import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Project } from '../types';
import { getProjectById, saveProject, getSystemPrompt, uploadImage } from '../services/store';
import { generateStoryboardContent, generateImageContent, generateImageFromReference } from '../services/geminiService';
import { GRID_PREFIX_CN, GRID_PREFIX_EN, DEFAULT_NEGATIVE_PROMPT } from '../constants';
import { Loader2, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Step } from './workspace/types';

// Sub-components
import CanvasView from './workspace/CanvasView';
import InputEditor from './workspace/InputEditor';
import StoryboardEditor from './workspace/StoryboardEditor';
import GridEditor from './workspace/GridEditor';
import NegativeEditor from './workspace/NegativeEditor';
import GridImageEditor from './workspace/GridImageEditor';
import SplitEditor from './workspace/SplitEditor';

interface WorkspaceProps {
  projectId?: string;
}

// Utility to convert blob to base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             if (typeof reader.result === 'string') resolve(reader.result);
             else reject(new Error("Empty result from FileReader"));
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(blob);
    });
};

const ProjectWorkspace: React.FC<WorkspaceProps> = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); 
  const [saving, setSaving] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState<string | null>(null);
  const [isBackgroundUploading, setIsBackgroundUploading] = useState(false);

  // Navigation & View State
  const [activeStep, setActiveStep] = useState<Step>('input');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Local state for edits
  const [plan, setPlan] = useState('');
  const [sbCn, setSbCn] = useState<string[]>([]);
  const [sbEn, setSbEn] = useState<string[]>([]);
  const [gridCn, setGridCn] = useState('');
  const [gridEn, setGridEn] = useState('');
  const [negativeImg, setNegativeImg] = useState('');
  const [gridCompositeImg, setGridCompositeImg] = useState('');
  const [splitImgs, setSplitImgs] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;

    setProject(null);
    getProjectById(projectId).then(p => {
        if (p) {
            setProject(p);
            setPlan(p.creativePlan || '');
            setSbCn(p.storyboardZh || []);
            setSbEn(p.storyboardEn || []);
            setGridCn(p.grid3x3Zh || '');
            setGridEn(p.grid3x3En || '');
            setNegativeImg(p.negativeImage || '');
            setGridCompositeImg(p.gridCompositeImage || '');
            setSplitImgs(p.splitImages || []);
            
            // Auto navigate
            if (!p.creativePlan) setActiveStep('input');
            else if (p.storyboardZh.length === 0) setActiveStep('storyboard');
            else if (!p.negativeImage) setActiveStep('negative');
            else if (!p.grid3x3Zh) setActiveStep('grid');
            else if (!p.gridCompositeImage) setActiveStep('grid_image');
            else setActiveStep('split');
            
            if (!p.creativePlan || p.storyboardZh.length === 0) {
               setIsPanelOpen(true);
            }
        }
    });
  }, [projectId]);

  // Robust Fetch Logic
  const fetchImageAsBase64 = async (url: string): Promise<string> => {
      // If it's already data url, return as is
      if (url.startsWith('data:')) return url;

      // 1. Try Direct Fetch (Fastest if CORS is set up)
      try {
          const urlObj = new URL(url);
          urlObj.searchParams.set('t', Date.now().toString()); 
          // Remove custom headers to avoid strict preflight checks
          const res = await fetch(urlObj.toString(), { mode: 'cors', credentials: 'omit' });
          if (res.ok) {
              const blob = await res.blob();
              return await blobToBase64(blob);
          }
      } catch (e) {
          console.warn("Direct fetch failed, attempting proxy...", e);
      }

      // 2. Try Proxy Fetch (Fallback)
      try {
          // Use the server-side proxy which adds correct CORS headers
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`Proxy status: ${res.status}`);
          const blob = await res.blob();
          return await blobToBase64(blob);
      } catch (e: any) {
          throw new Error(`图片读取失败: ${e.message}。请检查网络或 R2 Bucket 配置。`);
      }
  };

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    const updated: Project = {
      ...project,
      creativePlan: plan,
      storyboardZh: sbCn,
      storyboardEn: sbEn,
      grid3x3Zh: gridCn,
      grid3x3En: gridEn,
      negativeImage: negativeImg,
      gridCompositeImage: gridCompositeImg,
      splitImages: splitImgs,
      updatedAt: Date.now()
    };
    await saveProject(updated);
    setProject(updated);
    setSaving(false);
  };

  const handleGenerateStoryboard = async () => {
    if (!plan.trim()) {
        if (!isPanelOpen) setIsPanelOpen(true);
        setActiveStep('input');
        return alert("请输入创意方案。");
    }
    setLoading(true);
    setLoadingStep('storyboard');
    
    try {
      const systemPrompt = await getSystemPrompt('storyboard_generate');
      const res = await generateStoryboardContent(plan, systemPrompt);
      setSbCn(res.cn);
      setSbEn(res.en);
      
      if(project) {
        const updated = { ...project, creativePlan: plan, storyboardZh: res.cn, storyboardEn: res.en, updatedAt: Date.now() };
        await saveProject(updated);
        setProject(updated);
      }
      setActiveStep('storyboard');
      setIsPanelOpen(true);
    } catch (e: any) {
      alert("生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleGenerateGrid = async () => {
    if (sbCn.length === 0) {
        if (!isPanelOpen) setIsPanelOpen(true);
        setActiveStep('storyboard');
        return alert("请先生成分镜列表。");
    }
    setLoading(true);
    setLoadingStep('grid');

    try {
      const cnInstructions = sbCn.map((t, i) => `${i + 1}. 【固定镜头，拍摄角度固定不变】${t}`).join('\n');
      const enInstructions = sbEn.map((t, i) => `${i + 1}. ${t}`).join('\n');
      
      const finalCn = `${GRID_PREFIX_CN}\n${cnInstructions}`;
      const finalEn = `${GRID_PREFIX_EN}\n${enInstructions}`;
      
      setGridCn(finalCn);
      setGridEn(finalEn);

      if(project) {
        const updated = { ...project, grid3x3Zh: finalCn, grid3x3En: finalEn, updatedAt: Date.now() };
        await saveProject(updated);
        setProject(updated);
      }
      setActiveStep('grid');
      setIsPanelOpen(true);
    } catch (e: any) {
      alert("网格生成失败：" + e.message);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleGenerateNegativeImage = async () => {
    if (!plan && sbEn.length === 0) {
         return alert("无法生成图片：缺少创意方案或分镜描述。");
    }
    
    const promptToUse = plan || sbEn.slice(0, 3).join(', ');
    setLoading(true);
    setLoadingStep('negative');

    try {
        const systemPrompt = await getSystemPrompt('negative_generate');
        const finalSystemPrompt = systemPrompt || DEFAULT_NEGATIVE_PROMPT;
        
        const base64Image = await generateImageContent(promptToUse, finalSystemPrompt);
        setNegativeImg(base64Image);
        
        if(project) {
            const tempUpdated = { ...project, negativeImage: base64Image, updatedAt: Date.now() };
            await saveProject(tempUpdated); 
            setProject(tempUpdated);
        }

        setLoading(false);
        setLoadingStep('');

        // Background Upload
        setIsBackgroundUploading(true);
        (async () => {
            try {
                const imageUrl = await uploadImage(base64Image);
                setNegativeImg(imageUrl);
                if(project) {
                    const projectToUpdate = await getProjectById(projectId!) || project;
                    const finalUpdated = { ...projectToUpdate, negativeImage: imageUrl, updatedAt: Date.now() };
                    await saveProject(finalUpdated);
                    setProject(finalUpdated);
                }
            } catch (uploadErr: any) {
                console.warn("Background upload failed", uploadErr);
            } finally {
                setIsBackgroundUploading(false);
            }
        })();

    } catch (e: any) {
        alert("图片生成失败：" + e.message);
        setLoading(false);
        setLoadingStep('');
    }
  };

  const handleImageSelected = async (base64: string) => {
    setNegativeImg(base64);
    setIsBackgroundUploading(true);
    try {
        const imageUrl = await uploadImage(base64);
        setNegativeImg(imageUrl);
        if(project) {
            const updated = { ...project, negativeImage: imageUrl, updatedAt: Date.now() };
            await saveProject(updated);
            setProject(updated);
        }
    } catch (err: any) {
        console.warn("Upload failed", err);
        if(project) {
            const updated = { ...project, negativeImage: base64, updatedAt: Date.now() };
            await saveProject(updated);
            setProject(updated);
        }
    } finally {
        setIsBackgroundUploading(false);
    }
  };

  // Step 5: Generate Grid Image (Composite 3x3)
  const handleGenerateGridImage = async () => {
      if (!negativeImg) return alert("缺少底片(参考图)");
      if (!gridEn) return alert("缺少网格指令");

      setLoading(true);
      setLoadingStep('grid_image');
      setUploadingStatus("正在生成 3x3 大图...");

      try {
        // 1. Robustly get Base64 of the reference image
        const refBase64 = await fetchImageAsBase64(negativeImg);

        // 2. Call Gemini
        const newGridBase64 = await generateImageFromReference(gridEn, refBase64);
        setGridCompositeImg(newGridBase64);
        setLoading(false); // Stop block
        setLoadingStep('');
        setUploadingStatus(null);

        // 3. Background Upload
        setIsBackgroundUploading(true);
        try {
            const imageUrl = await uploadImage(newGridBase64);
            setGridCompositeImg(imageUrl);
            if(project) {
                const updated = { ...project, gridCompositeImage: imageUrl, updatedAt: Date.now() };
                await saveProject(updated);
                setProject(updated);
            }
        } catch(e) {
            console.warn("Grid image upload failed", e);
             if(project) {
                const updated = { ...project, gridCompositeImage: newGridBase64, updatedAt: Date.now() };
                await saveProject(updated);
                setProject(updated);
            }
        } finally {
            setIsBackgroundUploading(false);
        }

      } catch (e: any) {
        alert("生成失败：" + e.message);
        setLoading(false);
        setLoadingStep('');
        setUploadingStatus(null);
      }
  };

  // Step 6: Slice the Grid Image
  const handleSliceGridImage = async () => {
    if (!gridCompositeImg) return;
    setLoading(true);
    setLoadingStep('split'); // Actually loading for the next step, but triggered from prev or this
    setUploadingStatus("正在切割图片...");

    try {
        // Robustly fetch the image first to get a clean base64 string
        // This bypasses Canvas CORS Tainting issues because loading a data-uri is safe
        const sourceBase64 = await fetchImageAsBase64(gridCompositeImg);

        const img = new Image();
        img.src = sourceBase64;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Image load failed for slicing"));
        });

        const pieceWidth = img.width / 3;
        const pieceHeight = img.height / 3;
        
        const splitBase64s: string[] = [];
        const canvas = document.createElement('canvas');
        canvas.width = pieceWidth;
        canvas.height = pieceHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    ctx.clearRect(0, 0, pieceWidth, pieceHeight);
                    try {
                        ctx.drawImage(img, col * pieceWidth, row * pieceHeight, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight);
                        splitBase64s.push(canvas.toDataURL('image/jpeg', 0.95));
                    } catch (e) {
                        throw new Error("Canvas Tainted: Failed to slice image due to security restrictions.");
                    }
                }
            }
        }
        
        setUploadingStatus(`正在上传 9 张切片...`);
        const newSplitUrls: string[] = [];
        
        for(let i=0; i<splitBase64s.length; i++) {
            try {
                const url = await uploadImage(splitBase64s[i]);
                newSplitUrls.push(url);
            } catch(e) {
                newSplitUrls.push(splitBase64s[i]);
            }
        }

        setUploadingStatus(null);
        setSplitImgs(newSplitUrls);
        
        if(project) {
            const updated = { ...project, splitImages: newSplitUrls, updatedAt: Date.now() };
            await saveProject(updated);
            setProject(updated);
        }

        // Navigate to Split view
        setActiveStep('split');

    } catch (e: any) {
        console.error(e);
        alert("切割失败：" + e.message);
    } finally {
        setLoading(false);
        setLoadingStep('');
        setUploadingStatus(null);
    }
  };

  const handleStepClick = (step: Step) => {
    setActiveStep(step);
    setIsPanelOpen(true);
  };

  const handleGenerateStep = (step: Step) => {
      if (step === 'storyboard') handleGenerateStoryboard();
      else if (step === 'grid') handleGenerateGrid();
      else if (step === 'negative') handleGenerateNegativeImage();
      else if (step === 'grid_image') handleGenerateGridImage();
  };

  if (!projectId) return <div className="p-8 text-center text-slate-400">错误：未找到项目ID</div>;
  if (!project) return <div className="p-8 text-center text-slate-400 flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2"/>正在加载项目数据...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-950 font-sans">
      
      {/* 1. Canvas View Component */}
      <CanvasView 
         activeStep={activeStep}
         onStepClick={handleStepClick}
         projectData={{
             hasPlan: !!plan,
             hasStoryboard: sbCn.length > 0,
             hasGrid: !!gridCn,
             hasNegative: !!negativeImg,
             hasGridImage: !!gridCompositeImg,
             hasSplit: splitImgs.length > 0,
             name: project.name
         }}
         loading={loading}
         loadingStep={loadingStep}
         onGenerateStep={handleGenerateStep}
         isSaving={saving}
         onSave={handleSave}
         onPanelToggle={setIsPanelOpen}
      />

      {/* 2. Right Drawer Panel */}
      <div 
        onMouseDown={e => e.stopPropagation()} 
        onClick={(e) => e.stopPropagation()} 
        className={`absolute top-0 right-0 h-full w-full bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transition-all duration-500 ease-out z-40 flex flex-col
          ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
          ${isExpanded ? 'md:w-[840px]' : 'md:w-[420px]'}
        `}
      >
         {/* Uploading Status Overlay */}
         {uploadingStatus && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center animate-fade-in">
                 <Loader2 size={32} className="animate-spin text-brand-500 mb-3" />
                 <p className="text-white font-bold">{uploadingStatus}</p>
                 <p className="text-xs text-slate-400 mt-1">请勿关闭页面</p>
             </div>
         )}

         {/* Expand Toggle */}
         <button
            onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
            }}
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 py-4 px-1 bg-slate-900 border-y border-l border-white/10 rounded-l-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-[-5px_0_15px_rgba(0,0,0,0.2)] z-50 flex items-center justify-center"
            title={isExpanded ? "收起面板" : "展开面板 (2x)"}
         >
             {isExpanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
         </button>

         {/* Panel Header */}
         <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 shrink-0">
             <div className="flex items-center gap-2 overflow-hidden">
                 <span className="font-bold text-white tracking-tight truncate text-sm">
                    {activeStep === 'input' && '创意方案输入'}
                    {activeStep === 'storyboard' && '分镜脚本 (9帧)'}
                    {activeStep === 'grid' && '视觉网格 (3x3)'}
                    {activeStep === 'negative' && '底片管理'}
                    {activeStep === 'grid_image' && '九宫格合成图'}
                    {activeStep === 'split' && '切割后图片'}
                 </span>
             </div>
             <button onClick={() => setIsPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
                 <X size={20} />
             </button>
         </div>

         {/* Panel Content (Switched based on active step) */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
            {activeStep === 'input' && (
                <InputEditor 
                    plan={plan}
                    setPlan={setPlan}
                    loading={loading}
                    loadingStep={loadingStep}
                    onGenerate={handleGenerateStoryboard}
                />
            )}

            {activeStep === 'storyboard' && (
                <StoryboardEditor
                    sbCn={sbCn} setSbCn={setSbCn}
                    sbEn={sbEn} setSbEn={setSbEn}
                    loading={loading}
                    loadingStep={loadingStep}
                    onGenerateGrid={handleGenerateGrid}
                    onGoBack={() => setActiveStep('input')}
                />
            )}

            {activeStep === 'grid' && (
                <GridEditor 
                    gridCn={gridCn} setGridCn={setGridCn}
                    gridEn={gridEn} setGridEn={setGridEn}
                    loading={loading}
                    onRegenerate={handleGenerateGrid}
                    hasStoryboard={sbCn.length > 0}
                />
            )}

            {activeStep === 'negative' && (
                <NegativeEditor 
                    negativeImg={negativeImg}
                    loading={loading}
                    loadingStep={loadingStep}
                    hasPlanOrStoryboard={!!plan || sbEn.length > 0}
                    isBackgroundUploading={isBackgroundUploading}
                    onGenerate={handleGenerateNegativeImage}
                    onImageSelected={handleImageSelected}
                    onSplit={() => setActiveStep('grid_image')} 
                />
            )}

            {activeStep === 'grid_image' && (
                <GridImageEditor
                    gridCompositeImg={gridCompositeImg}
                    loading={loading}
                    loadingStep={loadingStep}
                    hasNegative={!!negativeImg}
                    hasGridInstructions={!!gridEn}
                    isBackgroundUploading={isBackgroundUploading}
                    onGenerate={handleGenerateGridImage}
                    onSlice={handleSliceGridImage}
                />
            )}

            {activeStep === 'split' && (
                <SplitEditor 
                    splitImgs={splitImgs}
                    loading={loading}
                    onResplit={handleSliceGridImage}
                    onGoBack={() => setActiveStep('grid_image')}
                    hasGridComposite={!!gridCompositeImg}
                />
            )}
         </div>
      </div>
      
      {/* Floating Toggle Button */}
      {!isPanelOpen && (
        <button 
            onClick={() => setIsPanelOpen(true)}
            onMouseDown={e => e.stopPropagation()}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-900/30 transition-all hover:scale-110 z-20 animate-fade-in"
        >
            <ChevronRight size={24} className="rotate-180" />
        </button>
      )}

    </div>
  );
};

export default ProjectWorkspace;