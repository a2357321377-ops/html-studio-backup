import type { Slide } from '@html-studio/shared';

interface SlideCardProps {
  slide: Slide;
  index: number;
  active: boolean;
  onClick: () => void;
}

export function SlideCard({ slide, index, active, onClick }: SlideCardProps) {
  const num = String(index + 1).padStart(2, '0');
  return (
    <div
      className={`rounded-lg p-2 cursor-pointer transition-colors ${
        active ? 'bg-[var(--color-primary)]/20 border border-[var(--color-primary)]' : 'bg-[var(--color-surface-2)] border border-transparent hover:border-[var(--color-border)]'
      }`}
      onClick={onClick}
    >
      <div className="h-12 bg-[var(--color-bg)] rounded flex items-center justify-center text-[10px] text-[var(--color-text-dim)]">
        {slide.layout}
      </div>
      <div className={`mt-1 text-[10px] ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-dim)]'}`}>
        {num} · {slide.layout}
      </div>
    </div>
  );
}