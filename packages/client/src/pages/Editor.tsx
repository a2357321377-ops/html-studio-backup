import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlideThumbnailList } from '../components/editor/SlideThumbnailList';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { PropertyPanel } from '../components/editor/PropertyPanel';
import { FullscreenPresenter } from '../components/FullscreenPresenter';
import { useEditorStore } from '../hooks/useEditorStore';
import { useAIChat } from '../hooks/useAIChat';
import { cleanEditorArtifacts } from '../hooks/useEditorStore';

/**
 * 编辑器页面
 * 三栏布局：SlideThumbnailList | EditorCanvas | PropertyPanel
 * 从 useAIChat.deckHtml 初始化 useEditorStore.deckHtml
 */
export default function Editor() {
  const navigate = useNavigate();
  const aiDeckHtml = useAIChat((s) => s.deckHtml);
  const editorDeckHtml = useEditorStore((s) => s.deckHtml);
  const setDeckHtml = useEditorStore((s) => s.setDeckHtml);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const totalSlides = useEditorStore((s) => s.totalSlides);

  // 全屏演讲模式
  const [showPresenter, setShowPresenter] = useState(false);

  // 从 AI 生成结果初始化编辑器（确保 HTML 是干净的）
  useEffect(() => {
    if (aiDeckHtml && !editorDeckHtml) {
      setDeckHtml(cleanEditorArtifacts(aiDeckHtml));
    }
  }, [aiDeckHtml, editorDeckHtml, setDeckHtml]);

  // 键盘快捷键：Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Shift+Z 重做
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  // 撤销/重做按钮：模拟键盘快捷键触发，与快捷键行为完全一致
  const handleUndoClick = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }));
  }, []);

  const handleRedoClick = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true, bubbles: true }));
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 编辑器修改同步回 AI store（用于导出）
  const handleSyncToAI = () => {
    syncFromIframe();
    const updatedHtml = cleanEditorArtifacts(useEditorStore.getState().deckHtml);
    useAIChat.getState().setDeckHtml(updatedHtml);
  };

  // 导出 HTML
  const handleExport = () => {
    handleSyncToAI();
    const html = cleanEditorArtifacts(useEditorStore.getState().deckHtml);
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 返回首页
  const handleBack = () => {
    handleSyncToAI();
    navigate('/');
  };

  // 进入全屏演讲
  const handleStartPresenter = () => {
    handleSyncToAI();
    setShowPresenter(true);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)]">
      {/* 顶部工具栏 */}
      <div className="h-12 border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="text-[12px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
            onClick={handleBack}
          >
            ← 返回
          </button>
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              title="撤销 (Ctrl+Z)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 7h6a3 3 0 1 1 0 6H8v-1h2a2 2 0 1 0 0-4H4l2.5 2.5L5.8 11 3 8l2.8-3 .7.7L4 7z" fill="currentColor"/></svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              title="重做 (Ctrl+Shift+Z)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 7H6a3 3 0 1 0 0 6h2v-1H6a2 2 0 1 1 0-4h6l-2.5 2.5.7.7L13 8l-2.8-3-.7.7L12 7z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            onClick={handleSyncToAI}
          >
            保存修改
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            onClick={handleStartPresenter}
          >
            ▶ 演讲
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-[11px] text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
            onClick={handleExport}
          >
            导出 HTML
          </button>
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        <SlideThumbnailList />
        <EditorCanvas />
        <PropertyPanel />
      </div>

      {/* 全屏演讲模式 */}
      {showPresenter && (
        <FullscreenPresenter
          deckHtml={cleanEditorArtifacts(useEditorStore.getState().deckHtml)}
          totalPages={totalSlides}
          onClose={() => setShowPresenter(false)}
        />
      )}
    </div>
  );
}