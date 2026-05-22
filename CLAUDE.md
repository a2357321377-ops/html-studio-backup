# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTML Studio 是一个将文档（PDF、Markdown、TXT、DOCX）或 AI 对话生成精美 HTML 演示文稿的 Web 应用。用户上传文档或通过 AI Chat 生成幻灯片，在 WYSIWYG 编辑器中可视化编辑，最终导出独立 HTML 文件。UI 语言为中文（zh-CN）。

## Commands

```bash
pnpm install          # 安装所有 workspace 依赖
pnpm dev              # 启动所有包的开发模式（turbo 并行）
pnpm build            # 构建所有包（shared → client/server）
pnpm lint             # lint（目前是 no-op，各包未配置 lint script）

# 单独启动
cd packages/client && pnpm dev    # Vite 开发服务器，端口 5173，已配置 /api proxy 到 :3000
cd packages/server && pnpm dev    # Hono 服务器，端口 3000，tsx watch
cd packages/shared && pnpm build  # 编译 shared 类型

# 类型检查
cd packages/client && npx tsc --noEmit
cd packages/server && npx tsc --noEmit
cd packages/shared && npx tsc --noEmit
```

目前没有测试框架和测试文件。

## Architecture

pnpm workspace monorepo，Turborepo 编排，三个包：

- **@html-studio/shared** — 纯类型和元数据包（36 主题、31 布局、27 CSS 动画、20 Canvas FX）。无构建产物，消费者直接 import `./src/index.ts`。
- **@html-studio/client** — React 19 + Vite 6 + Tailwind CSS v4 前端。Zustand 状态管理，react-router-dom v7 路由。
- **@html-studio/server** — Hono 后端，AI 代理路由（支持 Anthropic 和 OpenAI，含流式 SSE），前端通过此路由调用 AI API 避免 CORS 限制。

### 两条数据流

1. **AI 生成 HTML 流（主要流程）**：ChatPanel 对话 → AI 生成完整 raw HTML → 存为 `useAIChat.deckHtml` 字符串 → iframe 直接渲染 → WYSIWYG 编辑器通过 `contenteditable` + `postMessage` 修改 raw HTML → `syncFromIframe()` + `cleanEditorArtifacts()` 清理后同步回 store。

2. **传统 Slot 模板流（遗留）**：上传文件 → 解析为 `Slide[]` → `useDeck` store → `renderDeck()` 模板引擎 → iframe 预览。此路径修改结构化 `Slide[]` 数据后重新渲染完整 HTML。

编辑器当前主要工作在 raw HTML 模式（AI 流），传统模板系统仍存在但较少使用。

### Zustand 状态管理

| Store | 文件 | 持久化 | 作用 |
|-------|------|--------|------|
| `useDeck` | `hooks/useDeck.ts` | 无 | Slide[] CRUD、slot 更新、排序。自定义 `nanoid()`（timestamp+counter） |
| `useAIChat` | `hooks/useAIChat.ts` | localStorage `html-studio-ai-chat` | 聊天消息、上传文件、生成状态、`deckHtml`、`originalPrompt` |
| `useAIConfig` | `hooks/useAIConfig.ts` | localStorage `html-studio-ai-config` | AI provider 配置（OpenAI/Anthropic）、baseUrl、apiKey、model |
| `useEditorStore` | `hooks/useEditorStore.ts` | 无 | 编辑器状态：deckHtml、currentSlideIndex、selectedElement、activeTab、iframeRef |

### 路由

- `/` → Home（AI Chat + 预览）
- `/editor` → Editor（三栏 WYSIWYG）
- `/settings` → Settings（AI 配置）
- `/preview` → Preview（全屏 iframe，不在 AppLayout 内，无 Navbar）

### 渲染管线（传统模板）

`loadTemplate(layout)` → `injectSlotValues(html, slots)` (DOMParser) → 组装完整 HTML 文档（含主题 CSS、动画、runtime）。

### 关键类型（@html-studio/shared）

- `Deck` — 整个幻灯片组（id, title, slides[], globalTheme）
- `Slide` — 单页（id, layout, theme, animation, fx, slots[], notes, order）
- `SlotValue` — 插槽值（id, type, value, label），type 为 text/richtext/image/list/counter
- `LayoutType` — 31 种布局枚举（cover, bullets, chart-bar, code, timeline 等）
- `ParseResult` — 文件解析结果（slides[], title, fileType）

### Client 关键模块

- `useDeck` hook — Zustand store，Deck/Slide CRUD、slot 更新、排序。使用自定义 `nanoid()`（timestamp + counter）而非 npm 包。
- `useEditorStore` hook — 编辑器核心状态，`cleanEditorArtifacts()` 是关键卫生机制，用 DOMParser 在存储/导出/同步前剥离编辑器注入元素（`[data-editor-highlight]`、`[data-editor-runtime]`、`[contenteditable]`）。
- `useFileParser` hook — 文件解析（pdf.js/mammoth/自定义 markdown/txt parser），全部在浏览器端完成。
- `renderer.ts` — `renderDeck()` 和 `renderSlidePreview()`，将 Slide[] 转为完整 HTML 字符串。
- `template-loader.ts` — 从 `/html-ppt/assets/templates/` 加载布局 HTML 模板并缓存。
- `slot-resolver.ts` — DOMParser 将 slot 值注入模板 HTML。
- `ai-client.ts` — AI API 调用：`testConnection()`、`buildDeckPrompt()`（~580 行系统提示词，包含所有 CSS 类名、布局策略、背景规则、FX 规则的完整参考）、`buildEditPrompt()`。
- `ai-stream.ts` — `streamAI()` SSE 流式代理，解析 Anthropic 和 OpenAI 流格式。

### EditorCanvas iframe 生命周期

EditorCanvas 有复杂的 iframe 管理：`iframeKey`/`iframeSrcDoc` 防止重渲染循环，`lastWrittenHtmlRef` 区分外部更新与 syncFromIframe 回写，注入 runtime script 处理 click-select、dblclick-edit、contenteditable、postMessage 通信。修改此组件需格外注意 iframe 重渲染和状态同步的边界条件。

### 静态资源

`client/public/html-ppt/assets/` 包含从 html-ppt skill 复制的资源：36 主题 CSS、31 布局 HTML 模板、base.css、fonts.css、runtime.js、动画 CSS/JS、FX runtime 脚本、pdf.worker.min.mjs。

### Export 风格

- Pages 使用 `export default function Name()`
- Components 使用 `export function Name()`

### Tailwind CSS v4

使用 `@tailwindcss/vite` 插件（非 PostCSS），无 tailwind.config 文件。暗色主题颜色通过 CSS 自定义属性定义（`--color-primary`, `--color-surface`, `--color-bg` 等）在 `client/src/styles/index.css`。

### iframe WYSIWYG

Editor 页面三栏布局（SlideThumbnailList | EditorCanvas | PropertyPanel），EditorCanvas 在 960×540 iframe 中渲染实际 HTML，通过 `postMessage` 通信（`preview-goto`, `slot-clicked`, style/theme/fx/layout 更新命令）。

## Known Gaps

- `@dnd-kit` 已声明为依赖但拖拽排序使用原生 HTML5 drag events 实现
- 无测试框架、无 linter/formatter 配置
- 自定义 `nanoid()` 在 5+ 个文件中重复定义（useDeck.ts、markdown.ts、pdf.ts、txt.ts、docx.ts），应抽取为共享工具