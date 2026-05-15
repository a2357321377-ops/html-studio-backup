import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ThemePicker } from '../components/ThemePicker';
import { useFileParser } from '../hooks/useFileParser';
import { useDeck } from '../hooks/useDeck';
import { getLayoutMeta } from '@html-studio/shared';
import type { Slide } from '@html-studio/shared';
import { useAIConfig } from '../hooks/useAIConfig';
import { optimizeLayout } from '../lib/ai-client';

export default function Home() {
  const [selectedTheme, setSelectedTheme] = useState('tokyo-night');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { parseResult, parsing, error, parseFile, reset: resetParse } = useFileParser();
  const initDeck = useDeck(s => s.initDeck);
  const { autoLayout, connected, apiKey } = useAIConfig();
  const navigate = useNavigate();

  const handleFile = async (file: File) => {
    setUploadedFile(file);
    await parseFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    resetParse();
  };

  const handleGenerate = async () => {
    if (!uploadedFile) return;

    let result = parseResult;
    if (!result) {
      result = await parseFile(uploadedFile);
    }
    if (!result) return;

    // AI 自动排版
    if (autoLayout && connected && apiKey) {
      try {
        const content = result.slides.map((s, i) =>
          `--- 第${i + 1}页 ---\n${s.slots.map(slot => `${slot.label || slot.id}: ${slot.value}`).join('\n')}`
        ).join('\n\n');

        const suggestions = await optimizeLayout(content, result.fileType);

        // 用 AI 建议覆盖 parser 的默认布局选择
        suggestions.forEach((suggestion, i) => {
          if (i < result.slides.length) {
            const slide = result.slides[i];
            if (suggestion.layout) {
              (slide as any).layout = suggestion.layout;
            }
            if (suggestion.slotHints) {
              for (const [key, value] of Object.entries(suggestion.slotHints)) {
                const slot = slide.slots.find((s: any) => s.id === key || s.label === key);
                if (slot) {
                  slot.value = value;
                }
              }
            }
          }
        });
      } catch {
        // AI 失败时静默降级，使用默认布局
      }
    }

    // Apply selected theme to all slides
    const slides: Slide[] = result.slides.map((s, i) => ({
      ...s,
      theme: selectedTheme,
      order: i,
    }));

    initDeck(result.title, slides, selectedTheme);
    navigate('/editor');
  };

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto" style={{ background: 'linear-gradient(135deg, #0d0d1a, #1a1a3e)' }}>


      {/* 标题区 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">上传文档，生成演示</h1>
        <p className="text-sm text-[var(--color-text-dim)]">支持 PDF、Markdown、TXT、Word — 一键生成精美幻灯片</p>
      </div>

      {/* 上传区域 */}
      <div className="w-full max-w-[520px] mb-6">
        {!uploadedFile ? (
          <FileUploader onFile={handleFile} />
        ) : (
          <div className="bg-[var(--color-surface-2)] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center text-lg">&#128221;</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{uploadedFile.name}</div>
              <div className="text-[10px] text-[var(--color-text-dim)]">
                {(uploadedFile.size / 1024).toFixed(1)} KB
                {parseResult && ` · ${parseResult.slides.length} 页`}
              </div>
            </div>
            <button className="text-[var(--color-primary)] text-xs" onClick={handleRemoveFile}>&times; 移除</button>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-[520px] mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 风格选择 */}
      <div className="w-full max-w-[520px] mb-6">
        <ThemePicker selected={selectedTheme} onSelect={setSelectedTheme} mode="compact" />
      </div>

      {/* 生成按钮 */}
      <div className="w-full max-w-[520px]">
        <button
          className="w-full text-white rounded-xl py-3.5 text-sm font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #3b6cff, #7a5cff)' }}
          disabled={!uploadedFile || parsing}
          onClick={handleGenerate}
        >
          {parsing ? '解析中...' : '生成幻灯片'}
        </button>
        <div className="text-center mt-2 text-[10px] text-[var(--color-text-dim2)]">
          内容将自动拆分并匹配最佳布局
        </div>
      </div>
    </div>
  );
}