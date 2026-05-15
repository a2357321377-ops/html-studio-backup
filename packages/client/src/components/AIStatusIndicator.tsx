import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIConfig } from '../hooks/useAIConfig';

export function AIStatusIndicator() {
  const { connected, provider, model, apiKey } = useAIConfig();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const hasKey = apiKey.length > 0;
  const label = connected ? 'AI 已连接' : hasKey ? 'AI 未连接' : 'AI 未配置';
  const dotColor = connected ? 'bg-green-400' : hasKey ? 'bg-yellow-400' : 'bg-gray-500';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs text-[var(--color-text-dim)]">{label}</span>
        <span className="text-[10px] text-[var(--color-text-dim2)]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 z-50 shadow-lg">
          <div className="text-xs font-semibold mb-2 text-[var(--color-text)]">AI 设置</div>
          <div className="text-xs text-[var(--color-text-dim)] mb-1">
            当前: {provider === 'openai' ? 'OpenAI 兼容' : 'Anthropic Claude'}
          </div>
          <div className="text-xs text-[var(--color-text-dim)] mb-3">
            模型: {model}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/settings'); }}
            className="w-full py-1.5 rounded-md bg-[var(--color-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            修改配置
          </button>
        </div>
      )}
    </div>
  );
}
