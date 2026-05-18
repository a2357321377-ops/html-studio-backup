import { useRef, useEffect, useState, useCallback } from 'react';

interface FullscreenPresenterProps {
  deckHtml: string;
  totalPages: number;
  onClose: () => void;
}

export function FullscreenPresenter({ deckHtml, totalPages, onClose }: FullscreenPresenterProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 翻页 — 操作 iframe 内 DOM 切换 is-active class
  const gotoPage = useCallback((idx: number) => {
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
      const numEl = doc.querySelector('.slide-number');
      if (numEl) {
        numEl.setAttribute('data-current', String(clamped + 1));
        numEl.setAttribute('data-total', String(totalPages));
      }
    } catch {
      iframeRef.current?.contentWindow?.postMessage({ type: 'preview-goto', idx: clamped }, '*');
    }
  }, [totalPages]);

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        gotoPage(currentPage);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        gotoPage(currentPage - 2);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, gotoPage, onClose]);

  // 鼠标移动时显示控制栏，3秒后自动隐藏
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // iframe 加载后：设置第一页为 active + 绑定 iframe 内 ESC 监听
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !deckHtml) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const slides = doc.querySelectorAll('.slide');
        slides.forEach((s, i) => {
          s.classList.toggle('is-active', i === 0);
          s.classList.toggle('is-prev', i < 0);
        });
        // iframe 内 ESC 键 → postMessage 通知外层退出
        doc.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            window.postMessage({ type: 'fullscreen-esc' }, '*');
          }
        });
      } catch {
        // cross-origin
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [deckHtml]);

  // 监听 iframe 内通过 postMessage 发来的 ESC 事件
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'fullscreen-esc') {
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  // 阻止 body 滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={showControlsTemporarily}
    >
      {/* 幻灯片 iframe — 全屏居中 */}
      <iframe
        ref={iframeRef}
        srcDoc={deckHtml}
        className="w-full h-full border-none"
        style={{ maxWidth: '100vw', maxHeight: '100vh' }}
        title="全屏演讲预览"
        sandbox="allow-scripts allow-same-origin"
      />

      {/* 演讲者控制栏 — 底部浮动 */}
      <div
        className="fixed bottom-0 left-0 right-0 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
      >
        <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* 左侧：页码 */}
          <div className="flex items-center gap-4">
            <button
              className="w-10 h-10 rounded-lg bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 text-lg"
              disabled={currentPage <= 1}
              onClick={() => gotoPage(currentPage - 2)}
            >
              ◀
            </button>
            <span className="text-white/90 text-sm font-mono min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              className="w-10 h-10 rounded-lg bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 text-lg"
              disabled={currentPage >= totalPages}
              onClick={() => gotoPage(currentPage)}
            >
              ▶
            </button>
          </div>

          {/* 中间：演讲者提示 */}
          <div className="text-white/50 text-xs hidden md:block">
            ← → 翻页 &nbsp;|&nbsp; ESC 退出
          </div>

          {/* 右侧：退出按钮 */}
          <button
            className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20"
            onClick={onClose}
          >
            退出演讲
          </button>
        </div>
      </div>
    </div>
  );
}
