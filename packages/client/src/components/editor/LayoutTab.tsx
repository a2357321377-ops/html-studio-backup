import { useState, useCallback } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';
import { layouts } from '@html-studio/shared';

/**
 * 布局切换面板
 * - 31 个布局模板
 * - 选择后：提取当前 slide 的文字/图片 → 填入新布局模板
 */
export function LayoutTab() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [loading, setLoading] = useState(false);

  // 从当前 slide 提取内容
  const extractSlideContent = useCallback(() => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return null;
    const slides = doc.querySelectorAll('.slide');
    const slide = slides[currentSlideIndex];
    if (!slide) return null;

    const texts: string[] = [];
    const images: string[] = [];

    slide.querySelectorAll('h1, h2, h3, p, span, li').forEach((el) => {
      const text = el.textContent?.trim();
      if (text) texts.push(text);
    });
    slide.querySelectorAll('img').forEach((img) => {
      if (img.src) images.push(img.src);
    });

    return { texts, images };
  }, [iframeRef, currentSlideIndex]);

  // 将内容填入新布局模板
  const handleSelectLayout = async (layoutName: string) => {
    const content = extractSlideContent();
    if (!content) return;

    setLoading(true);
    try {
      // 加载布局模板 HTML
      const resp = await fetch(`/html-ppt/assets/templates/${layoutName}.html`);
      if (!resp.ok) throw new Error('模板加载失败');
      const templateHtml = await resp.text();

      // 解析模板，填入内容
      const parser = new DOMParser();
      const doc = parser.parseFromString(templateHtml, 'text/html');
      const slots = doc.querySelectorAll('[data-slot]');

      let textIdx = 0;
      let imgIdx = 0;

      slots.forEach((slot) => {
        const slotType = slot.getAttribute('data-slot') || 'text';
        if (slotType === 'image' || slot.tagName === 'IMG') {
          if (imgIdx < content.images.length) {
            if (slot.tagName === 'IMG') {
              (slot as HTMLImageElement).src = content.images[imgIdx];
            } else {
              slot.style.backgroundImage = `url(${content.images[imgIdx]})`;
            }
            imgIdx++;
          }
        } else {
          if (textIdx < content.texts.length) {
            slot.textContent = content.texts[textIdx];
            textIdx++;
          }
        }
      });

      // 替换 iframe 中当前 slide
      const iframeDoc = iframeRef?.contentDocument;
      if (!iframeDoc) return;;
      const currentSlides = iframeDoc.querySelectorAll('.slide');
      const currentSlide = currentSlides[currentSlideIndex];
      if (!currentSlide) return;

      // 从模板中提取 slide 内容
      const newSlide = doc.querySelector('.slide');
      if (newSlide) {
        // 保留 is-active/is-prev class
        newSlide.classList.toggle('is-active', currentSlide.classList.contains('is-active'));
        newSlide.classList.toggle('is-prev', currentSlide.classList.contains('is-prev'));
        currentSlide.replaceWith(newSlide);
      }

      syncFromIframe();
    } catch (err) {
      console.error('布局切换失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 布局分类
  const layoutCategories: Record<string, string> = {
    cover: '封面',
    content: '内容',
    media: '图文',
    data: '数据',
    code: '代码',
    end: '结尾',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-[11px] text-[var(--color-text-dim)]">
          选择布局将替换当前页面的布局，文字和图片内容会自动迁移
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="text-[11px] text-[var(--color-text-dim)] text-center py-4">
            正在切换布局...
          </div>
        )}

        {Object.entries(layoutCategories).map(([catKey, catLabel]) => {
          const catLayouts = layouts.filter((l) => l.category === catKey);
          if (catLayouts.length === 0) return null;
          return (
            <div key={catKey} className="mb-4">
              <div className="text-[10px] text-[var(--color-text-dim2)] mb-2">{catLabel}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {catLayouts.map((layout) => (
                  <button
                    key={layout.name}
                    className="rounded-lg border border-[var(--color-border)] hover:border-[var(--color-text-dim)] bg-[var(--color-surface-2)] overflow-hidden transition-all"
                    onClick={() => handleSelectLayout(layout.name)}
                    disabled={loading}
                  >
                    {/* 布局缩略图 — 用 iframe 渲染 */}
                    <div className="w-full" style={{ aspectRatio: '16/9' }}>
                      <iframe
                        srcDoc={getLayoutPreviewHtml(layout.name)}
                        className="w-full h-full border-none pointer-events-none"
                        title={layout.label}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                    <div className="text-[8px] text-[var(--color-text-dim)] text-center py-0.5 truncate px-1">
                      {layout.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 生成布局预览 HTML（只加载模板 + 基础样式） */
function getLayoutPreviewHtml(layoutName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/html-ppt/assets/base.css">
  <link rel="stylesheet" href="/html-ppt/assets/fonts.css">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    .slide { width: 100%; height: 100%; position: relative; }
  </style>
</head>
<body>
  <div data-layout="${layoutName}" data-slot="text">示例文本</div>
  <script>
    fetch('/html-ppt/assets/templates/${layoutName}.html')
      .then(r => r.text())
      .then(html => {
        document.body.innerHTML = html;
      });
  </script>
</body>
</html>`;
}