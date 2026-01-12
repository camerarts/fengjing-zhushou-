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

// --- API Helpers ---
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    // Network errors (e.g. backend not running)
    throw new Error("无法连接到 API。请检查后端服务是否正在运行。");
  }

  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      // Try to parse error message from JSON if available
      const data = await res.json();
      if (data && (data.error || data.message)) {
        errorMsg = data.error || data.message;
      }
    } catch {
      // Ignore JSON parse error on error response
    }
    throw new Error(`API 请求失败 (${res.status}): ${errorMsg}`);
  }

  // Handle empty responses
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("无效的服务器响应格式");
  }
}

// --- Projects (Async) ---
export const getProjects = async (): Promise<Project[]> => {
  try {
    return await fetchAPI<Project[]>('/projects');
  } catch (e) {
    console.error("Failed to fetch projects", e);
    // Return empty array instead of throwing to allow UI to render 'Empty State'
    return [];
  }
};

export const saveProject = async (project: Project) => {
  // Check if exists using getProjectById, but suppress 404s
  let existing: Project | undefined;
  try {
    existing = await fetchAPI<Project>(`/projects/${project.id}`);
  } catch (e: any) {
    // If it's a 404, we treat it as not existing. Other errors should bubble up?
    // For safety in this demo, we assume any error in GET means we try POST.
    // Realistically we should check status code, but fetchAPI throws generic Error strings now.
    // Let's rely on the POST/PUT logic.
  }
  
  if (existing) {
    await fetchAPI(`/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  } else {
    await fetchAPI('/projects', {
      method: 'POST',
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
  // We'll try to create (POST). If it fails, maybe update? 
  // Simplified logic: Check existence first.
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
};

export const deleteApiKey = async (id: string) => {
  await fetchAPI(`/keys/${id}`, { method: 'DELETE' });
};

export const getDefaultKey = async (): Promise<string | null> => {
  const keys = await getApiKeys();
  const def = keys.find(k => k.isDefault);
  return def ? def.key : (keys.length > 0 ? keys[0].key : null);
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