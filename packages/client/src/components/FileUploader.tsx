import { useState, useRef, useCallback } from 'react';

interface FileUploaderProps {
  onFile: (file: File) => void;
}

const ACCEPT = '.pdf,.md,.txt,.docx,.markdown';
const MAX_SIZE = 20 * 1024 * 1024;

export function FileUploader({ onFile }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_SIZE) {
      alert('文件大小不能超过 20MB');
      return;
    }
    onFile(file);
  }, [onFile]);

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
        dragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-primary)]/30'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="text-4xl mb-2">&#128196;</div>
      <div className="text-sm font-semibold mb-1">拖拽文件到这里，或点击上传</div>
      <div className="text-xs text-[var(--color-text-dim)]">支持 .pdf .md .txt .docx，最大 20MB</div>
      <button
        className="mt-4 bg-[var(--color-primary)] text-white rounded-lg px-6 py-2 text-xs font-semibold"
        onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        选择文件
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}