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
