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
