import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // 生成进度百分比
  const progressPercent = generating && totalPages > 0
    ? Math.min(100, Math.round((currentPage / Math.max(totalPages, 7)) * 100))
    : generating ? 30 : 100;

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
        {deckHtml ? (
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
            {/* 生成进度条 */}
            {generating && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-r-sm"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #3b6cff, #4ade80)',
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-[var(--color-text-dim2)] text-xs">
            {generating ? 'AI 正在生成...' : '上传文件并发送提示词，预览将在此显示'}
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
            className="px-4 py-2 rounded-lg text-xs text-white font-semibold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
            disabled={!deckHtml || generating}
            onClick={handleEnterEditor}
          >
            进入编辑器
          </button>
        </div>
      </div>
    </div>
  );
}
