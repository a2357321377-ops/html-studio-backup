import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/api/health', (c) => c.json({ status: 'ok' }));

// AI 代理路由 — 前端通过此路由调用 AI API，避免浏览器 CORS 限制
app.post('/api/ai/chat', async (c) => {
  const body = await c.req.json<{
    provider: 'openai' | 'anthropic';
    baseUrl: string;
    apiKey: string;
    model: string;
    messages: { role: string; content: string }[];
    maxTokens?: number;
  }>();

  const { provider, baseUrl, apiKey, model, messages, maxTokens } = body;

  if (!apiKey) {
    return c.json({ error: 'API Key 未配置' }, 400);
  }

  try {
    if (provider === 'anthropic') {
      // Anthropic Claude API
      const url = `${baseUrl}/v1/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens || 16384 }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `Anthropic API error: ${res.status} ${err}` }, res.status as 400);
      }
      const data = await res.json();
      return c.json({ content: data.content[0].text });
    } else {
      // OpenAI 兼容 API
      const url = `${baseUrl}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens || 16384 }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `OpenAI API error: ${res.status} ${err}` }, res.status as 400);
      }
      const data = await res.json();
      return c.json({ content: data.choices[0].message.content });
    }
  } catch (err: any) {
    return c.json({ error: err.message || 'AI 请求失败' }, 500);
  }
});

// AI 流式代理路由 — SSE 格式
app.post('/api/ai/chat/stream', async (c) => {
  const body = await c.req.json<{
    provider: 'openai' | 'anthropic';
    baseUrl: string;
    apiKey: string;
    model: string;
    messages: { role: string; content: string }[];
    maxTokens?: number;
  }>();

  const { provider, baseUrl, apiKey, model, messages, maxTokens } = body;

  if (!apiKey) {
    return c.json({ error: 'API Key 未配置' }, 400);
  }

  try {
    if (provider === 'anthropic') {
      const url = `${baseUrl}/v1/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens || 16384, stream: true }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `Anthropic API error: ${res.status} ${err}` }, res.status as 400);
      }

      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const url = `${baseUrl}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens || 16384, stream: true }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `OpenAI API error: ${res.status} ${err}` }, res.status as 400);
      }

      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (err: any) {
    return c.json({ error: err.message || 'AI 流式请求失败' }, 500);
  }
});

const port = 3000;
console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });