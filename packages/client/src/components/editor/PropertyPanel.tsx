import { useEditorStore } from '../../hooks/useEditorStore';
import { StyleTab } from './StyleTab';
import { ThemeTab } from './ThemeTab';
import { FxTab } from './FxTab';
import { LayoutTab } from './LayoutTab';
import type { EditorTab } from '../../hooks/useEditorStore';

const tabs: { key: EditorTab; label: string }[] = [
  { key: 'style', label: '样式' },
  { key: 'theme', label: '主题' },
  { key: 'fx', label: '动效' },
  { key: 'layout', label: '布局' },
];

/**
 * 右侧属性面板容器
 * - 顶部 tab 切换（样式/主题/动效/布局）
 * - 内容区渲染对应 tab 组件
 */
export function PropertyPanel() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="w-[280px] border-l border-[var(--color-border)] flex flex-col bg-[var(--color-bg)]">
      {/* Tab 切换 */}
      <div className="flex border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'style' && <StyleTab />}
        {activeTab === 'theme' && <ThemeTab />}
        {activeTab === 'fx' && <FxTab />}
        {activeTab === 'layout' && <LayoutTab />}
      </div>
    </div>
  );
}