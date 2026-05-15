# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTML Studio 是一个将文档（PDF、Markdown、TXT、DOCX）转换为精美 HTML 演示文稿的 Web 应用。用户上传文档后，前端解析并拆分为幻灯片，选择主题/布局/动画，通过 WYSIWYG 编辑器可视化编辑，最终导出独立 HTML 文件。

## Commands

```bash
pnpm install          # 安装所有 workspace 依赖
pnpm dev              # 启动所有包的开发模式（turbo 并行）
pnpm build            # 构建所有包（shared → client/server）
pnpm lint             # lint（目前是 no-op，各包未配置 lint script）

# 单独启动
cd packages/client && pnpm dev    # Vite 开发服务器，端口 5173
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
- **@html-studio/client** — React 19 + Vite 6 + Tailwind CSS v4 前端。Zustand 状态管理，react-router-dom 路由（`/` → Home, `/editor` → Editor, `/preview` → Preview）。
- **@html-studio/server** — Hono 后端，目前仅有 `/api/health` 健康检查端点，上传和 AI 服务尚未实现。

### 核心数据流

所有编辑操作修改 Zustand store 中的 `Slide[]` 数据，模板引擎重新渲染完整 HTML 填入 iframe 预览。

**渲染管线：** `loadTemplate(layout)` → `injectSlotValues(html, slots)` (DOMParser 操作) → 组装为完整 HTML 文档（含主题 CSS、动画、runtime）。

### 关键类型（@html-studio/shared）

- `Deck` — 整个幻灯片组（id, title, slides[], globalTheme）
- `Slide` — 单页（id, layout, theme, animation, fx, slots[], notes, order）
- `SlotValue` — 插槽值（id, type, value, label），type 为 text/richtext/image/list/counter
- `LayoutType` — 31 种布局枚举（cover, bullets, chart-bar, code, timeline 等）
- `ParseResult` — 文件解析结果（slides[], title, fileType）

### Client 关键模块

- `useDeck` hook — Zustand store，Deck/Slide CRUD、slot 更新、排序。使用自定义 `nanoid()`（timestamp + counter）而非 npm 包。
- `useFileParser` hook — 文件解析（pdf.js/mammoth/自定义 markdown/txt parser），全部在浏览器端完成。
- `renderer.ts` — `renderDeck()` 和 `renderSlidePreview()`，将 Slide[] 转为完整 HTML 字符串。
- `template-loader.ts` — 从 `/html-ppt/assets/templates/` 加载布局 HTML 模板并缓存。
- `slot-resolver.ts` — DOMParser 将 slot 值注入模板 HTML。

### 静态资源

`client/public/html-ppt/assets/` 包含从 html-ppt skill 复制的资源：36 主题 CSS、31 布局 HTML 模板、base.css、fonts.css、runtime.js、动画 CSS/JS、FX runtime 脚本、pdf.worker.min.mjs。

### Export 风格

- Pages 使用 `export default function Name()`
- Components 使用 `export function Name()`

### Tailwind CSS v4

使用 `@tailwindcss/vite` 插件（非 PostCSS），无 tailwind.config 文件。暗色主题颜色通过 CSS 自定义属性定义（`--color-primary`, `--color-surface`, `--color-bg` 等）在 `client/src/styles/index.css`。

### iframe WYSIWYG

Editor 页面三栏布局（SlideList | SlideCanvas | StylePanel），SlideCanvas 在 960×540 iframe 中渲染实际 HTML，通过 `postMessage` 通信（`preview-goto`, `slot-clicked`）。

## Known Gaps

- Vite 开发服务器未配置 API proxy 到后端 3000 端口
- `@dnd-kit` 已声明为依赖但拖拽排序使用原生 HTML5 drag events 实现
- Server 为 stub，上传路由和 AI 服务待实现
- 无测试框架、无 linter/formatter 配置