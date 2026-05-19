import { useState, useEffect } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';
import { themes, THEME_CATEGORIES } from '@html-studio/shared';

/**
 * 主题切换面板
 * - 36 个主题，按分类分组
 * - 每个主题显示 previewColors 渐变缩略图
 * - 点击切换 iframe 内的主题 CSS link
 */
export function ThemeTab() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // 检测当前主题
  useEffect(() => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const themeLink = doc.querySelector('link[rel="stylesheet"][href*="/themes/"]');
    if (themeLink) {
      const href = themeLink.getAttribute('href') || '';
      const match = href.match(/\/themes\/([^/.]+)/);
      if (match) setCurrentTheme(match[1]);
    }
  }, [iframeRef]);

  const handleSelectTheme = (themeName: string) => {
    iframeRef?.contentWindow?.postMessage({
      type: 'editor-theme-update',
      themeName,
    }, '*');
    setCurrentTheme(themeName);
    // 延迟同步，等 CSS 加载
    setTimeout(() => syncFromIframe(), 500);
  };

  // 分类过滤
  const categories = [
    { key: 'all', label: '全部' },
    ...Object.entries(THEME_CATEGORIES).map(([key, label]) => ({ key, label })),
  ];

  const filteredThemes = activeCategory === 'all'
    ? themes
    : themes.filter((t) => t.category === activeCategory);

  return (
    <div className="flex flex-col h-full">
      {/* 分类切换 */}
      <div className="flex border-b border-[var(--color-border)] overflow-x-auto px-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`px-2 py-1.5 text-[10px] whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 主题网格 */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {filteredThemes.map((theme) => (
            <button
              key={theme.name}
              className={`rounded-lg border-2 overflow-hidden transition-all ${
                currentTheme === theme.name
                  ? 'border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
              }`}
              onClick={() => handleSelectTheme(theme.name)}
            >
              {/* 预览色块 */}
              <div
                className="h-10 w-full"
                style={{
                  background: `linear-gradient(135deg, ${theme.previewColors[0]}, ${theme.previewColors[1]})`,
                }}
              />
              {/* 主题名 */}
              <div className="text-[9px] text-[var(--color-text-dim)] py-1 text-center truncate px-1">
                {theme.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}