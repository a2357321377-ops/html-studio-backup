interface ChatMessageProps {
  role: 'user' | 'ai';
  content: string;
  streaming?: boolean;
}

export function ChatMessage({ role, content, streaming }: ChatMessageProps) {
  const isAi = role === 'ai';

  return (
    <div className="mb-4">
      <div className="flex items-start gap-2">
        <div
          className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
            isAi ? 'bg-green-400 text-[var(--color-bg)]' : 'bg-[var(--color-primary)] text-white'
          }`}
        >
          {isAi ? 'AI' : '你'}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
              isAi ? 'bg-[var(--color-surface)] text-[var(--color-text-dim)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
            }`}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {content}
          </div>
          {streaming && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-green-400">生成中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
