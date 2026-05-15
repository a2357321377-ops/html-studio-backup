interface FileAttachmentProps {
  file: { name: string; size: number };
  pageCount?: number;
  onRemove: () => void;
}

export function FileAttachment({ file, pageCount, onRemove }: FileAttachmentProps) {
  const sizeKB = (file.size / 1024).toFixed(1);

  return (
    <div className="px-5 py-3 border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-lg cursor-pointer">
          📎
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{file.name}</div>
          <div className="text-[10px] text-[var(--color-text-dim)]">
            {sizeKB} KB{pageCount ? ` · ${pageCount} 页` : ''}
          </div>
        </div>
        <button
          className="text-[11px] text-[var(--color-primary)] hover:underline"
          onClick={onRemove}
        >
          ✕ 移除
        </button>
      </div>
    </div>
  );
}
