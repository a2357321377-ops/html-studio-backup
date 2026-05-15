import { useState, useMemo } from 'react';
import { themes, recommendedThemes, THEME_CATEGORIES, type ThemeMeta, type ThemeCategory } from '@html-studio/shared';
import { Modal } from './Modal';

interface ThemePickerProps {
  selected: string;
  onSelect: (name: string) => void;
  /** compact: 首页精简模式（3推荐+弹窗）, panel: 编辑器面板模式（色块+弹窗） */
  mode?: 'compact' | 'panel';
}

const ALL_CATEGORIES: (ThemeCategory | 'all')[] = ['all', ...Object.keys(THEME_CATEGORIES) as ThemeCategory[]];

export function ThemePicker({ selected, onSelect, mode = 'compact' }: ThemePickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ThemeCategory | 'all'>('all');

  const filtered = useMemo(() => {
    let list = themes;
    if (category !== 'all') list = list.filter(t => t.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.label.toLowerCase().includes(q) || t.description.includes(q));
    }
    return list;
  }, [category, search]);

  const displayThemes = mode === 'compact' ? recommendedThemes : themes.slice(0, 8);

  return (
    <div>
      {mode === 'compact' && (
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold">选择风格</div>
          <button
            className="text-xs text-[var(--color-primary)] hover:underline"
            onClick={() => setModalOpen(true)}
          >
            查看全部 {themes.length} 个 &rarr;
          </button>
        </div>
      )}

      <div className={`grid gap-2 ${mode === 'compact' ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {displayThemes.map(t => (
          <ThemeCard key={t.name} theme={t} selected={selected === t.name} onClick={() => onSelect(t.name)} />
        ))}
      </div>

      {mode === 'panel' && (
        <button
          className="w-full mt-2 text-xs text-[var(--color-text-dim2)] hover:text-[var(--color-primary)]"
          onClick={() => setModalOpen(true)}
        >
          查看全部 {themes.length} 个主题
        </button>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="选择主题">
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-1.5 text-xs"
            placeholder="搜索主题..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 mb-3 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`px-2.5 py-1 rounded-full text-[10px] ${
                category === cat ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'
              }`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? '全部' : THEME_CATEGORIES[cat]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {filtered.map(t => (
            <ThemeCard key={t.name} theme={t} selected={selected === t.name} onClick={() => { onSelect(t.name); setModalOpen(false); }} />
          ))}
        </div>
        <div className="text-center mt-3 text-[10px] text-[var(--color-text-dim2)]">
          {filtered.length}/{themes.length} 个主题
        </div>
      </Modal>
    </div>
  );
}

function ThemeCard({ theme, selected, onClick }: { theme: ThemeMeta; selected: boolean; onClick: () => void }) {
  const gradient = theme.previewColors.length > 1
    ? `linear-gradient(135deg, ${theme.previewColors.join(', ')})`
    : theme.previewColors[0];

  return (
    <div
      className={`rounded-lg p-2 cursor-pointer text-center border-2 transition-colors ${
        selected ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
      }`}
      onClick={onClick}
    >
      <div className="h-10 rounded mb-1.5" style={{ background: gradient }} />
      <div className="text-[10px] font-semibold truncate">{theme.label}</div>
    </div>
  );
}