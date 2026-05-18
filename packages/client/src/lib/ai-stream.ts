import { useAIConfig } from '../hooks/useAIConfig';

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

/**
 * 流式调用 AI API，通过后端 SSE 代理路由。
 * 逐步读取 AI 返回的文本 chunk，调用 onChunk 回调。
 */
export async function streamAI(
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const { provider, baseUrl, apiKey, model } = useAIConfig.getState();

  try {
    const res = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, baseUrl, apiKey, model, messages, maxTokens: 16384 }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: '请求失败' }));
      callbacks.onError(data.error || `请求失败: ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('无法读取响应流');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (useAIConfig.getState().provider === 'anthropic') {
            // Anthropic SSE: content_block_delta → delta.text
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              callbacks.onChunk(parsed.delta.text);
            }
          } else {
            // OpenAI SSE: choices[0].delta.content
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              callbacks.onChunk(content);
            }
          }
        } catch {
          // 忽略非 JSON 行
        }
      }
    }

    callbacks.onDone();
  } catch (err: any) {
    callbacks.onError(err.message || '流式请求失败');
  }
}
