import { useState, useRef, useEffect } from 'react';
import { FileAttachment } from './FileAttachment';
import { ChatMessage } from './ChatMessage';
import { ThemePicker } from './ThemePicker';
import { useFileParser } from '../hooks/useFileParser';
import { useAIConfig } from '../hooks/useAIConfig';
import { buildDeckPrompt } from '../lib/ai-client';
import { streamAI } from '../lib/ai-stream';

interface ChatPanelProps {
  onHtmlUpdate: (html: string) => void;
  onGenerationDone: (html: string) => void;
  onGenerationStart?: () => void;
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export function ChatPanel({ onHtmlUpdate, onGenerationDone, onGenerationStart, selectedTheme, onThemeSelect }: ChatPanelProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { parseResult, parsing, error, parseFile, reset: resetParse } = useFileParser();
  const { connected, apiKey } = useAIConfig();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFile = async (file: File) => {
    setUploadedFile(file);
    await parseFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    resetParse();
  };

  const handleSend = async () => {
    if (!uploadedFile && !prompt.trim()) return;
    if (generating) return;

    // 确保有文件内容
    let fileContent = '';
    if (uploadedFile) {
      let result = parseResult;
      if (!result) {
        result = await parseFile(uploadedFile);
      }
      if (result) {
        fileContent = result.slides.map((s, i) =>
          `--- 第${i + 1}页 ---\n${s.slots.map(slot => `${slot.label || slot.id}: ${slot.value}`).join('\n')}`
        ).join('\n\n');
      }
    }

    // 添加用户消息
    const userMsg = prompt.trim() || '根据上传的文件生成幻灯片';
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setPrompt('');
    setGenerating(true);
    onGenerationStart?.();

    // 构建 AI prompt
    const aiMessages = buildDeckPrompt(fileContent, userMsg, selectedTheme);

    // 添加 AI 消息占位
    setMessages(prev => [...prev, { role: 'ai', content: '正在生成幻灯片...' }]);

    let accumulatedHtml = '';

    await streamAI(aiMessages, {
      onChunk: (text) => {
        accumulatedHtml += text;
        onHtmlUpdate(accumulatedHtml);
      },
      onDone: () => {
        setGenerating(false);
        // 提取 HTML（去掉可能的 markdown 代码围栏）
        let cleanHtml = accumulatedHtml.trim();
        if (cleanHtml.startsWith('```html')) {
          cleanHtml = cleanHtml.slice(7);
        }
        if (cleanHtml.startsWith('```')) {
          cleanHtml = cleanHtml.slice(3);
        }
        if (cleanHtml.endsWith('```')) {
          cleanHtml = cleanHtml.slice(0, -3);
        }
        cleanHtml = cleanHtml.trim();

        onHtmlUpdate(cleanHtml);

        // 更新 AI 消息为完成状态
        const slideCount = (cleanHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'ai',
            content: `生成完成！使用 ${selectedTheme} 主题，共 ${slideCount} 页幻灯片。`,
          };
          return updated;
        });

        onGenerationDone(cleanHtml);
      },
      onError: (error) => {
        setGenerating(false);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'ai',
            content: `生成失败：${error}`,
          };
          return updated;
        });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-[45%] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg)]">
      {/* 文件上传区 */}
      {uploadedFile ? (
        <FileAttachment
          file={uploadedFile}
          pageCount={parseResult?.slides.length}
          onRemove={handleRemoveFile}
        />
      ) : (
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <button
            className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-primary)] transition-colors"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.md,.txt,.docx,.markdown';
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFile(f);
              };
              input.click();
            }}
          >
            <span className="text-lg">📎</span>
            <span>上传文件（PDF、Markdown、TXT、DOCX）</span>
          </button>
        </div>
      )}

      {/* 主题选择器 */}
      <div className="px-5 py-2 border-b border-[var(--color-border)]">
        <ThemePicker selected={selectedTheme} onSelect={onThemeSelect} mode="compact" />
      </div>

      {/* 对话消息区 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="text-center text-[var(--color-text-dim2)] text-xs mt-8">
            上传文件并输入提示词，AI 将为你生成幻灯片
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            streaming={generating && i === messages.length - 1 && msg.role === 'ai'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-5 mb-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-[10px] text-red-400">
          {error}
        </div>
      )}

      {/* 输入区 */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-[13px] resize-none min-h-[40px] max-h-[100px] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="描述你想要的演示风格，如：做一个深色科技风格的产品发布会..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white shrink-0 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
            disabled={generating || (!uploadedFile && !prompt.trim()) || (!connected && !apiKey)}
            onClick={handleSend}
          >
            ➤
          </button>
        </div>
        <div className="text-center mt-1.5 text-[10px] text-[var(--color-text-dim2)]">
          提示词可选，不填则 AI 根据文件内容自动决定风格
        </div>
      </div>
    </div>
  );
}
