# 导航栏 + AI 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HTML Studio 添加全局顶部导航栏（方案 B 风格）和 AI 模型 API 集成，支持 OpenAI 兼容和 Anthropic Claude 两种 API 格式。

**Architecture:** 在现有页面结构之上添加全局 Navbar 组件，通过路由嵌套实现共享布局。新增 Zustand store `useAIConfig` 管理 AI 配置并持久化到 localStorage。新增 `lib/ai-client.ts` 前端直连 AI API。新增 `/settings` 设置页面。不改动现有页面的内部布局和组件结构。

**Tech Stack:** React 19, react-router-dom v7 (BrowserRouter + 嵌套路由), Zustand 5 (persist middleware), Tailwind CSS v4, TypeScript

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `packages/client/src/components/Navbar.tsx` | 全局顶部导航栏组件 |
| `packages/client/src/components/AIStatusIndicator.tsx` | AI 连接状态指示器 + 下拉菜单 |
| `packages/client/src/pages/Settings.tsx` | 设置页面（AI 配置 + 功能开关） |
| `packages/client/src/hooks/useAIConfig.ts` | AI 配置 Zustand store（持久化到 localStorage） |
| `packages/client/src/lib/ai-client.ts` | AI API 调用层（testConnection / optimizeLayout / optimizeSlide） |
| `packages/client/src/components/AIOptimizeButton.tsx` | 编辑器 AI 优化按钮 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `packages/client/src/main.tsx` | 添加 `/settings` 路由，添加全局 Navbar 布局嵌套 |
| `packages/client/src/pages/Home.tsx` | 移除顶部导航区（Logo + 示例/帮助），保留其余内容不变 |
| `packages/client/src/pages/Editor.tsx` | 在 StylePanel 下方添加 AIOptimizeButton（条件渲染） |
| `packages/client/src/pages/Home.tsx` | 在 handleGenerate 中添加 AI 自动排版逻辑（条件分支） |

### 不修改文件

- `packages/client/src/pages/Preview.tsx` — 全屏预览页不加导航栏
- `packages/client/src/components/StylePanel.tsx` — 不改动现有内容
- `packages/client/src/components/SlideCanvas.tsx` — 不改动
- `packages/client/src/components/SlideList.tsx` — 不改动
- `packages/client/src/styles/index.css` — 不改动，新样式用 Tailwind 类名
- `packages/client/src/hooks/useDeck.ts` — 不改动
- `packages/client/src/hooks/useFileParser.ts` — 不改动
- `packages/shared/src/**` — 不改动

---

### Task 1: AI 配置 Store

**Files:**
- Create: `packages/client/src/hooks/useAIConfig.ts`

- [ ] **Step 1: 创建 useAIConfig store**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  connected: boolean;
  autoLayout: boolean;
  editorAssist: boolean;
}

const DEFAULTS: Record<AIProvider, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6-20250514' },
};

interface AIConfigState extends AIConfig {
  setProvider: (provider: AIProvider) => void;
  setBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setConnected: (connected: boolean) => void;
  setAutoLayout: (on: boolean) => void;
  setEditorAssist: (on: boolean) => void;
}

export const useAIConfig = create<AIConfigState>()(
  persist(
    (set) => ({
      provider: 'openai',
      baseUrl: DEFAULTS.openai.baseUrl,
      apiKey: '',
      model: DEFAULTS.openai.model,
      connected: false,
      autoLayout: true,
      editorAssist: true,

      setProvider: (provider) => set({
        provider,
        baseUrl: DEFAULTS[provider].baseUrl,
        model: DEFAULTS[provider].model,
        connected: false,
      }),
      setBaseUrl: (baseUrl) => set({ baseUrl, connected: false }),
      setApiKey: (apiKey) => set({ apiKey, connected: false }),
      setModel: (model) => set({ model }),
      setConnected: (connected) => set({ connected }),
      setAutoLayout: (autoLayout) => set({ autoLayout }),
      setEditorAssist: (editorAssist) => set({ editorAssist }),
    }),
    { name: 'html-studio-ai-config' }
  )
);
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

Expected: 无与 `useAIConfig` 相关的错误

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/hooks/useAIConfig.ts
git commit -m "feat: add AI config Zustand store with localStorage persistence"
```

---

### Task 2: AI 调用层

**Files:**
- Create: `packages/client/src/lib/ai-client.ts`

- [ ] **Step 1: 创建 ai-client.ts**

```typescript
import type { Slide, FileType, LayoutType } from '@html-studio/shared';
import type { AIProvider } from '../hooks/useAIConfig';

interface AIClientConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 发送请求到 AI API，返回文本响应 */
async function callAI(config: AIClientConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  if (config.provider === 'openai') {
    return callOpenAI(config, systemPrompt, userPrompt);
  }
  return callAnthropic(config, systemPrompt, userPrompt);
}

async function callOpenAI(config: AIClientConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 错误 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(config: AIClientConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${config.baseUrl}/v1/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API 错误 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

/** 测试 AI 连接 — 发一条简单消息验证 Key 和 URL */
export async function testConnection(config: AIClientConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const reply = await callAI(config, 'You are a helpful assistant.', 'Hi, respond with "OK".');
    if (reply && reply.length > 0) {
      return { ok: true };
    }
    return { ok: false, error: 'AI 返回了空响应' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '连接失败';
    // 检测 CORS 错误
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return { ok: false, error: '网络请求失败，可能是 CORS 限制。请配置后端代理或使用 OpenAI 兼容格式的转发服务。' };
    }
    return { ok: false, error: message };
  }
}

/** AI 自动排版 — 分析文档内容，返回每页的 layout + slots 建议 */
export async function optimizeLayout(
  config: AIClientConfig,
  slides: Slide[],
  fileType: FileType
): Promise<Array<{ layout: LayoutType; slotHints: Record<string, string> }>> {
  const systemPrompt = `你是一个演示文稿排版专家。根据文档内容，为每一页幻灯片选择最合适的布局，并提供每个插槽的内容建议。

可用的布局类型：cover, toc, section-divider, bullets, two-column, three-column, big-quote, stat-highlight, kpi-grid, table, chart-bar, chart-line, chart-pie, chart-radar, code, diff, terminal, flow-diagram, arch-diagram, process-steps, mindmap, timeline, roadmap, gantt, comparison, pros-cons, todo-checklist, image-hero, image-grid, cta, thanks

请返回 JSON 数组，每个元素包含：
- layout: 布局类型
- slotHints: 插槽内容建议的键值对

只返回 JSON，不要其他文字。`;

  const userPrompt = `文件类型: ${fileType}\n\n文档内容（共 ${slides.length} 页）:\n${slides.map((s, i) => `--- 第 ${i + 1} 页 ---\n布局: ${s.layout}\n内容: ${s.slots.map(slot => `[${slot.label}]: ${slot.value}`).join('\n')}`).join('\n\n')}`;

  const reply = await callAI(config, systemPrompt, userPrompt);

  try {
    // 尝试从回复中提取 JSON
    const jsonMatch = reply.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 数组');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI 返回的排版建议格式无效，请重试或调整模型');
  }
}

/** AI 优化单页 — 根据当前幻灯片内容和主题，优化 slots 内容 */
export async function optimizeSlide(
  config: AIClientConfig,
  slide: Slide,
  theme: string
): Promise<{ layout?: LayoutType; slots: Array<{ id: string; value: string }> }> {
  const systemPrompt = `你是一个演示文稿内容优化专家。根据当前幻灯片的内容和主题，优化文字表达、排版建议，让内容更精炼、更有冲击力。

可用的布局类型：cover, toc, section-divider, bullets, two-column, three-column, big-quote, stat-highlight, kpi-grid, table, chart-bar, chart-line, chart-pie, chart-radar, code, diff, terminal, flow-diagram, arch-diagram, process-steps, mindmap, timeline, roadmap, gantt, comparison, pros-cons, todo-checklist, image-hero, image-grid, cta, thanks

请返回 JSON 对象，包含：
- layout: (可选) 建议更换的布局类型，如果不换则不包含此字段
- slots: 数组，每个元素包含 id 和优化后的 value

只返回 JSON，不要其他文字。`;

  const userPrompt = `当前主题: ${theme}\n当前布局: ${slide.layout}\n当前内容:\n${slide.slots.map(s => `[${s.id}] ${s.label}: ${s.value}`).join('\n')}`;

  const reply = await callAI(config, systemPrompt, userPrompt);

  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 对象');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI 返回的优化建议格式无效，请重试或调整模型');
  }
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

Expected: 无与 `ai-client` 相关的错误

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/lib/ai-client.ts
git commit -m "feat: add AI client layer with OpenAI and Anthropic support"
```

---

### Task 3: AI 状态指示器组件

**Files:**
- Create: `packages/client/src/components/AIStatusIndicator.tsx`

- [ ] **Step 1: 创建 AIStatusIndicator 组件**

```tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIConfig } from '../hooks/useAIConfig';

export function AIStatusIndicator() {
  const navigate = useNavigate();
  const connected = useAIConfig(s => s.connected);
  const provider = useAIConfig(s => s.provider);
  const model = useAIConfig(s => s.model);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const providerLabel = provider === 'openai' ? 'OpenAI 兼容' : 'Anthropic Claude';

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs hover:border-[var(--color-primary)]/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
        <span className="text-[var(--color-text-dim)]">
          {connected ? 'AI 已连接' : 'AI 未配置'}
        </span>
        <span className="text-[10px] text-[var(--color-text-dim2)]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg z-50">
          <div className="text-xs font-semibold mb-2">AI 设置</div>
          <div className="text-[10px] text-[var(--color-text-dim)] mb-1">当前: {providerLabel}</div>
          <div className="text-[10px] text-[var(--color-text-dim)] mb-3">模型: {model || '未设置'}</div>
          <button
            className="w-full bg-[var(--color-primary)] text-white rounded-lg py-1.5 text-[10px] font-semibold hover:opacity-90"
            onClick={() => { setOpen(false); navigate('/settings'); }}
          >
            修改配置
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/AIStatusIndicator.tsx
git commit -m "feat: add AI status indicator component with dropdown"
```

---

### Task 4: 全局导航栏组件

**Files:**
- Create: `packages/client/src/components/Navbar.tsx`

- [ ] **Step 1: 创建 Navbar 组件**

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { AIStatusIndicator } from './AIStatusIndicator';

const TABS = [
  { path: '/', label: '文件对话' },
  { path: '/editor', label: '编辑' },
  { path: '/settings', label: '设置' },
] as const;

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 h-12 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
      {/* 左侧：Logo + Tab 标签 */}
      <div className="flex items-center gap-6">
        <div className="text-base font-bold cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-[var(--color-primary)]">HTML</span> Studio
        </div>
        <nav className="flex gap-0.5">
          {TABS.map(tab => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                className={`px-4 py-1.5 text-xs rounded-t-lg transition-colors ${
                  active
                    ? 'bg-[var(--color-primary)] text-white font-semibold'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                }`}
                onClick={() => navigate(tab.path)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 右侧：AI 状态 + 齿轮 */}
      <div className="flex items-center gap-3">
        <AIStatusIndicator />
        <button
          className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-sm hover:border-[var(--color-primary)]/50 transition-colors"
          onClick={() => navigate('/settings')}
          title="设置"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/Navbar.tsx
git commit -m "feat: add global Navbar component with tab navigation and AI status"
```

---

### Task 5: 设置页面

**Files:**
- Create: `packages/client/src/pages/Settings.tsx`

- [ ] **Step 1: 创建 Settings 页面**

```tsx
import { useState } from 'react';
import { useAIConfig, type AIProvider } from '../hooks/useAIConfig';
import { testConnection } from '../lib/ai-client';

export default function Settings() {
  const provider = useAIConfig(s => s.provider);
  const baseUrl = useAIConfig(s => s.baseUrl);
  const apiKey = useAIConfig(s => s.apiKey);
  const model = useAIConfig(s => s.model);
  const connected = useAIConfig(s => s.connected);
  const autoLayout = useAIConfig(s => s.autoLayout);
  const editorAssist = useAIConfig(s => s.editorAssist);
  const setProvider = useAIConfig(s => s.setProvider);
  const setBaseUrl = useAIConfig(s => s.setBaseUrl);
  const setApiKey = useAIConfig(s => s.setApiKey);
  const setModel = useAIConfig(s => s.setModel);
  const setConnected = useAIConfig(s => s.setConnected);
  const setAutoLayout = useAIConfig(s => s.setAutoLayout);
  const setEditorAssist = useAIConfig(s => s.setEditorAssist);

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection({ provider, baseUrl, apiKey, model });
    setConnected(result.ok);
    setTestResult({ ok: result.ok, msg: result.ok ? '连接成功！' : (result.error ?? '连接失败') });
    setTesting(false);
  };

  const handleSave = () => {
    // Zustand persist 自动保存到 localStorage，这里只需确认
    setTestResult({ ok: true, msg: '配置已保存到浏览器本地' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-6">用户设置</h1>

        {/* AI 模型配置区 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-sm font-semibold">AI 模型配置</span>
          </div>

          {/* API 类型选择 */}
          <div className="mb-4">
            <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">API 类型</div>
            <div className="flex gap-2">
              {(['openai', 'anthropic'] as AIProvider[]).map(p => (
                <button
                  key={p}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    provider === p
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                  }`}
                  onClick={() => setProvider(p)}
                >
                  {p === 'openai' ? 'OpenAI 兼容' : 'Anthropic Claude'}
                </button>
              ))}
            </div>
          </div>

          {/* API Base URL */}
          <div className="mb-3">
            <label className="text-[10px] text-[var(--color-text-dim)] mb-1 block">API Base URL</label>
            <input
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com'}
            />
          </div>

          {/* API Key */}
          <div className="mb-3">
            <label className="text-[10px] text-[var(--color-text-dim)] mb-1 block">API Key</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <div className="text-[10px] text-[var(--color-text-dim2)] mt-1">Key 仅存储在浏览器本地，不会上传到服务器</div>
          </div>

          {/* 模型名称 */}
          <div className="mb-4">
            <label className="text-[10px] text-[var(--color-text-dim)] mb-1 block">模型名称</label>
            <input
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-6-20250514'}
            />
          </div>

          {/* 测试 + 保存 */}
          <div className="flex gap-2 mb-3">
            <button
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
              onClick={handleTest}
              disabled={testing || !apiKey}
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              onClick={handleSave}
            >
              保存配置
            </button>
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={`text-[10px] rounded-lg p-2 ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        {/* AI 功能开关 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="text-sm font-semibold mb-4">AI 功能</div>

          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <div>
              <div className="text-xs">自动排版生成</div>
              <div className="text-[10px] text-[var(--color-text-dim)]">上传文档后 AI 自动选择布局和主题</div>
            </div>
            <button
              className={`w-10 h-[22px] rounded-full relative transition-colors ${autoLayout ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-2)]'}`}
              onClick={() => setAutoLayout(!autoLayout)}
            >
              <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-all ${autoLayout ? 'right-[2px]' : 'left-[2px]'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-xs">编辑器 AI 优化</div>
              <div className="text-[10px] text-[var(--color-text-dim)]">在编辑器中让 AI 优化单页内容</div>
            </div>
            <button
              className={`w-10 h-[22px] rounded-full relative transition-colors ${editorAssist ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-2)]'}`}
              onClick={() => setEditorAssist(!editorAssist)}
            >
              <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-all ${editorAssist ? 'right-[2px]' : 'left-[2px]'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/pages/Settings.tsx
git commit -m "feat: add Settings page with AI config and feature toggles"
```

---

### Task 6: 路由和布局集成

**Files:**
- Modify: `packages/client/src/main.tsx`

- [ ] **Step 1: 修改 main.tsx — 添加全局布局和 /settings 路由**

将 `main.tsx` 替换为：

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import Settings from './pages/Settings';
import { Navbar } from './components/Navbar';
import './styles/index.css';

/** 全局布局：Navbar + 页面内容（Preview 页除外） */
function AppLayout() {
  const location = useLocation();
  const isPreview = location.pathname === '/preview';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {!isPreview && <Navbar />}
      <Outlet />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/preview" element={<Preview />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
```

关键点：
- `AppLayout` 包含 Navbar + `<Outlet />`，Preview 页单独路由不加导航栏
- Home、Editor、Settings 共享 `AppLayout`，通过 `<Outlet />` 渲染
- Preview 保持独立全屏路由

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/main.tsx
git commit -m "feat: add global layout with Navbar and /settings route"
```

---

### Task 7: 适配 Home 页面

**Files:**
- Modify: `packages/client/src/pages/Home.tsx`

- [ ] **Step 1: 移除 Home 页面自带的顶部导航区**

Home 页面当前有自己的顶部导航（Logo + 示例/帮助），现在由全局 Navbar 提供，需要移除。只删除顶部导航 div，保留其余所有内容不变。

将 Home.tsx 第 49-58 行的顶部导航 div 删除：

```tsx
// 删除这段：
{/* 顶部导航 */}
<div className="w-full max-w-[720px] flex justify-between items-center mb-12">
  <div className="text-lg font-bold">
    <span className="text-[var(--color-primary)]">HTML</span> Studio
  </div>
  <div className="flex gap-3 text-xs text-[var(--color-text-dim)]">
    <span className="cursor-pointer hover:text-[var(--color-text)]">示例</span>
    <span className="cursor-pointer hover:text-[var(--color-text)]">帮助</span>
  </div>
</div>
```

同时调整外层 div：由于 Navbar 已提供顶部栏，Home 页面不再需要 `min-h-screen`，改为 `flex-1` 填充剩余空间：

```tsx
// 将：
<div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: 'linear-gradient(135deg, #0d0d1a, #1a1a3e)' }}>
// 改为：
<div className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto" style={{ background: 'linear-gradient(135deg, #0d0d1a, #1a1a3e)' }}>
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/pages/Home.tsx
git commit -m "feat: remove Home page header, now provided by global Navbar"
```

---

### Task 8: 适配 Editor 页面

**Files:**
- Modify: `packages/client/src/pages/Editor.tsx`

- [ ] **Step 1: 调整 Editor 页面布局**

Editor 当前用 `h-screen flex overflow-hidden`，现在由全局布局提供 `h-screen flex flex-col`，Editor 需要改为 `flex-1` 填充剩余空间。

将 Editor.tsx 第 27 行：

```tsx
// 将：
<div className="h-screen flex overflow-hidden">
// 改为：
<div className="flex-1 flex overflow-hidden">
```

不改动 Editor 内部的三栏布局（SlideList | SlideCanvas | StylePanel + 导出按钮），只调整外层容器高度。

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/pages/Editor.tsx
git commit -m "feat: adjust Editor layout for global Navbar"
```

---

### Task 9: AI 优化按钮组件

**Files:**
- Create: `packages/client/src/components/AIOptimizeButton.tsx`

- [ ] **Step 1: 创建 AIOptimizeButton 组件**

```tsx
import { useState } from 'react';
import { useAIConfig } from '../hooks/useAIConfig';
import { useDeck } from '../hooks/useDeck';
import { optimizeSlide } from '../lib/ai-client';
import type { LayoutType } from '@html-studio/shared';

export function AIOptimizeButton() {
  const connected = useAIConfig(s => s.connected);
  const editorAssist = useAIConfig(s => s.editorAssist);
  const provider = useAIConfig(s => s.provider);
  const baseUrl = useAIConfig(s => s.baseUrl);
  const apiKey = useAIConfig(s => s.apiKey);
  const model = useAIConfig(s => s.model);

  const deck = useDeck(s => s.deck);
  const currentSlideIndex = useDeck(s => s.currentSlideIndex);
  const updateSlotValue = useDeck(s => s.updateSlotValue);
  const updateSlideLayout = useDeck(s => s.updateSlideLayout);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 仅当 editorAssist 开启且 connected 时显示
  if (!editorAssist || !connected) return null;
  if (!deck) return null;
  const slide = deck.slides[currentSlideIndex];
  if (!slide) return null;

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await optimizeSlide(
        { provider, baseUrl, apiKey, model },
        slide,
        deck.globalTheme
      );

      // 更新 slots
      for (const slot of result.slots) {
        updateSlotValue(slide.id, slot.id, slot.value);
      }

      // 如果 AI 建议更换 layout
      if (result.layout) {
        updateSlideLayout(slide.id, result.layout as LayoutType);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-2)] text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5"
        onClick={handleOptimize}
        disabled={loading}
      >
        <span>✨</span>
        <span>{loading ? 'AI 优化中...' : 'AI 优化'}</span>
      </button>
      {error && (
        <div className="text-[10px] text-red-400 mt-1 px-1">{error}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/AIOptimizeButton.tsx
git commit -m "feat: add AI optimize button for editor slide optimization"
```

---

### Task 10: 集成 AI 优化按钮到 Editor

**Files:**
- Modify: `packages/client/src/pages/Editor.tsx`

- [ ] **Step 1: 在 Editor 中添加 AIOptimizeButton**

在 Editor.tsx 中：
1. 添加 import：`import { AIOptimizeButton } from '../components/AIOptimizeButton';`
2. 在 StylePanel 下方、导出按钮上方插入 `<AIOptimizeButton />`

修改后的右侧面板区域（约第 30-45 行）变为：

```tsx
<div className="flex flex-col">
  <StylePanel />
  <AIOptimizeButton />
  <div className="p-2 border-l border-[var(--color-border)] bg-[var(--color-surface)]">
    <button
      onClick={() => setExportOpen(true)}
      className="w-full bg-[var(--color-primary)] text-white rounded-lg py-2 text-xs font-semibold"
    >
      导出 HTML
    </button>
    <button
      onClick={() => navigate('/preview')}
      className="w-full mt-1 bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)] rounded-lg py-1.5 text-[10px]"
    >
      全屏预览
    </button>
  </div>
</div>
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/pages/Editor.tsx
git commit -m "feat: integrate AI optimize button into Editor"
```

---

### Task 11: 集成 AI 自动排版到 Home 页面

**Files:**
- Modify: `packages/client/src/pages/Home.tsx`

- [ ] **Step 1: 在 handleGenerate 中添加 AI 自动排版逻辑**

在 Home.tsx 中：
1. 添加 import：`import { useAIConfig } from '../hooks/useAIConfig';` 和 `import { optimizeLayout } from '../lib/ai-client';`
2. 在组件内获取 AI 配置：`const aiConfig = useAIConfig();`
3. 修改 `handleGenerate` 函数，在现有解析逻辑之后、`initDeck` 之前，添加 AI 自动排版分支

修改后的 `handleGenerate`：

```tsx
const handleGenerate = async () => {
  if (!uploadedFile) return;

  let result = parseResult;
  if (!result) {
    result = await parseFile(uploadedFile);
  }
  if (!result) return;

  let slides: Slide[] = result.slides.map((s, i) => ({
    ...s,
    theme: selectedTheme,
    order: i,
  }));

  // AI 自动排版（如果开启且已连接）
  if (aiConfig.autoLayout && aiConfig.connected && aiConfig.apiKey) {
    try {
      const suggestions = await optimizeLayout(
        { provider: aiConfig.provider, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey, model: aiConfig.model },
        slides,
        result.fileType
      );
      // 用 AI 建议覆盖 layout 和 slot 内容
      slides = slides.map((slide, i) => {
        const hint = suggestions[i];
        if (!hint) return slide;
        return {
          ...slide,
          layout: hint.layout,
          slots: slide.slots.map(slot => ({
            ...slot,
            value: hint.slotHints[slot.id] ?? slot.value,
          })),
        };
      });
    } catch {
      // AI 排版失败时静默降级，使用默认布局
    }
  }

  initDeck(result.title, slides, selectedTheme);
  navigate('/editor');
};
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd packages/client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/pages/Home.tsx
git commit -m "feat: integrate AI auto-layout into Home page file generation"
```

---

### Task 12: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `cd /Users/queota/CCworkspace/html-studio-main && pnpm dev`

- [ ] **Step 2: 验证导航栏在 Home 和 Editor 页面显示**

打开 `http://localhost:5173/`，确认：
- 顶部显示 Navbar（Logo + 文件对话/编辑/设置 tab + AI 状态指示器 + 齿轮图标）
- 当前 tab "文件对话" 高亮
- Home 页面原有的上传区域、主题选择、生成按钮正常显示

- [ ] **Step 3: 验证 tab 切换**

点击 "编辑" tab，确认：
- 跳转到 `/editor`
- "编辑" tab 高亮
- Editor 三栏布局正常（SlideList | SlideCanvas | StylePanel）
- AI 优化按钮在 StylePanel 下方（因为未连接 AI，按钮不显示，符合预期）

点击 "设置" tab，确认：
- 跳转到 `/settings`
- "设置" tab 高亮
- 设置页面显示 AI 模型配置区和 AI 功能开关区

- [ ] **Step 4: 验证 AI 状态指示器**

点击 AI 状态指示器，确认：
- 下拉菜单显示当前 provider/model
- "修改配置" 按钮跳转到 `/settings`

- [ ] **Step 5: 验证 Preview 页面无导航栏**

从 Editor 点击 "全屏预览"，确认：
- Preview 页面全屏显示，无 Navbar
- ESC 返回编辑器正常

- [ ] **Step 6: 验证设置页面功能**

在 `/settings` 页面：
- 切换 API 类型（OpenAI / Anthropic），确认 baseUrl 和 model 自动更新
- 输入 API Key，确认遮罩显示
- 点击显示/隐藏按钮，确认 Key 可见/遮罩切换
- 切换 AI 功能开关，确认 toggle 动画正常
- 点击保存配置，确认提示消息显示

- [ ] **Step 7: Commit 验证完成**

```bash
git commit --allow-empty -m "chore: verified navbar + AI integration end-to-end"
```
