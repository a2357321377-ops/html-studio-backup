# HTML Studio — Web 应用设计文档

> 日期：2026-05-14
> 状态：已确认

## 概述

将 html-ppt skill 的能力做成一个 Web 应用，让非技术用户通过可视化界面完成：上传文档 → 前端解析拆分 → 选择模板/主题/动效 → 可视化编辑 → 导出 HTML。AI 智能拆分作为后续增强，首版以前端规则解析为主。

## 目标用户

非技术用户，需要完全可视化操作，不能暴露代码。

## 技术架构

**方案：Vite + Hono Monorepo**

```
html-studio/
├── packages/
│   ├── shared/              # 共享类型与配置
│   │   ├── src/
│   │   │   ├── types.ts     # Slide, Theme, Animation, Layout 类型定义
│   │   │   ├── themes.ts    # 36 主题元数据（名称、预览色、适用场景、分类）
│   │   │   ├── layouts.ts   # 31 布局元数据（名称、缩略图、插槽定义）
│   │   │   ├── animations.ts # 47 动效元数据（27 CSS + 20 Canvas FX）
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── client/              # Vite + React 前端
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx           # 首页：上传入口
│   │   │   │   ├── Editor.tsx         # 编辑器主界面
│   │   │   │   └── Preview.tsx        # 全屏预览
│   │   │   ├── components/
│   │   │   │   ├── FileUploader.tsx    # 文件上传组件
│   │   │   │   ├── SlideList.tsx       # 左侧幻灯片列表
│   │   │   │   ├── SlideCanvas.tsx     # 中间画布（iframe 渲染）
│   │   │   │   ├── StylePanel.tsx      # 右侧样式面板
│   │   │   │   ├── ThemePicker.tsx     # 主题选择器（弹窗组件）
│   │   │   │   ├── AnimationPicker.tsx # 动效选择器
│   │   │   │   ├── LayoutPicker.tsx    # 布局选择器
│   │   │   │   ├── InlineEditor.tsx    # 就地编辑浮动工具条
│   │   │   │   └── ExportDialog.tsx    # 导出对话框
│   │   │   ├── hooks/
│   │   │   │   ├── useDeck.ts         # 幻灯片状态管理
│   │   │   │   └── useFileParser.ts   # 文件解析 hook
│   │   │   └── lib/
│   │   │       ├── parser/            # 前端文件解析器
│   │   │       │   ├── markdown.ts    # Markdown → Slides
│   │   │       │   ├── txt.ts         # TXT → Slides
│   │   │       │   ├── pdf.ts         # PDF → Slides (pdf.js)
│   │   │       │   └── docx.ts        # DOCX → Slides (mammoth.js)
│   │   │       ├── renderer.ts        # Slides → HTML 生成器
│   │   │       └── template-engine.ts # 模板引擎
│   │   ├── public/
│   │   │   └── html-ppt/             # html-ppt 静态资源
│   │   └── package.json
│   │
│   └── server/              # Hono 后端
│       ├── src/
│       │   ├── index.ts      # Hono app 入口
│       │   ├── routes/
│       │   │   ├── upload.ts  # 文件上传 API
│       │   │   ├── generate.ts # AI 生成 API（预留）
│       │   │   └── export.ts  # 导出 API
│       │   ├── services/
│       │   │   ├── file-parser.ts  # 服务端文件解析
│       │   │   └── ai-service.ts   # AI 调用服务（预留）
│       │   └── middleware/
│       │       └── cors.ts
│       └── package.json
│
├── turbo.json               # Turborepo 配置
├── package.json              # Workspace root
└── tsconfig.base.json
```

## 核心数据流

```
用户上传文件 → 前端解析器 → Slide[] 数据
                                  │
                    ┌─────────────┤
                    ▼             ▼
          选择模板/主题      AI 智能拆分（预留）
                    │             │
                    ▼             │
          模板引擎渲染  ◀─────────┘
          Slides → HTML
                  │
                  ▼
          iframe 预览 → 可视化编辑 → 导出 HTML
```

## 页面设计

### 首页 — 上传与生成

**交互流程：**
1. 拖拽或点击上传文件（支持 PDF/MD/TXT/DOCX，最大 20MB）
2. 前端解析文件，显示文件信息（名称、大小、段落数）
3. 选择风格主题：首页显示 3 个推荐，点击「查看全部 36 个」展开弹窗
4. 点击「生成幻灯片」→ 前端解析器拆分内容 → 模板引擎渲染 → 跳转编辑器

**主题选择器（方案 C）：**
- 首页精简显示 3 个推荐主题
- 点击「查看全部」弹出完整选择器
- 弹窗包含：搜索框 + 分类标签（全部/技术/商务/创意/学术/暗色/亮色）+ 网格滚动
- 编辑器右侧面板复用同一组件

### 编辑器 — 三栏布局

**左栏（200px）：幻灯片列表**
- 缩略图 + 序号 + 布局名称
- 支持拖拽排序（蓝色指示线显示插入位置）
- 底部「+ 添加」按钮
- 右键菜单：复制、删除、上移、下移

**中栏（flex）：画布预览**
- iframe 实时渲染，所见即所得
- 顶部显示缩放比例和画幅比例（16:9）
- 底部显示页码导航（◀ 2/5 ▶）和全屏按钮
- 点击文字元素进入就地编辑模式

**右栏（240px）：样式面板**
- 主题选择：色块网格，点击切换，可展开完整选择器
- 布局选择：缩略图网格（6/31），向下滚动查看更多
- 入场动效：下拉选择（fade-up/rise-in/zoom-pop/blur-in/glitch-in/typewriter...）
- 背景特效 (FX)：标签式选择（无/粒子/星场/知识图谱/烟花...）
- 内容编辑：表单字段（标题/副标题/标签等，根据布局插槽动态生成）
- 操作按钮：导出 HTML、全屏预览

### 就地编辑

- 点击 iframe 中的文字 → contenteditable 模式
- 浮动工具条：加粗(B)、斜体(I)、字号(A↓)、颜色(🎨)、对齐(≡)
- Esc 取消编辑，Enter/点击外部确认
- 修改内容同步更新 Slide[] 数据和右侧面板表单

### 导出对话框

- 文件名输入（默认：标题.html）
- 可选内容：
  - 运行时（键盘导航、主题切换）— 默认勾选
  - 动画效果 — 默认勾选
  - 演讲者模式 — 默认勾选
  - 源数据（JSON，用于再次导入编辑）— 默认不勾选
- 下载为完整独立 HTML 文件

## 文件解析策略

| 格式 | 解析库 | 拆分规则 |
|------|--------|----------|
| Markdown | 前端自定义 | H1=封面，H2=新页面，段落/列表=页面内容 |
| TXT | 前端自定义 | 按空行分段，每段一页；超过 200 字自动拆分 |
| PDF | pdf.js | 提取文字按页拆分，图片提取为 base64 |
| DOCX | mammoth.js | 转 HTML 后按标题结构拆分 |

## 核心数据结构

```typescript
// Slide 数据结构
interface Slide {
  id: string;
  layout: LayoutType;        // cover | bullets | two-column | kpi-grid | ...
  theme: string;             // tokyo-night | minimal-white | ...
  animation: string;         // fade-up | rise-in | ...
  fx: string | null;         // particle-burst | starfield | null
  slots: SlotValue[];         // 布局插槽内容，每个插槽有 id、type、value
  notes: string;             // 演讲者备注
  order: number;             // 排序
}

// 插槽值
interface SlotValue {
  id: string;                // 插槽标识：title | subtitle | body | items | image | ...
  type: 'text' | 'richtext' | 'image' | 'list';  // 值类型
  value: string;             // 实际内容（文本/URL/JSON 序列化的列表）
}
}

// Deck 数据结构
interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  globalTheme: string;       // 全局主题（可被单页覆盖）
  createdAt: number;
  updatedAt: number;
}
```

## 模板引擎

模板引擎负责将 Slide[] 数据渲染为完整 HTML 文件：

1. 读取 html-ppt 的 base.css + 主题 CSS + 动画 CSS
2. 根据每个 Slide 的 layout 类型，加载对应的 `templates/single-page/<layout>.html` 模板文件
3. 解析模板中的 `data-slot` 属性，将 SlotValue 数据填充到对应 DOM 位置
4. 为每个 Slide 的根元素添加 `data-anim` 和 `data-fx` 属性
5. 拼接所有 Slide 的 HTML，加上 runtime.js 和 fx-runtime.js
6. 输出完整 HTML 字符串

模板文件中的插槽标记示例：
```html
<h1 data-slot="title" class="slide-title">默认标题</h1>
<p data-slot="subtitle" class="slide-subtitle">默认副标题</p>
<div data-slot="body" data-slot-type="richtext">默认内容</div>
<ul data-slot="items" data-slot-type="list">...</ul>
```

编辑器中的 iframe 直接加载这个 HTML，通过 postMessage 实现编辑器与 iframe 的双向通信：
- 编辑器 → iframe：`{ type: 'update-slot', slotId, value }` 更新内容
- iframe → 编辑器：`{ type: 'slot-clicked', slotId }` 通知点击了某个插槽

## 关键设计决策

1. **前端解析优先**：Markdown/TXT 纯前端解析，PDF 用 pdf.js，DOCX 用 mammoth.js，无需后端参与
2. **iframe 所见即所得**：编辑器中间画布用 iframe 渲染真实 HTML，保证预览与导出一致
3. **html-ppt 资源作为 public assets**：主题 CSS、动效 CSS/JS、runtime.js 直接复制到 client/public/html-ppt/
4. **Slide 数据驱动**：所有编辑操作修改 Slide[] 数据，再由模板引擎重新渲染 HTML
5. **后端预留 AI 接口**：当前只做文件上传代理，AI 智能拆分作为后续增强
6. **主题选择器复用**：首页和编辑器共用 ThemePicker 弹窗组件
7. **导出包含 JSON 源数据选项**：方便用户再次导入编辑

## 后续增强（不在首版范围）

- AI 智能拆分：调用 Claude API 自动拆分内容、生成每页文案
- AI 一键美化：根据内容自动推荐最佳主题和布局组合
- 图片上传：支持拖拽图片到幻灯片
- 协作编辑：多人实时编辑
- 模板市场：用户分享自定义模板
- PNG/PDF 导出：服务端 headless Chrome 渲染
