import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  connected: boolean;
  autoLayout: boolean;
  editorAssist: boolean;
}

const DEFAULTS: Record<AIProvider, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6-20250514' },
};

interface AIConfigState extends AIConfig {
  setProvider: (provider: AIProvider) => void;
  setBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setConnected: (connected: boolean) => void;
  setAutoLayout: (on: boolean) => void;
  setEditorAssist: (on: boolean) => void;
}

export const useAIConfig = create<AIConfigState>()(
  persist(
    (set) => ({
      provider: 'openai',
      baseUrl: DEFAULTS.openai.baseUrl,
      apiKey: '',
      model: DEFAULTS.openai.model,
      connected: false,
      autoLayout: true,
      editorAssist: true,
      setProvider: (provider) => set({ provider, baseUrl: DEFAULTS[provider].baseUrl, model: DEFAULTS[provider].model }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setConnected: (connected) => set({ connected }),
      setAutoLayout: (autoLayout) => set({ autoLayout }),
      setEditorAssist: (editorAssist) => set({ editorAssist }),
    }),
    { name: 'html-studio-ai-config' }
  )
);
