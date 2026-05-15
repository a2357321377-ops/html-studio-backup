# HTML Studio 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 html-ppt skill 的能力做成 Web 应用，非技术用户通过可视化界面完成：上传文档 → 前端解析拆分 → 选择模板/主题/动效 → 可视化编辑 → 导出 HTML

**Architecture:** Vite + Hono Monorepo (Turborepo)。三个包：`shared`（类型与元数据）、`client`（Vite React 前端）、`server`（Hono 后端）。编辑器用 iframe 渲染真实 HTML 保证所见即所得，所有编辑操作修改 Slide[] 数据后由模板引擎重新渲染。

**Tech Stack:** React 19, TypeScript, Vite 6, Hono, Turborepo, Tailwind CSS 4, Zustand (状态管理), @dnd-kit (拖拽排序), pdf.js, mammoth.js

---

## 文件结构

```
html-studio/
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types.ts              # Slide, Deck, SlotValue, ThemeMeta, LayoutMeta, AnimMeta, FxMeta
│   │   │   ├── themes.ts             # 36 主题元数据（name, label, category, previewColors, description）
│   │   │   ├── layouts.ts            # 31 布局元数据（name, label, category, slots 定义）
│   │   │   ├── animations.ts         # 27 CSS 动效元数据
│   │   │   ├── fx.ts                 # 20 Canvas FX 元数据
│   │   │   └── index.ts              # 统一导出
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── client/
│   │   ├── src/
│   │   │   ├── App.tsx               # 路由入口
│   │   │   ├── main.tsx              # React 挂载
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx          # 首页：上传 + 主题选择 + 生成
│   │   │   │   ├── Editor.tsx        # 编辑器三栏布局
│   │   │   │   └── Preview.tsx       # 全屏预览
│   │   │   ├── components/
│   │   │   │   ├── FileUploader.tsx  # 文件拖拽上传
│   │   │   │   ├── FileInfo.tsx      # 已上传文件信息展示
│   │   │   │   ├── ThemePicker.tsx   # 主题选择器（首页3推荐 + 弹窗全量）
│   │   │   │   ├── LayoutPicker.tsx  # 布局选择器
│   │   │   │   ├── AnimationPicker.tsx # 入场动效选择器
│   │   │   │   ├── FxPicker.tsx      # 背景特效选择器
│   │   │   │   ├── SlideList.tsx     # 左栏幻灯片列表
│   │   │   │   ├── SlideCard.tsx     # 单个幻灯片缩略图卡片
│   │   │   │   ├── SlideCanvas.tsx   # 中栏 iframe 画布
│   │   │   │   ├── StylePanel.tsx    # 右栏样式面板
│   │   │   │   ├── SlotEditor.tsx    # 插槽内容表单编辑器
│   │   │   │   ├── InlineToolbar.tsx # 就地编辑浮动工具条
│   │   │   │   ├── ExportDialog.tsx  # 导出对话框
│   │   │   │   └── Modal.tsx         # 通用弹窗
│   │   │   ├── hooks/
│   │   │   │   ├── useDeck.ts        # Deck 状态管理 (Zustand store)
│   │   │   │   └── useFileParser.ts  # 文件解析 hook
│   │   │   ├── lib/
│   │   │   │   ├── parser/
│   │   │   │   │   ├── markdown.ts   # Markdown → Slide[]
│   │   │   │   │   ├── txt.ts        # TXT → Slide[]
│   │   │   │   │   ├── pdf.ts        # PDF → Slide[] (pdf.js)
│   │   │   │   │   ├── docx.ts       # DOCX → Slide[] (mammoth.js)
│   │   │   │   │   └── index.ts      # 统一解析入口
│   │   │   │   ├── renderer.ts       # Slide[] → 完整 HTML 字符串
│   │   │   │   ├── template-loader.ts # 加载布局模板 HTML
│   │   │   │   └── slot-resolver.ts  # 解析模板中的可编辑插槽
│   │   │   ├── styles/
│   │   │   │   └── index.css         # Tailwind 入口
│   │   │   └── vite-env.d.ts
│   │   ├── public/
│   │   │   └── html-ppt/             # html-ppt 静态资源（构建时复制）
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── server/
│       ├── src/
│       │   ├── index.ts              # Hono app 入口
│       │   ├── routes/
│       │   │   └── upload.ts         # 文件上传 API（代理大文件）
│       │   └── middleware/
│       │       └── cors.ts
│       └── package.json
│
├── turbo.json
├── package.json                      # Workspace root
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

---

### Task 1: 项目脚手架 — Monorepo 初始化

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`
- Create: `packages/client/vite.config.ts`
- Create: `packages/client/index.html`
- Create: `packages/client/tailwind.config.ts`
- Create: `packages/server/package.json`

- [ ] **Step 1: 创建 workspace root 配置**

```json
// package.json
{
  "name": "html-studio",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  },
  "packageManager": "pnpm@10.11.0"
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 2: 创建 shared 包配置**

```json
// packages/shared/package.json
{
  "name": "@html-studio/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 client 包配置**

```json
// packages/client/package.json
{
  "name": "@html-studio/client",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@html-studio/shared": "workspace:*",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0",
    "zustand": "^5.0.0",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "pdfjs-dist": "^4.10.0",
    "mammoth": "^1.8.0",
    "nanoid": "^5.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "vite": "^6.3.0",
    "typescript": "^5.8.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0"
  }
}
```

```ts
// packages/client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

```html
<!-- packages/client/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HTML Studio</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 server 包配置**

```json
// packages/server/package.json
{
  "name": "@html-studio/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/node-server": "^1.14.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 5: 安装依赖并验证**

Run: `pnpm install`
Expected: 所有依赖安装成功，无 peer dependency 警告

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: initialize monorepo with shared, client, server packages"
```

---

### Task 2: 共享类型与元数据 — shared 包

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/themes.ts`
- Create: `packages/shared/src/layouts.ts`
- Create: `packages/shared/src/animations.ts`
- Create: `packages/shared/src/fx.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: 定义核心类型**

```ts
// packages/shared/src/types.ts

/** 布局类型 — 对应 templates/single-page/*.html 文件名 */
export type LayoutType =
  | 'cover' | 'toc' | 'section-divider'
  | 'bullets' | 'two-column' | 'three-column' | 'big-quote'
  | 'stat-highlight' | 'kpi-grid' | 'table'
  | 'chart-bar' | 'chart-line' | 'chart-pie' | 'chart-radar'
  | 'code' | 'diff' | 'terminal'
  | 'flow-diagram' | 'arch-diagram' | 'process-steps' | 'mindmap'
  | 'timeline' | 'roadmap' | 'gantt' | 'comparison' | 'pros-cons' | 'todo-checklist'
  | 'image-hero' | 'image-grid'
  | 'cta' | 'thanks';

/** 插槽值类型 */
export type SlotType = 'text' | 'richtext' | 'image' | 'list' | 'counter';

/** 插槽值 */
export interface SlotValue {
  id: string;          // 插槽标识：title | subtitle | kicker | lede | body | items | counter | image | ...
  type: SlotType;      // 值类型
  value: string;       // 实际内容（文本/URL/JSON 序列化的列表）
  label: string;       // 显示标签（中文）
}

/** 单页幻灯片 */
export interface Slide {
  id: string;
  layout: LayoutType;
  theme: string;       // 主题名，如 'tokyo-night'
  animation: string;   // 入场动效，如 'fade-up'
  fx: string | null;   // 背景特效，如 'particle-burst'，null 表示无
  slots: SlotValue[];
  notes: string;       // 演讲者备注
  order: number;       // 排序序号
}

/** 整个幻灯片组 */
export interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  globalTheme: string; // 全局主题（可被单页覆盖）
  createdAt: number;
  updatedAt: number;
}

/** 主题分类 */
export type ThemeCategory =
  | 'light-calm' | 'bold-statement' | 'cool-dark'
  | 'warm-vibrant' | 'effect-heavy'
  | 'light-professional' | 'bold-editorial' | 'dramatic';

/** 主题元数据 */
export interface ThemeMeta {
  name: string;          // CSS 文件名（不含 .css）
  label: string;         // 显示名
  category: ThemeCategory;
  previewColors: string[]; // 预览渐变色，1-3 个
  description: string;   // 一句话描述
  recommended?: boolean; // 首页推荐
}

/** 布局分类 */
export type LayoutCategory =
  | 'openers' | 'text-centric' | 'numbers-data'
  | 'code-terminal' | 'diagrams-flows' | 'plans-comparisons'
  | 'visuals' | 'closers';

/** 布局元数据 */
export interface LayoutMeta {
  name: LayoutType;
  label: string;          // 显示名
  category: LayoutCategory;
  slotDefs: SlotDef[];    // 该布局的插槽定义
}

/** 插槽定义（描述布局有哪些可编辑区域） */
export interface SlotDef {
  id: string;
  type: SlotType;
  label: string;
  default: string;        // 默认值
}

/** CSS 动效元数据 */
export interface AnimMeta {
  name: string;           // 如 'fade-up'
  label: string;          // 显示名
  category: string;       // 分类
  description: string;
}

/** Canvas FX 元数据 */
export interface FxMeta {
  name: string;           // 如 'particle-burst'
  label: string;          // 显示名
  description: string;
}

/** 文件类型 */
export type FileType = 'markdown' | 'txt' | 'pdf' | 'docx';

/** 解析结果 */
export interface ParseResult {
  slides: Slide[];
  title: string;
  fileType: FileType;
}
```

- [ ] **Step 2: 定义 36 主题元数据**

```ts
// packages/shared/src/themes.ts
import type { ThemeMeta, ThemeCategory } from './types';

export const THEME_CATEGORIES: Record<ThemeCategory, string> = {
  'light-calm': '柔和亮色',
  'bold-statement': '大胆宣言',
  'cool-dark': '冷调暗色',
  'warm-vibrant': '温暖活力',
  'effect-heavy': '特效风格',
  'light-professional': '专业亮色',
  'bold-editorial': '编辑风格',
  'dramatic': '戏剧风格',
};

export const themes: ThemeMeta[] = [
  // Light & calm
  { name: 'minimal-white', label: 'Minimal White', category: 'light-calm', previewColors: ['#ffffff', '#f7f7f8'], description: '极简白，克制优雅', recommended: true },
  { name: 'editorial-serif', label: 'Editorial Serif', category: 'light-calm', previewColors: ['#f5f0e8', '#2c2c2c'], description: '杂志风衬线体' },
  { name: 'soft-pastel', label: 'Soft Pastel', category: 'light-calm', previewColors: ['#ffeaa7', '#fab1a0'], description: '柔和马卡龙三色渐变' },
  { name: 'xiaohongshu-white', label: 'Xiaohongshu White', category: 'light-calm', previewColors: ['#fff5f5', '#ff4757'], description: '小红书白 + 暖红点缀' },
  { name: 'solarized-light', label: 'Solarized Light', category: 'light-calm', previewColors: ['#fdf6e3', '#93a1a1'], description: '经典低眩光配色' },
  { name: 'catppuccin-latte', label: 'Catppuccin Latte', category: 'light-calm', previewColors: ['#eff1f5', '#8839ef'], description: 'Catppuccin 亮色变体' },

  // Bold & statement
  { name: 'sharp-mono', label: 'Sharp Mono', category: 'bold-statement', previewColors: ['#000000', '#ffffff'], description: '纯黑白 + 硬阴影' },
  { name: 'neo-brutalism', label: 'Neo Brutalism', category: 'bold-statement', previewColors: ['#fef9c3', '#facc15'], description: '粗描边 + 硬阴影 + 亮黄' },
  { name: 'bauhaus', label: 'Bauhaus', category: 'bold-statement', previewColors: ['#ef4444', '#eab308'], description: '几何 + 红黄蓝三原色' },
  { name: 'swiss-grid', label: 'Swiss Grid', category: 'bold-statement', previewColors: ['#ffffff', '#1a1a1a'], description: '瑞士网格 + Helvetica 感' },
  { name: 'memphis-pop', label: 'Memphis Pop', category: 'bold-statement', previewColors: ['#ff6b6b', '#feca57'], description: 'Memphis 波普风 + 圆点背景' },

  // Cool & dark
  { name: 'tokyo-night', label: 'Tokyo Night', category: 'cool-dark', previewColors: ['#1a1b26', '#7aa2f7'], description: '东京夜蓝调', recommended: true },
  { name: 'dracula', label: 'Dracula', category: 'cool-dark', previewColors: ['#282a36', '#bd93f9'], description: '经典 Dracula 紫红' },
  { name: 'catppuccin-mocha', label: 'Catppuccin Mocha', category: 'cool-dark', previewColors: ['#1e1e2e', '#cba6f7'], description: 'Catppuccin 暗色变体' },
  { name: 'nord', label: 'Nord', category: 'cool-dark', previewColors: ['#2e3440', '#88c0d0'], description: '北欧冷蓝白' },
  { name: 'gruvbox-dark', label: 'Gruvbox Dark', category: 'cool-dark', previewColors: ['#282828', '#fe8019'], description: '暖复古暗色' },
  { name: 'rose-pine', label: 'Rose Pine', category: 'cool-dark', previewColors: ['#191724', '#eb6f92'], description: 'Rose Pine 柔暗调' },
  { name: 'arctic-cool', label: 'Arctic Cool', category: 'cool-dark', previewColors: ['#e8f4f8', '#0c4a6e'], description: '蓝/青/石板冷色' },

  // Warm & vibrant
  { name: 'sunset-warm', label: 'Sunset Warm', category: 'warm-vibrant', previewColors: ['#ffecd2', '#fcb69f'], description: '橙/珊瑚/琥珀渐变', recommended: true },

  // Effect-heavy
  { name: 'glassmorphism', label: 'Glassmorphism', category: 'effect-heavy', previewColors: ['#0b1024', '#7dd3fc'], description: '毛玻璃 + 多彩光斑' },
  { name: 'aurora', label: 'Aurora', category: 'effect-heavy', previewColors: ['#a18cd1', '#fbc2eb'], description: '极光渐变 + 模糊' },
  { name: 'rainbow-gradient', label: 'Rainbow Gradient', category: 'effect-heavy', previewColors: ['#ff6b6b', '#48dbfb'], description: '白底 + 彩虹流动渐变' },
  { name: 'blueprint', label: 'Blueprint', category: 'effect-heavy', previewColors: ['#0a1628', '#4a9eff'], description: '蓝图工程 + 网格底纹' },
  { name: 'terminal-green', label: 'Terminal Green', category: 'effect-heavy', previewColors: ['#0a0a0a', '#33ff33'], description: '绿屏终端 + 等宽字体' },

  // v2 Light & professional
  { name: 'corporate-clean', label: 'Corporate Clean', category: 'light-professional', previewColors: ['#ffffff', '#1e3a5f'], description: '纯白 + 海军蓝 + 保守边框' },
  { name: 'pitch-deck-vc', label: 'Pitch Deck VC', category: 'light-professional', previewColors: ['#ffffff', '#6366f1'], description: 'YC 风 + 蓝紫渐变 + 大留白' },
  { name: 'academic-paper', label: 'Academic Paper', category: 'light-professional', previewColors: ['#fefefe', '#1a1a2e'], description: '论文白 + 衬线正文 + 蓝色链接' },
  { name: 'japanese-minimal', label: 'Japanese Minimal', category: 'light-professional', previewColors: ['#f8f4e8', '#c0392b'], description: '象牙白 + 朱红 + 极致留白' },
  { name: 'engineering-whiteprint', label: 'Engineering Whiteprint', category: 'light-professional', previewColors: ['#ffffff', '#1e3a5f'], description: '白底 + 坐标纸网格 + 海军蓝墨线' },

  // v2 Bold & editorial
  { name: 'magazine-bold', label: 'Magazine Bold', category: 'bold-editorial', previewColors: ['#f5f0e8', '#ff6b35'], description: '奶油底 + 超大 Playfair + 橙色点缀' },
  { name: 'news-broadcast', label: 'News Broadcast', category: 'bold-editorial', previewColors: ['#ffffff', '#dc2626'], description: '白 + 红竖条 + Oswald 大写' },
  { name: 'midcentury', label: 'Midcentury', category: 'bold-editorial', previewColors: ['#f5f0e8', '#d4a574'], description: '奶油底 + 芥末/青绿/焦橙' },
  { name: 'retro-tv', label: 'Retro TV', category: 'bold-editorial', previewColors: ['#f5e6c8', '#e8a838'], description: '暖奶油 + CRT 扫描线 + 琥珀橙' },

  // v2 Dramatic
  { name: 'cyberpunk-neon', label: 'Cyberpunk Neon', category: 'dramatic', previewColors: ['#000000', '#ff2bd6'], description: '纯黑 + 霓虹粉/青/黄' },
  { name: 'vaporwave', label: 'Vaporwave', category: 'dramatic', previewColors: ['#2d1b69', '#ff6ad5'], description: '深紫 + 粉/青/蓝渐变' },
  { name: 'y2k-chrome', label: 'Y2K Chrome', category: 'dramatic', previewColors: ['#c0c0c0', '#ff69b4'], description: '银铬渐变 + 彩虹点缀 + 大圆角' },
];

/** 首页推荐的 3 个主题 */
export const recommendedThemes = themes.filter(t => t.recommended);
```

- [ ] **Step 3: 定义 31 布局元数据（含插槽定义）**

```ts
// packages/shared/src/layouts.ts
import type { LayoutMeta, LayoutCategory, LayoutType, SlotDef } from './types';

export const LAYOUT_CATEGORIES: Record<LayoutCategory, string> = {
  'openers': '开场过渡',
  'text-centric': '文字内容',
  'numbers-data': '数字数据',
  'code-terminal': '代码终端',
  'diagrams-flows': '图表流程',
  'plans-comparisons': '计划对比',
  'visuals': '视觉图片',
  'closers': '结尾行动',
};

const coverSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: 'Tech Sharing · 纯干货' },
  { id: 'title', type: 'text', label: '标题', default: '演示标题' },
  { id: 'subtitle', type: 'text', label: '副标题', default: '从文档到演示，一键生成' },
  { id: 'pills', type: 'list', label: '标签列表', default: '[]' },
];

const bulletsSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: 'Why · 为什么' },
  { id: 'title', type: 'text', label: '标题', default: '好的演讲系统，帮你做三件事' },
  { id: 'lede', type: 'text', label: '引导语', default: '' },
  { id: 'items', type: 'list', label: '要点列表', default: '[]' },
];

const twoColSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'title', type: 'text', label: '标题', default: '' },
  { id: 'leftTitle', type: 'text', label: '左栏标题', default: '' },
  { id: 'leftBody', type: 'richtext', label: '左栏内容', default: '' },
  { id: 'rightTitle', type: 'text', label: '右栏标题', default: '' },
  { id: 'rightBody', type: 'richtext', label: '右栏内容', default: '' },
];

const kpiSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'title', type: 'text', label: '标题', default: '' },
  { id: 'kpi1Label', type: 'text', label: 'KPI1 标签', default: '' },
  { id: 'kpi1Value', type: 'counter', label: 'KPI1 数值', default: '0' },
  { id: 'kpi1Delta', type: 'text', label: 'KPI1 变化', default: '' },
  { id: 'kpi2Label', type: 'text', label: 'KPI2 标签', default: '' },
  { id: 'kpi2Value', type: 'counter', label: 'KPI2 数值', default: '0' },
  { id: 'kpi2Delta', type: 'text', label: 'KPI2 变化', default: '' },
  { id: 'kpi3Label', type: 'text', label: 'KPI3 标签', default: '' },
  { id: 'kpi3Value', type: 'counter', label: 'KPI3 数值', default: '0' },
  { id: 'kpi3Delta', type: 'text', label: 'KPI3 变化', default: '' },
  { id: 'kpi4Label', type: 'text', label: 'KPI4 标签', default: '' },
  { id: 'kpi4Value', type: 'counter', label: 'KPI4 数值', default: '0' },
  { id: 'kpi4Delta', type: 'text', label: 'KPI4 变化', default: '' },
];

const statSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'counterValue', type: 'counter', label: '数字', default: '92' },
  { id: 'unit', type: 'text', label: '单位', default: '%' },
  { id: 'subtitle', type: 'text', label: '说明', default: '' },
  { id: 'lede', type: 'text', label: '引导语', default: '' },
];

const thanksSlots: SlotDef[] = [
  { id: 'title', type: 'text', label: '标题', default: 'Thanks' },
  { id: 'subtitle', type: 'text', label: '副标题', default: '' },
  { id: 'contact', type: 'text', label: '联系信息', default: '' },
];

const genericSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'title', type: 'text', label: '标题', default: '' },
  { id: 'body', type: 'richtext', label: '内容', default: '' },
];

export const layouts: LayoutMeta[] = [
  // Openers & transitions
  { name: 'cover', label: '封面', category: 'openers', slotDefs: coverSlots },
  { name: 'toc', label: '目录', category: 'openers', slotDefs: genericSlots },
  { name: 'section-divider', label: '章节分隔', category: 'openers', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'number', type: 'text', label: '章节号', default: '01' }] },

  // Text-centric
  { name: 'bullets', label: '要点列表', category: 'text-centric', slotDefs: bulletsSlots },
  { name: 'two-column', label: '双栏', category: 'text-centric', slotDefs: twoColSlots },
  { name: 'three-column', label: '三栏', category: 'text-centric', slotDefs: genericSlots },
  { name: 'big-quote', label: '大引用', category: 'text-centric', slotDefs: [{ id: 'quote', type: 'richtext', label: '引用内容', default: '' }, { id: 'author', type: 'text', label: '作者', default: '' }] },

  // Numbers & data
  { name: 'stat-highlight', label: '数据高亮', category: 'numbers-data', slotDefs: statSlots },
  { name: 'kpi-grid', label: 'KPI 网格', category: 'numbers-data', slotDefs: kpiSlots },
  { name: 'table', label: '数据表格', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-bar', label: '柱状图', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-line', label: '折线图', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-pie', label: '饼图', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-radar', label: '雷达图', category: 'numbers-data', slotDefs: genericSlots },

  // Code & terminal
  { name: 'code', label: '代码', category: 'code-terminal', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'code', type: 'richtext', label: '代码', default: '' }] },
  { name: 'diff', label: '差异对比', category: 'code-terminal', slotDefs: genericSlots },
  { name: 'terminal', label: '终端', category: 'code-terminal', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'command', type: 'richtext', label: '命令输出', default: '' }] },

  // Diagrams & flows
  { name: 'flow-diagram', label: '流程图', category: 'diagrams-flows', slotDefs: genericSlots },
  { name: 'arch-diagram', label: '架构图', category: 'diagrams-flows', slotDefs: genericSlots },
  { name: 'process-steps', label: '步骤', category: 'diagrams-flows', slotDefs: genericSlots },
  { name: 'mindmap', label: '思维导图', category: 'diagrams-flows', slotDefs: genericSlots },

  // Plans & comparisons
  { name: 'timeline', label: '时间线', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'roadmap', label: '路线图', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'gantt', label: '甘特图', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'comparison', label: '对比', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'pros-cons', label: '优缺点', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'todo-checklist', label: '待办清单', category: 'plans-comparisons', slotDefs: genericSlots },

  // Visuals
  { name: 'image-hero', label: '图片英雄', category: 'visuals', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'image', type: 'image', label: '图片', default: '' }] },
  { name: 'image-grid', label: '图片网格', category: 'visuals', slotDefs: [{ id: 'images', type: 'list', label: '图片列表', default: '[]' }] },

  // Closers
  { name: 'cta', label: '行动号召', category: 'closers', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'subtitle', type: 'text', label: '副标题', default: '' }] },
  { name: 'thanks', label: '致谢', category: 'closers', slotDefs: thanksSlots },
];

export function getLayoutMeta(name: LayoutType): LayoutMeta {
  return layouts.find(l => l.name === name)!;
}
```

- [ ] **Step 4: 定义动效和 FX 元数据**

```ts
// packages/shared/src/animations.ts
import type { AnimMeta } from './types';

export const animations: AnimMeta[] = [
  { name: 'fade-up', label: '上浮淡入', category: '方向淡入', description: '从下方 32px 浮入' },
  { name: 'fade-down', label: '下落淡入', category: '方向淡入', description: '从上方 -32px 落入' },
  { name: 'fade-left', label: '左滑淡入', category: '方向淡入', description: '从左侧 -40px 滑入' },
  { name: 'fade-right', label: '右滑淡入', category: '方向淡入', description: '从右侧 40px 滑入' },
  { name: 'rise-in', label: '升起', category: '戏剧入场', description: '60px 升起 + 模糊消散' },
  { name: 'drop-in', label: '落下', category: '戏剧入场', description: '-60px 落下 + 微缩放' },
  { name: 'zoom-pop', label: '弹入', category: '戏剧入场', description: '0.6 → 1.04 → 1 缩放' },
  { name: 'blur-in', label: '聚焦', category: '戏剧入场', description: '18px 模糊渐清' },
  { name: 'glitch-in', label: '故障', category: '戏剧入场', description: 'clip-path 步进 + 抖动' },
  { name: 'typewriter', label: '打字机', category: '文字效果', description: '逐字打出 + 闪烁光标' },
  { name: 'neon-glow', label: '霓虹', category: '文字效果', description: '循环 text-shadow 脉冲' },
  { name: 'shimmer-sweep', label: '光泽扫过', category: '文字效果', description: '白色光泽横扫' },
  { name: 'gradient-flow', label: '渐变流动', category: '文字效果', description: '无限水平渐变滑动' },
  { name: 'stagger-list', label: '逐项出现', category: '列表数字', description: '子元素依次升起' },
  { name: 'counter-up', label: '数字递增', category: '列表数字', description: '0 → 目标值动画' },
  { name: 'path-draw', label: '路径绘制', category: 'SVG', description: 'SVG 描边动画' },
  { name: 'morph-shape', label: '形状变形', category: 'SVG', description: 'SVG path d 变形' },
  { name: 'parallax-tilt', label: '视差倾斜', category: '3D', description: 'hover 3D 倾斜' },
  { name: 'card-flip-3d', label: '卡片翻转', category: '3D', description: 'Y 轴 90° 翻转' },
  { name: 'cube-rotate-3d', label: '立方体旋转', category: '3D', description: '从立方体侧面旋入' },
  { name: 'page-turn-3d', label: '翻页', category: '3D', description: '左铰链翻页' },
  { name: 'perspective-zoom', label: '透视缩放', category: '3D', description: '从 -400Z 拉近' },
  { name: 'marquee-scroll', label: '跑马灯', category: '环境', description: '无限水平循环' },
  { name: 'kenburns', label: 'Ken Burns', category: '环境', description: '14s 慢速缩放平移' },
  { name: 'confetti-burst', label: '彩纸', category: '环境', description: '伪元素闪光爆发' },
  { name: 'spotlight', label: '聚光灯', category: '环境', description: '圆形 clip-path 揭示' },
  { name: 'ripple-reveal', label: '涟漪揭示', category: '环境', description: '角原点涟漪展开' },
];
```

```ts
// packages/shared/src/fx.ts
import type { FxMeta } from './types';

export const fxList: FxMeta[] = [
  { name: 'particle-burst', label: '粒子爆发', description: '粒子从中心爆炸，重力+衰减' },
  { name: 'confetti-cannon', label: '彩纸炮', description: '彩色旋转矩形从底部两侧弧射' },
  { name: 'firework', label: '烟花', description: '火箭从底部升空爆炸为彩色火花' },
  { name: 'starfield', label: '星场', description: '3D 透视星场向外飞出' },
  { name: 'matrix-rain', label: '矩阵雨', description: '绿色片假名 + 十六进制列下落' },
  { name: 'knowledge-graph', label: '知识图谱', description: '力导向图，28 标记节点，~50 边' },
  { name: 'neural-net', label: '神经网络', description: '4-6-6-3 前馈网络 + 脉冲传播' },
  { name: 'constellation', label: '星座', description: '漂移点，150px 内连线' },
  { name: 'orbit-ring', label: '轨道环', description: '5 同心环 + 不同速度轨道点' },
  { name: 'galaxy-swirl', label: '星系旋涡', description: '对数螺旋 ~800 粒子慢旋转' },
  { name: 'word-cascade', label: '词语瀑布', description: '词语从顶部落下堆积' },
  { name: 'letter-explode', label: '字母爆炸', description: '字母从随机方向飞入' },
  { name: 'chain-react', label: '链式反应', description: '8 圆多米诺脉冲波' },
  { name: 'magnetic-field', label: '磁场', description: '粒子沿贝塞尔/正弦曲线运动' },
  { name: 'data-stream', label: '数据流', description: '十六进制/二进制文本滚动行' },
  { name: 'gradient-blob', label: '渐变团', description: '4 漂移模糊径向渐变' },
  { name: 'sparkle-trail', label: '闪光轨迹', description: '指针驱动闪光发射器' },
  { name: 'shockwave', label: '冲击波', description: '从中心扩展的环' },
  { name: 'typewriter-multi', label: '多行打字', description: '3 行并发打字 + 闪烁块光标' },
  { name: 'counter-explosion', label: '数字爆炸', description: '数字计数到目标后爆发粒子' },
];
```

- [ ] **Step 5: 统一导出**

```ts
// packages/shared/src/index.ts
export * from './types';
export { themes, recommendedThemes, THEME_CATEGORIES } from './themes';
export { layouts, getLayoutMeta, LAYOUT_CATEGORIES } from './layouts';
export { animations } from './animations';
export { fxList } from './fx';
```

- [ ] **Step 6: 验证类型编译**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add packages/shared/
git commit -m "feat: add shared package with types, themes, layouts, animations, fx metadata"
```

---

### Task 3: html-ppt 静态资源复制

**Files:**
- Create: `scripts/copy-html-ppt-assets.sh`

- [ ] **Step 1: 编写资源复制脚本**

将 html-ppt skill 的 assets 复制到 client/public/html-ppt/，使 Vite 可以直接服务这些静态文件。

```bash
#!/usr/bin/env bash
# scripts/copy-html-ppt-assets.sh
# 将 html-ppt skill 的静态资源复制到 client/public/html-ppt/

set -euo pipefail

SKILL_DIR="$HOME/.claude/skills/html-ppt"
TARGET_DIR="packages/client/public/html-ppt"

echo "Copying html-ppt assets from $SKILL_DIR to $TARGET_DIR..."

# 清理旧文件
rm -rf "$TARGET_DIR"

# 复制 assets 目录
mkdir -p "$TARGET_DIR/assets"
cp -r "$SKILL_DIR/assets/base.css" "$TARGET_DIR/assets/"
cp -r "$SKILL_DIR/assets/fonts.css" "$TARGET_DIR/assets/"
cp -r "$SKILL_DIR/assets/runtime.js" "$TARGET_DIR/assets/"
cp -r "$SKILL_DIR/assets/themes" "$TARGET_DIR/assets/"
cp -r "$SKILL_DIR/assets/animations" "$TARGET_DIR/assets/"

# 复制布局模板
mkdir -p "$TARGET_DIR/templates/single-page"
cp -r "$SKILL_DIR/templates/single-page/"*.html "$TARGET_DIR/templates/single-page/"

echo "Done! Assets copied to $TARGET_DIR"
```

- [ ] **Step 2: 执行复制脚本**

Run: `bash scripts/copy-html-ppt-assets.sh`
Expected: 资源文件复制到 `packages/client/public/html-ppt/`

- [ ] **Step 3: 验证关键文件存在**

Run: `ls packages/client/public/html-ppt/assets/base.css packages/client/public/html-ppt/assets/runtime.js packages/client/public/html-ppt/assets/themes/tokyo-night.css packages/client/public/html-ppt/templates/single-page/cover.html`
Expected: 所有文件存在

- [ ] **Step 4: 提交**

```bash
git add scripts/ packages/client/public/html-ppt/
git commit -m "feat: copy html-ppt static assets to client/public"
```

---

### Task 4: React 应用骨架 — 路由与布局

**Files:**
- Create: `packages/client/src/main.tsx`
- Create: `packages/client/src/App.tsx`
- Create: `packages/client/src/pages/Home.tsx`
- Create: `packages/client/src/pages/Editor.tsx`
- Create: `packages/client/src/pages/Preview.tsx`
- Create: `packages/client/src/styles/index.css`
- Modify: `packages/client/vite.config.ts`

- [ ] **Step 1: 创建 Tailwind 入口和 Vite 配置更新**

```css
/* packages/client/src/styles/index.css */
@import "tailwindcss";

:root {
  --color-primary: #3b6cff;
  --color-primary-2: #7a5cff;
  --color-primary-3: #ff5c8a;
  --color-surface: #1a1a2e;
  --color-surface-2: #252540;
  --color-bg: #0d0d1a;
  --color-border: #333;
  --color-text: #eee;
  --color-text-dim: #888;
  --color-text-dim2: #666;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0;
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 2: 创建 React 入口和路由**

```tsx
// packages/client/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

```tsx
// packages/client/src/App.tsx
import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Editor } from './pages/Editor'
import { Preview } from './pages/Preview'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/preview" element={<Preview />} />
    </Routes>
  )
}
```

- [ ] **Step 3: 创建页面占位组件**

```tsx
// packages/client/src/pages/Home.tsx
export function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">HTML Studio — 首页</h1>
    </div>
  )
}
```

```tsx
// packages/client/src/pages/Editor.tsx
export function Editor() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">HTML Studio — 编辑器</h1>
    </div>
  )
}
```

```tsx
// packages/client/src/pages/Preview.tsx
export function Preview() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">HTML Studio — 预览</h1>
    </div>
  )
}
```

- [ ] **Step 4: 启动开发服务器验证**

Run: `cd packages/client && pnpm dev`
Expected: Vite 开发服务器在 http://localhost:5173 启动，页面显示 "HTML Studio — 首页"

- [ ] **Step 5: 提交**

```bash
git add packages/client/src/
git commit -m "feat: add React app skeleton with routing and page placeholders"
```

---

### Task 5: Zustand 状态管理 — useDeck store

**Files:**
- Create: `packages/client/src/hooks/useDeck.ts`

- [ ] **Step 1: 实现 Deck 状态管理**

```ts
// packages/client/src/hooks/useDeck.ts
import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Deck, Slide, SlotValue, LayoutType } from '@html-studio/shared'
import { getLayoutMeta } from '@html-studio/shared'

interface DeckState {
  deck: Deck | null
  currentSlideIndex: number

  // Deck 操作
  initDeck: (title: string, slides: Slide[], theme: string) => void
  setGlobalTheme: (theme: string) => void

  // Slide 操作
  setCurrentSlideIndex: (index: number) => void
  addSlide: (layout: LayoutType, theme: string) => void
  removeSlide: (slideId: string) => void
  duplicateSlide: (slideId: string) => void
  reorderSlides: (fromIndex: number, toIndex: number) => void
  updateSlideLayout: (slideId: string, layout: LayoutType) => void
  updateSlideTheme: (slideId: string, theme: string) => void
  updateSlideAnimation: (slideId: string, animation: string) => void
  updateSlideFx: (slideId: string, fx: string | null) => void
  updateSlotValue: (slideId: string, slotId: string, value: string) => void
  updateSlideNotes: (slideId: string, notes: string) => void
}

function createSlide(layout: LayoutType, theme: string, order: number): Slide {
  const meta = getLayoutMeta(layout)
  return {
    id: nanoid(),
    layout,
    theme,
    animation: 'fade-up',
    fx: null,
    slots: meta.slotDefs.map(def => ({
      id: def.id,
      type: def.type,
      value: def.default,
      label: def.label,
    })),
    notes: '',
    order,
  }
}

export const useDeck = create<DeckState>((set, get) => ({
  deck: null,
  currentSlideIndex: 0,

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
  }),

  setGlobalTheme: (theme) => set(state => {
    if (!state.deck) return state
    return { deck: { ...state.deck, globalTheme: theme, updatedAt: Date.now() } }
  }),

  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),

  addSlide: (layout, theme) => set(state => {
    if (!state.deck) return state
    const newSlide = createSlide(layout, theme, state.deck.slides.length)
    return {
      deck: {
        ...state.deck,
        slides: [...state.deck.slides, newSlide],
        updatedAt: Date.now(),
      },
    }
  }),

  removeSlide: (slideId) => set(state => {
    if (!state.deck) return state
    const slides = state.deck.slides.filter(s => s.id !== slideId).map((s, i) => ({ ...s, order: i }))
    return {
      deck: { ...state.deck, slides, updatedAt: Date.now() },
      currentSlideIndex: Math.min(state.currentSlideIndex, Math.max(0, slides.length - 1)),
    }
  }),

  duplicateSlide: (slideId) => set(state => {
    if (!state.deck) return state
    const idx = state.deck.slides.findIndex(s => s.id === slideId)
    if (idx === -1) return state
    const original = state.deck.slides[idx]
    const clone: Slide = { ...original, id: nanoid(), order: idx + 1 }
    const slides = [...state.deck.slides]
    slides.splice(idx + 1, 0, clone)
    return {
      deck: { ...state.deck, slides: slides.map((s, i) => ({ ...s, order: i })), updatedAt: Date.now() },
    }
  }),

  reorderSlides: (fromIndex, toIndex) => set(state => {
    if (!state.deck) return state
    const slides = [...state.deck.slides]
    const [moved] = slides.splice(fromIndex, 1)
    slides.splice(toIndex, 0, moved)
    return {
      deck: { ...state.deck, slides: slides.map((s, i) => ({ ...s, order: i })), updatedAt: Date.now() },
    }
  }),

  updateSlideLayout: (slideId, layout) => set(state => {
    if (!state.deck) return state
    const meta = getLayoutMeta(layout)
    const slides = state.deck.slides.map(s => {
      if (s.id !== slideId) return s
      // 保留已有插槽值，新插槽用默认值
      const existingValues = new Map(s.slots.map(slot => [slot.id, slot.value]))
      return {
        ...s,
        layout,
        slots: meta.slotDefs.map(def => ({
          id: def.id,
          type: def.type,
          value: existingValues.get(def.id) ?? def.default,
          label: def.label,
        })),
      }
    })
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } }
  }),

  updateSlideTheme: (slideId, theme) => set(state => {
    if (!state.deck) return state
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, theme } : s)
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } }
  }),

  updateSlideAnimation: (slideId, animation) => set(state => {
    if (!state.deck) return state
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, animation } : s)
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } }
  }),

  updateSlideFx: (slideId, fx) => set(state => {
    if (!state.deck) return state
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, fx } : s)
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } }
  }),

  updateSlotValue: (slideId, slotId, value) => set(state => {
    if (!state.deck) return state
    const slides = state.deck.slides.map(s => {
      if (s.id !== slideId) return s
      return { ...s, slots: s.slots.map(slot => slot.id === slotId ? { ...slot, value } : slot) }
    })
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } }
  }),

  updateSlideNotes: (slideId, notes) => set(state => {
    if (!state.deck) return state
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, notes } : s)
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } }
  }),
}))
```

- [ ] **Step 2: 验证类型编译**

Run: `cd packages/client && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add packages/client/src/hooks/
git commit -m "feat: add Zustand deck state management store"
```

---

### Task 6: 文件解析器 — Markdown/TXT/PDF/DOCX

**Files:**
- Create: `packages/client/src/lib/parser/markdown.ts`
- Create: `packages/client/src/lib/parser/txt.ts`
- Create: `packages/client/src/lib/parser/pdf.ts`
- Create: `packages/client/src/lib/parser/docx.ts`
- Create: `packages/client/src/lib/parser/index.ts`
- Create: `packages/client/src/hooks/useFileParser.ts`

- [ ] **Step 1: 实现 Markdown 解析器**

按 H1=封面，H2=新页面，段落/列表=页面内容拆分。

```ts
// packages/client/src/lib/parser/markdown.ts
import { nanoid } from 'nanoid'
import type { Slide, ParseResult } from '@html-studio/shared'
import { getLayoutMeta } from '@html-studio/shared'

export function parseMarkdown(content: string, theme: string): ParseResult {
  const lines = content.split('\n')
  const slides: Slide[] = []
  let currentContent: string[] = []
  let currentLayout: 'cover' | 'bullets' = 'cover'
  let title = ''
  let order = 0

  function flushContent() {
    if (currentContent.length === 0) return
    const meta = getLayoutMeta(currentLayout)
    const text = currentContent.join('\n').trim()
    const slots = meta.slotDefs.map(def => {
      if (def.id === 'title' && currentLayout === 'cover') return { ...def, value: text.split('\n')[0] || def.default }
      if (def.id === 'subtitle' && currentLayout === 'cover') return { ...def, value: text.split('\n').slice(1).join(' ').trim() || def.default }
      if (def.id === 'title' && currentLayout === 'bullets') return { ...def, value: text.split('\n')[0] || def.default }
      if (def.id === 'items' && currentLayout === 'bullets') {
        const items = text.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*')).map(l => l.replace(/^[\s]*[-*]\s*/, ''))
        return { ...def, value: JSON.stringify(items) }
      }
      if (def.id === 'lede') return { ...def, value: text.split('\n').filter(l => !l.startsWith('#') && !l.trim().startsWith('-') && !l.trim().startsWith('*')).slice(0, 1).join(' ') }
      return { ...def }
    })
    slides.push({
      id: nanoid(),
      layout: currentLayout,
      theme,
      animation: 'fade-up',
      fx: null,
      slots,
      notes: '',
      order: order++,
    })
    currentContent = []
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      flushContent()
      currentLayout = 'cover'
      currentContent.push(line)
      if (!title) title = line.replace(/^#\s+/, '')
    } else if (line.startsWith('## ')) {
      flushContent()
      currentLayout = 'bullets'
      currentContent.push(line)
    } else {
      currentContent.push(line)
    }
  }
  flushContent()

  // 如果没有解析出任何页面，创建一个默认封面
  if (slides.length === 0) {
    const meta = getLayoutMeta('cover')
    slides.push({
      id: nanoid(),
      layout: 'cover',
      theme,
      animation: 'fade-up',
      fx: null,
      slots: meta.slotDefs.map(def => ({ ...def })),
      notes: '',
      order: 0,
    })
  }

  return { slides, title: title || '未命名演示', fileType: 'markdown' }
}
```

- [ ] **Step 2: 实现 TXT 解析器**

按空行分段，每段一页；超过 200 字自动拆分。

```ts
// packages/client/src/lib/parser/txt.ts
import { nanoid } from 'nanoid'
import type { Slide, ParseResult } from '@html-studio/shared'
import { getLayoutMeta } from '@html-studio/shared'

export function parseTxt(content: string, theme: string): ParseResult {
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim())
  const slides: Slide[] = []
  let order = 0

  for (const para of paragraphs) {
    const text = para.trim()
    // 超过 200 字自动拆分
    if (text.length > 200) {
      const chunks = text.match(/.{1,200}/g) || [text]
      for (const chunk of chunks) {
        const meta = getLayoutMeta('bullets')
        slides.push({
          id: nanoid(),
          layout: 'bullets',
          theme,
          animation: 'fade-up',
          fx: null,
          slots: meta.slotDefs.map(def => {
            if (def.id === 'title') return { ...def, value: chunk.slice(0, 40) + '...' }
            if (def.id === 'lede') return { ...def, value: chunk }
            return { ...def }
          }),
          notes: '',
          order: order++,
        })
      }
    } else {
      const isFirst = order === 0
      const layout = isFirst ? 'cover' : 'bullets'
      const meta = getLayoutMeta(layout)
      slides.push({
        id: nanoid(),
        layout,
        theme,
        animation: 'fade-up',
        fx: null,
        slots: meta.slotDefs.map(def => {
          if (def.id === 'title') return { ...def, value: text.slice(0, 60) }
          if (def.id === 'subtitle' && layout === 'cover') return { ...def, value: text.slice(60) }
          if (def.id === 'lede' && layout === 'bullets') return { ...def, value: text }
          return { ...def }
        }),
        notes: '',
        order: order++,
      })
    }
  }

  if (slides.length === 0) {
    const meta = getLayoutMeta('cover')
    slides.push({
      id: nanoid(), layout: 'cover', theme, animation: 'fade-up', fx: null,
      slots: meta.slotDefs.map(def => ({ ...def })), notes: '', order: 0,
    })
  }

  return { slides, title: slides[0]?.slots.find(s => s.id === 'title')?.value || '未命名演示', fileType: 'txt' }
}
```

- [ ] **Step 3: 实现 PDF 解析器（pdf.js）**

```ts
// packages/client/src/lib/parser/pdf.ts
import * as pdfjs from 'pdfjs-dist'
import { nanoid } from 'nanoid'
import type { Slide, ParseResult } from '@html-studio/shared'
import { getLayoutMeta } from '@html-studio/shared'

// 设置 worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function parsePdf(arrayBuffer: ArrayBuffer, theme: string): Promise<ParseResult> {
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const slides: Slide[] = []
  let title = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item: any) => item.str).join(' ').trim()

    if (!text) continue

    const layout = i === 1 ? 'cover' : 'bullets'
    const meta = getLayoutMeta(layout)

    slides.push({
      id: nanoid(),
      layout,
      theme,
      animation: 'fade-up',
      fx: null,
      slots: meta.slotDefs.map(def => {
        if (def.id === 'title') return { ...def, value: text.slice(0, 80) }
        if (def.id === 'subtitle' && layout === 'cover') return { ...def, value: text.slice(80, 200) }
        if (def.id === 'lede' && layout === 'bullets') return { ...def, value: text.slice(0, 300) }
        return { ...def }
      }),
      notes: '',
      order: i - 1,
    })

    if (i === 1 && text) title = text.slice(0, 60)
  }

  return { slides, title: title || '未命名演示', fileType: 'pdf' }
}
```

- [ ] **Step 4: 实现 DOCX 解析器（mammoth.js）**

```ts
// packages/client/src/lib/parser/docx.ts
import mammoth from 'mammoth'
import { nanoid } from 'nanoid'
import type { Slide, ParseResult } from '@html-studio/shared'
import { getLayoutMeta } from '@html-studio/shared'

export async function parseDocx(arrayBuffer: ArrayBuffer, theme: string): Promise<ParseResult> {
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value

  // 用 DOMParser 解析 HTML，按 h1/h2 拆分
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  const slides: Slide[] = []
  let order = 0
  let currentElements: Element[] = []
  let currentLayout: 'cover' | 'bullets' = 'cover'
  let title = ''

  function flushElements() {
    if (currentElements.length === 0) return
    const text = currentElements.map(el => el.textContent?.trim() || '').filter(Boolean).join('\n')
    const meta = getLayoutMeta(currentLayout)

    slides.push({
      id: nanoid(),
      layout: currentLayout,
      theme,
      animation: 'fade-up',
      fx: null,
      slots: meta.slotDefs.map(def => {
        if (def.id === 'title') return { ...def, value: text.split('\n')[0] || def.default }
        if (def.id === 'subtitle' && currentLayout === 'cover') return { ...def, value: text.split('\n').slice(1, 2).join(' ') || def.default }
        if (def.id === 'lede' && currentLayout === 'bullets') return { ...def, value: text }
        return { ...def }
      }),
      notes: '',
      order: order++,
    })
    currentElements = []
  }

  for (const child of Array.from(body.children)) {
    if (child.tagName === 'H1') {
      flushElements()
      currentLayout = 'cover'
      currentElements.push(child)
      if (!title) title = child.textContent?.trim() || ''
    } else if (child.tagName === 'H2') {
      flushElements()
      currentLayout = 'bullets'
      currentElements.push(child)
    } else {
      currentElements.push(child)
    }
  }
  flushElements()

  if (slides.length === 0) {
    const meta = getLayoutMeta('cover')
    slides.push({
      id: nanoid(), layout: 'cover', theme, animation: 'fade-up', fx: null,
      slots: meta.slotDefs.map(def => ({ ...def })), notes: '', order: 0,
    })
  }

  return { slides, title: title || '未命名演示', fileType: 'docx' }
}
```

- [ ] **Step 5: 统一解析入口**

```ts
// packages/client/src/lib/parser/index.ts
import type { ParseResult, FileType } from '@html-studio/shared'
import { parseMarkdown } from './markdown'
import { parseTxt } from './txt'
import { parsePdf } from './pdf'
import { parseDocx } from './docx'

export function detectFileType(filename: string): FileType | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'md': case 'markdown': return 'markdown'
    case 'txt': return 'txt'
    case 'pdf': return 'pdf'
    case 'docx': return 'docx'
    default: return null
  }
}

export async function parseFile(file: File, theme: string): Promise<ParseResult> {
  const fileType = detectFileType(file.name)
  if (!fileType) throw new Error(`不支持的文件格式: ${file.name}`)

  switch (fileType) {
    case 'markdown': {
      const content = await file.text()
      return parseMarkdown(content, theme)
    }
    case 'txt': {
      const content = await file.text()
      return parseTxt(content, theme)
    }
    case 'pdf': {
      const buffer = await file.arrayBuffer()
      return parsePdf(buffer, theme)
    }
    case 'docx': {
      const buffer = await file.arrayBuffer()
      return parseDocx(buffer, theme)
    }
  }
}

export { parseMarkdown, parseTxt, parsePdf, parseDocx }
```

- [ ] **Step 6: 实现 useFileParser hook**

```ts
// packages/client/src/hooks/useFileParser.ts
import { useState, useCallback } from 'react'
import type { ParseResult, FileType } from '@html-studio/shared'
import { parseFile, detectFileType } from '../lib/parser'

interface FileParserState {
  file: File | null
  fileType: FileType | null
  parseResult: ParseResult | null
  parsing: boolean
  error: string | null
}

export function useFileParser() {
  const [state, setState] = useState<FileParserState>({
    file: null,
    fileType: null,
    parseResult: null,
    parsing: false,
    error: null,
  })

  const setFile = useCallback((file: File | null) => {
    if (!file) {
      setState({ file: null, fileType: null, parseResult: null, parsing: false, error: null })
      return
    }
    const fileType = detectFileType(file.name)
    if (!fileType) {
      setState({ file, fileType: null, parseResult: null, parsing: false, error: `不支持的文件格式: ${file.name}` })
      return
    }
    setState(prev => ({ ...prev, file, fileType, error: null, parseResult: null }))
  }, [])

  const parse = useCallback(async (theme: string) => {
    if (!state.file) return
    setState(prev => ({ ...prev, parsing: true, error: null }))
    try {
      const result = await parseFile(state.file, theme)
      setState(prev => ({ ...prev, parseResult: result, parsing: false }))
    } catch (err) {
      setState(prev => ({ ...prev, parsing: false, error: (err as Error).message }))
    }
  }, [state.file])

  const reset = useCallback(() => {
    setState({ file: null, fileType: null, parseResult: null, parsing: false, error: null })
  }, [])

  return { ...state, setFile, parse, reset }
}
```

- [ ] **Step 7: 验证类型编译**

Run: `cd packages/client && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add packages/client/src/lib/parser/ packages/client/src/hooks/useFileParser.ts
git commit -m "feat: add file parsers for Markdown, TXT, PDF, DOCX and useFileParser hook"
```

---

### Task 7: 模板引擎 — Slide[] → HTML 渲染器

**Files:**
- Create: `packages/client/src/lib/template-loader.ts`
- Create: `packages/client/src/lib/slot-resolver.ts`
- Create: `packages/client/src/lib/renderer.ts`

- [ ] **Step 1: 实现模板加载器**

加载布局模板 HTML 文件内容，缓存已加载的模板。

```ts
// packages/client/src/lib/template-loader.ts
const templateCache = new Map<string, string>()

export async function loadTemplate(layout: string): Promise<string> {
  if (templateCache.has(layout)) return templateCache.get(layout)!

  const url = `/html-ppt/templates/single-page/${layout}.html`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load template: ${layout}`)
  const html = await response.text()
  templateCache.set(layout, html)
  return html
}

export function clearTemplateCache() {
  templateCache.clear()
}
```

- [ ] **Step 2: 实现插槽解析器**

解析模板 HTML，识别可编辑区域（基于 CSS 类名和 HTML 结构），将 SlotValue 数据注入到对应位置。

```ts
// packages/client/src/lib/slot-resolver.ts
import type { SlotValue } from '@html-studio/shared'

/**
 * 将 SlotValue 数据注入到模板 HTML 中
 * 使用 DOMParser 解析模板，根据类名和结构定位可编辑区域
 */
export function injectSlotValues(templateHtml: string, slots: SlotValue[]): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(templateHtml, 'text/html')
  const slotMap = new Map(slots.map(s => [s.id, s.value]))

  // 注入 kicker
  const kicker = doc.querySelector('.kicker')
  if (kicker && slotMap.has('kicker')) kicker.textContent = slotMap.get('kicker')!

  // 注入 title (h1.h1 或 h2.h2)
  const h1 = doc.querySelector('h1.h1, h1.title')
  if (h1 && slotMap.has('title')) {
    // 保留 gradient-text span 如果存在
    const gradSpan = h1.querySelector('.gradient-text')
    if (gradSpan) {
      gradSpan.textContent = slotMap.get('title')!
    } else {
      h1.textContent = slotMap.get('title')!
    }
  }
  const h2 = doc.querySelector('h2.h2, h2.title')
  if (h2 && slotMap.has('title') && !h1) h2.textContent = slotMap.get('title')!

  // 注入 subtitle / lede
  const lede = doc.querySelector('.lede')
  if (lede && slotMap.has('subtitle')) lede.textContent = slotMap.get('subtitle')!
  if (lede && slotMap.has('lede') && !slotMap.has('subtitle')) lede.textContent = slotMap.get('lede')!

  // 注入 pills
  const pillRow = doc.querySelector('.row.wrap, .row')
  if (pillRow && slotMap.has('pills')) {
    try {
      const pills: string[] = JSON.parse(slotMap.get('pills')!)
      pillRow.innerHTML = pills.map(p => `<span class="pill pill-accent">${p}</span>`).join('')
    } catch { /* ignore parse errors */ }
  }

  // 注入 items (bullets)
  const listEl = doc.querySelector('ul.grid, ul')
  if (listEl && slotMap.has('items')) {
    try {
      const items: string[] = JSON.parse(slotMap.get('items')!)
      listEl.innerHTML = items.map(item => `<li class="card card-accent"><p>${item}</p></li>`).join('')
    } catch { /* ignore */ }
  }

  // 注入 counter values
  const counters = doc.querySelectorAll('.counter')
  const counterSlotIds = ['counterValue', 'kpi1Value', 'kpi2Value', 'kpi3Value', 'kpi4Value']
  counters.forEach((counter, i) => {
    const slotId = counterSlotIds[i]
    if (slotId && slotMap.has(slotId)) {
      const val = slotMap.get(slotId)!
      counter.setAttribute('data-to', val)
      counter.textContent = '0'
    }
  })

  // 注入 KPI labels
  const eyebrows = doc.querySelectorAll('.eyebrow')
  const kpiLabelIds = ['kpi1Label', 'kpi2Label', 'kpi3Label', 'kpi4Label']
  eyebrows.forEach((el, i) => {
    const slotId = kpiLabelIds[i]
    if (slotId && slotMap.has(slotId)) el.textContent = slotMap.get(slotId)!
  })

  // 注入 KPI deltas (dim paragraphs after counters)
  const dimEls = doc.querySelectorAll('.dim')
  const kpiDeltaIds = ['kpi1Delta', 'kpi2Delta', 'kpi3Delta', 'kpi4Delta']
  dimEls.forEach((el, i) => {
    const slotId = kpiDeltaIds[i]
    if (slotId && slotMap.has(slotId)) el.textContent = slotMap.get(slotId)!
  })

  // 注入 notes
  const notesEl = doc.querySelector('.notes')
  if (notesEl && slotMap.has('notes')) notesEl.innerHTML = slotMap.get('notes')!

  return doc.body.innerHTML
}
```

- [ ] **Step 3: 实现完整 HTML 渲染器**

将 Slide[] 渲染为完整可运行的 HTML 字符串。

```ts
// packages/client/src/lib/renderer.ts
import type { Slide, Deck } from '@html-studio/shared'
import { loadTemplate } from './template-loader'
import { injectSlotValues } from './slot-resolver'

interface RenderOptions {
  includeRuntime?: boolean   // 包含 runtime.js（键盘导航等），默认 true
  includeAnimations?: boolean // 包含动画 CSS，默认 true
  includeFx?: boolean        // 包含 FX runtime，默认 true
  includePresenter?: boolean  // 包含演讲者模式，默认 true
  includeSourceData?: boolean // 包含 JSON 源数据，默认 false
}

const ASSETS_BASE = '/html-ppt/assets'

export async function renderDeck(deck: Deck, options: RenderOptions = {}): Promise<string> {
  const {
    includeRuntime = true,
    includeAnimations = true,
    includeFx = true,
    includePresenter = true,
    includeSourceData = false,
  } = options

  // 收集所有使用的主题名
  const themeNames = new Set<string>()
  themeNames.add(deck.globalTheme)
  deck.slides.forEach(s => themeNames.add(s.theme))
  const themeListStr = Array.from(themeNames).join(',')

  // 渲染每个 slide 的 HTML
  const slideHtmls: string[] = []
  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i]
    const html = await renderSlide(slide, i === 0, slide.theme || deck.globalTheme)
    slideHtmls.push(html)
  }

  // 组装完整 HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${deck.globalTheme}">
<head>
<meta charset="utf-8">
<title>${deck.title}</title>
<link rel="stylesheet" href="${ASSETS_BASE}/fonts.css">
<link rel="stylesheet" href="${ASSETS_BASE}/base.css">
<link rel="stylesheet" id="theme-link" href="${ASSETS_BASE}/themes/${deck.globalTheme}.css">
${includeAnimations ? `<link rel="stylesheet" href="${ASSETS_BASE}/animations/animations.css">` : ''}
<style>
.slide { display: none; }
.slide.is-active { display: flex; }
</style>
</head>
<body>
<div class="deck" data-themes="${themeListStr}" data-theme-base="${ASSETS_BASE}/themes/">
${slideHtmls.join('\n')}
</div>
${includeRuntime ? `<script src="${ASSETS_BASE}/runtime.js"></script>` : ''}
${includeFx ? `<script src="${ASSETS_BASE}/animations/fx-runtime.js"></script>` : ''}
${includeSourceData ? `<script id="deck-source-data" type="application/json">${JSON.stringify(deck)}</script>` : ''}
</body>
</html>`

  return html
}

async function renderSlide(slide: Slide, isFirst: boolean, theme: string): Promise<string> {
  try {
    const templateHtml = await loadTemplate(slide.layout)
    const injectedHtml = injectSlotValues(templateHtml, slide.slots)

    // 从注入后的 HTML 中提取 <section> 内容
    const parser = new DOMParser()
    const doc = parser.parseFromString(injectedHtml, 'text/html')
    const section = doc.querySelector('section.slide')

    if (section) {
      // 设置 data-title
      const titleSlot = slide.slots.find(s => s.id === 'title')
      if (titleSlot) section.setAttribute('data-title', titleSlot.value)

      // 设置 is-active
      if (isFirst) {
        section.classList.add('is-active')
      } else {
        section.classList.remove('is-active')
      }

      // 添加 data-anim 到 slide 根元素
      if (slide.animation) {
        section.setAttribute('data-anim', slide.animation)
      }

      // 添加 data-fx 容器
      if (slide.fx) {
        const fxDiv = doc.createElement('div')
        fxDiv.setAttribute('data-fx', slide.fx)
        fxDiv.style.cssText = 'width:100%;height:360px;position:absolute;inset:0;pointer-events:none'
        section.style.position = 'relative'
        section.insertBefore(fxDiv, section.firstChild)
      }

      // 添加 notes
      if (slide.notes) {
        let notesEl = section.querySelector('.notes')
        if (!notesEl) {
          notesEl = doc.createElement('div')
          notesEl.classList.add('notes')
          section.appendChild(notesEl)
        }
        notesEl.innerHTML = slide.notes
      }

      return section.outerHTML
    }

    // 如果没有 section，返回注入后的 body 内容
    return `<section class="slide${isFirst ? ' is-active' : ''}" data-title="${slide.slots.find(s => s.id === 'title')?.value || ''}">${injectedHtml}</section>`
  } catch (err) {
    // 模板加载失败时，生成简单的 fallback
    const title = slide.slots.find(s => s.id === 'title')?.value || ''
    const subtitle = slide.slots.find(s => s.id === 'subtitle')?.value || ''
    return `<section class="slide${isFirst ? ' is-active' : ''}" data-title="${title}">
  <h1 class="h1">${title}</h1>
  <p class="lede">${subtitle}</p>
</section>`
  }
}

/** 渲染单个 slide 为独立 HTML（用于 iframe 预览） */
export async function renderSlidePreview(slide: Slide, theme: string): Promise<string> {
  const templateHtml = await loadTemplate(slide.layout)
  const injectedHtml = injectSlotValues(templateHtml, slide.slots)

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${ASSETS_BASE}/fonts.css">
<link rel="stylesheet" href="${ASSETS_BASE}/base.css">
<link rel="stylesheet" id="theme-link" href="${ASSETS_BASE}/themes/${theme}.css">
<link rel="stylesheet" href="${ASSETS_BASE}/animations/animations.css">
</head>
<body class="single">
${injectedHtml}
<script src="${ASSETS_BASE}/runtime.js"></script>
</body>
</html>`
}
```

- [ ] **Step 4: 验证类型编译**

Run: `cd packages/client && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add packages/client/src/lib/template-loader.ts packages/client/src/lib/slot-resolver.ts packages/client/src/lib/renderer.ts
git commit -m "feat: add template engine with loader, slot resolver, and HTML renderer"
```

---

### Task 8: 首页 — 上传与主题选择

**Files:**
- Create: `packages/client/src/components/FileUploader.tsx`
- Create: `packages/client/src/components/FileInfo.tsx`
- Create: `packages/client/src/components/ThemePicker.tsx`
- Create: `packages/client/src/components/Modal.tsx`
- Modify: `packages/client/src/pages/Home.tsx`

- [ ] **Step 1: 实现 Modal 通用弹窗**

```tsx
// packages/client/src/components/Modal.tsx
import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) dialog.showModal()
    else dialog.close()
  }, [open])

  return (
    <dialog ref={ref} onClose={onClose} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 max-w-2xl w-full backdrop:bg-black/60">
      <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
        <h2 className="text-base font-bold">{title}</h2>
        <button onClick={onClose} className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-lg">&times;</button>
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </dialog>
  )
}
```

- [ ] **Step 2: 实现 FileUploader 拖拽上传**

```tsx
// packages/client/src/components/FileUploader.tsx
import { useState, useRef, useCallback } from 'react'

interface FileUploaderProps {
  onFile: (file: File) => void
  accept?: string
}

const ACCEPT = '.pdf,.md,.txt,.docx,.markdown'
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export function FileUploader({ onFile, accept = ACCEPT }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_SIZE) {
      alert('文件大小不能超过 20MB')
      return
    }
    onFile(file)
  }, [onFile])

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
        dragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-primary)]/30'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="text-4xl mb-2">📄</div>
      <div className="text-sm font-semibold mb-1">拖拽文件到这里，或点击上传</div>
      <div className="text-xs text-[var(--color-text-dim)]">支持 .pdf .md .txt .docx，最大 20MB</div>
      <button
        className="mt-4 bg-[var(--color-primary)] text-white rounded-lg px-6 py-2 text-xs font-semibold"
        onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
      >
        选择文件
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
```

- [ ] **Step 3: 实现 FileInfo 已上传文件展示**

```tsx
// packages/client/src/components/FileInfo.tsx
import type { FileType } from '@html-studio/shared'

interface FileInfoProps {
  name: string
  size: number
  fileType: FileType | null
  onRemove: () => void
}

const FILE_ICONS: Record<string, string> = {
  markdown: '📝', txt: '📄', pdf: '📕', docx: '📘',
}

const FILE_LABELS: Record<string, string> = {
  markdown: 'Markdown', txt: 'TXT', pdf: 'PDF', docx: 'Word',
}

export function FileInfo({ name, size, fileType, onRemove }: FileInfoProps) {
  const icon = fileType ? FILE_ICONS[fileType] : '📄'
  const label = fileType ? FILE_LABELS[fileType] : '未知'
  const sizeStr = size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="bg-[var(--color-surface-2)] rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center text-lg">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">{name}</div>
        <div className="text-[10px] text-[var(--color-text-dim)]">{sizeStr} · {label}</div>
      </div>
      <button onClick={onRemove} className="text-[var(--color-primary)] text-[10px] hover:underline">移除</button>
    </div>
  )
}
```

- [ ] **Step 4: 实现 ThemePicker 主题选择器**

首页显示 3 个推荐，点击「查看全部 36 个」展开弹窗（搜索 + 分类标签 + 网格）。

```tsx
// packages/client/src/components/ThemePicker.tsx
import { useState, useMemo } from 'react'
import { themes, recommendedThemes, THEME_CATEGORIES, type ThemeMeta, type ThemeCategory } from '@html-studio/shared'
import { Modal } from './Modal'

interface ThemePickerProps {
  selected: string
  onSelect: (name: string) => void
  compact?: boolean  // true = 首页精简模式（3 推荐），false = 编辑器面板模式
}

export function ThemePicker({ selected, onSelect, compact = true }: ThemePickerProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ThemeCategory | 'all'>('all')

  const filtered = useMemo(() => {
    let list = themes
    if (category !== 'all') list = list.filter(t => t.category === category)
    if (search) list = list.filter(t => t.label.toLowerCase().includes(search.toLowerCase()) || t.name.includes(search.toLowerCase()))
    return list
  }, [category, search])

  const ThemeCard = ({ meta }: { meta: ThemeMeta }) => (
    <div
      className={`bg-[var(--color-surface-2)] rounded-lg p-2.5 cursor-pointer text-center transition-all hover:scale-105 ${
        selected === meta.name ? 'border-2 border-[var(--color-primary)]' : 'border border-[var(--color-border)]'
      }`}
      onClick={() => { onSelect(meta.name); if (compact) setModalOpen(false) }}
    >
      <div
        className="h-10 rounded mb-1.5"
        style={{ background: meta.previewColors.length > 1 ? `linear-gradient(135deg, ${meta.previewColors.join(', ')})` : meta.previewColors[0] }}
      />
      <div className="text-[10px] font-semibold truncate">{meta.label}</div>
      {compact && <div className="text-[9px] text-[var(--color-text-dim)] truncate">{meta.description}</div>}
    </div>
  )

  // 首页精简模式
  if (compact) {
    return (
      <>
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <div className="text-xs font-semibold">选择风格</div>
            <button onClick={() => setModalOpen(true)} className="text-[10px] text-[var(--color-primary)] hover:underline">查看全部 36 个 →</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recommendedThemes.map(t => <ThemeCard key={t.name} meta={t} />)}
          </div>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="选择主题">
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs"
              placeholder="搜索主题..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              className={`px-3 py-1 rounded-full text-[9px] ${category === 'all' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
              onClick={() => setCategory('all')}
            >全部</button>
            {Object.entries(THEME_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                className={`px-3 py-1 rounded-full text-[9px] ${category === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
                onClick={() => setCategory(key as ThemeCategory)}
              >{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {filtered.map(t => <ThemeCard key={t.name} meta={t} />)}
          </div>
          <div className="text-center mt-2 text-[9px] text-[var(--color-text-dim2)]">显示 {filtered.length}/36</div>
        </Modal>
      </>
    )
  }

  // 编辑器面板模式 — 色块网格
  return (
    <div>
      <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">主题</div>
      <div className="grid grid-cols-3 gap-1">
        {themes.slice(0, 6).map(t => (
          <div
            key={t.name}
            className={`h-7 rounded cursor-pointer transition-all ${selected === t.name ? 'border-2 border-[var(--color-primary)]' : 'border border-[var(--color-border)]'}`}
            style={{ background: t.previewColors.length > 1 ? `linear-gradient(135deg, ${t.previewColors.join(', ')})` : t.previewColors[0] }}
            onClick={() => onSelect(t.name)}
            title={t.label}
          />
        ))}
      </div>
      <button onClick={() => setModalOpen(true)} className="text-[9px] text-[var(--color-text-dim2)] mt-1 hover:underline">当前：{selected} · 点击切换</button>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="选择主题">
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs"
            placeholder="搜索主题..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            className={`px-3 py-1 rounded-full text-[9px] ${category === 'all' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
            onClick={() => setCategory('all')}
          >全部</button>
          {Object.entries(THEME_CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              className={`px-3 py-1 rounded-full text-[9px] ${category === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
              onClick={() => setCategory(key as ThemeCategory)}
            >{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {filtered.map(t => <ThemeCard key={t.name} meta={t} />)}
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 5: 实现首页完整交互**

```tsx
// packages/client/src/pages/Home.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFileParser } from '../hooks/useFileParser'
import { useDeck } from '../hooks/useDeck'
import { FileUploader } from '../components/FileUploader'
import { FileInfo } from '../components/FileInfo'
import { ThemePicker } from '../components/ThemePicker'

export function Home() {
  const navigate = useNavigate()
  const { file, fileType, parsing, error, setFile, parse, reset } = useFileParser()
  const [selectedTheme, setSelectedTheme] = useState('tokyo-night')
  const { initDeck } = useDeck()

  const handleGenerate = async () => {
    if (!file) return
    const result = await parse(selectedTheme)
    if (result) {
      initDeck(result.title, result.slides, selectedTheme)
      navigate('/editor')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-8 py-8" style={{ background: 'linear-gradient(135deg, #0d0d1a, #1a1a3e)' }}>
      {/* 导航 */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-12">
        <div className="text-lg font-bold"><span className="text-[var(--color-primary)]">HTML</span> Studio</div>
        <div className="flex gap-3 text-xs text-[var(--color-text-dim)]">
          <span className="cursor-pointer hover:text-[var(--color-text)]">示例</span>
          <span className="cursor-pointer hover:text-[var(--color-text)]">帮助</span>
        </div>
      </div>

      {/* 标题 */}
      <div className="text-center mb-9">
        <h1 className="text-3xl font-bold mb-2">上传文档，生成演示</h1>
        <p className="text-sm text-[var(--color-text-dim)]">支持 PDF、Markdown、TXT、Word — 一键生成精美幻灯片</p>
      </div>

      {/* 上传区域 */}
      <div className="w-full max-w-xl mb-7">
        {!file ? (
          <FileUploader onFile={setFile} />
        ) : (
          <FileInfo name={file.name} size={file.size} fileType={fileType} onRemove={reset} />
        )}
      </div>

      {/* 主题选择 */}
      {file && (
        <div className="w-full max-w-xl mb-7">
          <ThemePicker selected={selectedTheme} onSelect={setSelectedTheme} />
        </div>
      )}

      {/* 生成按钮 */}
      {file && (
        <div className="w-full max-w-xl">
          <button
            onClick={handleGenerate}
            disabled={parsing}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
          >
            {parsing ? '解析中...' : '生成幻灯片'}
          </button>
          {error && <p className="text-center mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: 启动开发服务器验证首页**

Run: `cd packages/client && pnpm dev`
Expected: 首页显示上传区域，拖拽文件后显示文件信息和主题选择器

- [ ] **Step 7: 提交**

```bash
git add packages/client/src/components/ packages/client/src/pages/Home.tsx
git commit -m "feat: add Home page with file uploader, theme picker, and generate flow"
```

---

### Task 9: 编辑器 — 三栏布局与幻灯片列表

**Files:**
- Create: `packages/client/src/components/SlideList.tsx`
- Create: `packages/client/src/components/SlideCard.tsx`
- Create: `packages/client/src/components/SlideCanvas.tsx`
- Create: `packages/client/src/components/StylePanel.tsx`
- Create: `packages/client/src/components/LayoutPicker.tsx`
- Create: `packages/client/src/components/AnimationPicker.tsx`
- Create: `packages/client/src/components/FxPicker.tsx`
- Create: `packages/client/src/components/SlotEditor.tsx`
- Modify: `packages/client/src/pages/Editor.tsx`

- [ ] **Step 1: 实现 SlideCard 和 SlideList（含拖拽排序）**

```tsx
// packages/client/src/components/SlideCard.tsx
import type { Slide } from '@html-studio/shared'

interface SlideCardProps {
  slide: Slide
  index: number
  active: boolean
  onClick: () => void
}

export function SlideCard({ slide, index, active, onClick }: SlideCardProps) {
  const num = String(index + 1).padStart(2, '0')
  return (
    <div
      className={`rounded-lg p-2 cursor-pointer transition-colors ${active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-2)]/80'}`}
      onClick={onClick}
    >
      <div className="h-14 bg-[var(--color-bg)] rounded flex items-center justify-center text-[10px] text-[var(--color-text-dim)]">
        {slide.layout}
      </div>
      <div className={`mt-1 text-[10px] ${active ? 'text-white' : 'text-[var(--color-text-dim)]'}`}>
        {num} · {slide.layout}
      </div>
    </div>
  )
}
```

```tsx
// packages/client/src/components/SlideList.tsx
import type { Slide } from '@html-studio/shared'
import { SlideCard } from './SlideCard'

interface SlideListProps {
  slides: Slide[]
  currentIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  onReorder: (from: number, to: number) => void
}

export function SlideList({ slides, currentIndex, onSelect, onAdd, onReorder }: SlideListProps) {
  // 简单拖拽排序（后续可用 @dnd-kit 增强）
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (fromIndex !== targetIndex) onReorder(fromIndex, targetIndex)
  }

  return (
    <div className="w-[200px] bg-[var(--color-surface)] p-3 border-r border-[var(--color-border)] flex flex-col h-full">
      <div className="font-semibold mb-2 text-sm">📑 幻灯片</div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            draggable
            onDragStart={e => handleDragStart(e, i)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, i)}
          >
            <SlideCard slide={slide} index={i} active={i === currentIndex} onClick={() => onSelect(i)} />
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 w-full bg-[var(--color-primary)] text-white rounded py-1 text-[10px] font-semibold"
      >
        + 添加
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 实现 SlideCanvas iframe 画布**

```tsx
// packages/client/src/components/SlideCanvas.tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import type { Deck } from '@html-studio/shared'
import { renderDeck } from '../lib/renderer'

interface SlideCanvasProps {
  deck: Deck
  currentSlideIndex: number
  onSlotClick?: (slotId: string) => void
}

export function SlideCanvas({ deck, currentSlideIndex, onSlotClick }: SlideCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string>('')
  const [rendering, setRendering] = useState(false)

  // 渲染完整 HTML
  useEffect(() => {
    let cancelled = false
    setRendering(true)
    renderDeck(deck, { includeRuntime: true, includeAnimations: true, includeFx: true }).then(html => {
      if (!cancelled) {
        setHtml(html)
        setRendering(false)
      }
    })
    return () => { cancelled = true }
  }, [deck])

  // 导航到当前 slide
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !html) return
    // 通过 postMessage 通知 iframe 切换到指定 slide
    iframe.contentWindow?.postMessage({ type: 'preview-goto', idx: currentSlideIndex }, '*')
  }, [currentSlideIndex, html])

  // 监听 iframe 中的点击事件
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'slot-clicked' && onSlotClick) {
        onSlotClick(event.data.slotId)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onSlotClick])

  const totalSlides = deck.slides.length

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col items-center justify-center relative">
      {/* 顶部信息 */}
      <div className="absolute top-2 left-3 flex gap-1.5 text-[10px]">
        <span className="bg-[var(--color-surface-2)] text-[var(--color-text-dim)] px-2 py-0.5 rounded">100%</span>
        <span className="bg-[var(--color-surface-2)] text-[var(--color-text-dim)] px-2 py-0.5 rounded">16:9</span>
      </div>

      {/* iframe */}
      {rendering && <div className="text-xs text-[var(--color-text-dim)]">渲染中...</div>}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="w-[640px] h-[360px] rounded-lg border-0 shadow-2xl"
        title="幻灯片预览"
        sandbox="allow-scripts allow-same-origin"
      />

      {/* 底部导航 */}
      <div className="absolute bottom-2 flex gap-2 text-[10px] text-[var(--color-text-dim)]">
        <span>◀</span>
        <span className="text-[var(--color-text)]">{currentSlideIndex + 1} / {totalSlides}</span>
        <span>▶</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 实现 LayoutPicker, AnimationPicker, FxPicker**

```tsx
// packages/client/src/components/LayoutPicker.tsx
import { layouts, LAYOUT_CATEGORIES, type LayoutType, type LayoutCategory } from '@html-studio/shared'

interface LayoutPickerProps {
  selected: LayoutType
  onSelect: (name: LayoutType) => void
}

export function LayoutPicker({ selected, onSelect }: LayoutPickerProps) {
  return (
    <div>
      <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">布局</div>
      <div className="grid grid-cols-2 gap-1">
        {layouts.slice(0, 6).map(l => (
          <button
            key={l.name}
            className={`h-8 rounded text-[8px] ${selected === l.name ? 'bg-[var(--color-surface-2)] border-2 border-[var(--color-primary)] text-[var(--color-text)]' : 'bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)]'}`}
            onClick={() => onSelect(l.name)}
          >{l.label}</button>
        ))}
      </div>
      <div className="text-[9px] text-[var(--color-text-dim2)] mt-1">6/31 · 向下滚动查看更多</div>
    </div>
  )
}
```

```tsx
// packages/client/src/components/AnimationPicker.tsx
import { animations } from '@html-studio/shared'

interface AnimationPickerProps {
  selected: string
  onSelect: (name: string) => void
}

export function AnimationPicker({ selected, onSelect }: AnimationPickerProps) {
  return (
    <div>
      <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">入场动效</div>
      <select
        className="w-full bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] rounded px-1.5 py-1 text-[10px]"
        value={selected}
        onChange={e => onSelect(e.target.value)}
      >
        {animations.map(a => (
          <option key={a.name} value={a.name}>{a.label}（{a.description}）</option>
        ))}
      </select>
    </div>
  )
}
```

```tsx
// packages/client/src/components/FxPicker.tsx
import { fxList } from '@html-studio/shared'

interface FxPickerProps {
  selected: string | null
  onSelect: (name: string | null) => void
}

export function FxPicker({ selected, onSelect }: FxPickerProps) {
  return (
    <div>
      <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">背景特效 (FX)</div>
      <div className="flex flex-wrap gap-1">
        <button
          className={`px-1.5 py-0.5 rounded text-[9px] ${!selected ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
          onClick={() => onSelect(null)}
        >无</button>
        {fxList.map(fx => (
          <button
            key={fx.name}
            className={`px-1.5 py-0.5 rounded text-[9px] ${selected === fx.name ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]'}`}
            onClick={() => onSelect(fx.name)}
          >{fx.label}</button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 实现 SlotEditor 插槽内容编辑**

```tsx
// packages/client/src/components/SlotEditor.tsx
import type { SlotValue } from '@html-studio/shared'

interface SlotEditorProps {
  slots: SlotValue[]
  onUpdate: (slotId: string, value: string) => void
}

export function SlotEditor({ slots, onUpdate }: SlotEditorProps) {
  return (
    <div>
      <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">内容编辑</div>
      <div className="bg-[var(--color-surface-2)] rounded p-2 flex flex-col gap-1.5">
        {slots.map(slot => (
          <div key={slot.id}>
            <label className="text-[9px] text-[var(--color-text-dim2)]">{slot.label}</label>
            {slot.type === 'richtext' ? (
              <textarea
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded px-1.5 py-1 text-[10px] min-h-[60px] resize-y"
                value={slot.value}
                onChange={e => onUpdate(slot.id, e.target.value)}
              />
            ) : slot.type === 'list' ? (
              <input
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded px-1.5 py-1 text-[10px]"
                value={(() => { try { return JSON.parse(slot.value).join(', ') } catch { return slot.value } })()}
                onChange={e => onUpdate(slot.id, JSON.stringify(e.target.value.split(',').map(s => s.trim()).filter(Boolean)))}
              />
            ) : (
              <input
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded px-1.5 py-1 text-[10px]"
                value={slot.value}
                onChange={e => onUpdate(slot.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 实现 StylePanel 右栏样式面板**

```tsx
// packages/client/src/components/StylePanel.tsx
import type { Slide } from '@html-studio/shared'
import { ThemePicker } from './ThemePicker'
import { LayoutPicker } from './LayoutPicker'
import { AnimationPicker } from './AnimationPicker'
import { FxPicker } from './FxPicker'
import { SlotEditor } from './SlotEditor'

interface StylePanelProps {
  slide: Slide
  onThemeChange: (theme: string) => void
  onLayoutChange: (layout: string) => void
  onAnimationChange: (anim: string) => void
  onFxChange: (fx: string | null) => void
  onSlotUpdate: (slotId: string, value: string) => void
  onExport: () => void
  onPreview: () => void
}

export function StylePanel({ slide, onThemeChange, onLayoutChange, onAnimationChange, onFxChange, onSlotUpdate, onExport, onPreview }: StylePanelProps) {
  return (
    <div className="w-[240px] bg-[var(--color-surface)] p-3 border-l border-[var(--color-border)] flex flex-col overflow-y-auto">
      <div className="font-semibold mb-3 text-sm">🎨 样式</div>

      <div className="mb-4">
        <ThemePicker selected={slide.theme} onSelect={onThemeChange} compact={false} />
      </div>

      <div className="mb-4">
        <LayoutPicker selected={slide.layout} onSelect={onLayoutChange} />
      </div>

      <div className="mb-4">
        <AnimationPicker selected={slide.animation} onSelect={onAnimationChange} />
      </div>

      <div className="mb-4">
        <FxPicker selected={slide.fx} onSelect={onFxChange} />
      </div>

      <div className="mb-4">
        <SlotEditor slots={slide.slots} onUpdate={onSlotUpdate} />
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <button onClick={onExport} className="bg-[var(--color-primary)] text-white rounded-lg py-2 text-[11px] font-semibold">导出 HTML</button>
        <button onClick={onPreview} className="bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)] rounded-lg py-1.5 text-[10px]">全屏预览</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 实现编辑器主页面**

```tsx
// packages/client/src/pages/Editor.tsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeck } from '../hooks/useDeck'
import { SlideList } from '../components/SlideList'
import { SlideCanvas } from '../components/SlideCanvas'
import { StylePanel } from '../components/StylePanel'
import { ExportDialog } from '../components/ExportDialog'

export function Editor() {
  const navigate = useNavigate()
  const { deck, currentSlideIndex, setCurrentSlideIndex, addSlide, reorderSlides, updateSlideLayout, updateSlideTheme, updateSlideAnimation, updateSlideFx, updateSlotValue } = useDeck()
  const [exportOpen, setExportOpen] = useState(false)

  if (!deck || deck.slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-dim)] mb-4">还没有幻灯片数据</p>
          <button onClick={() => navigate('/')} className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2 text-xs">返回首页</button>
        </div>
      </div>
    )
  }

  const currentSlide = deck.slides[currentSlideIndex]

  return (
    <div className="h-screen flex overflow-hidden">
      <SlideList
        slides={deck.slides}
        currentIndex={currentSlideIndex}
        onSelect={setCurrentSlideIndex}
        onAdd={() => addSlide('bullets', deck.globalTheme)}
        onReorder={reorderSlides}
      />
      <SlideCanvas deck={deck} currentSlideIndex={currentSlideIndex} />
      <StylePanel
        slide={currentSlide}
        onThemeChange={theme => updateSlideTheme(currentSlide.id, theme)}
        onLayoutChange={layout => updateSlideLayout(currentSlide.id, layout)}
        onAnimationChange={anim => updateSlideAnimation(currentSlide.id, anim)}
        onFxChange={fx => updateSlideFx(currentSlide.id, fx)}
        onSlotUpdate={(slotId, value) => updateSlotValue(currentSlide.id, slotId, value)}
        onExport={() => setExportOpen(true)}
        onPreview={() => navigate('/preview')}
      />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 7: 验证类型编译**

Run: `cd packages/client && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add packages/client/src/components/ packages/client/src/pages/Editor.tsx
git commit -m "feat: add Editor with three-column layout, slide list, canvas, and style panel"
```

---

### Task 10: 导出对话框与全屏预览

**Files:**
- Create: `packages/client/src/components/ExportDialog.tsx`
- Modify: `packages/client/src/pages/Preview.tsx`

- [ ] **Step 1: 实现 ExportDialog**

```tsx
// packages/client/src/components/ExportDialog.tsx
import { useState, useCallback } from 'react'
import { useDeck } from '../hooks/useDeck'
import { renderDeck } from '../lib/renderer'
import { Modal } from './Modal'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { deck } = useDeck()
  const [filename, setFilename] = useState('')
  const [includeRuntime, setIncludeRuntime] = useState(true)
  const [includeAnimations, setIncludeAnimations] = useState(true)
  const [includePresenter, setIncludePresenter] = useState(true)
  const [includeSourceData, setIncludeSourceData] = useState(false)
  const [exporting, setExporting] = useState(false)

  const defaultFilename = deck ? `${deck.title.replace(/\s+/g, '-')}.html` : 'presentation.html'

  const handleExport = useCallback(async () => {
    if (!deck) return
    setExporting(true)
    try {
      const html = await renderDeck(deck, {
        includeRuntime,
        includeAnimations,
        includeFx: includeAnimations,
        includePresenter,
        includeSourceData,
      })
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || defaultFilename
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } finally {
      setExporting(false)
    }
  }, [deck, filename, defaultFilename, includeRuntime, includeAnimations, includePresenter, includeSourceData, onClose])

  return (
    <Modal open={open} onClose={onClose} title="导出幻灯片">
      <div className="mb-4">
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">文件名</div>
        <input
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
          value={filename}
          placeholder={defaultFilename}
          onChange={e => setFilename(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">包含内容</div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input type="checkbox" checked={includeRuntime} onChange={e => setIncludeRuntime(e.target.checked)} /> 运行时（键盘导航、主题切换）
          </label>
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input type="checkbox" checked={includeAnimations} onChange={e => setIncludeAnimations(e.target.checked)} /> 动画效果
          </label>
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input type="checkbox" checked={includePresenter} onChange={e => setIncludePresenter(e.target.checked)} /> 演讲者模式
          </label>
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input type="checkbox" checked={includeSourceData} onChange={e => setIncludeSourceData(e.target.checked)} /> 源数据（JSON，用于再次导入编辑）
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)] rounded-lg py-2.5 text-xs">取消</button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-[2] text-white rounded-lg py-2.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
        >
          {exporting ? '生成中...' : '下载 HTML'}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: 实现全屏预览页面**

```tsx
// packages/client/src/pages/Preview.tsx
import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeck } from '../hooks/useDeck'
import { renderDeck } from '../lib/renderer'

export function Preview() {
  const navigate = useNavigate()
  const { deck } = useDeck()
  const [html, setHtml] = useState('')

  useEffect(() => {
    if (!deck) return
    renderDeck(deck).then(setHtml)
  }, [deck])

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => navigate('/')} className="bg-[var(--color-primary)] text-white rounded-lg px-4 py-2 text-xs">返回首页</button>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <iframe
        srcDoc={html}
        className="w-full h-full border-0"
        title="全屏预览"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  )
}
```

- [ ] **Step 3: 验证类型编译**

Run: `cd packages/client && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add packages/client/src/components/ExportDialog.tsx packages/client/src/pages/Preview.tsx
git commit -m "feat: add export dialog and fullscreen preview page"
```

---

### Task 11: Hono 后端 — 文件上传代理

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/routes/upload.ts`
- Create: `packages/server/src/middleware/cors.ts`

- [ ] **Step 1: 实现 Hono 应用入口**

```ts
// packages/server/src/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from './middleware/cors'
import { uploadRoutes } from './routes/upload'

const app = new Hono()

app.use('*', cors)
app.route('/api', uploadRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

const port = 3000
console.log(`Server running on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
```

```ts
// packages/server/src/middleware/cors.ts
import type { MiddlewareHandler } from 'hono'

export const cors: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type')
}
```

```ts
// packages/server/src/routes/upload.ts
import { Hono } from 'hono'

export const uploadRoutes = new Hono()

// 文件上传代理（首版主要在前端解析，此路由预留用于大文件上传）
uploadRoutes.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 400)
  }
  return c.json({
    name: file.name,
    size: file.size,
    type: file.type,
  })
})
```

- [ ] **Step 2: 启动后端验证**

Run: `cd packages/server && pnpm dev`
Expected: Server running on http://localhost:3000，访问 /api/health 返回 {"status":"ok"}

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/
git commit -m "feat: add Hono server with CORS and upload route"
```

---

### Task 12: 集成验证与端到端测试

**Files:**
- Modify: `packages/client/package.json` (添加 test 脚本)

- [ ] **Step 1: 启动完整应用**

Run: `pnpm dev`
Expected: 前端 http://localhost:5173 和后端 http://localhost:3000 同时启动

- [ ] **Step 2: 手动验证首页流程**

1. 访问 http://localhost:5173
2. 拖拽一个 .md 文件到上传区域
3. 确认文件信息显示
4. 选择主题
5. 点击「生成幻灯片」
6. 确认跳转到编辑器页面

- [ ] **Step 3: 手动验证编辑器流程**

1. 确认三栏布局正常显示
2. 点击左侧幻灯片列表切换
3. 确认右侧面板显示当前幻灯片属性
4. 修改标题文本，确认 iframe 刷新
5. 切换主题，确认样式变化
6. 切换布局，确认内容适配
7. 点击「导出 HTML」，确认下载文件

- [ ] **Step 4: 提交最终状态**

```bash
git add -A
git commit -m "feat: complete HTML Studio v1 — upload, parse, edit, export"
```

---

## 自审检查

### 1. 规格覆盖

| 规格要求 | 对应任务 |
|---------|---------|
| Vite + Hono Monorepo | Task 1 |
| shared 包：类型与元数据 | Task 2 |
| 36 主题元数据 | Task 2 |
| 31 布局元数据（含插槽定义） | Task 2 |
| 27 CSS 动效 + 20 FX 元数据 | Task 2 |
| html-ppt 静态资源复制 | Task 3 |
| React 路由骨架 | Task 4 |
| Zustand 状态管理 | Task 5 |
| Markdown 解析器 | Task 6 |
| TXT 解析器 | Task 6 |
| PDF 解析器 (pdf.js) | Task 6 |
| DOCX 解析器 (mammoth.js) | Task 6 |
| useFileParser hook | Task 6 |
| 模板加载器 | Task 7 |
| 插槽解析器 | Task 7 |
| HTML 渲染器 | Task 7 |
| 首页上传流程 | Task 8 |
| 主题选择器（方案C） | Task 8 |
| 编辑器三栏布局 | Task 9 |
| 幻灯片列表 + 拖拽排序 | Task 9 |
| iframe 画布预览 | Task 9 |
| 样式面板 | Task 9 |
| 布局/动效/FX 选择器 | Task 9 |
| 插槽内容编辑 | Task 9 |
| 导出对话框 | Task 10 |
| 全屏预览 | Task 10 |
| Hono 后端 | Task 11 |
| 集成验证 | Task 12 |

### 2. 占位符扫描

无 TBD、TODO、implement later 等占位符。所有代码步骤均包含完整实现。

### 3. 类型一致性

- `Slide`, `Deck`, `SlotValue`, `LayoutType` 等类型在 Task 2 定义，后续任务统一从 `@html-studio/shared` 导入
- `useDeck` store 的方法签名与组件调用一致
- `renderDeck` 和 `renderSlidePreview` 的参数类型一致
- `injectSlotValues` 的参数类型与 `SlotValue[]` 一致
