import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeck } from '../hooks/useDeck';
import { SlideList } from '../components/SlideList';
import { SlideCanvas } from '../components/SlideCanvas';
import { StylePanel } from '../components/StylePanel';
import { ExportDialog } from '../components/ExportDialog';
import { AIOptimizeButton } from '../components/AIOptimizeButton';

export default function Editor() {
  const navigate = useNavigate();
  const deck = useDeck(s => s.deck);
  const currentSlideIndex = useDeck(s => s.currentSlideIndex);
  const [exportOpen, setExportOpen] = useState(false);

  if (!deck || deck.slides.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-dim)] mb-4">还没有幻灯片数据</p>
          <button onClick={() => navigate('/')} className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2 text-xs">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <SlideList />
      <SlideCanvas deck={deck} currentSlideIndex={currentSlideIndex} />
      <div className="flex flex-col">
        <StylePanel />
        <div className="p-2 border-l border-[var(--color-border)] bg-[var(--color-surface)]">
          <AIOptimizeButton />
          <button
            onClick={() => setExportOpen(true)}
            className="w-full bg-[var(--color-primary)] text-white rounded-lg py-2 text-xs font-semibold"
          >
            导出 HTML
          </button>
          <button
            onClick={() => navigate('/preview')}
            className="w-full mt-1 bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)] rounded-lg py-1.5 text-[10px]"
          >
            全屏预览
          </button>
        </div>
      </div>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}