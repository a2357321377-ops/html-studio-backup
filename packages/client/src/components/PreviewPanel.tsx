import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FullscreenPresenter } from './FullscreenPresenter';
import { useAIChat } from '../hooks/useAIChat';

interface PreviewPanelProps {
  deckHtml: string;
  generating: boolean;
}

export function PreviewPanel({ deckHtml, generating }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const generationProgress = useAIChat((s) => s.generationProgress);
  const generationPhase = useAIChat((s) => s.generationPhase);
  const navigate = useNavigate();

  // 计算 iframe 缩放
  const updateScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
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

  // iframe 加载完成后，恢复当前页的 is-active 状态
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !deckHtml) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const slides = doc.querySelectorAll('.slide');
        const targetIdx = currentPage - 1;
        slides.forEach((s, i) => {
          s.classList.toggle('is-active', i === targetIdx);
          s.classList.toggle('is-prev', i < targetIdx);
        });
      } catch {
        // cross-origin, ignore
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [deckHtml, currentPage]);

  // 从 HTML 中估算页数
  useEffect(() => {
    if (deckHtml) {
      const count = (deckHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length;
      setTotalPages(count);
    }
  }, [deckHtml]);

  // 翻页 — 直接操作 iframe 内 DOM 切换 is-active class
  const gotoPage = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, totalPages - 1));
    setCurrentPage(clamped + 1);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const slides = doc.querySelectorAll('.slide');
      slides.forEach((s, i) => {
        s.classList.toggle('is-active', i === clamped);
        s.classList.toggle('is-prev', i < clamped);
      });
      // 更新页码元素
      const numEl = doc.querySelector('.slide-number');
      if (numEl) {
        numEl.setAttribute('data-current', String(clamped + 1));
        numEl.setAttribute('data-total', String(totalPages));
      }
    } catch {
      // cross-origin fallback: postMessage
      iframeRef.current?.contentWindow?.postMessage({ type: 'preview-goto', idx: clamped }, '*');
    }
  };

  // 导出 HTML
  const handleExport = () => {
    if (!deckHtml) return;
    const blob = new Blob([deckHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 进入编辑器
  const handleEnterEditor = () => {
    navigate('/editor');
  };

  
  return (
    <div className="w-[55%] flex flex-col bg-[#111118]">
      {/* 顶部信息 */}
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--color-text-dim)]">幻灯片预览</span>
        <div className="flex gap-2">
          {totalPages > 0 && <span className="text-[11px] text-[var(--color-text-dim)]">{totalPages} 页</span>}
        </div>
      </div>

      {/* iframe 预览区 */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-5 relative overflow-hidden">
        {generating ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]" />
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin"
              />
            </div>
            <div className="text-[var(--color-text-dim)] text-sm">{generationPhase || 'AI 正在生成幻灯片...'}</div>
            <div className="w-48 h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%`, background: 'linear-gradient(90deg, #3b6cff, #7a5cff)' }}
              />
            </div>
            <div className="text-[var(--color-text-dim2)] text-[10px]">{generationProgress}%</div>
          </div>
        ) : deckHtml ? (
          <div
            className="relative"
            style={{
              width: 960 * scale,
              height: 540 * scale,
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
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none' }}
              title="幻灯片预览"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <div className="text-[var(--color-text-dim2)] text-xs">
            上传文件并发送提示词，预览将在此显示
          </div>
        )}
      </div>

      {/* 底部控制栏 */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] flex items-center justify-center hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={currentPage <= 1 || !deckHtml}
            onClick={() => gotoPage(currentPage - 2)}
          >
            ◀
          </button>
          <span className="text-xs text-[var(--color-text)]">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : '- / -'}
          </span>
          <button
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] flex items-center justify-center hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={currentPage >= totalPages || !deckHtml}
            onClick={() => gotoPage(currentPage)}
          >
            ▶
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={!deckHtml}
            onClick={handleExport}
          >
            导出 HTML
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={!deckHtml || generating}
            onClick={() => setFullscreen(true)}
          >
            全屏演讲
          </button>
          <button
            className="px-4 py-2 rounded-lg text-xs text-white font-semibold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
            disabled={!deckHtml || generating}
            onClick={handleEnterEditor}
          >
            进入编辑器
          </button>
        </div>
      </div>

      {/* 全屏演讲模式 */}
      {fullscreen && deckHtml && (
        <FullscreenPresenter
          deckHtml={deckHtml}
          totalPages={totalPages}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}
