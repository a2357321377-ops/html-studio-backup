import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useEditorStore, cleanEditorArtifacts } from '../../hooks/useEditorStore';
import { ImageUploader } from './ImageUploader';

/**
 * 左侧幻灯片缩略图列表
 *
 * 性能优化：
 * 1. 防抖：deckHtml 变化后延迟 300ms 再更新缩略图
 * 2. 懒加载：只有进入视口的缩略图才创建 iframe，离开视口的销毁
 * 3. 占位符：未加载的缩略图显示灰色占位符
 */
export function SlideThumbnailList() {
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const totalSlides = useEditorStore((s) => s.totalSlides);
  const setCurrentSlideIndex = useEditorStore((s) => s.setCurrentSlideIndex);
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);

  // 防抖：deckHtml 变化后延迟 300ms 再更新缩略图
  const rawDeckHtml = useEditorStore((s) => s.deckHtml);
  const [deckHtml, setDebouncedHtml] = useState(rawDeckHtml);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 缩略图缩放比例
  const listRef = useRef<HTMLDivElement>(null);
  const [thumbScale, setThumbScale] = useState(1);

  // 懒加载：跟踪哪些缩略图已进入视口
  const [visibleSlides, setVisibleSlides] = useState<Set<number>>(new Set([0]));
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedHtml(rawDeckHtml);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rawDeckHtml]);

  // 监听容器宽度变化，计算缩放比例
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const updateScale = () => {
      const availableWidth = container.clientWidth - 20;
      const scale = availableWidth / 960;
      setThumbScale(scale);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 初始化 IntersectionObserver（只创建一次，通过 ref callback 动态注册观察）
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSlides((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const idx = Number(entry.target.getAttribute('data-slide-idx'));
            if (entry.isIntersecting) {
              next.add(idx);
            }
            // 不移除已加载的，避免来回滚动时反复创建/销毁 iframe
          }
          return next;
        });
      },
      { root: listRef.current, rootMargin: '200px 0px' }
    );
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  // ref callback：每个缩略图容器渲染后注册到 IntersectionObserver
  const observeSlide = useCallback((el: HTMLDivElement | null) => {
    if (el && observerRef.current) {
      observerRef.current.observe(el);
    }
  }, []);

  // 从 deckHtml 中提取每页 slide 的内容信息 + head 中的样式表链接
  const { slideInfos, headLinks } = useMemo(() => {
    if (!deckHtml) return { slideInfos: [], headLinks: '' };
    const cleanSource = cleanEditorArtifacts(deckHtml);
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanSource, 'text/html');
    const slides = doc.querySelectorAll('.slide');
    if (slides.length === 0) return { slideInfos: [], headLinks: '' };

    // 提取 head 中的样式表链接（主题、动画等），确保缩略图样式与编辑页一致
    const links: string[] = [];
    doc.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href) {
        links.push(`<link rel="stylesheet" href="${href}">`);
      }
    });
    const headLinksStr = links.join('');

    const infos: { innerHtml: string; slideClasses: string; slideStyle: string }[] = [];
    slides.forEach((slide) => {
      const classes = Array.from(slide.classList)
        .filter((c) => c !== 'is-active' && c !== 'is-prev')
        .join(' ');
      // 保留 slide 自身的 inline style，确保缩略图与编辑页一致
      const slideStyle = slide.getAttribute('style') || '';
      infos.push({
        innerHtml: slide.innerHTML,
        slideClasses: classes,
        slideStyle,
      });
    });
    return { slideInfos: infos, headLinks: headLinksStr };
  }, [deckHtml]);

  // 切换当前页（先同步当前页的编辑内容，再翻页）
  const handleSelectSlide = (idx: number) => {
    // 切换页面前先同步当前编辑内容到 store，确保缩略图更新
    syncFromIframe();
    setCurrentSlideIndex(idx);
    iframeRef?.contentWindow?.postMessage({ type: 'editor-goto', idx }, '*');
  };

  // 删除当前页
  const handleDeleteSlide = (idx: number) => {
    if (!iframeRef?.contentDocument) return;
    const doc = iframeRef.contentDocument;
    const slides = doc.querySelectorAll('.slide');
    if (slides.length <= 1) return;
    slides[idx].remove();
    syncFromIframe();
    const newTotal = doc.querySelectorAll('.slide').length;
    const newIdx = Math.min(idx, newTotal - 1);
    setCurrentSlideIndex(newIdx);
    const remaining = doc.querySelectorAll('.slide');
    remaining.forEach((s, i) => {
      s.classList.toggle('is-active', i === newIdx);
      s.classList.toggle('is-prev', i < newIdx);
    });
  };

  // 添加空白页
  const handleAddSlide = () => {
    if (!iframeRef?.contentDocument) return;
    const doc = iframeRef.contentDocument;
    const slides = doc.querySelectorAll('.slide');
    const lastSlide = slides[slides.length - 1];
    if (!lastSlide) return;
    const newSlide = lastSlide.cloneNode(true) as HTMLElement;
    newSlide.querySelectorAll('h1, h2, h3, p, span, li').forEach((el) => {
      el.textContent = '';
    });
    newSlide.classList.remove('is-active', 'is-prev');
    lastSlide.parentElement?.appendChild(newSlide);
    syncFromIframe();
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
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {slideInfos.map((info, i) => (
          <div
            key={i}
            ref={observeSlide}
            data-slide-idx={i}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              i === currentSlideIndex
                ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
            }`}
            onClick={() => handleSelectSlide(i)}
          >
            {visibleSlides.has(i) ? (
              /* 已进入视口：渲染 iframe 缩略图 */
              <div style={{ width: 960 * thumbScale, height: 540 * thumbScale, overflow: 'hidden' }}>
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><link rel="stylesheet" href="/html-ppt/assets/base.css"><link rel="stylesheet" href="/html-ppt/assets/fonts.css">${headLinks}</head><body style="margin:0;padding:0;overflow:hidden"><div class="deck"><div class="slide is-active ${info.slideClasses}" style="${info.slideStyle || 'position:relative;width:960px;height:540px;opacity:1;pointer-events:auto;transform:none;padding:72px 96px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center'}">${info.innerHtml}</div></div></body></html>`}
                  width="960"
                  height="540"
                  className="border-none pointer-events-none"
                  style={{ transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}
                  title={`幻灯片 ${i + 1}`}
                />
              </div>
            ) : (
              /* 未进入视口：灰色占位符 */
              <div
                style={{ width: 960 * thumbScale, height: 540 * thumbScale }}
                className="bg-[var(--color-surface-2)]"
              />
            )}
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