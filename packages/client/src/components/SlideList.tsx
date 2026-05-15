import { useDeck } from '../hooks/useDeck';
import { SlideCard } from './SlideCard';

export function SlideList() {
  const deck = useDeck(s => s.deck);
  const currentSlideIndex = useDeck(s => s.currentSlideIndex);
  const setCurrentSlideIndex = useDeck(s => s.setCurrentSlideIndex);
  const addSlide = useDeck(s => s.addSlide);

  if (!deck) return null;

  return (
    <div className="w-[200px] h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {deck.slides.map((slide, i) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            index={i}
            active={i === currentSlideIndex}
            onClick={() => setCurrentSlideIndex(i)}
          />
        ))}
      </div>
      <div className="p-2 border-t border-[var(--color-border)]">
        <button
          className="w-full bg-[var(--color-surface-2)] text-[var(--color-text-dim)] rounded-lg py-2 text-xs hover:text-[var(--color-text)] transition-colors"
          onClick={() => addSlide('bullets', deck.globalTheme)}
        >
          + 添加幻灯片
        </button>
      </div>
    </div>
  );
}