import { GoogleGenAI, Type } from "@google/genai";
import { getDefaultKey, getDefaultModel } from './store';
import { ModelType } from '../types';

// Helper to get client
const getClient = async (apiKey?: string) => {
  // Priority 1: Direct argument (e.g. passed from a specific temporary input)
  // 最高优先级：直接传入的参数（用于临时覆盖）
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }

  // Priority 2: Stored Key from Resource Management (The "Frontend Configured" Key)
  // 第二优先级：资源管理中配置的密钥 (用户在前端界面设置的)
  const storedKey = await getDefaultKey();
  if (storedKey) {
    // console.log("Using Resource Management API Key");
    return new GoogleGenAI({ apiKey: storedKey });
  }

  // Priority 3: Environment Variable (Fallback / System Key)
  // 第三优先级：环境变量 (系统预设兜底)
  const envKey = process.env.API_KEY;
  if (envKey) {
    // console.log("Using Environment API Key");
    return new GoogleGenAI({ apiKey: envKey });
  }

  throw new Error("未找到 API 密钥。请在“资源管理”页面的“密钥”中添加一个，或联系管理员配置环境变量。");
};

// Helper to get model ID by type
const getModelId = async (type: ModelType) => {
    const storedModel = await getDefaultModel(type);
    if (storedModel) return storedModel;
    
    // Fallbacks if no model configured
    return type === 'image' 
        ? 'gemini-2.5-flash-image'
        : 'gemini-3-flash-preview';
};

export const generateStoryboardContent = async (
  creativePlan: string,
  systemPrompt: string,
  userApiKey?: string
): Promise<{ cn: string[]; en: string[] }> => {
  const client = await getClient(userApiKey);
  const modelId = await getModelId('text'); // Use text model

  const prompt = `
    基于以下创意方案，生成 9 个独特的分镜画面描述。
    
    创意方案：
    "${creativePlan}"

    要求：
    1. 严格输出 9 个分镜。
    2. 分别提供中文 (cn) 和英文 (en) 的画面描述。
    3. 描述必须具有画面感、细节丰富，可直接用于 AI 绘画。
  `;

  // Define schema using Type enum from the SDK
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      cn: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "9 个中文分镜描述的数组。",
      },
      en: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "9 个英文分镜描述的数组。",
      },
    },
    required: ["cn", "en"],
  };

  try {
    const response = await client.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini 返回内容为空");
    
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error", text);
      throw new Error("模型返回的不是有效的 JSON 格式");
    }

    // Validation
    if (!Array.isArray(json.cn) || !Array.isArray(json.en) || json.cn.length === 0) {
       throw new Error("模型返回格式无效，缺少数组数据");
    }
    
    // Ensure 9 frames
    return {
      cn: json.cn.slice(0, 9),
      en: json.en.slice(0, 9)
    };

  } catch (error: any) {
    console.error("Gemini Storyboard Generation Error:", error);
    if (error.message?.includes("403") || error.message?.includes("API_KEY")) {
       throw new Error("API 密钥无效或无访问权限。请检查您的密钥配置。");
    }
    throw error;
  }
};

export const generateImageContent = async (
    prompt: string,
    systemPrompt: string,
    userApiKey?: string
): Promise<string> => {
    const client = await getClient(userApiKey);
    const modelId = await getModelId('image'); // Use image model

    try {
        const response = await client.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                systemInstruction: systemPrompt,
                // responseMimeType is NOT supported for nano banana series
                // responseSchema is NOT supported for nano banana series
            }
        });

        // The output response may contain both image and text parts; iterate to find image.
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const base64EncodeString = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    return `data:${mimeType};base64,${base64EncodeString}`;
                }
            }
        }
        
        throw new Error("生成的响应中未包含图片数据");

    } catch (error: any) {
        console.error("Gemini Image Generation Error:", error);
         if (error.message?.includes("403") || error.message?.includes("API_KEY")) {
            throw new Error("API 密钥无效或无访问权限。请检查您的密钥配置。");
         }
         throw error;
    }
};