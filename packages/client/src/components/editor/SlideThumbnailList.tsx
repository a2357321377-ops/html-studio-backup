import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';
import { ImageUploader } from './ImageUploader';

/**
 * 左侧幻灯片缩略图列表
 * - 每个 slide 用小 iframe 渲染缩略图
 * - 支持切换当前编辑页、删除页、添加页
 */
export function SlideThumbnailList() {
  const deckHtml = useEditorStore((s) => s.deckHtml);
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const totalSlides = useEditorStore((s) => s.totalSlides);
  const setCurrentSlideIndex = useEditorStore((s) => s.setCurrentSlideIndex);
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const setDeckHtml = useEditorStore((s) => s.setDeckHtml);

  // 解析出每页 slide 的 HTML 片段
  const getSlideHtmlList = useCallback((): string[] => {
    if (!deckHtml) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(deckHtml, 'text/html');
    const slides = doc.querySelectorAll('.slide');
    const baseHtml = deckHtml;
    const results: string[] = [];
    slides.forEach((slide, i) => {
      // 构建一个只显示当前 slide 的完整 HTML
      const clonedDoc = doc.cloneNode(true) as Document;
      const clonedSlides = clonedDoc.querySelectorAll('.slide');
      clonedSlides.forEach((s, j) => {
        s.classList.toggle('is-active', j === i);
        s.classList.toggle('is-prev', j < i);
      });
      results.push(clonedDoc.documentElement.outerHTML);
    });
    return results;
  }, [deckHtml]);

  const slideHtmlList = getSlideHtmlList();

  // 切换当前页
  const handleSelectSlide = (idx: number) => {
    setCurrentSlideIndex(idx);
    // 通知 iframe 翻页
    iframeRef?.contentWindow?.postMessage({ type: 'editor-goto', idx }, '*');
  };

  // 删除当前页
  const handleDeleteSlide = (idx: number) => {
    if (!iframeRef?.contentDocument) return;
    const doc = iframeRef.contentDocument;
    const slides = doc.querySelectorAll('.slide');
    if (slides.length <= 1) return; // 至少保留一页
    slides[idx].remove();
    syncFromIframe();
    // 重新计算
    const newTotal = doc.querySelectorAll('.slide').length;
    const newIdx = Math.min(idx, newTotal - 1);
    setCurrentSlideIndex(newIdx);
    // 通知 iframe 更新 active 状态
    const remaining = doc.querySelectorAll('.slide');
    remaining.forEach((s, i) => {
      s.classList.toggle('is-active', i === newIdx);
      s.classList.toggle('is-prev', i < newIdx);
    });
  };

  // 添加空白页（复制最后一页的布局，清空内容）
  const handleAddSlide = () => {
    if (!iframeRef?.contentDocument) return;
    const doc = iframeRef.contentDocument;
    const slides = doc.querySelectorAll('.slide');
    const lastSlide = slides[slides.length - 1];
    if (!lastSlide) return;
    const newSlide = lastSlide.cloneNode(true) as HTMLElement;
    // 清空文字内容
    newSlide.querySelectorAll('h1, h2, h3, p, span, li').forEach((el) => {
      el.textContent = '';
    });
    newSlide.classList.remove('is-active', 'is-prev');
    lastSlide.parentElement?.appendChild(newSlide);
    syncFromIframe();
    // 跳到新页
    const newIdx = doc.querySelectorAll('.slide').length - 1;
    setCurrentSlideIndex(newIdx);
    handleSelectSlide(newIdx);
  };

  return (
    <div className="w-[180px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg)]">
      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-[11px] font-semibold text-[var(--color-text-dim)]">幻灯片</span>
      </div>

      {/* 缩略图列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slideHtmlList.map((html, i) => (
          <div
            key={i}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              i === currentSlideIndex
                ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
            }`}
            onClick={() => handleSelectSlide(i)}
          >
            {/* 缩略图 iframe */}
            <div className="w-full" style={{ aspectRatio: '16/9' }}>
              <iframe
                srcDoc={html}
                className="w-full h-full border-none pointer-events-none"
                style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
                title={`幻灯片 ${i + 1}`}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            {/* 页码 + 删除按钮 */}
            <div className="absolute bottom-1 right-1 flex items-center gap-1">
              <span className="text-[9px] text-white/70 bg-black/50 rounded px-1">{i + 1}</span>
              {totalSlides > 1 && (
                <button
                  className="w-4 h-4 rounded bg-black/50 text-white/70 hover:text-red-400 text-[10px] flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); handleDeleteSlide(i); }}
                  title="删除此页"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 添加页 + 添加图片按钮 */}
      <div className="p-2 border-t border-[var(--color-border)] space-y-1.5">
        <button
          className="w-full py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
          onClick={handleAddSlide}
        >
          + 添加幻灯片
        </button>
        <ImageUploader />
      </div>
    </div>
  );
}
