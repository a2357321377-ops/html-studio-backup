# 幻灯片可视化编辑器实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户在 AI 生成幻灯片后，进入编辑器对内容进行所见即所得编辑——包括文字修改、颜色调整、主题/动效切换、布局切换、页面增删、图片上传。

**Architecture:** 编辑器直接操作 iframe 内的 DOM，不走 Slide[] 数据模型。用户点击"进入编辑器"时，把 `deckHtml` 加载到 iframe，注入编辑 runtime 监听用户交互。侧栏提供结构化操作面板（主题/动效/布局缩略图选择）。导出时从 iframe 取 `outerHTML` 写回 store。

**Tech Stack:** React 19, Zustand, Tailwind CSS v4, iframe postMessage 通信, html2canvas（缩略图）, FileReader API（图片上传 base64）

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/client/src/hooks/useEditorStore.ts` | **新建** — 编辑器状态管理：当前选中页、选中元素、编辑模式 tab、iframe 引用 |
| `packages/client/src/components/editor/EditorCanvas.tsx` | **新建** — 中间 iframe 预览区，注入编辑 runtime，处理元素选中/文字编辑 |
| `packages/client/src/components/editor/SlideThumbnailList.tsx` | **新建** — 左侧幻灯片缩略图列表，支持切换/删除/排序/添加 |
| `packages/client/src/components/editor/PropertyPanel.tsx` | **新建** — 右侧属性面板容器，tab 切换（样式/主题/动效/布局） |
| `packages/client/src/components/editor/StyleTab.tsx` | **新建** — 样式 tab：颜色选择器、字号、对齐 |
| `packages/client/src/components/editor/ThemeTab.tsx` | **新建** — 主题 tab：36 个主题缩略图网格 |
| `packages/client/src/components/editor/FxTab.tsx` | **新建** — 动效 tab：27 个 Canvas FX 实时缩略图 + 20 个 CSS 动画缩略图 |
| `packages/client/src/components/editor/LayoutTab.tsx` | **新建** — 布局 tab：31 个布局模板缩略图，选择后迁移内容 |
| `packages/client/src/components/editor/ImageUploader.tsx` | **新建** — 图片上传组件，FileReader 转 base64 |
| `packages/client/src/pages/Editor.tsx` | **修改** — 替换为新的三栏编辑器布局 |
| `packages/client/src/hooks/useAIChat.ts` | **修改** — 新增 `syncDeckHtml` 方法，编辑器修改后同步回 store |
| `packages/client/src/components/PreviewPanel.tsx` | **修改** — "进入编辑器"按钮传递 deckHtml |

---

## Task 1: useEditorStore — 编辑器状态管理

**Files:**
- Create: `packages/client/src/hooks/useEditorStore.ts`

- [ ] **Step 1: 创建 useEditorStore**

```typescript
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
    const html = iframe.contentDocument.documentElement.outerHTML;
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
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/hooks/useEditorStore.ts
git commit -m "feat: add useEditorStore for editor state management"
```

---

## Task 2: EditorCanvas — iframe 预览区 + 编辑 runtime

**Files:**
- Create: `packages/client/src/components/editor/EditorCanvas.tsx`

这是编辑器的核心组件。它加载 deckHtml 到 iframe，注入编辑 runtime（点击监听、contenteditable、选中高亮），并处理与侧栏的通信。

- [ ] **Step 1: 创建 EditorCanvas 组件**

```typescript
import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore, SelectedElement } from '../../hooks/useEditorStore';

/**
 * 获取元素在 iframe 内的 CSS 路径（简化版：tag:nth-child 链）
 */
function getCssPath(el: Element, root: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== root) {
    let selector = current.tagName.toLowerCase();
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

export function EditorCanvas() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const deckHtml = useEditorStore((s) => s.deckHtml);
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const setIframeRef = useEditorStore((s) => s.setIframeRef);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);
  const setTotalSlides = useEditorStore((s) => s.setTotalSlides);
  const setCurrentSlideIndex = useEditorStore((s) => s.setCurrentSlideIndex);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);

  // 注册 iframe ref 到 store
  useEffect(() => {
    setIframeRef(iframeRef.current);
    return () => setIframeRef(null);
  }, [setIframeRef]);

  // iframe 加载完成后注入编辑 runtime
  const handleIframeLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // 计算幻灯片总数
    const slides = doc.querySelectorAll('.slide');
    setTotalSlides(slides.length);

    // 设置当前页为 active
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === currentSlideIndex);
      s.classList.toggle('is-prev', i < currentSlideIndex);
    });

    // 注入编辑样式：选中高亮、hover 提示
    const style = doc.createElement('style');
    style.id = 'editor-runtime-style';
    style.textContent = `
      .slide [data-editable],
      .slide h1, .slide h2, .slide h3, .slide h4, .slide p, .slide li, .slide span, .slide a {
        cursor: text;
        outline: 1px dashed transparent;
        transition: outline-color 0.15s;
      }
      .slide [data-editable]:hover,
      .slide h1:hover, .slide h2:hover, .slide h3:hover, .slide h4:hover,
      .slide p:hover, .slide li:hover, .slide span:hover, .slide a:hover {
        outline-color: rgba(59, 108, 255, 0.4);
      }
      .slide img, .slide [data-slot-type="image"] {
        cursor: pointer;
        outline: 2px dashed transparent;
        transition: outline-color 0.15s;
      }
      .slide img:hover, .slide [data-slot-type="image"]:hover {
        outline-color: rgba(59, 108, 255, 0.6);
      }
      .editor-selected {
        outline: 2px solid #3b6cff !important;
        outline-offset: 2px;
      }
    `;
    // 避免重复注入
    doc.getElementById('editor-runtime-style')?.remove();
    doc.head.appendChild(style);

    // 点击事件：选中元素
    doc.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as Element;

      // 取消之前的选中
      doc.querySelectorAll('.editor-selected').forEach((el) => {
        el.classList.remove('editor-selected');
        if (el.getAttribute('contenteditable') === 'true') {
          el.removeAttribute('contenteditable');
        }
      });

      // 判断是否为可编辑文本元素
      const isText =
        target.matches('h1, h2, h3, h4, p, li, span, a, [data-editable]') &&
        !target.matches('img, svg, canvas, video, iframe');
      const isImg = target.matches('img, [data-slot-type="image"]');

      if (isText || isImg) {
        e.preventDefault();
        e.stopPropagation();
        target.classList.add('editor-selected');

        const computed = doc.defaultView!.getComputedStyle(target);
        const selected: SelectedElement = {
          tagName: target.tagName.toLowerCase(),
          textContent: target.textContent || '',
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          textAlign: computed.textAlign,
          cssPath: getCssPath(target, doc.body),
          isImage: isImg,
          imageSrc: isImg ? (target as HTMLImageElement).src || '' : '',
        };
        setSelectedElement(selected);

        // 文本元素启用 contenteditable
        if (isText) {
          target.setAttribute('contenteditable', 'true');
          (target as HTMLElement).focus();
        }
      } else {
        setSelectedElement(null);
      }
    }, true); // capture phase

    // 失焦时保存文字修改
    doc.addEventListener('focusout', () => {
      // 延迟同步，让 click 事件先处理
      setTimeout(() => syncFromIframe(), 100);
    });

    // input 事件也同步（实时编辑时）
    doc.addEventListener('input', () => {
      syncFromIframe();
    });
  }, [currentSlideIndex, setTotalSlides, setSelectedElement, syncFromIframe]);

  // 切换幻灯片页
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const slides = doc.querySelectorAll('.slide');
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === currentSlideIndex);
      s.classList.toggle('is-prev', i < currentSlideIndex);
    });
  }, [currentSlideIndex]);

  // 计算 iframe 缩放
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center p-5 relative overflow-hidden bg-[#111118]">
      <div
        className="relative"
        style={{
          width: 960 * 0.55,
          height: 540 * 0.55,
          overflow: 'hidden',
          borderRadius: '0.75rem',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={deckHtml}
          width="960"
          height="540"
          style={{ transform: 'scale(0.55)', transformOrigin: 'top left', border: 'none' }}
          title="幻灯片编辑"
          sandbox="allow-scripts allow-same-origin"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/EditorCanvas.tsx
git commit -m "feat: add EditorCanvas with iframe editing runtime"
```

---

## Task 3: SlideThumbnailList — 左侧幻灯片缩略图列表

**Files:**
- Create: `packages/client/src/components/editor/SlideThumbnailList.tsx`

- [ ] **Step 1: 创建 SlideThumbnailList 组件**

```typescript
import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

interface SlideThumbnailProps {
  slideHtml: string;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function SlideThumbnail({ slideHtml, index, isActive, onClick, onDelete }: SlideThumbnailProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // 构建完整的缩略图 HTML：只包含当前 slide 的内容 + 基础样式
    const fullHtml = slideHtml;
    iframe.srcdoc = fullHtml;
  }, [slideHtml]);

  return (
    <div
      className={`group relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
        isActive ? 'border-[var(--color-primary)] shadow-lg' : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
      }`}
      onClick={onClick}
    >
      <div className="relative" style={{ width: 160, height: 90 }}>
        <iframe
          ref={iframeRef}
          width="960"
          height="540"
          style={{ transform: 'scale(0.167)', transformOrigin: 'top left', border: 'none', pointerEvents: 'none' }}
          title={`幻灯片 ${index + 1}`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
      <button
        className="absolute top-1 right-1 w-4 h-4 bg-red-500/80 text-white text-[10px] rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-500"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="删除此页"
      >
        ×
      </button>
    </div>
  );
}

export function SlideThumbnailList() {
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const setCurrentSlideIndex = useEditorStore((s) => s.setCurrentSlideIndex);
  const totalSlides = useEditorStore((s) => s.totalSlides);
  const setTotalSlides = useEditorStore((s) => s.setTotalSlides);
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const deckHtml = useEditorStore((s) => s.deckHtml);

  // 从 iframe 提取每页 slide 的 HTML
  const [slideHtmls, setSlideHtmls] = useState<string[]>([]);

  const extractSlideHtmls = useCallback(() => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const slides = doc.querySelectorAll('.slide');
    const htmls: string[] = [];
    slides.forEach((slide) => {
      htmls.push(slide.outerHTML);
    });
    setSlideHtmls(htmls);
  }, [iframeRef]);

  // deckHtml 变化时重新提取
  useEffect(() => {
    // 延迟一帧让 iframe 加载完成
    const timer = setTimeout(extractSlideHtmls, 500);
    return () => clearTimeout(timer);
  }, [deckHtml, extractSlideHtmls]);

  const handleDeleteSlide = (index: number) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const slides = doc.querySelectorAll('.slide');
    if (slides.length <= 1) return; // 至少保留一页
    slides[index]?.remove();
    setTotalSlides(slides.length - 1);
    if (currentSlideIndex >= slides.length - 1) {
      setCurrentSlideIndex(Math.max(0, slides.length - 2));
    }
    syncFromIframe();
    extractSlideHtmls();
  };

  const handleAddSlide = () => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    // 创建空白 slide
    const newSlide = doc.createElement('section');
    newSlide.className = 'slide';
    newSlide.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:24px;">新页面</div>';
    const slides = doc.querySelectorAll('.slide');
    const lastSlide = slides[slides.length - 1];
    lastSlide?.after(newSlide);
    setTotalSlides(slides.length + 1);
    setCurrentSlideIndex(slides.length);
    syncFromIframe();
    extractSlideHtmls();
  };

  return (
    <div className="w-[200px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg)]">
      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-[12px] font-semibold text-[var(--color-text-dim)]">幻灯片</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {slideHtmls.map((html, i) => (
          <SlideThumbnail
            key={i}
            slideHtml={html}
            index={i}
            isActive={i === currentSlideIndex}
            onClick={() => setCurrentSlideIndex(i)}
            onDelete={() => handleDeleteSlide(i)}
          />
        ))}
      </div>
      <div className="p-3 border-t border-[var(--color-border)]">
        <button
          className="w-full py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
          onClick={handleAddSlide}
        >
          + 添加空白页
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/SlideThumbnailList.tsx
git commit -m "feat: add SlideThumbnailList with delete and add slide"
```

---

## Task 4: StyleTab — 样式编辑面板

**Files:**
- Create: `packages/client/src/components/editor/StyleTab.tsx`

- [ ] **Step 1: 创建 StyleTab 组件**

```typescript
import { useEditorStore } from '../../hooks/useEditorStore';

export function StyleTab() {
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);

  if (!selectedElement) {
    return (
      <div className="p-4 text-[var(--color-text-dim2)] text-xs text-center mt-8">
        点击幻灯片中的元素进行编辑
      </div>
    );
  }

  const applyStyle = (property: string, value: string) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const el = doc.querySelector('.editor-selected') as HTMLElement | null;
    if (!el) return;
    (el.style as Record<string, string>)[property] = value;
    syncFromIframe();
    // 更新 selectedElement 状态
    const computed = doc.defaultView!.getComputedStyle(el);
    setSelectedElement({
      ...selectedElement,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      textAlign: computed.textAlign,
      textContent: el.textContent || '',
    });
  };

  const handleColorChange = (color: string) => applyStyle('color', color);
  const handleBgColorChange = (color: string) => applyStyle('backgroundColor', color);
  const handleFontSizeChange = (size: string) => applyStyle('fontSize', size);
  const handleFontWeightChange = (weight: string) => applyStyle('fontWeight', weight);
  const handleTextAlignChange = (align: string) => applyStyle('textAlign', align);

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px'];
  const fontWeights = [
    { label: '细', value: '300' },
    { label: '常规', value: '400' },
    { label: '中粗', value: '500' },
    { label: '粗体', value: '700' },
    { label: '特粗', value: '900' },
  ];
  const aligns = [
    { label: '左', value: 'left', icon: '☰' },
    { label: '中', value: 'center', icon: '☰' },
    { label: '右', value: 'right', icon: '☰' },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* 元素信息 */}
      <div>
        <div className="text-[10px] text-[var(--color-text-dim2)] mb-1">选中元素</div>
        <div className="text-[12px] text-[var(--color-text)]">&lt;{selectedElement.tagName}&gt;</div>
      </div>

      {/* 文字颜色 */}
      <div>
        <div className="text-[10px] text-[var(--color-text-dim2)] mb-1.5">文字颜色</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={rgbToHex(selectedElement.color)}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-8 h-8 rounded border border-[var(--color-border)] cursor-pointer bg-transparent"
          />
          <span className="text-[11px] text-[var(--color-text-dim)]">{rgbToHex(selectedElement.color)}</span>
        </div>
      </div>

      {/* 背景颜色 */}
      <div>
        <div className="text-[10px] text-[var(--color-text-dim2)] mb-1.5">背景颜色</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={rgbToHex(selectedElement.backgroundColor)}
            onChange={(e) => handleBgColorChange(e.target.value)}
            className="w-8 h-8 rounded border border-[var(--color-border)] cursor-pointer bg-transparent"
          />
          <span className="text-[11px] text-[var(--color-text-dim)]">{rgbToHex(selectedElement.backgroundColor)}</span>
        </div>
      </div>

      {/* 字号 */}
      <div>
        <div className="text-[10px] text-[var(--color-text-dim2)] mb-1.5">字号</div>
        <div className="flex flex-wrap gap-1">
          {fontSizes.map((size) => (
            <button
              key={size}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                selectedElement.fontSize === size
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => handleFontSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* 字重 */}
      <div>
        <div className="text-[10px] text-[var(--color-text-dim2)] mb-1.5">字重</div>
        <div className="flex gap-1">
          {fontWeights.map((fw) => (
            <button
              key={fw.value}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                selectedElement.fontWeight === fw.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => handleFontWeightChange(fw.value)}
            >
              {fw.label}
            </button>
          ))}
        </div>
      </div>

      {/* 对齐 */}
      <div>
        <div className="text-[10px] text-[var(--color-text-dim2)] mb-1.5">对齐</div>
        <div className="flex gap-1">
          {aligns.map((a) => (
            <button
              key={a.value}
              className={`px-3 py-1 rounded text-[10px] border transition-colors ${
                selectedElement.textAlign === a.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => handleTextAlignChange(a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图片上传（仅图片元素显示） */}
      {selectedElement.isImage && (
        <div>
          <div className="text-[10px] text-[var(--color-text-dim2)] mb-1.5">替换图片</div>
          <ImageUploaderInline />
        </div>
      )}
    </div>
  );
}

/** 内联图片上传按钮 */
function ImageUploaderInline() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const doc = iframeRef?.contentDocument;
        if (!doc) return;
        const el = doc.querySelector('.editor-selected') as HTMLImageElement | null;
        if (el) {
          el.src = base64;
          syncFromIframe();
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <button
      className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
      onClick={handleUpload}
    >
      上传图片替换
    </button>
  );
}

/** rgb(r, g, b) → #rrggbb */
function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/StyleTab.tsx
git commit -m "feat: add StyleTab with color, font, alignment editing"
```

---

## Task 5: ThemeTab — 主题切换面板

**Files:**
- Create: `packages/client/src/components/editor/ThemeTab.tsx`

- [ ] **Step 1: 创建 ThemeTab 组件**

主题 CSS 文件位于 `/html-ppt/assets/themes/`，共 36 个。切换主题 = 替换 iframe 内 `<link rel="stylesheet">` 的 href。

```typescript
import { useState, useEffect } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

// 36 个主题文件名（从 assets/themes/ 目录）
const THEMES = [
  'aurora', 'cyber', 'ocean', 'sunset', 'forest', 'volcano',
  'midnight', 'crystal', 'neon', 'pastel', 'retro', 'minimal',
  'corporate', 'creative', 'elegant', 'bold', 'calm', 'vibrant',
  'dark-tech', 'light-clean', 'gradient-blue', 'gradient-purple', 'gradient-green', 'gradient-red',
  'paper', 'ink', 'marble', 'wood', 'metal', 'glass',
  'space', 'desert', 'arctic', 'tropical', 'neon-city', 'vintage',
];

export function ThemeTab() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);

  // 检测当前主题
  useEffect(() => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const themeLink = doc.querySelector('link[rel="stylesheet"][href*="/themes/"]');
    if (themeLink) {
      const href = themeLink.getAttribute('href') || '';
      const match = href.match(/\/themes\/([^/.]+)/);
      if (match) setCurrentTheme(match[1]);
    }
  }, [iframeRef]);

  const handleSelectTheme = (themeName: string) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;

    // 查找或创建主题 link 元素
    let themeLink = doc.querySelector('link[rel="stylesheet"][href*="/themes/"]');
    if (!themeLink) {
      themeLink = doc.createElement('link');
      themeLink.setAttribute('rel', 'stylesheet');
      (themeLink as HTMLLinkElement).type = 'text/css';
      doc.head.appendChild(themeLink);
    }
    themeLink.setAttribute('href', `/html-ppt/assets/themes/${themeName}.css`);
    setCurrentTheme(themeName);
    syncFromIframe();
  };

  return (
    <div className="p-4">
      <div className="text-[10px] text-[var(--color-text-dim2)] mb-3">选择主题</div>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((theme) => (
          <button
            key={theme}
            className={`rounded-lg border-2 transition-all overflow-hidden ${
              currentTheme === theme
                ? 'border-[var(--color-primary)] shadow-md'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
            }`}
            onClick={() => handleSelectTheme(theme)}
          >
            <div
              className="h-12 w-full"
              style={{ background: `linear-gradient(135deg, var(--theme-preview-start, #333), var(--theme-preview-end, #666))` }}
            />
            <div className="text-[9px] text-[var(--color-text-dim)] py-1 text-center truncate px-1">
              {theme}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/ThemeTab.tsx
git commit -m "feat: add ThemeTab with 36 theme thumbnails"
```

---

## Task 6: FxTab — 动效选择面板（实时缩略图）

**Files:**
- Create: `packages/client/src/components/editor/FxTab.tsx`

Canvas FX 缩略图：每个 FX 在一个小 canvas（120×68）里加载对应 JS 跑真实动画。CSS 动画缩略图：展示动画名称，点击预览。

- [ ] **Step 1: 创建 FxTab 组件**

```typescript
import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

// Canvas FX 文件名（从 assets/fx/ 目录）
const CANVAS_FX = [
  'particles', 'matrix-rain', 'aurora', 'fireflies', 'bubbles',
  'starfield', 'rain', 'snow', 'lightning', 'smoke',
  'waves', 'ripple', 'nebula', 'constellation', 'fire',
  'geometric', 'hexagon', 'circuit', 'dna', 'pulse',
  'gradient-flow', 'morphing', 'crystal', 'plasma', 'vortex',
  'topology', 'noise',
];

// CSS 动画文件名（从 assets/animations/ 目录）
const CSS_ANIMATIONS = [
  'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'zoom-in', 'zoom-out', 'flip-x', 'flip-y', 'rotate',
  'bounce', 'elastic', 'glide', 'swing', 'fold',
  'unfold', 'push', 'pull', 'blur', 'morph',
];

/** 单个 Canvas FX 缩略图 */
function FxThumbnail({ fxName }: { fxName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 加载 FX 脚本到缩略图 canvas
    const script = document.createElement('script');
    script.src = `/html-ppt/assets/fx/${fxName}.js`;
    script.onload = () => {
      setLoaded(true);
      // 尝试调用 FX 的初始化函数（约定：window.initFx(canvas)）
      const initFn = (window as Record<string, unknown>)[`initFx_${fxName}`]
        || (window as Record<string, unknown>).initFx;
      if (typeof initFn === 'function') {
        (initFn as (c: HTMLCanvasElement) => void)(canvas);
      }
    };
    script.onerror = () => setLoaded(false);
    document.head.appendChild(script);

    return () => {
      script.remove();
      setLoaded(false);
    };
  }, [fxName]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-[var(--color-border)]">
      <canvas
        ref={canvasRef}
        width={120}
        height={68}
        className="w-full h-auto"
        style={{ background: '#111' }}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] text-[var(--color-text-dim)]">
          加载中...
        </div>
      )}
    </div>
  );
}

export function FxTab() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [activeSection, setActiveSection] = useState<'canvas' | 'css'>('canvas');
  const [currentFx, setCurrentFx] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);

  // 检测当前 FX/动画
  useEffect(() => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const fxScript = doc.querySelector('script[src*="/fx/"]');
    if (fxScript) {
      const src = fxScript.getAttribute('src') || '';
      const match = src.match(/\/fx\/([^/.]+)/);
      if (match) setCurrentFx(match[1]);
    }
    const animLink = doc.querySelector('link[href*="/animations/"]');
    if (animLink) {
      const href = animLink.getAttribute('href') || '';
      const match = href.match(/\/animations\/([^/.]+)/);
      if (match) setCurrentAnimation(match[1]);
    }
  }, [iframeRef]);

  const handleSelectCanvasFx = (fxName: string) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;

    // 移除旧 FX script
    doc.querySelectorAll('script[src*="/fx/"]').forEach((s) => s.remove());
    // 移除旧 FX canvas
    doc.querySelectorAll('canvas.fx-canvas').forEach((c) => c.remove());

    // 添加新 FX canvas
    const canvas = doc.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    doc.body.prepend(canvas);

    // 添加新 FX script
    const script = doc.createElement('script');
    script.src = `/html-ppt/assets/fx/${fxName}.js`;
    doc.body.appendChild(script);

    setCurrentFx(fxName);
    syncFromIframe();
  };

  const handleSelectCssAnimation = (animName: string) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;

    // 替换动画 CSS link
    let animLink = doc.querySelector('link[href*="/animations/"]');
    if (!animLink) {
      animLink = doc.createElement('link');
      animLink.setAttribute('rel', 'stylesheet');
      (animLink as HTMLLinkElement).type = 'text/css';
      doc.head.appendChild(animLink);
    }
    animLink.setAttribute('href', `/html-ppt/assets/animations/${animName}.css`);
    setCurrentAnimation(animName);
    syncFromIframe();
  };

  return (
    <div className="flex flex-col h-full">
      {/* 切换 Canvas FX / CSS 动画 */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          className={`flex-1 py-2 text-[11px] transition-colors ${
            activeSection === 'canvas'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-dim)]'
          }`}
          onClick={() => setActiveSection('canvas')}
        >
          背景动效
        </button>
        <button
          className={`flex-1 py-2 text-[11px] transition-colors ${
            activeSection === 'css'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-dim)]'
          }`}
          onClick={() => setActiveSection('css')}
        >
          切换动画
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeSection === 'canvas' ? (
          <div className="grid grid-cols-2 gap-2">
            {/* 无动效选项 */}
            <button
              className={`rounded-lg border-2 overflow-hidden transition-all ${
                currentFx === null
                  ? 'border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
              }`}
              onClick={() => {
                const doc = iframeRef?.contentDocument;
                if (!doc) return;
                doc.querySelectorAll('script[src*="/fx/"]').forEach((s) => s.remove());
                doc.querySelectorAll('canvas.fx-canvas').forEach((c) => c.remove());
                setCurrentFx(null);
                syncFromIframe();
              }}
            >
              <div className="h-[68px] bg-[#111] flex items-center justify-center text-[10px] text-[var(--color-text-dim)]">
                无动效
              </div>
              <div className="text-[9px] text-[var(--color-text-dim)] py-1 text-center">无</div>
            </button>
            {CANVAS_FX.map((fx) => (
              <button
                key={fx}
                className={`rounded-lg border-2 overflow-hidden transition-all ${
                  currentFx === fx
                    ? 'border-[var(--color-primary)] shadow-md'
                    : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
                }`}
                onClick={() => handleSelectCanvasFx(fx)}
              >
                <FxThumbnail fxName={fx} />
                <div className="text-[9px] text-[var(--color-text-dim)] py-1 text-center truncate px-1">
                  {fx}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {CSS_ANIMATIONS.map((anim) => (
              <button
                key={anim}
                className={`rounded-lg border-2 p-2 transition-all ${
                  currentAnimation === anim
                    ? 'border-[var(--color-primary)] shadow-md bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)] bg-[var(--color-surface-2)]'
                }`}
                onClick={() => handleSelectCssAnimation(anim)}
              >
                <div className="text-[9px] text-[var(--color-text-dim)] text-center truncate">
                  {anim}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/FxTab.tsx
git commit -m "feat: add FxTab with live canvas FX thumbnails and CSS animation picker"
```

---

## Task 7: LayoutTab — 布局切换面板

**Files:**
- Create: `packages/client/src/components/editor/LayoutTab.tsx`

布局切换的核心逻辑：选择新布局 → fetch 模板 HTML → 提取当前页的文字/图片 → 填入新布局的对应 slot → 替换当前 slide 的 innerHTML。

- [ ] **Step 1: 创建 LayoutTab 组件**

```typescript
import { useState, useEffect } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

// 31 个布局文件名（从 assets/templates/ 目录）
const LAYOUTS = [
  'cover', 'title', 'section', 'bullets', 'image-left',
  'image-right', 'image-full', 'two-column', 'three-column', 'quote',
  'chart-bar', 'chart-pie', 'chart-line', 'table', 'timeline',
  'process', 'comparison', 'team', 'testimonial', 'code',
  'numbered-list', 'icon-grid', 'feature-grid', 'stats', 'agenda',
  'thank-you', 'blank', 'image-gallery', 'call-to-action', 'key-points',
  'diagram',
];

interface LayoutPreviewProps {
  layoutName: string;
  isActive: boolean;
  onClick: () => void;
}

function LayoutPreview({ layoutName, isActive, onClick }: LayoutPreviewProps) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    fetch(`/html-ppt/assets/templates/${layoutName}.html`)
      .then((r) => r.text())
      .then(setHtml)
      .catch(() => setHtml(''));
  }, [layoutName]);

  return (
    <button
      className={`rounded-lg border-2 overflow-hidden transition-all ${
        isActive
          ? 'border-[var(--color-primary)] shadow-md'
          : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
      }`}
      onClick={onClick}
    >
      <div className="h-[68px] bg-[#111] overflow-hidden relative">
        {html && (
          <iframe
            srcDoc={html}
            width="960"
            height="540"
            style={{ transform: 'scale(0.125)', transformOrigin: 'top left', border: 'none', pointerEvents: 'none' }}
            title={layoutName}
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
      <div className="text-[9px] text-[var(--color-text-dim)] py-1 text-center truncate px-1">
        {layoutName}
      </div>
    </button>
  );
}

export function LayoutTab() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [currentLayout, setCurrentLayout] = useState<string | null>(null);

  const handleSelectLayout = async (layoutName: string) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;

    const slides = doc.querySelectorAll('.slide');
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;

    // 1. 提取当前页的内容
    const extractedContent = extractContent(currentSlide);

    // 2. 加载新布局模板
    try {
      const resp = await fetch(`/html-ppt/assets/templates/${layoutName}.html`);
      const templateHtml = await resp.text();

      // 3. 解析模板，将提取的内容填入对应 slot
      const parser = new DOMParser();
      const templateDoc = parser.parseFromString(templateHtml, 'text/html');
      const templateSlide = templateDoc.querySelector('.slide');
      if (!templateSlide) return;

      // 填充文字内容到模板的文本 slot
      const textSlots = templateSlide.querySelectorAll('[data-slot-type="text"], h1, h2, h3, p, li');
      textSlots.forEach((slot, i) => {
        if (extractedContent.texts[i]) {
          slot.textContent = extractedContent.texts[i];
        }
      });

      // 填充图片到模板的图片 slot
      const imgSlots = templateSlide.querySelectorAll('[data-slot-type="image"], img');
      imgSlots.forEach((slot, i) => {
        if (extractedContent.images[i]) {
          if (slot.tagName === 'IMG') {
            (slot as HTMLImageElement).src = extractedContent.images[i];
          } else {
            slot.setAttribute('data-src', extractedContent.images[i]);
          }
        }
      });

      // 4. 替换当前 slide 的内容
      currentSlide.innerHTML = templateSlide.innerHTML;
      // 复制模板 slide 的 class（保留布局相关 class）
      const templateClasses = templateSlide.className.split(' ').filter((c) => c !== 'slide');
      templateClasses.forEach((c) => {
        if (!currentSlide.classList.contains(c)) {
          currentSlide.classList.add(c);
        }
      });

      setCurrentLayout(layoutName);
      syncFromIframe();
    } catch {
      // 模板加载失败，忽略
    }
  };

  return (
    <div className="p-3">
      <div className="text-[10px] text-[var(--color-text-dim2)] mb-3">
        选择布局（当前页内容将迁移到新布局）
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUTS.map((layout) => (
          <LayoutPreview
            key={layout}
            layoutName={layout}
            isActive={currentLayout === layout}
            onClick={() => handleSelectLayout(layout)}
          />
        ))}
      </div>
    </div>
  );
}

/** 从当前 slide 中提取文字和图片内容 */
function extractContent(slide: Element): { texts: string[]; images: string[] } {
  const texts: string[] = [];
  const images: string[] = [];

  // 提取所有文本内容
  slide.querySelectorAll('h1, h2, h3, h4, p, li, span, a').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) texts.push(text);
  });

  // 提取所有图片 src
  slide.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src) images.push(src);
  });

  return { texts, images };
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/LayoutTab.tsx
git commit -m "feat: add LayoutTab with 31 layout templates and content migration"
```

---

## Task 8: PropertyPanel — 右侧属性面板容器

**Files:**
- Create: `packages/client/src/components/editor/PropertyPanel.tsx`

- [ ] **Step 1: 创建 PropertyPanel 组件**

```typescript
import { useEditorStore, EditorTab } from '../../hooks/useEditorStore';
import { StyleTab } from './StyleTab';
import { ThemeTab } from './ThemeTab';
import { FxTab } from './FxTab';
import { LayoutTab } from './LayoutTab';

const TABS: { key: EditorTab; label: string }[] = [
  { key: 'style', label: '样式' },
  { key: 'theme', label: '主题' },
  { key: 'fx', label: '动效' },
  { key: 'layout', label: '布局' },
];

export function PropertyPanel() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="w-[280px] border-l border-[var(--color-border)] flex flex-col bg-[var(--color-bg)]">
      {/* Tab 切换 */}
      <div className="flex border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'style' && <StyleTab />}
        {activeTab === 'theme' && <ThemeTab />}
        {activeTab === 'fx' && <FxTab />}
        {activeTab === 'layout' && <LayoutTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/editor/PropertyPanel.tsx
git commit -m "feat: add PropertyPanel with tab switching for style/theme/fx/layout"
```

---

## Task 9: Editor 页面整合 + useAIChat 同步

**Files:**
- Modify: `packages/client/src/pages/Editor.tsx`
- Modify: `packages/client/src/hooks/useAIChat.ts`
- Modify: `packages/client/src/components/PreviewPanel.tsx`

- [ ] **Step 1: 在 useAIChat 中添加 syncDeckHtml 方法**

在 `packages/client/src/hooks/useAIChat.ts` 的 `AIChatState` 接口中添加：

```typescript
// 从编辑器同步修改后的 HTML
syncDeckHtml: (html: string) => void;
```

在 store 实现中添加：

```typescript
syncDeckHtml: (html) => set({ deckHtml: html }),
```

- [ ] **Step 2: 重写 Editor.tsx**

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIChat } from '../hooks/useAIChat';
import { useEditorStore } from '../hooks/useEditorStore';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { SlideThumbnailList } from '../components/editor/SlideThumbnailList';
import { PropertyPanel } from '../components/editor/PropertyPanel';

export default function Editor() {
  const deckHtml = useAIChat((s) => s.deckHtml);
  const syncDeckHtml = useAIChat((s) => s.syncDeckHtml);
  const navigate = useNavigate();

  // 从 useAIChat 初始化 useEditorStore
  useEffect(() => {
    useEditorStore.getState().setDeckHtml(deckHtml);
  }, [deckHtml]);

  // 编辑器修改同步回 useAIChat
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.deckHtml !== prev.deckHtml) {
        syncDeckHtml(state.deckHtml);
      }
    });
    return unsub;
  }, [syncDeckHtml]);

  // 没有 HTML 时跳回首页
  useEffect(() => {
    if (!deckHtml) {
      navigate('/');
    }
  }, [deckHtml, navigate]);

  // 导出 HTML
  const handleExport = () => {
    const currentHtml = useEditorStore.getState().deckHtml;
    if (!currentHtml) return;
    const blob = new Blob([currentHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 返回首页
  const handleBack = () => {
    navigate('/');
  };

  if (!deckHtml) return null;

  return (
    <div className="h-screen flex flex-col bg-[#111118]">
      {/* 顶部工具栏 */}
      <div className="h-12 border-b border-[var(--color-border)] flex items-center justify-between px-4 bg-[var(--color-bg)]">
        <div className="flex items-center gap-3">
          <button
            className="text-[12px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
            onClick={handleBack}
          >
            ← 返回
          </button>
          <span className="text-[13px] font-semibold text-[var(--color-text)]">幻灯片编辑器</span>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
            onClick={handleExport}
          >
            导出 HTML
          </button>
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        <SlideThumbnailList />
        <EditorCanvas />
        <PropertyPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/pages/Editor.tsx packages/client/src/hooks/useAIChat.ts
git commit -m "feat: integrate editor page with three-panel layout and AI chat sync"
```

---

## Task 10: 图片上传到指定位置

**Files:**
- Create: `packages/client/src/components/editor/ImageUploader.tsx`

用户可以在幻灯片的任意位置添加图片。实现方式：双击 iframe 内的空白区域 → 在该位置插入一个可拖拽的图片占位符 → 用户上传图片后替换。

- [ ] **Step 1: 创建 ImageUploader 组件**

```typescript
import { useEditorStore } from '../../hooks/useEditorStore';

/**
 * 在 iframe 内当前 slide 的指定位置插入图片
 * 由侧栏的"添加图片"按钮调用
 */
export function insertImageAtPosition(
  iframeRef: HTMLIFrameElement | null,
  syncFromIframe: () => void,
  base64?: string,
) {
  const doc = iframeRef?.contentDocument;
  if (!doc) return;

  const activeSlide = doc.querySelector('.slide.is-active') || doc.querySelector('.slide');
  if (!activeSlide) return;

  const img = doc.createElement('img');
  img.src = base64 || '';
  img.style.cssText = 'max-width: 60%; max-height: 60%; position: relative; display: block; margin: 20px auto; cursor: pointer;';
  img.classList.add('editor-added-image');
  if (!base64) {
    img.alt = '点击上传图片';
    img.style.cssText += 'min-width: 120px; min-height: 80px; background: rgba(59,108,255,0.1); border: 2px dashed rgba(59,108,255,0.4);';
  }
  activeSlide.appendChild(img);
  syncFromIframe();
}

export function ImageUploader() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        insertImageAtPosition(iframeRef, syncFromIframe, base64);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="p-4 border-t border-[var(--color-border)]">
      <div className="text-[10px] text-[var(--color-text-dim2)] mb-2">添加图片到当前页</div>
      <button
        className="w-full py-2 rounded-lg bg-[var(--color-surface-2)] border border-dashed border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
        onClick={handleUpload}
      >
        + 上传图片
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 在 SlideThumbnailList 底部添加 ImageUploader**

在 `SlideThumbnailList.tsx` 中导入并添加 `ImageUploader`：

```typescript
import { ImageUploader } from './ImageUploader';
```

在组件 JSX 的 `</div>` 闭合标签前（"添加空白页"按钮之后）添加：

```tsx
<ImageUploader />
```

- [ ] **Step 3: TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/components/editor/ImageUploader.tsx packages/client/src/components/editor/SlideThumbnailList.tsx
git commit -m "feat: add image upload to slides with base64 inline"
```

---

## Task 11: 清理旧编辑器组件 + 最终集成测试

**Files:**
- Modify: `packages/client/src/pages/Editor.tsx`（确认旧组件引用已移除）
- Verify: 所有组件正确导入，无死代码

- [ ] **Step 1: 确认 Editor.tsx 不引用旧组件**

检查 `Editor.tsx` 中是否还引用了旧的 `SlideCanvas`, `StylePanel`, `SlideList` 组件。如果存在，移除这些导入。当前 Task 9 的 Editor.tsx 已经是全新实现，不应有旧引用。

- [ ] **Step 2: 确认路由正常**

检查 `packages/client/src/App.tsx` 或路由配置文件，确认 `/editor` 路由指向新的 Editor 页面。

- [ ] **Step 3: 完整 TypeScript 编译验证**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 手动功能测试**

1. 启动 `pnpm dev`
2. 上传文件或输入提示词生成幻灯片
3. 点击"进入编辑器" → 应显示三栏编辑器
4. 点击文字 → 应可编辑，侧栏样式面板显示属性
5. 修改颜色/字号 → 应实时生效
6. 切换主题 tab → 点击主题 → 幻灯片主题应切换
7. 切换动效 tab → 点击 FX → 应看到背景动效变化
8. 切换布局 tab → 点击布局 → 当前页内容应迁移到新布局
9. 左侧缩略图 → 点击切换页面、删除页面、添加空白页
10. 上传图片 → 应插入到当前页
11. 点击"导出 HTML" → 应下载完整 HTML 文件
12. 点击"返回" → 应回到首页，且修改已保存

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: clean up old editor components and verify integration"
```
