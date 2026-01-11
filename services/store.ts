import { Project, KeyItem, PromptConfig, User } from '../types';
import { DEFAULT_SYSTEM_PROMPT, MOCK_USER } from '../constants';

const STORAGE_KEYS = {
  USER: 'sb_user',
  PROJECTS: 'sb_projects',
  API_KEYS: 'sb_api_keys',
  PROMPTS: 'sb_prompts',
};

// --- User / Auth ---
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

// --- Projects ---
export const getProjects = (): Project[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  return data ? JSON.parse(data) : [];
};

export const saveProject = (project: Project) => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    projects.unshift({ ...project, createdAt: Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
};

export const deleteProject = (id: string) => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
};

export const getProjectById = (id: string): Project | undefined => {
  return getProjects().find(p => p.id === id);
};

// --- API Keys ---
export const getApiKeys = (): KeyItem[] => {
  const data = localStorage.getItem(STORAGE_KEYS.API_KEYS);
  return data ? JSON.parse(data) : [];
};

export const saveApiKey = (keyItem: KeyItem) => {
  let keys = getApiKeys();
  if (keyItem.isDefault) {
    keys = keys.map(k => ({ ...k, isDefault: false }));
  }
  const index = keys.findIndex(k => k.id === keyItem.id);
  if (index >= 0) {
    keys[index] = keyItem;
  } else {
    keys.push(keyItem);
  }
  // If no default exists and we just added one, make it default
  if (!keys.some(k => k.isDefault) && keys.length > 0) {
    keys[0].isDefault = true;
  }
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
};

export const deleteApiKey = (id: string) => {
  const keys = getApiKeys().filter(k => k.id !== id);
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
};

export const getDefaultKey = (): string | null => {
  const keys = getApiKeys();
  const def = keys.find(k => k.isDefault);
  return def ? def.key : (keys.length > 0 ? keys[0].key : null);
};

// --- Prompts ---
export const getSystemPrompt = (moduleKey: string = 'storyboard_generate'): string => {
  const data = localStorage.getItem(STORAGE_KEYS.PROMPTS);
  if (!data) return DEFAULT_SYSTEM_PROMPT;
  const prompts: PromptConfig[] = JSON.parse(data);
  const prompt = prompts.find(p => p.moduleKey === moduleKey);
  return prompt ? prompt.content : DEFAULT_SYSTEM_PROMPT;
};

export const saveSystemPrompt = (moduleKey: string, content: string) => {
  const data = localStorage.getItem(STORAGE_KEYS.PROMPTS);
  let prompts: PromptConfig[] = data ? JSON.parse(data) : [];
  const index = prompts.findIndex(p => p.moduleKey === moduleKey);
  if (index >= 0) {
    prompts[index] = { ...prompts[index], content, updatedAt: Date.now() };
  } else {
    prompts.push({ id: Date.now().toString(), moduleKey, content, updatedAt: Date.now() });
  }
  localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(prompts));
};
