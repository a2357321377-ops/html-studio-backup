import { useDeck } from '../hooks/useDeck';
import { layouts, LAYOUT_CATEGORIES, animations, fxList, type LayoutCategory } from '@html-studio/shared';
import { ThemePicker } from './ThemePicker';

export function StylePanel() {
  const deck = useDeck(s => s.deck);
  const currentSlideIndex = useDeck(s => s.currentSlideIndex);
  const setGlobalTheme = useDeck(s => s.setGlobalTheme);
  const updateSlideLayout = useDeck(s => s.updateSlideLayout);
  const updateSlideTheme = useDeck(s => s.updateSlideTheme);
  const updateSlideAnimation = useDeck(s => s.updateSlideAnimation);
  const updateSlideFx = useDeck(s => s.updateSlideFx);
  const updateSlotValue = useDeck(s => s.updateSlotValue);

  if (!deck) return null;
  const slide = deck.slides[currentSlideIndex];
  if (!slide) return null;

  const currentLayoutMeta = layouts.find(l => l.name === slide.layout);
  const layoutCategories = Object.entries(LAYOUT_CATEGORIES) as [LayoutCategory, string][];

  return (
    <div className="w-[240px] h-full bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-y-auto p-3 flex flex-col gap-4">

      {/* 主题 */}
      <section>
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">主题</div>
        <ThemePicker
          selected={slide.theme || deck.globalTheme}
          onSelect={name => { updateSlideTheme(slide.id, name); setGlobalTheme(name); }}
          mode="panel"
        />
      </section>

      {/* 布局 */}
      <section>
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">布局</div>
        <div className="grid grid-cols-3 gap-1">
          {layouts.slice(0, 9).map(l => (
            <button
              key={l.name}
              className={`rounded p-1.5 text-center border transition-colors ${
                slide.layout === l.name
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
              }`}
              onClick={() => updateSlideLayout(slide.id, l.name)}
            >
              <div className="h-5 bg-[var(--color-bg)] rounded-sm mb-0.5" />
              <div className="text-[8px] text-[var(--color-text-dim)]">{l.label}</div>
            </button>
          ))}
        </div>
        <div className="text-[9px] text-[var(--color-text-dim2)] mt-1 text-right">9/{layouts.length} · 向下滚动查看更多</div>
      </section>

      {/* 入场动效 */}
      <section>
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">入场动效</div>
        <select
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2 py-1.5 text-xs"
          value={slide.animation}
          onChange={e => updateSlideAnimation(slide.id, e.target.value)}
        >
          {animations.map(a => (
            <option key={a.name} value={a.name}>{a.label} — {a.description}</option>
          ))}
        </select>
      </section>

      {/* 背景特效 */}
      <section>
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">背景特效 (FX)</div>
        <div className="flex flex-wrap gap-1">
          <button
            className={`px-2 py-1 rounded text-[10px] ${!slide.fx ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
            onClick={() => updateSlideFx(slide.id, null)}
          >
            无
          </button>
          {fxList.slice(0, 8).map(f => (
            <button
              key={f.name}
              className={`px-2 py-1 rounded text-[10px] ${slide.fx === f.name ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
              onClick={() => updateSlideFx(slide.id, f.name)}
              title={f.description}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* 内容编辑 */}
      {currentLayoutMeta && (
        <section>
          <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">内容</div>
          <div className="flex flex-col gap-2">
            {slide.slots.map(slot => (
              <div key={slot.id}>
                <label className="text-[10px] text-[var(--color-text-dim2)] mb-0.5 block">{slot.label}</label>
                {slot.type === 'richtext' || slot.type === 'list' ? (
                  <textarea
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2 py-1.5 text-xs min-h-[60px] resize-y"
                    value={slot.value}
                    onChange={e => updateSlotValue(slide.id, slot.id, e.target.value)}
                  />
                ) : (
                  <input
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2 py-1.5 text-xs"
                    value={slot.value}
                    onChange={e => updateSlotValue(slide.id, slot.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}