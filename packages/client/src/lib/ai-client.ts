import { useAIConfig, type AIProvider } from '../hooks/useAIConfig';

async function callOpenAI(baseUrl: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(baseUrl: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const { provider, baseUrl, apiKey, model } = useAIConfig.getState();
  if (provider === 'anthropic') {
    return callAnthropic(baseUrl, apiKey, model, messages);
  }
  return callOpenAI(baseUrl, apiKey, model, messages);
}

export async function testConnection(): Promise<boolean> {
  const { provider, baseUrl, apiKey, model } = useAIConfig.getState();
  try {
    const messages = [{ role: 'user', content: 'Hi' }];
    if (provider === 'anthropic') {
      await callAnthropic(baseUrl, apiKey, model, messages);
    } else {
      await callOpenAI(baseUrl, apiKey, model, messages);
    }
    useAIConfig.getState().setConnected(true);
    return true;
  } catch (err: any) {
    useAIConfig.getState().setConnected(false);
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      throw new Error('CORS 错误：浏览器无法直接访问此 API。请配置后端代理或使用 OpenAI 兼容格式的转发服务。');
    }
    throw err;
  }
}

export interface LayoutSuggestion {
  layout: string;
  slotHints: Record<string, string>;
}

export async function optimizeLayout(content: string, fileType: string): Promise<LayoutSuggestion[]> {
  const systemPrompt = `你是一个演示文稿排版专家。用户会提供解析后的文档内容（标题、段落、列表等），你需要为每一页幻灯片选择最合适的布局并建议每个插槽的内容。

可用的布局类型：cover, section, bullets, text-image, image-text, two-column, quote, stats, timeline, comparison, chart-bar, chart-line, code, photo-grid, centered, agenda, team, testimonial, process, numbered-list, icon-grid, call-to-action, blank

返回 JSON 数组，每个元素包含：
- layout: 布局类型字符串
- slotHints: 对象，键为插槽名（如 title, subtitle, body, items, image 等），值为建议的内容

只返回 JSON 数组，不要其他文字。`;

  const userPrompt = `文件类型：${fileType}\n\n文档内容：\n${content}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI 返回的格式无法解析，请重试');
  }
}

export async function optimizeSlide(slideData: { layout: string; slots: { id: string; value: string; type: string }[]; theme: string }): Promise<{ layout?: string; slots: { id: string; value: string }[] }> {
  const systemPrompt = `你是一个演示文稿内容优化专家。用户会提供当前幻灯片的布局、插槽内容和主题，你需要优化每个插槽的内容，使其更专业、更有表现力。

返回 JSON 对象：
- layout: (可选) 如果建议更换布局，提供新的布局类型
- slots: 数组，每个元素包含 id 和 value

只返回 JSON 对象，不要其他文字。`;

  const userPrompt = `当前幻灯片数据：\n${JSON.stringify(slideData, null, 2)}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI 返回的格式无法解析，请重试');
  }
}
