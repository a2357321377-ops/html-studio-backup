import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlideThumbnailList } from '../components/editor/SlideThumbnailList';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { PropertyPanel } from '../components/editor/PropertyPanel';
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

  // 从 AI 生成结果初始化编辑器（确保 HTML 是干净的）
  useEffect(() => {
    if (aiDeckHtml && !editorDeckHtml) {
      setDeckHtml(cleanEditorArtifacts(aiDeckHtml));
    }
  }, [aiDeckHtml, editorDeckHtml, setDeckHtml]);

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
          <span className="text-[13px] font-semibold text-[var(--color-text)]">幻灯片编辑器</span>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            onClick={handleSyncToAI}
          >
            保存修改
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
    </div>
  );
}