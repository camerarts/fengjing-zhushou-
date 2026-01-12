import { Project, KeyItem, PromptConfig, User } from '../types';
import { DEFAULT_SYSTEM_PROMPT, MOCK_USER } from '../constants';

const STORAGE_KEYS = {
  USER: 'sb_user',
};

// --- User / Auth (Keep LocalStorage for Session) ---
export const login = (): User => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(MOCK_USER));
  return MOCK_USER;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.USER);
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
  console.log(`[API Req] ${method} ${endpoint}`, options.body ? '(with payload)' : '');

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
  console.log(`[API Res] ${res.status} ${method} ${endpoint} - ${duration}ms`, res.ok ? 'OK' : 'FAIL');

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
    // 针对 "no such table" 错误提供明确的开发指引
    if (typeof errorMsg === 'string' && errorMsg.includes('no such table')) {
        errorMsg = `数据库表尚未初始化。\n请在终端运行：\nnpx wrangler d1 execute storyboard-db --local --file=./migrations/0001_init.sql`;
    }
    // ------------------

    // 4.1 处理常见 HTTP 错误码
    if (res.status === 401) errorMsg = "登录已过期或未授权";
    if (res.status === 404 && !errorMsg.includes('no such table')) errorMsg = "请求的资源未找到";
    if (res.status === 500 && !errorMsg.includes('数据库表尚未初始化')) errorMsg = `服务器内部错误: ${errorMsg}`;

    throw new ApiError(errorMsg, res.status, traceId);
  }

  return data as T;
}

// --- Projects (Async) ---
export const getProjects = async (): Promise<Project[]> => {
  try {
    return await fetchAPI<Project[]>('/projects');
  } catch (e) {
    console.error("Failed to fetch projects", e);
    return [];
  }
};

/**
 * 创建或更新项目
 * @param project 项目对象
 * @param forceCreate 如果为 true，则跳过存在性检查，直接尝试 POST (用于新建项目优化)
 */
export const saveProject = async (project: Project, forceCreate: boolean = false) => {
  // 优化：如果是明确的新建操作，直接 POST，减少一次 GET 请求
  if (forceCreate) {
     return await fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  // 旧逻辑：先检查后更新 (用于保存现有项目)
  let isNew = false;
  try {
    await fetchAPI<Project>(`/projects/${project.id}`);
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      isNew = true;
    } else {
      throw e; // 网络错误或 500 必须抛出
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
  await fetchAPI(`/projects/${id}`, { method: 'DELETE' });
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
  try {
    return await fetchAPI<Project>(`/projects/${id}`);
  } catch (e) {
    return undefined;
  }
};

// --- API Keys (Async) ---
export const getApiKeys = async (): Promise<KeyItem[]> => {
  try {
    return await fetchAPI<KeyItem[]>('/keys');
  } catch (e) {
    return [];
  }
};

export const saveApiKey = async (keyItem: KeyItem) => {
  try {
    const keys = await getApiKeys();
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
  } catch (e) {
    throw e;
  }
};

export const deleteApiKey = async (id: string) => {
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

// --- Prompts (Async) ---
export const getSystemPrompt = async (moduleKey: string = 'storyboard_generate'): Promise<string> => {
  try {
    const res = await fetchAPI<PromptConfig | null>(`/prompts?moduleKey=${moduleKey}`);
    return res ? res.content : DEFAULT_SYSTEM_PROMPT;
  } catch (e) {
    return DEFAULT_SYSTEM_PROMPT;
  }
};

export const saveSystemPrompt = async (moduleKey: string, content: string) => {
  await fetchAPI('/prompts', {
    method: 'POST',
    body: JSON.stringify({
      moduleKey,
      content,
      updatedAt: Date.now()
    })
  });
};