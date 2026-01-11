import { GoogleGenAI, Type, Schema } from "@google/genai";
import { getDefaultKey } from './store';

// Helper to get client
const getClient = (apiKey?: string) => {
  // Priority: 1. Passed key, 2. Stored User Key, 3. Env Key (fallback for devs)
  const key = apiKey || getDefaultKey() || process.env.API_KEY;
  if (!key) {
    throw new Error("未找到 API 密钥。请在“密钥管理”中添加一个。");
  }
  return new GoogleGenAI({ apiKey: key });
};

export const generateStoryboardContent = async (
  creativePlan: string,
  systemPrompt: string,
  userApiKey?: string
): Promise<{ cn: string[]; en: string[] }> => {
  const client = getClient(userApiKey);

  const prompt = `
    基于以下创意方案，生成 9 个独特的分镜画面描述。
    
    创意方案：
    "${creativePlan}"

    要求：
    1. 严格输出 9 个分镜。
    2. 分别提供中文 (cn) 和英文 (en) 的画面描述。
    3. 描述必须具有画面感、细节丰富，可直接用于 AI 绘画。
  `;

  const responseSchema: Schema = {
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
      model: 'gemini-3-flash-preview',
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
    
    const json = JSON.parse(text);
    // Validation
    if (!Array.isArray(json.cn) || !Array.isArray(json.en) || json.cn.length === 0) {
       throw new Error("模型返回格式无效");
    }
    
    // Ensure 9 frames (trim or pad if necessary, though model should obey)
    return {
      cn: json.cn.slice(0, 9),
      en: json.en.slice(0, 9)
    };

  } catch (error: any) {
    console.error("Gemini Storyboard Generation Error:", error);
    // Simple error mapping
    if (error.message?.includes("403") || error.message?.includes("API_KEY")) {
       throw new Error("API 密钥无效或无访问权限。");
    }
    throw error;
  }
};

export const generate3x3GridInstructions = async (
  framesCn: string[],
  framesEn: string[],
  userApiKey?: string
): Promise<{ cn: string; en: string }> => {
  const client = getClient(userApiKey);
  
  // We want the model to refine the 9 descriptions into short, punchy instructions
  // suitable for the grid prompt format.
  const prompt = `
    我有 9 个分镜画面描述。我需要将它们格式化为用于 3x3 网格图像生成的指令列表。
    
    来源中文：${JSON.stringify(framesCn)}
    来源英文：${JSON.stringify(framesEn)}

    任务：
    1. 对于中文版本，将每一帧概括为简练的视觉指令（例如：“1. 镜头推进，主角微笑”）。
    2. 对于英文版本，做同样的处理（例如：“1. Camera zoom in, protagonist smiles”）。
    3. 严格返回一个 JSON 对象，包含 'cn_instructions'（单个字符串，包含换行符）和 'en_instructions'（单个字符串，包含换行符）。
    4. 不要添加前缀文本，只需要 1-9 的编号列表。
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      cn_instructions: { type: Type.STRING },
      en_instructions: { type: Type.STRING },
    },
    required: ["cn_instructions", "en_instructions"],
  };

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });
    
    const text = response.text;
    if(!text) throw new Error("3x3 网格生成返回为空");
    
    const json = JSON.parse(text);
    return {
      cn: json.cn_instructions,
      en: json.en_instructions
    };

  } catch (error) {
    console.error("Gemini Grid Gen Error", error);
    // Fallback if AI fails: just join the raw strings
    return {
      cn: framesCn.map((f, i) => `${i + 1}. ${f}`).join('\n'),
      en: framesEn.map((f, i) => `${i + 1}. ${f}`).join('\n')
    };
  }
};