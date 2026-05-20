import { create } from 'zustand';

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

  // 重置
  reset: () => void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  deckHtml: '',
  setDeckHtml: (html) => set({ deckHtml: html }),

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

  syncFromIframe: () => {
    const iframe = get().iframeRef;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    // 同步前移除编辑器注入的临时元素，避免它们被写入 deckHtml
    // 1. 移除高亮框
    const highlight = doc.querySelector('[data-editor-highlight]');
    if (highlight) highlight.remove();
    // 2. 移除编辑 runtime script
    const editorScript = doc.querySelector('[data-editor-runtime]');
    if (editorScript) editorScript.remove();

    const html = doc.documentElement.outerHTML;
    set({ deckHtml: `<!DOCTYPE html>\n${html}` });
  },

  reset: () =>
    set({
      deckHtml: '',
      currentSlideIndex: 0,
      totalSlides: 0,
      selectedElement: null,
      activeTab: 'style',
      iframeRef: null,
    }),
}));