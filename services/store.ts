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
  const res = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
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

export const saveProject = async (project: Project) => {
  // Check if exists to decide PUT vs POST (handled by ID in frontend logic usually, but here we can check)
  // To simplify, we rely on the component calling this. 
  // However, `saveProject` in the old code handled both insert and update.
  // We need to check if it exists in the backend or just use an Upsert logic if we had one.
  // For now, let's assume if it's new, the caller knows? 
  // Actually, let's just try to GET it first or use a flag. 
  // Better yet, let's assume the frontend state knows.
  // Since the previous implementation handled "upsert" internally, let's try to replicate that:
  
  const existing = await getProjectById(project.id);
  
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
  // For keys, we usually create new ones. Update is mainly for setting default.
  // We'll treat this as "Upsert" logic similar to projects is tricky without checking.
  // The UI calls `saveApiKey` for new keys and `handleSetDefault`.
  // Let's use POST for create, and if it exists (by ID logic), PUT.
  // The current UI generates a new ID for new keys.
  
  // Since we don't have an easy "exists" check without fetching all, 
  // we will try to PUT, if 404/error, then POST? No, simpler:
  // We'll split logic in the backend or just always POST for new keys (since ID is timestamp).
  // But updating "isDefault" calls this too.
  
  // Quick fix: If it's a new key, the UI component generates ID.
  // We can try to fetch all keys, see if ID exists.
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
