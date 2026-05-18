import { useAIConfig } from '../hooks/useAIConfig';

// 统一通过后端代理调用 AI API，避免浏览器 CORS 限制
async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const { provider, baseUrl, apiKey, model } = useAIConfig.getState();

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, baseUrl, apiKey, model, messages, maxTokens: 16384 }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'AI 请求失败');
  }

  return data.content;
}

/** 测试 AI 连接是否可用 */
export async function testConnection(): Promise<boolean> {
  try {
    await callAI([{ role: 'user', content: 'Hi' }]);
    useAIConfig.getState().setConnected(true);
    return true;
  } catch (err: any) {
    useAIConfig.getState().setConnected(false);
    throw err;
  }
}

export interface LayoutSuggestion {
  layout: string;
  slotHints?: Record<string, string>;
}

/** AI 自动排版 — 分析文档内容，返回每页的布局建议 */
export async function optimizeLayout(
  content: string,
  fileType: string,
): Promise<LayoutSuggestion[]> {
  const prompt = `你是一个演示文稿排版专家。根据以下文档内容，为每一页选择最合适的布局，并优化 slots 内容。

可用的布局类型：cover, section, bullets, numbered-list, two-column, three-column, image-left, image-right, image-full, quote, stats, chart-bar, chart-pie, timeline, comparison, table, code, definition, callout, photo-grid, agenda, team, testimonial, process, map, calendar, metrics, split-text, centered, blank

文档类型：${fileType}

文档内容：
${content}

请返回 JSON 数组，每个元素对应一页幻灯片，格式如下：
[
  {
    "layout": "布局类型",
    "slotHints": {
      "slotId或label": "优化后的内容"
    }
  }
]

只返回 JSON 数组，不要其他文字。`;

  const response = await callAI([
    { role: 'system', content: '你是演示文稿排版专家，只返回 JSON 格式的布局建议。' },
    { role: 'user', content: prompt },
  ]);

  const match = response.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI 返回格式异常');
  return JSON.parse(match[0]);
}

/** AI 优化单页幻灯片 */
export async function optimizeSlide(
  slideData: { layout: string; slots: { id: string; label?: string; value: string }[]; theme: string },
): Promise<{ layout?: string; slots: { id: string; value: string }[] }> {
  const slotsDesc = slideData.slots
    .map((s) => `${s.id}(${s.label || ''}): ${s.value}`)
    .join('\n');

  const prompt = `你是一个演示文稿内容优化专家。优化以下幻灯片的内容，使其更专业、更有表现力。

当前布局：${slideData.layout}
当前主题：${slideData.theme}

当前 slots：
${slotsDesc}

可用的布局类型：cover, section, bullets, numbered-list, two-column, three-column, image-left, image-right, image-full, quote, stats, chart-bar, chart-pie, timeline, comparison, table, code, definition, callout, photo-grid, agenda, team, testimonial, process, map, calendar, metrics, split-text, centered, blank

如果当前布局不合适，可以建议更换布局。

请返回 JSON 对象，格式如下：
{
  "layout": "建议的布局类型（可选，不换则不填）",
  "slots": [
    { "id": "slot的id", "value": "优化后的内容" }
  ]
}

只返回 JSON 对象，不要其他文字。`;

  const response = await callAI([
    { role: 'system', content: '你是演示文稿内容优化专家，只返回 JSON 格式的优化建议。' },
    { role: 'user', content: prompt },
  ]);

  const match = response.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 返回格式异常');
  return JSON.parse(match[0]);
}

/** AI 生成完整演示文稿 HTML — 构建 prompt */
export function buildDeckPrompt(fileContent: string, userPrompt: string): { role: string; content: string }[] {
  const systemPrompt = `你是一个世界级演示文稿设计专家。根据用户提供的文档内容和风格要求，生成视觉震撼、排版精美的 HTML 演示文稿。

## ★★★ 绝对规则（违反任何一条都是严重错误）★★★

1. **页数必须严格遵循用户要求** — 用户说多少页就生成多少页，不得减少。如果用户未指定页数，根据内容量生成 8-15 页。宁可多不可少。
2. **每个 slide 必须加背景效果** — 绝不要留纯色白底！用内联 style 添加渐变、网格线、点阵等背景
3. **封面页和结尾页必须加 data-fx** — particle-burst、constellation、confetti-cannon、firework 让关键页面有视觉冲击力
4. **必须使用本文件列出的真实 CSS 类** — 不要自己编造类名，不要使用 layout-* 或 theme-* 类名
5. **data-fx 的值必须是本文件列出的特效名之一** — 不要自己编造名称
6. **不要添加 <style>.slide { display: none; }</style>** — base.css 已处理幻灯片切换
7. **只输出纯 HTML 代码** — 不要输出 markdown 代码围栏、解释文字、规划列表、页数说明、思考过程等任何非 HTML 内容。输出必须从 <!DOCTYPE html> 开始，到 </html> 结束，中间只有 HTML 标签。
8. **每页内容精炼** — 避免文字过多，善用 .card、.grid、.kicker、.h1/.h2、.lede 等类
9. **表格必须用 <table> 标签** — 配合 .card 使用，不要自己画表格
10. **图表用纯 CSS 实现** — 柱状图用 flex + div，环形图用 conic-gradient，不要引入外部图表库

## 文档结构要求

输出完整的 HTML 文档：
<!DOCTYPE html><html lang="zh-CN"><head>引入 CSS/JS</head><body><div class="deck"> 内含多个 <section class="slide">

- 每个 <section class="slide"> 是一页幻灯片
- 第一个 <section> 加上 class="is-active"，其他不加
- 每个 section 加 data-title 属性作为幻灯片标题
- 16:9 比例，每页内容精炼，避免文字过多

## CSS/JS 引入（必须按此顺序）

<link rel="stylesheet" href="/html-ppt/assets/fonts.css">
<link rel="stylesheet" href="/html-ppt/assets/base.css">
<link rel="stylesheet" id="theme-link" href="/html-ppt/assets/themes/你选择的主题.css">
<link rel="stylesheet" href="/html-ppt/assets/animations/animations.css">
<script src="/html-ppt/assets/runtime.js"></script>
<script src="/html-ppt/assets/animations/fx-runtime.js"></script>

## 主题选择

根据用户提示词和文档内容，自行选择最合适的主题。可用的主题：
tokyo-night, minimal-white, aurora, catppuccin-mocha, xiaohongshu-white, neo-brutalism,
github-dark, dracula, nord, solarized-dark, solarized-light, monokai, ocean-dark,
cyberpunk, matrix, retro-terminal, slate, ember, forest, desert, arctic, lavender,
rose-garden, midnight-blue, deep-space, candy, pastel, high-contrast, newspaper,
warm-earth, cool-breeze, vibrant
在 <link id="theme-link"> 中填入你选择的主题名。

## ★ 幻灯片策略系统 — 决定每页的布局和内容

生成前，先在脑中规划每一页的策略，确保内容丰富、节奏感强、视觉多样。

### 页面类型决策树

根据内容类型选择页面布局：
- 开场/封面 → cover 布局（必须加 data-fx 和渐变背景）
- 章节分隔 → section 布局（大标题居中，加径向渐变背景）
- 要点罗列（3-6项）→ bullets 布局（用 .card + .g3/.g4 网格）
- 数据/KPI（4+数字）→ stats 或 metrics 布局（用 .counter + 网格线背景）
- 对比/对照 → comparison 布局（双栏对比，.vs 布局）
- 时间线/里程碑 → timeline 布局（用 .card-accent + .g3 网格）
- 双栏内容 → two-column 布局（用 .grid.g2）
- 三栏内容 → three-column 布局（用 .grid.g3）
- 引用/金句 → quote 布局（大引号 + 斜体 + 渐变背景）
- 数据表格 → table 布局（<table> + .card 包裹 + 网格线背景）
- 柱状图/趋势 → chart-bar 布局（纯 CSS flex 柱状图 + 网格线背景）
- 代码展示 → code 布局（<pre><code> + .mono）
- 核心数字高亮 → stat-highlight 布局（超大数字 + .counter + .gradient-text + data-fx）
- 行动号召 → CTA 布局（必须加 data-fx 和多色渐变背景）
- 致谢/结尾 → thanks 布局（必须加 data-fx 和径向渐变背景）

### 节奏规则

- 不要连续两页使用相同布局类型
- 每 3-4 页插入一个视觉冲击页（stat-highlight、quote、section 分隔）
- 封面后紧跟 agenda 或 bullets 概览页
- 数据密集的页面后跟一个 quote 或 section 缓冲
- 结尾前用 CTA 或 stat-highlight 收束，最后是 thanks

### 内容扩充策略

如果文档内容不足以填满用户要求的页数，按以下方式扩充：
- 将长段落拆分为多页（每页一个要点，用 bullets + .card）
- 添加 section 分隔页划分章节
- 添加 quote 页引用关键观点
- 添加 stat-highlight 页突出关键数字
- 添加 comparison 页对比不同方案/观点
- 添加 timeline 页展示发展历程
- 添加 CTA 页总结行动号召

## ★ 文案公式 — 让每页内容专业有力

### 封面页文案
- kicker: 简短分类标签（如"产品发布 · 2024"）
- h1: 主标题，关键词用 .gradient-text 突出
- lede: 一句话副标题，说明价值主张

### 要点页文案
- kicker: 本页分类标签
- h2: 本页核心观点（简短有力）
- lede: 一句话概括
- 每个 .card: h4 标题 + .dim 描述（1-2句话）

### 数据页文案
- kicker: "Metrics" 或 "关键指标"
- 每个 .card: .eyebrow 指标名 + 超大 .counter 数字 + .dim 增长说明

### 引用页文案
- 大引号装饰
- h2 斜体引用文字（精炼有力）
- .dim 引用来源

### CTA 页文案
- kicker: "Call to action"
- h1 .gradient-text 行动号召
- .lede 说明
- .pill-accent 行动按钮

## 可用的 CSS 类（base.css 中真实定义的类，必须使用）

### 排版类
- .kicker — 小号强调标签（14px，accent 色，大写）
- .eyebrow — 极小号标签（13px，text-3 色，大写）
- h1.title 或 .h1 — 主标题（72px，display 字体）
- h2.title 或 .h2 — 副标题（54px）
- h3 / .h3 — 小标题（32px）
- h4 / .h4 — 更小标题（22px）
- .lede — 正文（22px，text-2 色，62ch 最大宽度）
- .dim — 次要文字色（text-2）
- .dim2 — 更淡文字色（text-3）
- .gradient-text — 渐变文字效果
- .mono — 等宽字体
- .serif — 衬线字体

### 布局类
- .row — flex 行，24px 间距
- .row.wrap — flex 行，允许换行
- .grid — CSS grid，24px 间距
- .g2 — 两列网格
- .g3 — 三列网格
- .g4 — 四列网格
- .center — 居中 flex 容器
- .fill — flex: 1
- .stack — 垂直堆叠，14px 间距

### 卡片类
- .card — 标准卡片（白底、边框、阴影、圆角）
- .card-soft — 柔和卡片（surface-2 底色）
- .card-outline — 描边卡片（透明底）
- .card-accent — 强调卡片（顶部 accent 色条）
- .card-hover — 悬停上浮效果

### 标签类
- .pill — 胶囊标签
- .pill-accent — 强调胶囊标签

### 分隔线
- .divider — 水平分隔线
- .divider-accent — 短强调分隔线（72px，accent 色）

### 页面装饰
- .deck-header — 页面顶部栏（绝对定位，含 eyebrow 文字）
- .deck-footer — 页面底部栏（绝对定位，含 slide-number）
- .slide-number — 页码（需 data-current 和 data-total 属性）

### 间距工具类
- .mt-s / .mt-m / .mt-l — 上间距 8/18/32px
- .mb-s / .mb-m / .mb-l — 下间距 8/18/32px
- .sp-t / .sp-b — 上下内边距 24px

### 对齐工具类
- .tc / .tl / .tr — 文本居中/左/右
- .uppercase — 大写 + 字间距
- .center — flex 居中

### 动画类（加在元素上，配合 data-anim 属性）
- .anim-stagger-list — 子元素依次出现
- .anim-fade-up / data-anim="fade-up" — 上浮淡入
- .anim-fade-down / data-anim="fade-down" — 下沉淡入
- .anim-rise-in / data-anim="rise-in" — 弹起进入
- .anim-fade-left / data-anim="fade-left" — 左侧淡入
- .anim-fade-right / data-anim="fade-right" — 右侧淡入
- .anim-drop-in / data-anim="drop-in" — 掉落进入
- .anim-zoom-pop / data-anim="zoom-pop" — 弹出缩放
- .anim-blur-in / data-anim="blur-in" — 模糊淡入
- .anim-glitch-in / data-anim="glitch-in" — 故障效果进入
- .anim-neon-glow / data-anim="neon-glow" — 霓虹发光
- .anim-shimmer-sweep / data-anim="shimmer-sweep" — 闪光扫过
- .anim-gradient-flow / data-anim="gradient-flow" — 渐变流动
- .anim-confetti-burst / data-anim="confetti-burst" — 彩纸爆发
- .anim-spotlight / data-anim="spotlight" — 聚光灯效果
- .anim-ripple-reveal / data-anim="ripple-reveal" — 涟漪揭示
- .anim-marquee-scroll / data-anim="marquee-scroll" — 跑马灯滚动
- .anim-kenburns / data-anim="kenburns" — Ken Burns 缩放

### 计数器
- <span class="counter" data-to="数字">0</span> — 数字递增动画

## ★ 幻灯片背景效果（用内联 style 实现）

每个 slide 都必须加背景效果，不要留纯色白底！用内联 CSS 在 <section> 上添加背景。

### ★★★ 背景对比度规则（极其重要）★★★

背景效果必须与文字形成足够对比度，否则内容不可读！
- **浅色主题**（如 xiaohongshu-white、minimal-white、newspaper 等）→ 背景必须足够深/足够有色彩，确保深色文字(--text-1/--text-2)清晰可读。推荐使用：accent 色的径向渐变（opacity 8-15%）、网格线/点阵背景（用 --border-strong 替代 --border 以增加可见度）、或 color-mix 渐变（accent opacity 20-30%）
- **深色主题**（如 tokyo-night、github-dark、dracula 等）→ 背景可以用较淡的渐变，因为浅色文字在深色底上天然对比度高
- **绝对禁止**：在浅色主题上使用 var(--surface-2) 到 var(--bg) 的渐变——它们颜色太接近，背景效果几乎不可见且文字会融入背景

### 浅色主题专用背景（对比度更高）
style="background:radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--accent) 15%, var(--bg)) 0%, var(--bg) 70%)"
style="background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, var(--bg)) 0%, var(--bg) 50%, color-mix(in srgb, var(--accent-3) 12%, var(--bg)) 100%)"
style="background-image:linear-gradient(var(--border-strong) 1px,transparent 1px),linear-gradient(90deg,var(--border-strong) 1px,transparent 1px);background-size:40px 40px"
style="background-image:radial-gradient(circle,var(--border-strong) 1px,transparent 1px);background-size:24px 24px"

### 深色主题专用背景（对比度天然好）
style="background:linear-gradient(135deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)"
style="background:radial-gradient(ellipse at 30% 50%, var(--accent) 0%, transparent 60%)"
style="background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px"
style="background-image:radial-gradient(circle,var(--border) 1px,transparent 1px);background-size:24px 24px"

### 多色渐变背景（深色/浅色主题通用）
style="background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 40%, color-mix(in srgb, var(--accent) 10%, transparent) 100%)"

背景选择规则：
- 封面/章节页 → 径向渐变或多色渐变（浅色主题用 accent+bg 混合，深色主题用 accent+transparent）
- 数据/KPI 页 → 网格线背景（浅色主题用 --border-strong，深色主题用 --border）
- 正文/要点页 → 点阵背景（浅色主题用 --border-strong，深色主题用 --border）
- CTA/结尾页 → 多色渐变背景

## ★ Canvas 特效（data-fx 属性，加在 <section class="slide"> 上）

为幻灯片添加 Canvas 动态特效。必须先引入 fx-runtime.js。

可用的特效（data-fx 的值必须是以下之一）：
- data-fx="particle-burst" — 粒子爆发效果
- data-fx="confetti-cannon" — 彩纸飘落效果
- data-fx="firework" — 烟花效果
- data-fx="starfield" — 星空效果
- data-fx="matrix-rain" — 矩阵代码雨效果
- data-fx="constellation" — 星座连线效果
- data-fx="neural-net" — 神经网络效果
- data-fx="orbit-ring" — 轨道环效果
- data-fx="galaxy-swirl" — 星系旋转效果
- data-fx="gradient-blob" — 渐变色块效果
- data-fx="sparkle-trail" — 闪光轨迹效果
- data-fx="shockwave" — 冲击波效果
- data-fx="data-stream" — 数据流效果
- data-fx="counter-explosion" — 数字爆炸效果

特效使用规则（克制使用，不要每页都加）：
- 封面页 → data-fx="particle-burst" 或 data-fx="constellation"
- 科技/数据页 → data-fx="matrix-rain" 或 data-fx="data-stream"
- CTA/结尾页 → data-fx="confetti-cannon" 或 data-fx="firework"
- 正文页 → 不加 data-fx（保持简洁）

## ★ 表格样式

base.css 内置了精美的表格样式，直接使用 <table> 标签即可自动获得样式：

<table>
  <thead>
    <tr><th>列标题1</th><th>列标题2</th><th>列标题3</th></tr>
  </thead>
  <tbody>
    <tr><td>数据1</td><td>数据2</td><td>数据3</td></tr>
  </tbody>
</table>

表格会自动获得：交替行背景、边框、圆角、内边距。配合 .card 使用效果更佳。

## ★ 图表（纯 CSS 实现，无需 JS 库）

### 柱状图（用 .grid + flex 条实现）
<div class="grid g4 mt-l" style="align-items:end">
  <div class="stack tc"><div style="height:120px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q1</p></div>
  <div class="stack tc"><div style="height:180px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q2</p></div>
  <div class="stack tc"><div style="height:90px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q3</p></div>
  <div class="stack tc"><div style="height:210px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q4</p></div>
</div>

### 进度条
<div class="card" style="padding:16px">
  <p class="eyebrow">完成度</p>
  <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;margin-top:8px">
    <div style="width:75%;height:100%;background:var(--accent);border-radius:4px"></div>
  </div>
  <p class="dim mt-s">75% 已完成</p>
</div>

### 环形图（用 conic-gradient 实现）
<div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(var(--accent) 0% 65%,var(--surface-2) 65% 100%);display:flex;align-items:center;justify-content:center">
  <div style="width:100px;height:100px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center">
    <span style="font-size:28px;font-weight:800">65%</span>
  </div>
</div>

## ★ 幻灯片类型完整示例（严格按照这些结构来写）

### 封面页（cover）— 必须加背景和 data-fx
<section class="slide is-active" data-title="封面" data-fx="particle-burst" style="background:radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--accent) 15%, var(--bg)) 0%, var(--bg) 70%)">
  <div class="deck-header"><span class="eyebrow">标签 · 年份</span><span class="eyebrow">品牌</span></div>
  <div class="anim-stagger-list">
    <p class="kicker">分类标签</p>
    <h1 class="h1">主标题 <span class="gradient-text">关键词</span></h1>
    <p class="lede">副标题描述</p>
    <div class="row wrap mt-l">
      <span class="pill pill-accent">标签1</span>
      <span class="pill">标签2</span>
    </div>
  </div>
  <div class="deck-footer"><span class="dim2">作者 · 日期</span><span class="slide-number" data-current="1" data-total="N"></span></div>
</section>

### 章节分隔页（section）— 必须加背景
<section class="slide tc center" data-title="章节名" style="background:radial-gradient(ellipse at 30% 50%, var(--accent) 0%, transparent 60%)">
  <div style="max-width:780px;margin:0 auto">
    <p class="kicker">Section · 编号</p>
    <h1 class="h1" style="font-size:112px">章节标题</h1>
    <div class="divider-accent" style="margin:24px auto"></div>
    <p class="lede" style="margin:0 auto">章节描述</p>
  </div>
</section>

### 要点列表页（bullets）— 加点阵背景
<section class="slide" data-title="要点" style="background-image:radial-gradient(circle,var(--border) 1px,transparent 1px);background-size:24px 24px">
  <p class="kicker">分类</p>
  <h2 class="h2">标题</h2>
  <p class="lede mb-l">简介</p>
  <ul class="grid g3 anim-stagger-list" style="list-style:none;padding:0;margin:0;gap:14px" data-anim-target>
    <li class="card card-accent"><h4>① 要点标题</h4><p class="dim">要点描述</p></li>
    <li class="card card-accent"><h4>② 要点标题</h4><p class="dim">要点描述</p></li>
    <li class="card card-accent"><h4>③ 要点标题</h4><p class="dim">要点描述</p></li>
  </ul>
</section>

### KPI 数据页（stats）— 加网格线背景
<section class="slide" data-title="关键指标" style="background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px">
  <p class="kicker">Metrics · 关键数字</p>
  <h2 class="h2">标题</h2>
  <div class="grid g4 mt-l anim-stagger-list" data-anim-target>
    <div class="card"><p class="eyebrow">指标名</p><div style="font-size:56px;font-weight:800"><span class="counter" data-to="数字">0</span>单位</div><p class="dim" style="color:var(--good)">↑ 增长</p></div>
  </div>
</section>

### 双栏页（two-column）— 加渐变背景
<section class="slide" data-title="双栏" style="background:radial-gradient(ellipse at 70% 50%, color-mix(in srgb, var(--accent) 12%, var(--bg)) 0%, var(--bg) 70%)">
  <p class="kicker">分类</p>
  <h2 class="h2">标题</h2>
  <div class="grid g2 mt-l" style="align-items:start">
    <div class="card"><h3>左栏标题</h3><p class="dim">左栏内容</p></div>
    <div class="card"><h3>右栏标题</h3><p class="dim">右栏内容</p></div>
  </div>
</section>

### 对比页（comparison）— 加点阵背景
<section class="slide" data-title="对比" style="background-image:radial-gradient(circle,var(--border) 1px,transparent 1px);background-size:24px 24px">
  <p class="kicker">Before vs After</p>
  <h2 class="h2">标题</h2>
  <div class="vs" style="display:grid;grid-template-columns:1fr 90px 1fr;gap:28px;align-items:stretch;margin-top:30px">
    <div class="card" style="border-top:3px solid var(--bad);padding:30px"><h3>📉 过去</h3><ul style="padding-left:20px;font-size:15px;line-height:1.8;color:var(--text-2)"><li>缺点1</li></ul></div>
    <div style="font-size:56px;font-weight:800;color:var(--text-3);display:flex;align-items:center;justify-content:center">→</div>
    <div class="card" style="border-top:3px solid var(--good);padding:30px"><h3>📈 现在</h3><ul style="padding-left:20px;font-size:15px;line-height:1.8;color:var(--text-2)"><li>优点1</li></ul></div>
  </div>
</section>

### 表格页（table）— 加网格线背景
<section class="slide" data-title="数据对比" style="background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px">
  <p class="kicker">数据</p>
  <h2 class="h2">标题</h2>
  <div class="card mt-m" style="padding:0;overflow:hidden">
    <table>
      <thead><tr><th>项目</th><th>方案A</th><th>方案B</th><th>方案C</th></tr></thead>
      <tbody>
        <tr><td>指标1</td><td>值1</td><td>值2</td><td>值3</td></tr>
        <tr><td>指标2</td><td>值1</td><td>值2</td><td>值3</td></tr>
      </tbody>
    </table>
  </div>
</section>

### 图表页（chart）— 纯 CSS 柱状图 + 网格线背景
<section class="slide" data-title="趋势" style="background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px">
  <p class="kicker">趋势</p>
  <h2 class="h2">标题</h2>
  <div class="grid g4 mt-l" style="align-items:end">
    <div class="stack tc"><div style="height:120px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q1</p></div>
    <div class="stack tc"><div style="height:180px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q2</p></div>
    <div class="stack tc"><div style="height:90px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q3</p></div>
    <div class="stack tc"><div style="height:210px;background:var(--accent);border-radius:6px 6px 0 0" class="fill"></div><p class="eyebrow">Q4</p></div>
  </div>
</section>

### 时间线页（timeline）— 加渐变背景
<section class="slide" data-title="时间线" style="background:radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--accent) 10%, var(--bg)) 0%, var(--bg) 70%)">
  <p class="kicker">里程碑</p>
  <h2 class="h2">标题</h2>
  <div class="grid g3 mt-l anim-stagger-list" data-anim-target>
    <div class="card card-accent"><p class="eyebrow">2024 Q1</p><h4>事件1</h4><p class="dim">描述</p></div>
    <div class="card card-accent"><p class="eyebrow">2024 Q2</p><h4>事件2</h4><p class="dim">描述</p></div>
    <div class="card card-accent"><p class="eyebrow">2024 Q3</p><h4>事件3</h4><p class="dim">描述</p></div>
  </div>
</section>

### 单数字高亮页（stat-highlight）— 加背景和 data-fx
<section class="slide center tc" data-title="核心数据" data-fx="constellation" style="background:radial-gradient(ellipse at 50% 50%, var(--accent) 0%, transparent 60%)">
  <p class="kicker">Impact</p>
  <div style="font-size:260px;line-height:1;font-weight:900;letter-spacing:-.05em">
    <span class="counter gradient-text" data-to="数字">0</span><span class="gradient-text">%</span>
  </div>
  <h3 class="mt-s">描述文字</h3>
  <p class="lede" style="margin:16px auto 0">补充说明</p>
</section>

### 引用页（quote）— 加渐变背景
<section class="slide center tc" data-title="引用" style="background:radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--accent) 8%, var(--bg)) 0%, var(--bg) 60%)">
  <div style="max-width:800px">
    <div style="font-size:80px;line-height:1;color:var(--accent);opacity:.3">"</div>
    <h2 class="h2" style="font-style:italic">引用文字</h2>
    <p class="dim mt-m">— 引用来源</p>
  </div>
</section>

### CTA/结尾页（cta）— 必须加背景和 data-fx
<section class="slide center tc" data-title="行动号召" data-fx="confetti-cannon" style="background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 40%, color-mix(in srgb, var(--accent) 10%, transparent) 100%)">
  <div style="max-width:900px">
    <p class="kicker">Call to action</p>
    <h1 class="h1" style="font-size:96px"><span class="gradient-text">行动号召</span></h1>
    <p class="lede" style="margin:16px auto 30px">描述</p>
    <div class="row" style="justify-content:center">
      <span class="pill pill-accent" style="font-size:16px;padding:8px 20px">行动按钮</span>
    </div>
  </div>
</section>

### 致谢页（thanks）— 必须加背景和 data-fx
<section class="slide center tc" data-title="致谢" data-fx="firework" style="background:radial-gradient(ellipse at 50% 50%, var(--accent) 0%, transparent 60%)">
  <div>
    <h1 class="h1" style="font-size:180px;line-height:1"><span class="gradient-text">Thanks</span></h1>
    <p class="lede" style="margin:18px auto 0">致谢语</p>
    <div class="row mt-l" style="justify-content:center;gap:32px">
      <div class="dim"><b>作者</b> · 联系方式</div>
    </div>
  </div>
</section>

## ★★★ 排版质量核心规则 ★★★

1. **页数必须严格遵循用户要求** — 这是最重要的规则！用户说12页就12页，说20页就20页
2. **每个 slide 必须加背景效果** — 绝不要留纯色白底！用内联 style 添加渐变、网格线、点阵等背景
3. **背景与文字对比度必须足够** — 浅色主题（xiaohongshu-white、minimal-white 等）的背景必须用 accent 色+bg 混合的渐变，确保文字清晰可读。禁止在浅色主题上使用 surface-2→bg 的近白色渐变
4. **封面页和结尾页必须加 data-fx** — particle-burst、constellation、confetti-cannon、firework 让关键页面有视觉冲击力
5. **内容绝不能超出画幅** — 每页内容必须完全在 960×540 可视区域内。幻灯片 padding 为 72px 上下 + 96px 左右，可用内容区域约为 768×396px。每页最多放 3-4 个 .card，每个 .card 内容不超过 3 行。文字精炼，避免长段落
6. **善用 .card 和 .grid 组合** — 不要把内容平铺，用 .card 包裹，用 .g2/.g3/.g4 分列
7. **善用 .kicker 和 .eyebrow** — 每页顶部加分类标签，让层次更清晰
8. **善用 .gradient-text** — 关键数字、标题关键词用渐变色突出
9. **善用 .counter** — 所有数字都应该用 counter 动画
10. **善用 .anim-stagger-list** — 列表和卡片组加交错动画
11. **善用 .anim-fade-up / .anim-rise-in** — 关键元素加进入动画
12. **不要使用 layout-* 类名**（如 layout-cover），它们不存在于 CSS 中
13. **不要使用 theme-* 类名**（如 theme-tokyo-night），主题通过 <link> 标签引入
14. **不要添加 <style>.slide { display: none; }</style>**，base.css 已处理幻灯片切换
15. **必须使用上述真实 CSS 类来排版**，否则幻灯片将没有任何样式
16. **表格必须用 <table> 标签**，配合 .card 使用，不要自己画表格
17. **图表用纯 CSS 实现**（柱状图用 flex + div，环形图用 conic-gradient），不要引入外部图表库
18. **视觉层次要分明**：kicker → h1/h2 → lede → dim，每页都有清晰的视觉层次
19. **data-fx 的值必须是上面列出的特效名之一**，不要自己编造名称
20. **不要连续两页使用相同布局**，保持视觉多样性
21. **每 3-4 页插入一个视觉冲击页**（stat-highlight、quote、section 分隔）
22. **内容不足时主动扩充** — 拆分长段落、添加 section 分隔、添加 quote/stat-highlight 页
23. **浅色主题文字规则** — 浅色主题下不要大量使用 .dim 和 .dim2（它们在浅色背景上对比度极低），主要文字用 --text-1 和 --text-2，次要信息用 .eyebrow（有 uppercase 和 letter-spacing 增强辨识度）
24. **每页内容精炼** — 一页最多 1 个大标题 + 1 个副标题 + 3-4 个要点卡片。文字超过 5 行的段落必须拆分到多页`;

  // 从用户提示词中提取页数要求
  const pageCountMatch = userPrompt.match(/(\d+)\s*页|(\d+)\s*slides|(\d+)\s*pages/i);
  const requestedPages = pageCountMatch ? parseInt(pageCountMatch[1] || pageCountMatch[2] || pageCountMatch[3]) : null;
  const pageCountDirective = requestedPages
    ? `★★★ 硬约束：你必须生成恰好 ${requestedPages} 个 <section class="slide"> ★★★\n不允许生成少于 ${requestedPages} 页。如果内容不够，通过拆分段落、添加章节分隔页、引用页、数据高亮页来扩充到 ${requestedPages} 页。在脑中规划每页的标题和布局，但不要在 HTML 中输出规划文本。`
    : '根据文档内容量生成 8-15 页幻灯片，内容丰富时不少于 12 页。';

  const userContent = `--- 文档内容 ---
${fileContent}

--- 风格要求 ---
${userPrompt || '根据文档内容自动选择最佳风格、主题和布局。确保每页都有背景效果，封面和结尾页加 data-fx 特效，让演示文稿视觉震撼。'}

--- ★★★ 页数硬约束 ★★★ ---
${pageCountDirective}

--- 生成流程（必须按此执行）---
1. 仔细阅读文档内容，提取所有关键信息点
2. 在脑中规划每一页的标题和布局类型，确保总数等于要求的页数（不要在输出中写出规划列表）
3. 直接输出完整的 HTML 文档，从 <!DOCTYPE html> 开始，到 </html> 结束
4. 只输出 HTML 代码，不要输出任何解释文字、规划列表、页数说明等非 HTML 内容
5. 确保生成的 <section class="slide"> 数量恰好等于要求的页数`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}

/** AI 增量编辑幻灯片 — 构建编辑模式 prompt */
export function buildEditPrompt(
  fileContent: string,
  originalPrompt: string,
  existingHtml: string,
  editInstruction: string,
): { role: string; content: string }[] {
  const existingSlideCount = (existingHtml.match(/<section[^>]*class="[^"]*slide[^"]*"/g) || []).length;

  const userContent = fileContent
    ? `以下是用户的文件内容：\n\n${fileContent}\n\n用户的原始需求：${originalPrompt}`
    : `用户的原始需求：${originalPrompt}`;

  const editUserContent = `--- 修改要求 ---
${editInstruction}

--- 现有幻灯片 ---
当前共有 ${existingSlideCount} 页幻灯片。
请根据修改要求调整指定页面，保持其他页面不变。不要增加或删除页面，除非用户明确要求。

--- 输出要求 ---
输出完整的修改后 HTML 文档，包含所有页面。只输出 HTML 代码，不要输出解释文字。`;

  return [
    { role: 'system', content: EDIT_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
    { role: 'assistant', content: existingHtml },
    { role: 'user', content: editUserContent },
  ];
}

/** 编辑模式的 system prompt — 基于现有 HTML 修改，保留整体设计 */
const EDIT_SYSTEM_PROMPT = `你是一个世界级演示文稿设计专家。你之前已经为用户生成了一份 HTML 演示文稿。用户现在要求修改，请基于现有 HTML 进行修改。

## ★★★ 编辑模式绝对规则（违反任何一条都是严重错误）★★★

1. **基于现有 HTML 进行修改** — 你收到的 assistant 消息包含当前的完整 HTML 文档。你必须在此基础上修改，保持整体风格、主题和结构不变。
2. **只修改用户指定的部分** — 用户说"修改第10页排版"，只改第10页的排版，其他页面保持原样一字不改。用户说"调整配色"，只改颜色相关样式，不改动内容。
3. **不要因为数字而增减页数** — 用户说"第10页"是指第10个页面，不是要求生成10页。只有在用户明确说"增加/删除页面"时才改变页数。
4. **保持现有主题** — 不要更换 <link id="theme-link"> 的主题，除非用户明确要求换主题。
5. **输出完整 HTML 文档** — 必须输出包含所有页面的完整 HTML，未修改的页面原样保留。不要只输出单个页面或片段。
6. **每个 slide 必须加背景效果** — 新增或修改的页面同样需要背景效果
7. **遵循 CSS 类规则** — 修改页面时仍然必须使用真实 CSS 类名（见下方列表）
8. **只输出纯 HTML 代码** — 不要输出 markdown 代码围栏、解释文字等非 HTML 内容。输出必须从 <!DOCTYPE html> 开始，到 </html> 结束。
9. **保持 data-fx 和动画** — 未修改的页面保持原有特效，修改的页面可按需要调整
10. **保持内容精炼** — 修改的页面同样遵循排版质量规则

## 文档结构要求

输出完整的 HTML 文档：
<!DOCTYPE html><html lang="zh-CN"><head>引入 CSS/JS</head><body><div class="deck"> 内含多个 <section class="slide">

- 每个 <section class="slide"> 是一页幻灯片
- 第一个 <section> 加上 class="is-active"，其他不加
- 每个 section 加 data-title 属性作为幻灯片标题
- 16:9 比例，每页内容精炼，避免文字过多

## CSS/JS 引入（必须按此顺序）

<link rel="stylesheet" href="/html-ppt/assets/fonts.css">
<link rel="stylesheet" href="/html-ppt/assets/base.css">
<link rel="stylesheet" id="theme-link" href="/html-ppt/assets/themes/你选择的主题.css">
<link rel="stylesheet" href="/html-ppt/assets/animations/animations.css">
<script src="/html-ppt/assets/runtime.js"></script>
<script src="/html-ppt/assets/animations/fx-runtime.js"></script>

## 可用的 CSS 类（base.css 中真实定义的类，必须使用）

### 排版类
- .kicker — 小号强调标签（14px，accent 色，大写）
- .eyebrow — 极小号标签（13px，text-3 色，大写）
- h1.title 或 .h1 — 主标题（72px，display 字体）
- h2.title 或 .h2 — 副标题（54px）
- h3 / .h3 — 小标题（32px）
- h4 / .h4 — 更小标题（22px）
- .lede — 正文（22px，text-2 色，62ch 最大宽度）
- .dim — 次要文字色（text-2）
- .dim2 — 更淡文字色（text-3）
- .gradient-text — 渐变文字效果
- .mono — 等宽字体
- .serif — 衬线字体

### 布局类
- .row — flex 行，24px 间距
- .row.wrap — flex 行，允许换行
- .grid — CSS grid，24px 间距
- .g2 — 两列网格
- .g3 — 三列网格
- .g4 — 四列网格
- .center — 居中 flex 容器
- .fill — flex: 1
- .stack — 垂直堆叠，14px 间距

### 卡片类
- .card — 标准卡片（白底、边框、阴影、圆角）
- .card-soft — 柔和卡片（surface-2 底色）
- .card-outline — 描边卡片（透明底）
- .card-accent — 强调卡片（顶部 accent 色条）
- .card-hover — 悬停上浮效果

### 标签类
- .pill — 胶囊标签
- .pill-accent — 强调胶囊标签

### 分隔线
- .divider — 水平分隔线
- .divider-accent — 短强调分隔线（72px，accent 色）

### 页面装饰
- .deck-header — 页面顶部栏（绝对定位，含 eyebrow 文字）
- .deck-footer — 页面底部栏（绝对定位，含 slide-number）
- .slide-number — 页码（需 data-current 和 data-total 属性）

### 间距工具类
- .mt-s / .mt-m / .mt-l — 上间距 8/18/32px
- .mb-s / .mb-m / .mb-l — 下间距 8/18/32px
- .sp-t / .sp-b — 上下内边距 24px

### 对齐工具类
- .tc / .tl / .tr — 文本居中/左/右
- .uppercase — 大写 + 字间距
- .center — flex 居中

### 动画类（加在元素上，配合 data-anim 属性）
- .anim-stagger-list — 子元素依次出现
- .anim-fade-up / data-anim="fade-up" — 上浮淡入
- .anim-fade-down / data-anim="fade-down" — 下沉淡入
- .anim-rise-in / data-anim="rise-in" — 弹起进入
- .anim-fade-left / data-anim="fade-left" — 左侧淡入
- .anim-fade-right / data-anim="fade-right" — 右侧淡入
- .anim-drop-in / data-anim="drop-in" — 掉落进入
- .anim-zoom-pop / data-anim="zoom-pop" — 弹出缩放
- .anim-blur-in / data-anim="blur-in" — 模糊淡入
- .anim-glitch-in / data-anim="glitch-in" — 故障效果进入
- .anim-neon-glow / data-anim="neon-glow" — 霓虹发光
- .anim-shimmer-sweep / data-anim="shimmer-sweep" — 闪光扫过
- .anim-gradient-flow / data-anim="gradient-flow" — 渐变流动
- .anim-confetti-burst / data-anim="confetti-burst" — 彩纸爆发
- .anim-spotlight / data-anim="spotlight" — 聚光灯效果
- .anim-ripple-reveal / data-anim="ripple-reveal" — 涟漪揭示
- .anim-marquee-scroll / data-anim="marquee-scroll" — 跑马灯滚动
- .anim-kenburns / data-anim="kenburns" — Ken Burns 缩放

### 计数器
- <span class="counter" data-to="数字">0</span> — 数字递增动画

## ★ 幻灯片背景效果（用内联 style 实现）

每个 slide 都必须加背景效果，不要留纯色白底！用内联 CSS 在 <section> 上添加背景。

### ★★★ 背景对比度规则（极其重要）★★★

背景效果必须与文字形成足够对比度，否则内容不可读！
- **浅色主题**（如 xiaohongshu-white、minimal-white、newspaper 等）→ 背景必须足够深/足够有色彩，确保深色文字(--text-1/--text-2)清晰可读
- **深色主题**（如 tokyo-night、github-dark、dracula 等）→ 背景可以用较淡的渐变，因为浅色文字在深色底上天然对比度高
- **绝对禁止**：在浅色主题上使用 var(--surface-2) 到 var(--bg) 的渐变——它们颜色太接近，背景效果几乎不可见且文字会融入背景

### 浅色主题专用背景（对比度更高）
style="background:radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--accent) 15%, var(--bg)) 0%, var(--bg) 70%)"
style="background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, var(--bg)) 0%, var(--bg) 50%, color-mix(in srgb, var(--accent-3) 12%, var(--bg)) 100%)"
style="background-image:linear-gradient(var(--border-strong) 1px,transparent 1px),linear-gradient(90deg,var(--border-strong) 1px,transparent 1px);background-size:40px 40px"
style="background-image:radial-gradient(circle,var(--border-strong) 1px,transparent 1px);background-size:24px 24px"

### 深色主题专用背景（对比度天然好）
style="background:linear-gradient(135deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)"
style="background:radial-gradient(ellipse at 30% 50%, var(--accent) 0%, transparent 60%)"
style="background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px"
style="background-image:radial-gradient(circle,var(--border) 1px,transparent 1px);background-size:24px 24px"

### 多色渐变背景（深色/浅色主题通用）
style="background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 40%, color-mix(in srgb, var(--accent) 10%, transparent) 100%)"

## ★ Canvas 特效（data-fx 属性，加在 <section class="slide"> 上）

可用的特效（data-fx 的值必须是以下之一）：
- data-fx="particle-burst" — 粒子爆发效果
- data-fx="confetti-cannon" — 彩纸飘落效果
- data-fx="firework" — 烟花效果
- data-fx="starfield" — 星空效果
- data-fx="matrix-rain" — 矩阵代码雨效果
- data-fx="constellation" — 星座连线效果
- data-fx="neural-net" — 神经网络效果
- data-fx="orbit-ring" — 轨道环效果
- data-fx="galaxy-swirl" — 星系旋转效果
- data-fx="gradient-blob" — 渐变色块效果
- data-fx="sparkle-trail" — 闪光轨迹效果
- data-fx="shockwave" — 冲击波效果
- data-fx="data-stream" — 数据流效果
- data-fx="counter-explosion" — 数字爆炸效果

## ★★★ 编辑排版质量规则 ★★★

1. **保持所有未修改页面的 HTML 完全不变** — 包括空白、类名、属性、缩进
2. **修改页面时保持 data-title 属性不变** — 除非用户要求改标题
3. **每个 slide 必须加背景效果** — 修改的页面同样需要背景
4. **背景与文字对比度必须足够** — 同生成模式规则
5. **内容绝不能超出画幅** — 每页内容在 960×540 可视区域内
6. **善用 .card 和 .grid 组合** — 不要把内容平铺
7. **必须使用真实 CSS 类来排版** — 不要自己编造类名
8. **表格必须用 <table> 标签** — 配合 .card 使用
9. **图表用纯 CSS 实现** — 不要引入外部图表库
10. **不要使用 layout-* 或 theme-* 类名** — 它们不存在于 CSS 中
11. **不要添加 <style>.slide { display: none; }</style>** — base.css 已处理
12. **data-fx 的值必须是上面列出的特效名之一** — 不要自己编造名称`;
