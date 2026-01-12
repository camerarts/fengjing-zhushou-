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
  negativeImage?: string; // Anchor/Reference Image (Single 9:16)
  gridCompositeImage?: string; // The generated 3x3 Grid Image (Single Image)
  splitImages?: string[]; // Array of 9 split images
  createdAt: number;
  updatedAt: number;
}

export interface KeyItem {
  id: string;
  userId: string;
  // label removed
  key: string; // Stored locally for this demo app
  isDefault: boolean;
  createdAt: number;
}

export type ModelType = 'text' | 'image';

export interface ModelItem {
  id: string;
  userId: string;
  // label removed
  modelId: string; // API Model ID e.g. "gemini-1.5-pro"
  type: ModelType;
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