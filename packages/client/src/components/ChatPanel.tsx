import { useRef, useEffect } from 'react';
import { FileAttachment } from './FileAttachment';
import { ChatMessage } from './ChatMessage';
import { useFileParser } from '../hooks/useFileParser';
import { useAIConfig } from '../hooks/useAIConfig';
import { useAIChat } from '../hooks/useAIChat';
import { buildDeckPrompt } from '../lib/ai-client';
import { streamAI } from '../lib/ai-stream';

interface ChatPanelProps {
  onHtmlUpdate: (html: string) => void;
  onGenerationDone: (html: string) => void;
  onGenerationStart?: () => void;
}

export function ChatPanel({ onHtmlUpdate, onGenerationDone, onGenerationStart }: ChatPanelProps) {
  const messages = useAIChat((s) => s.messages);
  const addMessage = useAIChat((s) => s.addMessage);
  const updateMessage = useAIChat((s) => s.updateMessage);
  const uploadedFile = useAIChat((s) => s.uploadedFile);
  const setUploadedFile = useAIChat((s) => s.setUploadedFile);
  const generating = useAIChat((s) => s.generating);
  const setGenerating = useAIChat((s) => s.setGenerating);
  const deckHtml = useAIChat((s) => s.deckHtml);
  const setDeckHtml = useAIChat((s) => s.setDeckHtml);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { parseResult, parsing, error, parseFile, reset: resetParse } = useFileParser();
  const { connected, apiKey } = useAIConfig();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 当 useFileParser 解析完成后，同步到 store
  useEffect(() => {
    if (parseResult && uploadedFile) {
      const fileContent = parseResult.slides.map((s, i) =>
        `--- 第${i + 1}页 ---\n${s.slots.map(slot => `${slot.label || slot.id}: ${slot.value}`).join('\n')}`
      ).join('\n\n');
      setUploadedFile({
        name: uploadedFile.name,
        size: uploadedFile.size,
        pageCount: parseResult.slides.length,
        content: fileContent,
      });
    }
  }, [parseResult]);

  const handleFile = async (file: File) => {
    // 先存 File 对象信息到 store（content 后续由 effect 填充）
    setUploadedFile({ name: file.name, size: file.size, content: '' });
    await parseFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    resetParse();
  };

  const handleSend = async () => {
    if (!uploadedFile && !deckHtml) return;
    if (generating) return;

    // 获取文件内容（从 store 中读取已解析的内容）
    let fileContent = uploadedFile?.content || '';
    if (!fileContent && parseResult) {
      fileContent = parseResult.slides.map((s, i) =>
        `--- 第${i + 1}页 ---\n${s.slots.map(slot => `${slot.label || slot.id}: ${slot.value}`).join('\n')}`
      ).join('\n\n');
    }

    // 获取用户输入的提示词
    const promptEl = document.querySelector<HTMLTextAreaElement>('#chat-prompt-input');
    const userMsg = promptEl?.value?.trim() || '根据上传的文件生成幻灯片';

    // 添加用户消息
    const msgId = `msg-${Date.now()}`;
    addMessage({ id: msgId, role: 'user', content: userMsg });
    if (promptEl) promptEl.value = '';

    setGenerating(true);
    onGenerationStart?.();

    // 构建 AI prompt（不指定主题，让 AI 自行选择）
    const aiMessages = buildDeckPrompt(fileContent, userMsg);

    // 添加 AI 消息占位
    const aiMsgId = `msg-ai-${Date.now()}`;
    addMessage({ id: aiMsgId, role: 'assistant', content: '正在生成幻灯片...', streaming: true });

    let accumulatedHtml = '';

    await streamAI(aiMessages, {
      onChunk: (text) => {
        accumulatedHtml += text;
        // 流式生成期间不实时更新预览，避免 iframe 频闪
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

        // 生成完成后一次性更新预览
        onHtmlUpdate(cleanHtml);

        // 更新 AI 消息为完成状态
        const slideCount = (cleanHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length;
        updateMessage(aiMsgId, {
          content: `生成完成！共 ${slideCount} 页幻灯片。`,
          streaming: false,
        });

        onGenerationDone(cleanHtml);
      },
      onError: (err) => {
        setGenerating(false);
        updateMessage(aiMsgId, {
          content: `生成失败：${err}`,
          streaming: false,
        });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-[45%] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg)]">
      {/* 文件上传区 */}
      {uploadedFile ? (
        <FileAttachment
          file={{ name: uploadedFile.name, size: uploadedFile.size }}
          pageCount={uploadedFile.pageCount}
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

      {/* 对话消息区 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="text-center text-[var(--color-text-dim2)] text-xs mt-8">
            上传文件并输入提示词，AI 将为你生成幻灯片
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role === 'assistant' ? 'ai' : msg.role}
            content={msg.content}
            streaming={generating && msg.streaming}
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
            id="chat-prompt-input"
            className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-[13px] resize-none min-h-[40px] max-h-[100px] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="描述你想要的演示风格，如：做一个深色科技风格的产品发布会..."
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white shrink-0 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
            disabled={generating || (!uploadedFile && !deckHtml) || (!connected && !apiKey)}
            onClick={handleSend}
          >
            ➤
          </button>
        </div>
        <div className="text-center mt-1.5 text-[10px] text-[var(--color-text-dim2)]">
          提示词可选，不填则 AI 根据文件内容自动决定风格。Alt+Enter 发送
        </div>
      </div>
    </div>
  );
}