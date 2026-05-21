import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Deck } from '@html-studio/shared';
import { renderDeck } from '../lib/renderer';
import { cleanEditorArtifacts } from '../hooks/useEditorStore';

interface SlideCanvasProps {
  deck: Deck;
  currentSlideIndex: number;
  deckHtml?: string | null;
}

export function SlideCanvas({ deck, currentSlideIndex, deckHtml }: SlideCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState('');
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(1);

  // Calculate scale to fit 16:9 slide in container
  const updateScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    // Slide is 960x540 (16:9), scale to fit container with padding
    const maxW = width - 48;
    const maxH = height - 80;
    const scaleX = maxW / 960;
    const scaleY = maxH / 540;
    setScale(Math.min(scaleX, scaleY, 1));
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  useEffect(() => {
    let cancelled = false;

    if (deckHtml) {
      // AI 生成的 HTML — 清理编辑器残留后使用
      setHtml(cleanEditorArtifacts(deckHtml));
      setRendering(false);
      return;
    }

    setRendering(true);
    renderDeck(deck, { includeRuntime: true, includeAnimations: true, includeFx: true }).then(result => {
      if (!cancelled) {
        setHtml(result);
        setRendering(false);
      }
    });
    return () => { cancelled = true; };
  }, [deck, deckHtml]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;
    try {
      iframe.contentWindow?.postMessage({ type: 'preview-goto', idx: currentSlideIndex }, '*');
    } catch { /* iframe not ready */ }
  }, [currentSlideIndex, html]);

  const totalSlides = deckHtml
    ? (deckHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length
    : deck.slides.length;

  return (
    <div ref={containerRef} className="flex-1 bg-[var(--color-bg)] flex flex-col items-center justify-center relative overflow-hidden">
      {/* 顶部信息 */}
      <div className="absolute top-3 left-4 flex gap-2 text-[10px]">
        <span className="bg-[var(--color-surface-2)] text-[var(--color-text-dim)] px-2 py-0.5 rounded">16:9</span>
      </div>

      {/* iframe with scaling */}
      {rendering && <div className="text-xs text-[var(--color-text-dim)]">渲染中...</div>}
      <div style={{ width: 960 * scale, height: 540 * scale, overflow: 'hidden', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          width="960"
          height="540"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none' }}
          title="幻灯片预览"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* 底部导航 */}
      <div className="absolute bottom-3 flex items-center gap-3 text-xs">
        <button
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          onClick={() => {
            const iframe = iframeRef.current;
            if (iframe) iframe.contentWindow?.postMessage({ type: 'preview-goto', idx: currentSlideIndex - 1 }, '*');
          }}
        >&laquo;</button>
        <span className="text-[var(--color-text)]">{currentSlideIndex + 1} / {totalSlides}</span>
        <button
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          onClick={() => {
            const iframe = iframeRef.current;
            if (iframe) iframe.contentWindow?.postMessage({ type: 'preview-goto', idx: currentSlideIndex + 1 }, '*');
          }}
        >&raquo;</button>
      </div>
    </div>
  );
}