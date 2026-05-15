import { ChatPanel } from '../components/ChatPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { useAIChat } from '../hooks/useAIChat';
import { useDeck } from '../hooks/useDeck';

export default function Home() {
  const deckHtml = useAIChat((s) => s.deckHtml);
  const generating = useAIChat((s) => s.generating);
  const selectedTheme = useAIChat((s) => s.selectedTheme);
  const setDeckHtml = useAIChat((s) => s.setDeckHtml);
  const setGenerating = useAIChat((s) => s.setGenerating);
  const setStoreDeckHtml = useDeck((s) => s.setDeckHtml);

  const handleHtmlUpdate = (html: string) => {
    setDeckHtml(html);
  };

  const handleGenerationDone = (html: string) => {
    setDeckHtml(html);
    setGenerating(false);
    // 同步到 deck store，供编辑器使用
    setStoreDeckHtml(html);
  };

  const handleGenerationStart = () => {
    setGenerating(true);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <ChatPanel
        onHtmlUpdate={handleHtmlUpdate}
        onGenerationDone={handleGenerationDone}
        onGenerationStart={handleGenerationStart}
      />
      <PreviewPanel
        deckHtml={deckHtml}
        generating={generating}
        selectedTheme={selectedTheme}
      />
    </div>
  );
}
