import { useState } from 'react';
import { ChatPanel } from '../components/ChatPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { useDeck } from '../hooks/useDeck';

export default function Home() {
  const [selectedTheme, setSelectedTheme] = useState('tokyo-night');
  const [deckHtml, setDeckHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const setStoreDeckHtml = useDeck(s => s.setDeckHtml);

  const handleHtmlUpdate = (html: string) => {
    setDeckHtml(html);
  };

  const handleGenerationDone = (html: string) => {
    setDeckHtml(html);
    setGenerating(false);
    // 存入 store，供编辑器使用
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
        selectedTheme={selectedTheme}
        onThemeSelect={setSelectedTheme}
      />
      <PreviewPanel
        deckHtml={deckHtml}
        generating={generating}
        selectedTheme={selectedTheme}
      />
    </div>
  );
}
