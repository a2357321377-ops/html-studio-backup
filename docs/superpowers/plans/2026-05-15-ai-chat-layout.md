# AI 对话式排版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 html-ppt skill 的对话式工作流搬到网页端 — 用户在左侧对话区上传文件 + 输入提示词，AI 直接生成完整 HTML 幻灯片，右侧实时预览。

**Architecture:** 新 Home 页面左右分栏（对话区 45% + 预览区 55%）。对话区包含文件上传、提示词输入、AI 回复。预览区用 iframe srcdoc 实时渲染 AI 流式生成的 HTML。后端新增 SSE 流式代理路由。Store 新增 `deckHtml` / `isAiDeck` 字段，编辑器适配 AI 生成的 HTML 直接渲染模式。

**Tech Stack:** React 19, Zustand, Vite 6, Hono (backend), SSE (text/event-stream), iframe srcdoc

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/client/src/components/ChatPanel.tsx` | 左侧对话区：文件上传、主题选择、提示词输入、AI 回复、发送按钮 |
| Create | `packages/client/src/components/PreviewPanel.tsx` | 右侧预览区：iframe 渲染、翻页控制、导出/进入编辑器按钮 |
| Create | `packages/client/src/components/ChatMessage.tsx` | 单条对话消息（用户/AI） |
| Create | `packages/client/src/components/FileAttachment.tsx` | 对话区顶部的文件附件显示 |
| Create | `packages/client/src/lib/ai-stream.ts` | 流式 AI 调用客户端（fetch + ReadableStream） |
| Modify | `packages/client/src/pages/Home.tsx` | 替换为左右分栏布局，使用 ChatPanel + PreviewPanel |
| Modify | `packages/client/src/hooks/useDeck.ts` | 新增 deckHtml / isAiDeck 字段和 setter |
| Modify | `packages/client/src/lib/ai-client.ts` | 新增 generateDeck() 函数，构建 AI prompt |
| Modify | `packages/server/src/index.ts` | 新增 POST /api/ai/chat/stream SSE 流式路由 |
| Modify | `packages/client/src/pages/Editor.tsx` | 适配 isAiDeck 模式，iframe 直接渲染 deckHtml |
| Modify | `packages/client/src/components/SlideCanvas.tsx` | 支持 isAiDeck 时用 srcdoc 渲染 deckHtml |
| Modify | `packages/client/src/components/ExportDialog.tsx` | 支持 isAiDeck 时直接导出 deckHtml |
| Modify | `packages/client/src/components/Navbar.tsx` | Tab 标签更新：Home → AI 创作 |

---

### Task 1: Store 扩展 — 新增 deckHtml / isAiDeck

**Files:**
- Modify: `packages/client/src/hooks/useDeck.ts`

- [ ] **Step 1: 在 DeckState interface 中新增字段和 setter**

在 `packages/client/src/hooks/useDeck.ts` 中，在 `DeckState` interface 的 `deck` 和 `currentSlideIndex` 之后新增：

```typescript
interface DeckState {
  deck: Deck | null;
  currentSlideIndex: number;
  deckHtml: string | null;   // AI 生成的完整 HTML
  isAiDeck: boolean;         // 标记当前 deck 是否由 AI 生成

  // ... 现有方法
  setDeckHtml: (html: string) => void;
  clearDeckHtml: () => void;
}
```

- [ ] **Step 2: 在 store 实现中新增初始值和方法**

在 `create<DeckState>((set, get) => ({` 中，在 `currentSlideIndex: 0,` 之后新增：

```typescript
  deckHtml: null,
  isAiDeck: false,
```

在 `initDeck` 方法之前新增：

```typescript
  setDeckHtml: (html) => set({ deckHtml: html, isAiDeck: true }),
  clearDeckHtml: () => set({ deckHtml: null, isAiDeck: false }),
```

- [ ] **Step 3: 修改 initDeck，清除 AI deck 状态**

在 `initDeck` 方法中，将 `set({` 内新增 `deckHtml: null, isAiDeck: false,`：

```typescript
  initDeck: (title, slides, theme) => set({
    deck: {
      id: nanoid(),
      title,
      slides,
      globalTheme: theme,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    currentSlideIndex: 0,
    deckHtml: null,
    isAiDeck: false,
  }),
```

- [ ] **Step 4: 验证类型检查通过**

Run: `cd /Users/queota/CCworkspace/html-studio-main/packages/client && npx tsc --noEmit 2>&1 | head -20`
Expected: 无与 useDeck 相关的类型错误

- [ ] **Step 5: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/hooks/useDeck.ts
git commit -m "feat(store): add deckHtml and isAiDeck fields for AI-generated decks"
```

---

### Task 2: 后端 SSE 流式路由

**Files:**
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: 新增 POST /api/ai/chat/stream 路由**

在 `packages/server/src/index.ts` 中，在现有的 `app.post('/api/ai/chat', ...)` 路由之后新增：

```typescript
// AI 流式代理路由 — SSE 格式
app.post('/api/ai/chat/stream', async (c) => {
  const body = await c.req.json<{
    provider: 'openai' | 'anthropic';
    baseUrl: string;
    apiKey: string;
    model: string;
    messages: { role: string; content: string }[];
  }>();

  const { provider, baseUrl, apiKey, model, messages } = body;

  if (!apiKey) {
    return c.json({ error: 'API Key 未配置' }, 400);
  }

  try {
    if (provider === 'anthropic') {
      const url = `${baseUrl}/v1/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, messages, max_tokens: 8192, stream: true }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `Anthropic API error: ${res.status} ${err}` }, res.status as 400);
      }

      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const url = `${baseUrl}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, stream: true }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `OpenAI API error: ${res.status} ${err}` }, res.status as 400);
      }

      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (err: any) {
    return c.json({ error: err.message || 'AI 流式请求失败' }, 500);
  }
});
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd /Users/queota/CCworkspace/html-studio-main/packages/server && npx tsc --noEmit 2>&1 | head -20`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/server/src/index.ts
git commit -m "feat(server): add SSE streaming route POST /api/ai/chat/stream"
```

---

### Task 3: 流式 AI 客户端

**Files:**
- Create: `packages/client/src/lib/ai-stream.ts`

- [ ] **Step 1: 创建流式 AI 调用模块**

创建 `packages/client/src/lib/ai-stream.ts`：

```typescript
import { useAIConfig } from '../hooks/useAIConfig';

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

/**
 * 流式调用 AI API，通过后端 SSE 代理路由。
 * 逐步读取 AI 返回的文本 chunk，调用 onChunk 回调。
 */
export async function streamAI(
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const { provider, baseUrl, apiKey, model } = useAIConfig.getState();

  try {
    const res = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, baseUrl, apiKey, model, messages }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: '请求失败' }));
      callbacks.onError(data.error || `请求失败: ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('无法读取响应流');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (useAIConfig.getState().provider === 'anthropic') {
            // Anthropic SSE: content_block_delta → delta.text
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              callbacks.onChunk(parsed.delta.text);
            }
          } else {
            // OpenAI SSE: choices[0].delta.content
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              callbacks.onChunk(content);
            }
          }
        } catch {
          // 忽略非 JSON 行
        }
      }
    }

    callbacks.onDone();
  } catch (err: any) {
    callbacks.onError(err.message || '流式请求失败');
  }
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd /Users/queota/CCworkspace/html-studio-main/packages/client && npx tsc --noEmit 2>&1 | head -20`
Expected: 无与 ai-stream 相关的类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/lib/ai-stream.ts
git commit -m "feat(client): add streaming AI client with SSE parsing"
```

---

### Task 4: AI Prompt 构建 — generateDeck 函数

**Files:**
- Modify: `packages/client/src/lib/ai-client.ts`

- [ ] **Step 1: 新增 generateDeck 函数**

在 `packages/client/src/lib/ai-client.ts` 文件末尾新增：

```typescript
/** AI 生成完整演示文稿 HTML — 构建 prompt */
export function buildDeckPrompt(fileContent: string, userPrompt: string, theme: string): { role: string; content: string }[] {
  const systemPrompt = `你是一个演示文稿生成专家。根据用户提供的文档内容和风格要求，生成符合 html-ppt 规范的完整 HTML 演示文稿。

规范要求：
- 整体结构：<!DOCTYPE html><html><head>引入 CSS/JS</head><body><div class="deck"> 内含多个 <section class="slide">
- 每个 <section class="slide"> 是一页幻灯片
- 使用指定的主题 CSS 类（如 theme-tokyo-night）
- 可用的布局类：layout-cover, layout-section, layout-bullets, layout-numbered-list, layout-two-column, layout-three-column, layout-image-left, layout-image-right, layout-image-full, layout-quote, layout-stats, layout-chart-bar, layout-chart-pie, layout-timeline, layout-comparison, layout-table, layout-code, layout-definition, layout-callout, layout-photo-grid, layout-agenda, layout-team, layout-testimonial, layout-process, layout-map, layout-calendar, layout-metrics, layout-split-text, layout-centered, layout-blank
- slot 标记：<div data-slot="slotId">内容</div>
- 引入 CSS：/html-ppt/assets/themes/${theme}.css, /html-ppt/assets/base.css, /html-ppt/assets/fonts.css
- 引入 JS：/html-ppt/assets/runtime.js
- 动画 CSS：/html-ppt/assets/animations/animations.css
- 16:9 比例，每页内容精炼，避免文字过多
- 第一页 <section> 加上 class="is-active"
- <style>.slide { display: none; } .slide.is-active { display: flex; }</style>
- 只输出 HTML 代码，不要输出任何其他文字或 markdown 代码围栏`;

  const userContent = `--- 文档内容 ---
${fileContent}

--- 风格要求 ---
${userPrompt || '根据文档内容自动选择最佳风格和布局'}

--- 主题 ---
${theme}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd /Users/queota/CCworkspace/html-studio-main/packages/client && npx tsc --noEmit 2>&1 | head -20`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/lib/ai-client.ts
git commit -m "feat(ai): add buildDeckPrompt for AI deck generation"
```

---

### Task 5: ChatMessage 组件

**Files:**
- Create: `packages/client/src/components/ChatMessage.tsx`

- [ ] **Step 1: 创建 ChatMessage 组件**

创建 `packages/client/src/components/ChatMessage.tsx`：

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/components/ChatMessage.tsx
git commit -m "feat(ui): add ChatMessage component for AI conversation"
```

---

### Task 6: FileAttachment 组件

**Files:**
- Create: `packages/client/src/components/FileAttachment.tsx`

- [ ] **Step 1: 创建 FileAttachment 组件**

创建 `packages/client/src/components/FileAttachment.tsx`：

```tsx
interface FileAttachmentProps {
  file: File;
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/components/FileAttachment.tsx
git commit -m "feat(ui): add FileAttachment component for chat file display"
```

---

### Task 7: ChatPanel 组件

**Files:**
- Create: `packages/client/src/components/ChatPanel.tsx`

- [ ] **Step 1: 创建 ChatPanel 组件**

创建 `packages/client/src/components/ChatPanel.tsx`：

```tsx
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
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export function ChatPanel({ onHtmlUpdate, onGenerationDone, selectedTheme, onThemeSelect }: ChatPanelProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamingHtml, setStreamingHtml] = useState('');
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
    setStreamingHtml('');

    // 构建 AI prompt
    const aiMessages = buildDeckPrompt(fileContent, userMsg, selectedTheme);

    // 添加 AI 消息占位
    setMessages(prev => [...prev, { role: 'ai', content: '正在生成幻灯片...' }]);

    let accumulatedHtml = '';

    await streamAI(aiMessages, {
      onChunk: (text) => {
        accumulatedHtml += text;
        setStreamingHtml(accumulatedHtml);
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

        setStreamingHtml(cleanHtml);
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/components/ChatPanel.tsx
git commit -m "feat(ui): add ChatPanel component with file upload, prompt, AI streaming"
```

---

### Task 8: PreviewPanel 组件

**Files:**
- Create: `packages/client/src/components/PreviewPanel.tsx`

- [ ] **Step 1: 创建 PreviewPanel 组件**

创建 `packages/client/src/components/PreviewPanel.tsx`：

```tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface PreviewPanelProps {
  deckHtml: string;
  generating: boolean;
  selectedTheme: string;
}

export function PreviewPanel({ deckHtml, generating, selectedTheme }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const navigate = useNavigate();

  // 计算 iframe 缩放
  const updateScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const maxW = width - 48;
    const maxH = height - 80;
    const scaleX = maxW / 960;
    const scaleY = maxH / 540;
    setScale(Math.min(scaleX, scaleY, 1));
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  // 监听 iframe postMessage 获取页数
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'deck-info') {
        setTotalPages(e.data.total || 0);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // 从 HTML 中估算页数
  useEffect(() => {
    if (deckHtml) {
      const count = (deckHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length;
      setTotalPages(count);
    }
  }, [deckHtml]);

  // 翻页
  const gotoPage = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, totalPages - 1));
    setCurrentPage(clamped + 1);
    iframeRef.current?.contentWindow?.postMessage({ type: 'preview-goto', idx: clamped }, '*');
  };

  // 导出 HTML
  const handleExport = () => {
    if (!deckHtml) return;
    const blob = new Blob([deckHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 进入编辑器
  const handleEnterEditor = () => {
    navigate('/editor');
  };

  // 生成进度百分比
  const progressPercent = generating && totalPages > 0
    ? Math.min(100, Math.round((currentPage / Math.max(totalPages, 7)) * 100))
    : generating ? 30 : 100;

  return (
    <div className="w-[55%] flex flex-col bg-[#111118]">
      {/* 顶部信息 */}
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--color-text-dim)]">幻灯片预览</span>
        <div className="flex gap-2">
          <span className="text-[11px] text-[var(--color-text-dim)]">{selectedTheme} 主题</span>
          {totalPages > 0 && <span className="text-[11px] text-[var(--color-text-dim)]">{totalPages} 页</span>}
        </div>
      </div>

      {/* iframe 预览区 */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-5 relative overflow-hidden">
        {deckHtml ? (
          <div
            className="relative"
            style={{
              width: 960 * scale,
              height: 540 * scale,
              overflow: 'hidden',
              borderRadius: '0.75rem',
              border: '1px solid var(--color-border)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={deckHtml}
              width="960"
              height="540"
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none' }}
              title="幻灯片预览"
              sandbox="allow-scripts allow-same-origin"
            />
            {/* 生成进度条 */}
            {generating && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-r-sm"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #3b6cff, #4ade80)',
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-[var(--color-text-dim2)] text-xs">
            {generating ? 'AI 正在生成...' : '上传文件并发送提示词，预览将在此显示'}
          </div>
        )}
      </div>

      {/* 底部控制栏 */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] flex items-center justify-center hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={currentPage <= 1 || !deckHtml}
            onClick={() => gotoPage(currentPage - 2)}
          >
            ◀
          </button>
          <span className="text-xs text-[var(--color-text)]">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : '- / -'}
          </span>
          <button
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] flex items-center justify-center hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={currentPage >= totalPages || !deckHtml}
            onClick={() => gotoPage(currentPage)}
          >
            ▶
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40"
            disabled={!deckHtml}
            onClick={handleExport}
          >
            导出 HTML
          </button>
          <button
            className="px-4 py-2 rounded-lg text-xs text-white font-semibold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
            disabled={!deckHtml || generating}
            onClick={handleEnterEditor}
          >
            进入编辑器
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/components/PreviewPanel.tsx
git commit -m "feat(ui): add PreviewPanel with iframe, page nav, export, and editor entry"
```

---

### Task 9: 重写 Home 页面

**Files:**
- Modify: `packages/client/src/pages/Home.tsx`

- [ ] **Step 1: 重写 Home 页面为左右分栏布局**

将 `packages/client/src/pages/Home.tsx` 完整替换为：

```tsx
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
```

- [ ] **Step 2: 修正 ChatPanel — 添加 onGenerationStart 回调**

ChatPanel 的 `handleSend` 中需要在开始生成时通知父组件。修改 `ChatPanel.tsx`：

在 `ChatPanelProps` interface 中新增：

```typescript
interface ChatPanelProps {
  onHtmlUpdate: (html: string) => void;
  onGenerationDone: (html: string) => void;
  onGenerationStart?: () => void;
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
}
```

在 `handleSend` 函数中，`setGenerating(true)` 之后新增：

```typescript
    onGenerationStart?.();
```

同时更新 Home.tsx 中的 ChatPanel 调用：

```tsx
      <ChatPanel
        onHtmlUpdate={handleHtmlUpdate}
        onGenerationDone={handleGenerationDone}
        onGenerationStart={handleGenerationStart}
        selectedTheme={selectedTheme}
        onThemeSelect={setSelectedTheme}
      />
```

- [ ] **Step 3: 验证类型检查通过**

Run: `cd /Users/queota/CCworkspace/html-studio-main/packages/client && npx tsc --noEmit 2>&1 | head -20`
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/pages/Home.tsx packages/client/src/components/ChatPanel.tsx
git commit -m "feat(home): rewrite Home page with ChatPanel + PreviewPanel split layout"
```

---

### Task 10: Navbar Tab 标签更新

**Files:**
- Modify: `packages/client/src/components/Navbar.tsx`

- [ ] **Step 1: 更新 Tab 标签**

在 `packages/client/src/components/Navbar.tsx` 中，将 `TABS` 数组修改为：

```typescript
const TABS = [
  { path: '/', label: 'AI 创作' },
  { path: '/editor', label: '编辑' },
  { path: '/settings', label: '设置' },
];
```

- [ ] **Step 2: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/components/Navbar.tsx
git commit -m "feat(nav): update Home tab label to 'AI 创作'"
```

---

### Task 11: 编辑器适配 isAiDeck 模式

**Files:**
- Modify: `packages/client/src/pages/Editor.tsx`
- Modify: `packages/client/src/components/SlideCanvas.tsx`
- Modify: `packages/client/src/components/ExportDialog.tsx`

- [ ] **Step 1: 修改 SlideCanvas 支持 isAiDeck**

在 `packages/client/src/components/SlideCanvas.tsx` 中：

1. 在文件顶部新增 import：

```typescript
import { useDeck } from '../hooks/useDeck';
```

2. 修改 `SlideCanvasProps` interface，新增可选的 `deckHtml` prop：

```typescript
interface SlideCanvasProps {
  deck: Deck;
  currentSlideIndex: number;
  deckHtml?: string | null;
}
```

3. 修改组件签名和渲染逻辑：

```typescript
export function SlideCanvas({ deck, currentSlideIndex, deckHtml }: SlideCanvasProps) {
```

4. 修改 `useEffect` 中的渲染逻辑 — 当 `deckHtml` 存在时直接使用，否则走 `renderDeck`：

```typescript
  useEffect(() => {
    let cancelled = false;

    if (deckHtml) {
      // AI 生成的 HTML 直接使用
      setHtml(deckHtml);
      setRendering(false);
      return;
    }

    setRendering(true);
    renderDeck(deck, { includeRuntime: true, includeAnimations: true, includeFx: true }).then(result => {
      if (!cancelled) {
        setHtml(result);
        setRendering(false);
      }
    });
    return () => { cancelled = true; };
  }, [deck, deckHtml]);
```

5. 修改 `totalSlides` 计算：

```typescript
  const totalSlides = deckHtml
    ? (deckHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length
    : deck.slides.length;
```

- [ ] **Step 2: 修改 Editor 页面传递 deckHtml**

在 `packages/client/src/pages/Editor.tsx` 中：

1. 新增从 store 获取 `isAiDeck` 和 `deckHtml`：

```typescript
  const isAiDeck = useDeck(s => s.isAiDeck);
  const deckHtml = useDeck(s => s.deckHtml);
```

2. 修改 `SlideCanvas` 调用，传递 `deckHtml`：

```typescript
  <SlideCanvas deck={deck} currentSlideIndex={currentSlideIndex} deckHtml={isAiDeck ? deckHtml : null} />
```

- [ ] **Step 3: 修改 ExportDialog 支持 isAiDeck**

在 `packages/client/src/components/ExportDialog.tsx` 中：

1. 新增从 store 获取 `isAiDeck` 和 `deckHtml`：

```typescript
  const isAiDeck = useDeck(s => s.isAiDeck);
  const deckHtml = useDeck(s => s.deckHtml);
```

2. 修改 `handleExport` 函数，当 `isAiDeck` 时直接导出 `deckHtml`：

```typescript
  const handleExport = async () => {
    if (!deck && !isAiDeck) return;
    setExporting(true);
    try {
      let html: string;
      if (isAiDeck && deckHtml) {
        html = deckHtml;
      } else if (deck) {
        html = await renderDeck(deck, {
          includeRuntime,
          includeAnimations,
          includeFx: includeAnimations,
          includePresenter,
          includeSourceData,
        });
      } else {
        return;
      }
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
```

- [ ] **Step 4: 验证类型检查通过**

Run: `cd /Users/queota/CCworkspace/html-studio-main/packages/client && npx tsc --noEmit 2>&1 | head -20`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add packages/client/src/pages/Editor.tsx packages/client/src/components/SlideCanvas.tsx packages/client/src/components/ExportDialog.tsx
git commit -m "feat(editor): adapt SlideCanvas and ExportDialog for isAiDeck mode"
```

---

### Task 12: 集成验证和构建测试

**Files:**
- None (verification only)

- [ ] **Step 1: 运行完整类型检查**

Run: `cd /Users/queota/CCworkspace/html-studio-main && pnpm build 2>&1 | tail -30`
Expected: 构建成功，无错误

- [ ] **Step 2: 启动开发服务器验证**

Run: `cd /Users/queota/CCworkspace/html-studio-main && pnpm dev`

手动验证：
1. 浏览器打开 http://localhost:5173
2. 确认新 Home 页面左右分栏布局正确
3. 确认文件上传功能正常
4. 确认主题选择器正常
5. 确认提示词输入和发送按钮正常
6. 确认 AI 连接后可以触发生成（需要配置 API Key）
7. 确认生成完成后 iframe 预览正常
8. 确认翻页控制正常
9. 确认"导出 HTML"按钮可下载文件
10. 确认"进入编辑器"按钮可跳转到编辑器
11. 确认编辑器中 AI deck 可以正常渲染和导出

- [ ] **Step 3: Final commit**

```bash
cd /Users/queota/CCworkspace/html-studio-main
git add -A
git commit -m "feat: complete AI conversational layout — chat + preview split view"
```
