# HTML Studio — AI 对话式排版设计

## 概述

将 html-ppt skill 的对话式工作流搬到网页端。用户在左侧对话区上传文件 + 输入提示词，AI 直接生成完整 HTML 幻灯片，右侧实时预览。替换现有 Home 页面。

## 页面布局

新 Home 页面采用左右分栏布局：

```
┌─────────────────── Navbar ──────────────────────┐
├────────────────────┬────────────────────────────┤
│   对话区 (45%)     │    预览区 (55%)            │
│                    │                            │
│  [📎 上传文件]     │   ┌──────────────────┐     │
│  [提示词输入框]    │   │                  │     │
│                    │   │   幻灯片预览      │     │
│  [发送按钮]        │   │   (iframe)       │     │
│                    │   │                  │     │
│  ── AI 回复 ──     │   └──────────────────┘     │
│                    │                            │
│  [生成进度]        │   [< 1/N >]  翻页控制      │
│                    │                            │
│                    │   [进入编辑器] [导出 HTML]  │
└────────────────────┴────────────────────────────┘
```

### 对话区（左侧 45%）

- **文件上传**：顶部附件按钮，点击弹出文件选择器。上传后显示文件名和大小，可移除。复用现有 `useFileParser` 解析文件内容。
- **提示词输入框**：多行文本输入，placeholder 为"描述你想要的演示风格，如：做一个深色科技风格的产品发布会..."。可选填，不填则 AI 根据文件内容自动决定风格。
- **发送按钮**：点击后将文件内容 + 提示词发给 AI。
- **AI 回复区**：显示 AI 的生成计划（使用哪些布局、主题）和实时进度（"正在生成第 3/7 页..."）。

### 预览区（右侧 55%）

- **幻灯片预览**：iframe 用 `srcdoc` 渲染 AI 生成的 HTML，流式更新。
- **翻页控制**：上一页/下一页按钮 + 页码显示。
- **操作按钮**：
  - "导出 HTML" — 直接下载 AI 生成的完整 HTML 文件
  - "进入编辑器" — 跳转编辑器页面，AI HTML 存入 store

## AI 生成流程

### 交互流程

1. 用户上传文件 + 输入提示词 → 点击发送
2. 前端解析文件内容（复用 `useFileParser`），将文件文本 + 提示词 + 主题信息组合为 prompt
3. 通过后端代理 `/api/ai/chat` 发给 AI，prompt 包含 html-ppt 模板规范
4. AI 流式返回 HTML → 前端逐步拼接完整 deck HTML
5. 右侧 iframe 实时渲染，每收到一段就刷新 `srcdoc`
6. 生成完成 → 完整 HTML 存入 store，用户可翻页、进入编辑器或导出

### AI Prompt 结构

**系统 prompt**：

```
你是一个演示文稿生成专家。根据用户提供的文档内容和风格要求，
生成符合 html-ppt 规范的完整 HTML 演示文稿。

规范要求：
- 整体结构：<!DOCTYPE html><html><head>引入 CSS/JS</head><body>
  <div class="deck"> 内含多个 <section class="slide">
- 每个 <section class="slide"> 是一页幻灯片
- 使用指定的主题 CSS 类（如 theme-tokyo-night）
- 可用的布局类：layout-cover, layout-section, layout-bullets,
  layout-numbered-list, layout-two-column, layout-three-column,
  layout-image-left, layout-image-right, layout-image-full,
  layout-quote, layout-stats, layout-chart-bar, layout-chart-pie,
  layout-timeline, layout-comparison, layout-table, layout-code,
  layout-definition, layout-callout, layout-photo-grid, layout-agenda,
  layout-team, layout-testimonial, layout-process, layout-map,
  layout-calendar, layout-metrics, layout-split-text, layout-centered,
  layout-blank
- slot 标记：<div data-slot="slotId">内容</div>
- 引入 CSS：/html-ppt/assets/themes/{theme}.css,
  /html-ppt/assets/base.css, /html-ppt/assets/fonts.css
- 引入 JS：/html-ppt/assets/runtime.js
- 动画 CSS：/html-ppt/assets/animations/{animation}.css
- 16:9 比例，每页内容精炼，避免文字过多
```

**用户 prompt**：

```
--- 文档内容 ---
{解析后的文件文本}

--- 风格要求 ---
{用户提示词}

--- 主题 ---
{当前选择的主题}
```

### 流式响应

后端代理 `/api/ai/chat` 支持流式转发：

- **OpenAI**：使用 `stream: true`，返回 SSE 格式，后端透传 SSE 事件
- **Anthropic**：使用 `stream: true`，返回 SSE 格式，后端透传 SSE 事件

前端用 `fetch + ReadableStream` 逐步读取 AI 返回的 HTML chunk，拼接后刷新 iframe `srcdoc`。

后端新增路由：`POST /api/ai/chat/stream`，返回 `text/event-stream`。

## Store 变更

`useDeck` 新增字段：

```typescript
interface DeckState {
  // ... 现有字段
  deckHtml: string | null;  // AI 生成的完整 HTML
  isAiDeck: boolean;        // 标记当前 deck 是否由 AI 生成
}
```

- `setDeckHtml(html: string)` — 设置 AI 生成的 HTML
- `clearDeckHtml()` — 清除 AI HTML

## 编辑器适配

当 `isAiDeck = true` 时，编辑器行为变化：

1. **SlideCanvas** — iframe 直接渲染 `deckHtml`（用 `srcdoc`），不走模板引擎的 `renderSlide()`
2. **翻页** — 通过 `postMessage` 向 iframe 发送 `goto-slide` 指令，runtime.js 处理翻页
3. **文字编辑** — 点击幻灯片文字区域，通过 `slot-clicked` postMessage 事件，在 StylePanel 中显示编辑框，修改后直接更新 `deckHtml` 中对应的 DOM 内容
4. **主题切换** — 替换 `deckHtml` 中的主题 CSS link
5. **AI 优化** — AIOptimizeButton 将当前 slide 的 HTML 片段发给 AI，返回优化后直接替换

当 `isAiDeck = false` 时，保持现有编辑器逻辑不变。

## 导出

- **导出 HTML** — 直接下载 `deckHtml`，包含所有主题 CSS、runtime.js、动画等，是一个独立可运行的 HTML 文件
- **导出 PDF** — 后续迭代

## 组件清单

| 组件 | 位置 | 职责 |
|------|------|------|
| `ChatPanel` | `components/ChatPanel.tsx` | 左侧对话区：文件上传、提示词输入、AI 回复、发送按钮 |
| `PreviewPanel` | `components/PreviewPanel.tsx` | 右侧预览区：iframe 渲染、翻页控制、操作按钮 |
| `ChatMessage` | `components/ChatMessage.tsx` | 单条对话消息（用户/AI） |
| `FileAttachment` | `components/FileAttachment.tsx` | 对话区顶部的文件附件显示 |

## 路由变更

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 新 Home（AI 对话式排版） | 替换现有 Home |
| `/editor` | 编辑器 | 现有，适配 AI deck |
| `/settings` | 设置 | 现有，不变 |
| `/preview` | 预览 | 现有，不变 |

## 主题选择

主题选择从 Home 页面移到对话区。在提示词输入框上方添加一个简洁的主题选择器（复用现有 `ThemePicker` 组件，`mode="compact"`）。AI 会根据选择的主题生成对应风格的 HTML。

## 错误处理

- AI 连接失败 → 对话区显示红色错误提示，建议检查设置
- AI 返回格式异常 → 提示"AI 生成失败，请重试"，保留已生成的部分
- 文件解析失败 → 和现有行为一致，显示错误提示
- 流式传输中断 → 保留已接收的 HTML，提示"生成中断，可使用已生成的部分"
