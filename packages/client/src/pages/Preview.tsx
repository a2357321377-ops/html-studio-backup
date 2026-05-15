import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeck } from '../hooks/useDeck';
import { renderDeck } from '../lib/renderer';

export default function Preview() {
  const navigate = useNavigate();
  const deck = useDeck(s => s.deck);
  const [html, setHtml] = useState('');
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!deck) return;
    renderDeck(deck).then(setHtml);
  }, [deck]);

  // Auto-hide controls after 3 seconds of no mouse movement
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  // ESC to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/editor');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <button onClick={() => navigate('/')} className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2 text-xs">返回首页</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center relative" onMouseMove={handleMouseMove}>
      <iframe
        srcDoc={html}
        className="w-full h-full border-0"
        title="全屏预览"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />

      {/* Floating controls - auto-hide */}
      <div
        className={`absolute top-4 left-4 flex gap-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={() => navigate('/editor')}
          className="bg-black/60 hover:bg-black/80 text-white rounded-lg px-3 py-1.5 text-xs backdrop-blur-sm flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回编辑
        </button>
      </div>

      {/* ESC hint */}
      <div
        className={`absolute bottom-4 right-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <span className="bg-black/60 text-white/60 rounded px-2 py-1 text-[10px] backdrop-blur-sm">ESC 返回编辑</span>
      </div>
    </div>
  );
}