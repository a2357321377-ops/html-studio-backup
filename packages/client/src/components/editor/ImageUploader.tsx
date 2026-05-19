import { useRef, useCallback } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

/**
 * 图片上传组件
 * - 选择图片文件 → FileReader 转 base64
 * - 插入到当前选中元素位置或当前 slide
 */
export function ImageUploader() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !iframeRef?.contentDocument) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const doc = iframeRef.contentDocument;
      if (!doc) return;

      const slides = doc.querySelectorAll('.slide');
      const slide = slides[currentSlideIndex];
      if (!slide) return;

      // 如果选中了图片元素，替换它
      if (selectedElement?.isImage) {
        const existingImg = doc.querySelector(selectedElement.cssPath) as HTMLImageElement;
        if (existingImg) {
          existingImg.src = base64;
          syncFromIframe();
          return;
        }
      }

      // 否则在当前 slide 末尾插入新图片
      const img = doc.createElement('img');
      img.src = base64;
      img.style.cssText = 'max-width: 80%; max-height: 60%; object-fit: contain; display: block; margin: 0 auto;';
      slide.appendChild(img);
      syncFromIframe();
    };
    reader.readAsDataURL(file);

    // 重置 input 以便再次选择同一文件
    e.target.value = '';
  }, [iframeRef, currentSlideIndex, selectedElement, syncFromIframe]);

  return (
    <>
      <button
        className="w-full py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
        onClick={handleUpload}
      >
        + 添加图片
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
    </>
  );
}