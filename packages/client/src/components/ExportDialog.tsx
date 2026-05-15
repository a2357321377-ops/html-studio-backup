import { useState } from 'react';
import { useDeck } from '../hooks/useDeck';
import { renderDeck } from '../lib/renderer';
import { Modal } from './Modal';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const deck = useDeck(s => s.deck);
  const [filename, setFilename] = useState('');
  const [includeRuntime, setIncludeRuntime] = useState(true);
  const [includeAnimations, setIncludeAnimations] = useState(true);
  const [includePresenter, setIncludePresenter] = useState(true);
  const [includeSourceData, setIncludeSourceData] = useState(false);
  const [exporting, setExporting] = useState(false);

  const defaultFilename = deck ? `${deck.title.replace(/\s+/g, '-')}.html` : 'presentation.html';

  const handleExport = async () => {
    if (!deck) return;
    setExporting(true);
    try {
      const html = await renderDeck(deck, {
        includeRuntime,
        includeAnimations,
        includeFx: includeAnimations,
        includePresenter,
        includeSourceData,
      });
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || defaultFilename;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="导出幻灯片">
      <div className="mb-4">
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">文件名</div>
        <input
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
          value={filename}
          placeholder={defaultFilename}
          onChange={e => setFilename(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">包含内容</div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={includeRuntime} onChange={e => setIncludeRuntime(e.target.checked)} />
            运行时（键盘导航、主题切换）
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={includeAnimations} onChange={e => setIncludeAnimations(e.target.checked)} />
            动画效果
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={includePresenter} onChange={e => setIncludePresenter(e.target.checked)} />
            演讲者模式
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={includeSourceData} onChange={e => setIncludeSourceData(e.target.checked)} />
            源数据（JSON，用于再次导入编辑）
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)] rounded-lg py-2.5 text-xs">取消</button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-[2] text-white rounded-lg py-2.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
        >
          {exporting ? '生成中...' : '下载 HTML'}
        </button>
      </div>
    </Modal>
  );
}