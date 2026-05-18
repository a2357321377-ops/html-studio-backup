import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export interface UploadedFile {
  name: string;
  size: number;
  pageCount?: number;
  content: string; // 解析后的文本内容
}

interface AIChatState {
  // 对话消息
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // 上传文件
  uploadedFile: UploadedFile | null;
  setUploadedFile: (file: UploadedFile | null) => void;

  // 生成状态
  generating: boolean;
  setGenerating: (g: boolean) => void;

  // 生成进度
  generationProgress: number;
  generationPhase: string;
  setGenerationProgress: (progress: number, phase: string) => void;

  // AI 生成的 HTML
  deckHtml: string;
  setDeckHtml: (html: string) => void;
  clearDeckHtml: () => void;

  // 原始提示词（首次生成时记录，编辑时作为上下文）
  originalPrompt: string;
  setOriginalPrompt: (prompt: string) => void;

  // 重置所有状态
  resetAll: () => void;
}

export const useAIChat = create<AIChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateMessage: (id, updates) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      clearMessages: () => set({ messages: [] }),

      uploadedFile: null,
      setUploadedFile: (file) => set({ uploadedFile: file }),

      generating: false,
      setGenerating: (g) => set({ generating: g }),

      generationProgress: 0,
      generationPhase: '',
      setGenerationProgress: (progress, phase) => set({ generationProgress: progress, generationPhase: phase }),

      deckHtml: '',
      setDeckHtml: (html) => set({ deckHtml: html }),
      clearDeckHtml: () => set({ deckHtml: '' }),

      originalPrompt: '',
      setOriginalPrompt: (prompt) => set({ originalPrompt: prompt }),

      resetAll: () =>
        set({
          messages: [],
          uploadedFile: null,
          generating: false,
          generationProgress: 0,
          generationPhase: '',
          deckHtml: '',
          originalPrompt: '',
        }),
    }),
    { name: 'html-studio-ai-chat' }
  )
);
