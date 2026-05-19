import { useCallback, useRef } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

/**
 * 样式编辑面板
 * - 颜色选择器（文字色、背景色）
 * - 字号、字重
 * - 对齐方式
 * - 图片替换（base64 inline）
 */
export function StyleTab() {
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 发送样式更新到 iframe
  const updateStyle = useCallback((props: Record<string, string>) => {
    if (!selectedElement) return;
    iframeRef?.contentWindow?.postMessage({
      type: 'editor-style-update',
      cssPath: selectedElement.cssPath,
      props,
    }, '*');
  }, [selectedElement, iframeRef]);

  // 文字颜色
  const handleColorChange = (color: string) => {
    updateStyle({ color });
    if (selectedElement) {
      setSelectedElement({ ...selectedElement, color });
    }
  };

  // 背景颜色
  const handleBgColorChange = (backgroundColor: string) => {
    updateStyle({ backgroundColor });
    if (selectedElement) {
      setSelectedElement({ ...selectedElement, backgroundColor });
    }
  };

  // 字号
  const handleFontSizeChange = (size: string) => {
    updateStyle({ fontSize: size });
    if (selectedElement) {
      setSelectedElement({ ...selectedElement, fontSize: size });
    }
  };

  // 字重
  const handleFontWeightChange = (weight: string) => {
    updateStyle({ fontWeight: weight });
    if (selectedElement) {
      setSelectedElement({ ...selectedElement, fontWeight: weight });
    }
  };

  // 对齐
  const handleTextAlignChange = (align: string) => {
    updateStyle({ textAlign: align });
    if (selectedElement) {
      setSelectedElement({ ...selectedElement, textAlign: align });
    }
  };

  // 图片替换
  const handleImageReplace = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement?.isImage || !iframeRef?.contentDocument) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const doc = iframeRef.contentDocument;
      if (!doc) return;
      const el = doc.querySelector(selectedElement.cssPath) as HTMLImageElement;
      if (el) {
        el.src = base64;
        syncFromIframe();
        setSelectedElement({ ...selectedElement, imageSrc: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!selectedElement) {
    return (
      <div className="p-4 text-[var(--color-text-dim2)] text-xs text-center">
        点击幻灯片中的元素进行编辑
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 元素信息 */}
      <div className="text-[11px] text-[var(--color-text-dim)]">
        选中：{selectedElement.tagName.toLowerCase()}
        {selectedElement.isImage ? ' (图片)' : ''}
      </div>

      {/* 文字颜色 */}
      {!selectedElement.isImage && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)]">文字颜色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(selectedElement.color)}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-[var(--color-border)] cursor-pointer bg-transparent"
              />
              <span className="text-[11px] text-[var(--color-text-dim)] font-mono">
                {rgbToHex(selectedElement.color)}
              </span>
            </div>
          </div>

          {/* 背景颜色 */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)]">背景颜色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(selectedElement.backgroundColor)}
                onChange={(e) => handleBgColorChange(e.target.value)}
                className="w-8 h-8 rounded border border-[var(--color-border)] cursor-pointer bg-transparent"
              />
              <span className="text-[11px] text-[var(--color-text-dim)] font-mono">
                {rgbToHex(selectedElement.backgroundColor)}
              </span>
            </div>
          </div>

          {/* 字号 */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)]">字号</label>
            <div className="flex gap-1 flex-wrap">
              {['14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'].map((size) => (
                <button
                  key={size}
                  className={`px-2 py-1 rounded text-[10px] ${
                    selectedElement.fontSize === size
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                  }`}
                  onClick={() => handleFontSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* 字重 */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)]">字重</label>
            <div className="flex gap-1">
              {['300', '400', '500', '600', '700', '900'].map((weight) => (
                <button
                  key={weight}
                  className={`px-2 py-1 rounded text-[10px] ${
                    selectedElement.fontWeight === weight
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                  }`}
                  style={{ fontWeight: weight }}
                  onClick={() => handleFontWeightChange(weight)}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>

          {/* 对齐 */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)]">对齐</label>
            <div className="flex gap-1">
              {[
                { value: 'left', icon: '⬅' },
                { value: 'center', icon: '⬌' },
                { value: 'right', icon: '➡' },
              ].map(({ value, icon }) => (
                <button
                  key={value}
                  className={`px-3 py-1.5 rounded text-[11px] ${
                    selectedElement.textAlign === value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                  }`}
                  onClick={() => handleTextAlignChange(value)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 图片替换 */}
      {selectedElement.isImage && (
        <div className="space-y-1.5">
          <label className="text-[11px] text-[var(--color-text-dim)]">替换图片</label>
          <button
            className="w-full py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            onClick={handleImageReplace}
          >
            选择图片文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
          {/* 当前图片预览 */}
          {selectedElement.imageSrc && (
            <div className="mt-2 rounded-lg overflow-hidden border border-[var(--color-border)]">
              <img
                src={selectedElement.imageSrc}
                alt="当前图片"
                className="w-full h-auto max-h-32 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 将 rgb(r,g,b) 或 rgba(r,g,b,a) 转为 #hex */
function rgbToHex(rgb: string): string {
  if (!rgb) return '#000000';
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
