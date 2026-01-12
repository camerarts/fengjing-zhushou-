import { Project, KeyItem, ModelItem, PromptConfig, User, ModelType } from '../types';
import { DEFAULT_SYSTEM_PROMPT, MOCK_USER } from '../constants';

const STORAGE_KEYS = {
  USER: 'sb_user',
};

// --- In-Memory Cache ---
const cache: {
    projects: Project[] | null;
    keys: KeyItem[] | null;
    models: ModelItem[] | null;
    prompts: Record<string, string>;
} = {
    projects: null,
    keys: null,
    models: null,
    prompts: {}
};

const clearCache = (key?: keyof typeof cache) => {
    if (key && key !== 'prompts') {
        cache[key] = null;
    } else if (key === 'prompts') {
        cache.prompts = {};
    } else {
        cache.projects = null;
        cache.keys = null;
        cache.models = null;
        cache.prompts = {};
    }
};

// --- User / Auth (Keep LocalStorage for Session) ---
export const login = (): User => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(MOCK_USER));
  return MOCK_USER;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.USER);
  clearCache();
};

export const getCurrentUser = (): User | null => {
  const u = localStorage.getItem(STORAGE_KEYS.USER);
  return u ? JSON.parse(u) : null;
};

// Custom Error to carry status code and trace info
class ApiError extends Error {
  status: number;
  traceId?: string;

  constructor(message: string, status: number, traceId?: string) {
    super(message);
    this.status = status;
    this.traceId = traceId;
    this.name = 'ApiError';
  }
}

// --- API Helpers ---
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // 3.3 请求与超时：15秒强制超时
  const TIMEOUT_MS = 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const method = options.method || 'GET';
  const startTime = Date.now();
  
  // 3.5 日志：请求发起
  // console.log(`[API Req] ${method} ${endpoint}`, options.body ? '(with payload)' : '');

  let res: Response;
  try {
    res = await fetch(`/api${endpoint}`, {
      ...options,
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        ...options.headers 
      },
      signal: controller.signal
    });
  } catch (e: any) {
    // 3.3 网络/超时错误处理
    const duration = Date.now() - startTime;
    console.error(`[API Err] ${method} ${endpoint} - ${duration}ms`, e);
    
    if (e.name === 'AbortError') {
      throw new ApiError("请求超时 (15s)，请检查网络连接。", 408);
    }
    throw new ApiError("网络请求失败，无法连接到服务器。请检查后端服务是否运行。", 0);
  } finally {
    clearTimeout(timeoutId);
  }

  const duration = Date.now() - startTime;
  
  // 尝试解析 JSON
  let data: any;
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const text = await res.text();

  try {
    if (text && isJson) {
      data = JSON.parse(text);
    } else {
      data = text; // Fallback for non-JSON text
    }
  } catch (e) {
    console.warn(`[API Warn] Failed to parse JSON response:`, text.substring(0, 100));
  }

  // 3.5 日志：响应结果
  // console.log(`[API Res] ${res.status} ${method} ${endpoint} - ${duration}ms`, res.ok ? 'OK' : 'FAIL');

  if (!res.ok) {
    let errorMsg = res.statusText;
    let traceId = '';

    // Extract detailed error from backend if available
    if (data && typeof data === 'object') {
       if (data.error) errorMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
       if (data.message) errorMsg = data.message;
       if (data.traceId) traceId = data.traceId;
    }

    // --- 智能错误诊断 ---
    if (typeof errorMsg === 'string') {
        if (errorMsg.includes('KV binding') || errorMsg.includes('KV namespace') || errorMsg.includes('wrangler.toml')) {
             errorMsg = "严重错误：KV 数据库绑定丢失。\n1. 请进入 Cloudflare Pages -> Settings -> Functions。\n2. 确保添加了 KV Namespace Binding。\n3. 变量名称(Variable name)必须完全一致为 'KV' (大写)。\n4. 设置完成后，请务必 Retry deployment (重新部署)。";
        }
    }
    // ------------------

    // 4.1 处理常见 HTTP 错误码
    if (res.status === 401) errorMsg = "登录已过期或未授权";
    if (res.status === 404) errorMsg = "请求的资源未找到";
    
    // 500 错误兜底
    if (res.status === 500 && !errorMsg.includes('严重错误')) {
         errorMsg = `服务器内部错误: ${errorMsg}`;
    }

    throw new ApiError(errorMsg, res.status, traceId);
  }

  return data as T;
}

// --- Projects (Async) ---
export const getProjects = async (): Promise<Project[]> => {
  if (cache.projects) return cache.projects;
  try {
    const data = await fetchAPI<Project[]>('/projects');
    cache.projects = data;
    return data;
  } catch (e) {
    console.error("Failed to fetch projects", e);
    return [];
  }
};

export const saveProject = async (project: Project, forceCreate: boolean = false) => {
  clearCache('projects'); // Invalidate cache
  if (forceCreate) {
     return await fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  let isNew = false;
  try {
    await fetchAPI<Project>(`/projects/${project.id}`);
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      isNew = true;
    } else {
      throw e; 
    }
  }
  
  if (isNew) {
    await fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  } else {
    await fetchAPI(`/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }
};

export const deleteProject = async (id: string) => {
  clearCache('projects');
  await fetchAPI(`/projects/${id}`, { method: 'DELETE' });
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
  // Try to find in cache first
  if (cache.projects) {
    const p = cache.projects.find(p => p.id === id);
    if (p) return p;
  }
  try {
    return await fetchAPI<Project>(`/projects/${id}`);
  } catch (e) {
    return undefined;
  }
};

// --- API Keys (Async) ---
export const getApiKeys = async (): Promise<KeyItem[]> => {
  if (cache.keys) return cache.keys;
  try {
    const data = await fetchAPI<KeyItem[]>('/keys');
    cache.keys = data;
    return data;
  } catch (e) {
    return [];
  }
};

export const saveApiKey = async (keyItem: KeyItem) => {
  clearCache('keys');
  const keys = await getApiKeys(); // This might still fetch if cache was cleared immediately above, but that's intended logic for safety
  const exists = keys.find(k => k.id === keyItem.id);
  
  if (exists) {
    await fetchAPI(`/keys/${keyItem.id}`, {
      method: 'PUT',
      body: JSON.stringify(keyItem),
    });
  } else {
    await fetchAPI('/keys', {
      method: 'POST',
      body: JSON.stringify(keyItem),
    });
  }
};

export const deleteApiKey = async (id: string) => {
  clearCache('keys');
  await fetchAPI(`/keys/${id}`, { method: 'DELETE' });
};

export const getDefaultKey = async (): Promise<string | null> => {
  try {
    const keys = await getApiKeys();
    const def = keys.find(k => k.isDefault);
    return def ? def.key : (keys.length > 0 ? keys[0].key : null);
  } catch (e) {
    return null;
  }
};

// --- Models (Async) ---
export const getModels = async (): Promise<ModelItem[]> => {
  if (cache.models) return cache.models;
  try {
    const data = await fetchAPI<ModelItem[]>('/models');
    cache.models = data;
    return data;
  } catch (e) {
    return [];
  }
};

export const saveModel = async (modelItem: ModelItem) => {
  clearCache('models');
  const models = await getModels(); // Re-fetch or logic needs to handle exists check. For simplicity, we can trust the ID.
  // Actually, better to optimistically check.
  const exists = models.find(m => m.id === modelItem.id);

  if (exists) {
      await fetchAPI(`/models/${modelItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(modelItem),
      });
  } else {
      await fetchAPI('/models', {
          method: 'POST',
          body: JSON.stringify(modelItem),
      });
  }
};

export const deleteModel = async (id: string) => {
  clearCache('models');
  await fetchAPI(`/models/${id}`, { method: 'DELETE' });
};

// Updated to accept type filter
export const getDefaultModel = async (type: ModelType = 'text'): Promise<string | null> => {
    try {
        const models = await getModels();
        // Filter by type
        const typeModels = models.filter(m => (m.type || 'text') === type);
        
        const def = typeModels.find(m => m.isDefault);
        return def ? def.modelId : (typeModels.length > 0 ? typeModels[0].modelId : null);
    } catch (e) {
        return null;
    }
};

// --- Prompts (Async) ---
export const getSystemPrompt = async (moduleKey: string = 'storyboard_generate'): Promise<string> => {
  if (cache.prompts[moduleKey]) return cache.prompts[moduleKey];
  try {
    const res = await fetchAPI<PromptConfig | null>(`/prompts?moduleKey=${moduleKey}`);
    const content = res ? res.content : DEFAULT_SYSTEM_PROMPT;
    cache.prompts[moduleKey] = content;
    return content;
  } catch (e) {
    return DEFAULT_SYSTEM_PROMPT;
  }
};

export const saveSystemPrompt = async (moduleKey: string, content: string) => {
  cache.prompts[moduleKey] = content; // Optimistic update
  await fetchAPI('/prompts', {
    method: 'POST',
    body: JSON.stringify({
      moduleKey,
      content,
      updatedAt: Date.now()
    })
  });
};