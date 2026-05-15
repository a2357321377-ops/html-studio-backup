import { useState } from 'react';
import { useAIConfig, type AIProvider } from '../hooks/useAIConfig';
import { testConnection } from '../lib/ai-client';

export default function Settings() {
  const {
    provider, baseUrl, apiKey, model, connected,
    autoLayout, editorAssist,
    setProvider, setBaseUrl, setApiKey, setModel, setConnected,
    setAutoLayout, setEditorAssist,
  } = useAIConfig();

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await testConnection();
      setTestResult({ ok: true, msg: '连接成功！' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err?.message ?? '连接失败' });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await testConnection();
      setTestResult({ ok: true, msg: '配置已保存，AI 连接成功' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: `配置已保存，但连接失败：${err?.message ?? '未知错误'}` });
    }
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: 'linear-gradient(135deg, #0d0d1a, #1a1a3e)' }}>
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-6">用户设置</h1>

        {/* AI 模型配置区 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-sm font-semibold">AI 模型配置</span>
          </div>

          {/* API 类型选择 */}
          <div className="mb-4">
            <div className="text-[10px] text-[var(--color-text-dim)] mb-1.5">API 类型</div>
            <div className="flex gap-2">
              {(['openai', 'anthropic'] as AIProvider[]).map(p => (
                <button
                  key={p}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    provider === p
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                  }`}
                  onClick={() => setProvider(p)}
                >
                  {p === 'openai' ? 'OpenAI 兼容' : 'Anthropic Claude'}
                </button>
              ))}
            </div>
          </div>

          {/* API Base URL */}
          <div className="mb-3">
            <label className="text-[10px] text-[var(--color-text-dim)] mb-1 block">API Base URL</label>
            <input
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com'}
            />
          </div>

          {/* API Key */}
          <div className="mb-3">
            <label className="text-[10px] text-[var(--color-text-dim)] mb-1 block">API Key</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <div className="text-[10px] text-[var(--color-text-dim2)] mt-1">Key 仅存储在浏览器本地，不会上传到服务器</div>
          </div>

          {/* 模型名称 */}
          <div className="mb-4">
            <label className="text-[10px] text-[var(--color-text-dim)] mb-1 block">模型名称</label>
            <input
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-xs"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514'}
            />
          </div>

          {/* 测试 + 保存 */}
          <div className="flex gap-2 mb-3">
            <button
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
              onClick={handleTest}
              disabled={testing || !apiKey}
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40"
              onClick={handleSave}
              disabled={saving || !apiKey}
            >
              {saving ? '保存并测试中...' : '保存配置'}
            </button>
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={`text-[10px] rounded-lg p-2 ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        {/* AI 功能开关 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="text-sm font-semibold mb-4">AI 功能</div>

          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <div>
              <div className="text-xs">自动排版生成</div>
              <div className="text-[10px] text-[var(--color-text-dim)]">上传文档后 AI 自动选择布局和主题</div>
            </div>
            <button
              className={`w-10 h-[22px] rounded-full relative transition-colors ${autoLayout ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-2)]'}`}
              onClick={() => setAutoLayout(!autoLayout)}
            >
              <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-all ${autoLayout ? 'right-[2px]' : 'left-[2px]'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-xs">编辑器 AI 优化</div>
              <div className="text-[10px] text-[var(--color-text-dim)]">在编辑器中让 AI 优化单页内容</div>
            </div>
            <button
              className={`w-10 h-[22px] rounded-full relative transition-colors ${editorAssist ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-2)]'}`}
              onClick={() => setEditorAssist(!editorAssist)}
            >
              <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-all ${editorAssist ? 'right-[2px]' : 'left-[2px]'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
