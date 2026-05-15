import { useState } from 'react';
import { useAIConfig } from '../hooks/useAIConfig';
import { useDeck } from '../hooks/useDeck';
import { optimizeSlide } from '../lib/ai-client';

export function AIOptimizeButton() {
  const { editorAssist, connected, apiKey } = useAIConfig();
  const deck = useDeck(s => s.deck);
  const currentSlideIndex = useDeck(s => s.currentSlideIndex);
  const updateSlotValue = useDeck(s => s.updateSlotValue);
  const updateSlideLayout = useDeck(s => s.updateSlideLayout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!editorAssist || !connected || !apiKey) return null;

  const currentSlide = deck ? deck.slides[currentSlideIndex] : null;
  if (!currentSlide) return null;

  const handleOptimize = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await optimizeSlide({
        layout: currentSlide.layout,
        slots: currentSlide.slots.map(s => ({ id: s.id, value: s.value, type: s.type })),
        theme: deck?.globalTheme ?? '',
      });

      // Update slots
      for (const slot of result.slots) {
        const existing = currentSlide.slots.find(s => s.id === slot.id);
        if (existing) {
          updateSlotValue(currentSlide.id, slot.id, slot.value);
        }
      }

      // Update layout if suggested
      if (result.layout && result.layout !== currentSlide.layout) {
        updateSlideLayout(currentSlide.id, result.layout as any);
      }
    } catch (err: any) {
      setError(err?.message ?? '优化失败');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleOptimize}
        disabled={loading}
        className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-2,#6366f1)] hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {loading ? 'AI 优化中...' : '✨ AI 优化'}
      </button>
      {error && <div className="text-[10px] text-red-400">{error}</div>}
    </div>
  );
}
