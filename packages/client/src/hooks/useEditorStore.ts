import { create } from 'zustand';
import { useAIChat } from './useAIChat';

/**
 * 清理 HTML 中的编辑器注入元素（高亮框、编辑 runtime、contenteditable 属性）
 * 用于预览、演讲者模式、导出等非编辑场景
 */
export function cleanEditorArtifacts(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // 移除高亮框
  doc.querySelectorAll('[data-editor-highlight]').forEach(el => el.remove());
  // 移除编辑 runtime script
  doc.querySelectorAll('[data-editor-runtime]').forEach(el => el.remove());
  // 移除 contenteditable 属性（编辑器可能给元素添加了此属性）
  doc.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
  });
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export type EditorTab = 'style' | 'theme' | 'fx' | 'layout';

export interface SelectedElement {
  tagName: string;
  textContent: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  // iframe 内元素的 CSS path，用于定位
  cssPath: string;
  // 是否为图片元素
  isImage: boolean;
  imageSrc: string;
}

const MAX_UNDO_SIZE = 50;

interface EditorState {
  // 当前编辑的 HTML（从 useAIChat.deckHtml 初始化）
  deckHtml: string;
  setDeckHtml: (html: string) => void;

  // 当前选中的幻灯片索引（0-based）
  currentSlideIndex: number;
  setCurrentSlideIndex: (idx: number) => void;

  // 幻灯片总数（从 iframe DOM 计算）
  totalSlides: number;
  setTotalSlides: (n: number) => void;

  // 当前选中的元素信息
  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;

  // 当前激活的侧栏 tab
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;

  // iframe ref（不存入 zustand，用 module-level ref）
  iframeRef: HTMLIFrameElement | null;
  setIframeRef: (ref: HTMLIFrameElement | null) => void;

  // 从 iframe 同步 HTML 回 store
  syncFromIframe: () => void;

  // 获取清理后的 HTML（移除编辑器注入的临时元素和脚本）
  // 用于预览、演讲者模式、导出等非编辑场景
  getCleanHtml: () => string;

  // 撤销/重做
  undoStack: string[];
  redoStack: string[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // 重置
  reset: () => void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  deckHtml: '',
  setDeckHtml: (html) => {
    const prev = get().deckHtml;
    const undoStack = prev ? [...get().undoStack, prev].slice(-MAX_UNDO_SIZE) : get().undoStack;
    set({ deckHtml: html, undoStack, redoStack: [], canUndo: undoStack.length > 0, canRedo: false });
  },

  currentSlideIndex: 0,
  setCurrentSlideIndex: (idx) => set({ currentSlideIndex: idx }),

  totalSlides: 0,
  setTotalSlides: (n) => set({ totalSlides: n }),

  selectedElement: null,
  setSelectedElement: (el) => set({ selectedElement: el }),

  activeTab: 'style',
  setActiveTab: (tab) => set({ activeTab: tab }),

  iframeRef: null,
  setIframeRef: (ref) => set({ iframeRef: ref }),

  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  undo: () => {
    const { undoStack, redoStack, deckHtml } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const newRedo = deckHtml ? [...redoStack, deckHtml] : redoStack;
    set({
      deckHtml: prev,
      undoStack: newUndo,
      redoStack: newRedo,
      canUndo: newUndo.length > 0,
      canRedo: newRedo.length > 0,
      selectedElement: null,
    });
    // 延迟同步到 AI store，避免触发额外的重渲染
    requestAnimationFrame(() => useAIChat.getState().setDeckHtml(prev));
  },

  redo: () => {
    const { undoStack, redoStack, deckHtml } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newUndo = deckHtml ? [...undoStack, deckHtml] : undoStack;
    set({
      deckHtml: next,
      undoStack: newUndo,
      redoStack: newRedo,
      canUndo: newUndo.length > 0,
      canRedo: newRedo.length > 0,
      selectedElement: null,
    });
    // 延迟同步到 AI store，避免触发额外的重渲染
    requestAnimationFrame(() => useAIChat.getState().setDeckHtml(next));
  },

  syncFromIframe: () => {
    const iframe = get().iframeRef;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    // 直接读取 outerHTML，不修改 iframe DOM（避免破坏编辑器 runtime 的引用）
    const rawHtml = doc.documentElement.outerHTML;
    // 用 DOMParser 清理编辑器注入的元素后存入 store
    const cleanHtml = cleanEditorArtifacts(`<!DOCTYPE html>\n${rawHtml}`);
    const prev = get().deckHtml;
    // 内容没变则不记录历史
    // 用 DOMParser 重新序列化 prev，确保属性顺序与 cleanHtml 一致后再比较
    if (prev) {
      const prevDoc = new DOMParser().parseFromString(prev, 'text/html');
      const prevNormalized = prevDoc.documentElement.outerHTML;
      const newDoc = new DOMParser().parseFromString(cleanHtml, 'text/html');
      const newNormalized = newDoc.documentElement.outerHTML;
      if (prevNormalized === newNormalized) return;
    }
    const undoStack = prev ? [...get().undoStack, prev].slice(-MAX_UNDO_SIZE) : get().undoStack;
    set({ deckHtml: cleanHtml, undoStack, redoStack: [], canUndo: undoStack.length > 0, canRedo: false });
    // 延迟同步到 AI store，避免触发额外的重渲染
    requestAnimationFrame(() => useAIChat.getState().setDeckHtml(cleanHtml));
  },

  getCleanHtml: () => {
    return cleanEditorArtifacts(get().deckHtml);
  },

  reset: () =>
    set({
      deckHtml: '',
      currentSlideIndex: 0,
      totalSlides: 0,
      selectedElement: null,
      activeTab: 'style',
      iframeRef: null,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    }),
}));