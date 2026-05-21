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

    // 直接读取 outerHTML，不修改 iframe DOM（避免破坏编辑器 runtime 的引用）
    const rawHtml = doc.documentElement.outerHTML;
    // 用 DOMParser 清理编辑器注入的元素后存入 store
    const cleanHtml = cleanEditorArtifacts(`<!DOCTYPE html>\n${rawHtml}`);
    set({ deckHtml: cleanHtml });
    // 同步到 AI store（首页使用 AI store 的 deckHtml，且 persist 到 localStorage）
    // 确保 localStorage 中始终是干净的 HTML，避免刷新后首页残留编辑器痕迹
    useAIChat.getState().setDeckHtml(cleanHtml);
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
    }),
}));