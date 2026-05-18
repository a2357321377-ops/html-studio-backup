import { useAIConfig } from '../hooks/useAIConfig';

// 统一通过后端代理调用 AI API，避免浏览器 CORS 限制
async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const { provider, baseUrl, apiKey, model } = useAIConfig.getState();

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, baseUrl, apiKey, model, messages }),
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
  const systemPrompt = `你是一个演示文稿生成专家。根据用户提供的文档内容和风格要求，生成符合 html-ppt 规范的完整 HTML 演示文稿。

## 文档结构要求
- 输出完整的 HTML 文档：<!DOCTYPE html><html lang="zh-CN"><head>引入 CSS/JS</head><body><div class="deck"> 内含多个 <section class="slide">
- 每个 <section class="slide"> 是一页幻灯片
- 第一个 <section> 加上 class="is-active"，其他不加
- 每个 section 加 data-title 属性作为幻灯片标题
- 16:9 比例，每页内容精炼，避免文字过多
- 只输出 HTML 代码，不要输出任何其他文字或 markdown 代码围栏

## CSS/JS 引入（必须按此顺序）
<link rel="stylesheet" href="/html-ppt/assets/fonts.css">
<link rel="stylesheet" href="/html-ppt/assets/base.css">
<link rel="stylesheet" id="theme-link" href="/html-ppt/assets/themes/你选择的主题.css">
<link rel="stylesheet" href="/html-ppt/assets/animations/animations.css">
...
<script src="/html-ppt/assets/runtime.js"></script>

## 主题选择
根据用户提示词和文档内容，自行选择最合适的主题。可用的主题：
tokyo-night, minimal-white, aurora, catppuccin-mocha, xiaohongshu-white, neo-brutalism,
github-dark, dracula, nord, solarized-dark, solarized-light, monokai, ocean-dark,
cyberpunk, matrix, retro-terminal, slate, ember, forest, desert, arctic, lavender,
rose-garden, midnight-blue, deep-space, candy, pastel, high-contrast, newspaper,
warm-earth, cool-breeze, vibrant
在 <link id="theme-link"> 中填入你选择的主题名。

## 可用的 CSS 类（这些是 base.css 中真实定义的类，必须使用它们来排版）

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

### 计数器
- <span class="counter" data-to="数字">0</span> — 数字递增动画

## 幻灯片类型示例（必须严格按照这些结构来写）

### 封面页（cover）
<section class="slide is-active" data-title="封面">
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

### 章节分隔页（section）
<section class="slide tc center" data-title="章节名">
  <div style="max-width:780px;margin:0 auto">
    <p class="kicker">Section · 编号</p>
    <h1 class="h1" style="font-size:112px">章节标题</h1>
    <div class="divider-accent" style="margin:24px auto"></div>
    <p class="lede" style="margin:0 auto">章节描述</p>
  </div>
</section>

### 要点列表页（bullets）
<section class="slide" data-title="要点">
  <p class="kicker">分类</p>
  <h2 class="h2">标题</h2>
  <p class="lede mb-l">简介</p>
  <ul class="grid g1 anim-stagger-list" style="list-style:none;padding:0;margin:0;gap:14px" data-anim-target>
    <li class="card card-accent"><h4>① 要点标题</h4><p class="dim">要点描述</p></li>
    <li class="card card-accent"><h4>② 要点标题</h4><p class="dim">要点描述</p></li>
    <li class="card card-accent"><h4>③ 要点标题</h4><p class="dim">要点描述</p></li>
  </ul>
</section>

### KPI 数据页（kpi-grid）
<section class="slide" data-title="关键指标">
  <p class="kicker">Metrics · 关键数字</p>
  <h2 class="h2">标题</h2>
  <div class="grid g4 mt-l anim-stagger-list" data-anim-target>
    <div class="card"><p class="eyebrow">指标名</p><div style="font-size:56px;font-weight:800"><span class="counter" data-to="数字">0</span>单位</div><p class="dim" style="color:var(--good)">↑ 增长</p></div>
  </div>
</section>

### 双栏页（two-column）
<section class="slide" data-title="双栏">
  <p class="kicker">分类</p>
  <h2 class="h2">标题</h2>
  <div class="grid g2 mt-l" style="align-items:start">
    <div class="card"><h3>左栏标题</h3><p class="dim">左栏内容</p></div>
    <div class="card"><h3>右栏标题</h3><p class="dim">右栏内容</p></div>
  </div>
</section>

### 对比页（comparison）
<section class="slide" data-title="对比">
  <p class="kicker">Before vs After</p>
  <h2 class="h2">标题</h2>
  <div class="vs" style="display:grid;grid-template-columns:1fr 90px 1fr;gap:28px;align-items:stretch;margin-top:30px">
    <div class="card" style="border-top:3px solid var(--bad);padding:30px"><h3>📉 过去</h3><ul style="padding-left:20px;font-size:15px;line-height:1.8;color:var(--text-2)"><li>缺点1</li></ul></div>
    <div style="font-size:56px;font-weight:800;color:var(--text-3);display:flex;align-items:center;justify-content:center">→</div>
    <div class="card" style="border-top:3px solid var(--good);padding:30px"><h3>📈 现在</h3><ul style="padding-left:20px;font-size:15px;line-height:1.8;color:var(--text-2)"><li>优点1</li></ul></div>
  </div>
</section>

### 单数字高亮页（stat-highlight）
<section class="slide center tc" data-title="核心数据">
  <p class="kicker">Impact</p>
  <div style="font-size:260px;line-height:1;font-weight:900;letter-spacing:-.05em">
    <span class="counter gradient-text" data-to="数字">0</span><span class="gradient-text">%</span>
  </div>
  <h3 class="mt-s">描述文字</h3>
  <p class="lede" style="margin:16px auto 0">补充说明</p>
</section>

### CTA/结尾页（cta）
<section class="slide center tc" data-title="行动号召">
  <div style="max-width:900px">
    <p class="kicker">Call to action</p>
    <h1 class="h1" style="font-size:96px"><span class="gradient-text">行动号召</span></h1>
    <p class="lede" style="margin:16px auto 30px">描述</p>
    <div class="row" style="justify-content:center">
      <span class="pill pill-accent" style="font-size:16px;padding:8px 20px">行动按钮</span>
    </div>
  </div>
</section>

### 致谢页（thanks）
<section class="slide center tc" data-title="致谢">
  <div>
    <h1 class="h1" style="font-size:180px;line-height:1"><span class="gradient-text">Thanks</span></h1>
    <p class="lede" style="margin:18px auto 0">致谢语</p>
    <div class="row mt-l" style="justify-content:center;gap:32px">
      <div class="dim"><b>作者</b> · 联系方式</div>
    </div>
  </div>
</section>

## 重要规则
- 不要使用 layout-* 类名（如 layout-cover），它们不存在于 CSS 中
- 不要使用 theme-* 类名（如 theme-tokyo-night），主题通过 <link> 标签引入
- 不要添加 <style>.slide { display: none; }</style>，base.css 已处理幻灯片切换
- 必须使用上述真实 CSS 类来排版，否则幻灯片将没有任何样式
- 每页内容精炼，避免文字过多，善用 .card、.grid、.kicker、.h1/.h2、.lede 等类`;

  const userContent = `--- 文档内容 ---
${fileContent}

--- 风格要求 ---
${userPrompt || '根据文档内容自动选择最佳风格、主题和布局'}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
