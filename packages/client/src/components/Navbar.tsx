import { useLocation, useNavigate } from 'react-router-dom';
import { AIStatusIndicator } from './AIStatusIndicator';

const TABS = [
  { path: '/', label: 'AI 创作' },
  { path: '/editor', label: '编辑' },
  { path: '/settings', label: '设置' },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="flex items-center gap-6">
        <span className="font-bold text-sm">
          <span className="text-[var(--color-primary)]">HTML</span> Studio
        </span>
        <nav className="flex gap-0.5">
          {TABS.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`px-4 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <AIStatusIndicator />
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-sm hover:border-[var(--color-primary)] transition-colors"
          title="设置"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
