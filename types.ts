export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  creativePlan: string;
  storyboardZh: string[];
  storyboardEn: string[];
  grid3x3Zh: string;
  grid3x3En: string;
  createdAt: number;
  updatedAt: number;
}

export interface KeyItem {
  id: string;
  userId: string;
  label: string;
  key: string; // Stored locally for this demo app
  isDefault: boolean;
  createdAt: number;
}

export interface PromptConfig {
  id: string;
  moduleKey: string; // e.g., 'storyboard_generate'
  content: string;
  updatedAt: number;
}

export enum AppRoute {
  LANDING = 'landing',
  LOGIN = 'login',
  DASHBOARD = 'dashboard',
  PROJECT_WORKSPACE = 'workspace',
  KEYS = 'keys',
  PROMPTS = 'prompts',
}
