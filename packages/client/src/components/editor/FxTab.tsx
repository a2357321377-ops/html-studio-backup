import { useState, useEffect } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';
import { animations, fxList } from '@html-studio/shared';

/**
 * 动效选择面板
 * - CSS 动画：切换幻灯片切换动画
 * - Canvas FX：背景特效（需要对应 JS 脚本）
 */
export function FxTab() {
  const iframeRef = useEditorStore((s) => s.iframeRef);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [activeSection, setActiveSection] = useState<'animation' | 'fx'>('animation');
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [currentFx, setCurrentFx] = useState<string | null>(null);

  // 检测当前动画
  useEffect(() => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    const animLink = doc.querySelector('link[href*="/animations/"]');
    if (animLink) {
      const href = animLink.getAttribute('href') || '';
      // animations.css 包含所有动画，检测 body 上的 data-animation 属性
      const bodyAnim = doc.body.getAttribute('data-animation');
      if (bodyAnim) setCurrentAnimation(bodyAnim);
    }
    const fxScript = doc.querySelector('script[data-fx]');
    if (fxScript) {
      setCurrentFx(fxScript.getAttribute('data-fx'));
    }
  }, [iframeRef]);

  // 切换 CSS 动画
  const handleSelectAnimation = (animName: string) => {
    const doc = iframeRef?.contentDocument;
    if (!doc) return;
    doc.body.setAttribute('data-animation', animName);
    setCurrentAnimation(animName);
    syncFromIframe();
  };

  // 切换 Canvas FX
  const handleSelectFx = (fxName: string) => {
    iframeRef?.contentWindow?.postMessage({
      type: 'editor-fx-update',
      fxName,
    }, '*');
    setCurrentFx(fxName);
    setTimeout(() => syncFromIframe(), 300);
  };

  // 移除 FX
  const handleRemoveFx = () => {
    iframeRef?.contentWindow?.postMessage({
      type: 'editor-fx-update',
      fxName: null,
    }, '*');
    setCurrentFx(null);
    setTimeout(() => syncFromIframe(), 300);
  };

  // 动画分类
  const animCategories = {
    fade: '淡入',
    scale: '缩放',
    slide: '滑动',
    '3d': '3D',
    effect: '特效',
  };

  return (
    <div className="flex flex-col h-full">
      {/* 切换动画 / FX */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          className={`flex-1 py-2 text-[11px] transition-colors ${
            activeSection === 'animation'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-dim)]'
          }`}
          onClick={() => setActiveSection('animation')}
        >
          切换动画
        </button>
        <button
          className={`flex-1 py-2 text-[11px] transition-colors ${
            activeSection === 'fx'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-dim)]'
          }`}
          onClick={() => setActiveSection('fx')}
        >
          背景动效
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeSection === 'animation' ? (
          <div className="space-y-4">
            {Object.entries(animCategories).map(([catKey, catLabel]) => {
              const catAnims = animations.filter((a) => a.category === catKey);
              if (catAnims.length === 0) return null;
              return (
                <div key={catKey}>
                  <div className="text-[10px] text-[var(--color-text-dim2)] mb-2">{catLabel}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {catAnims.map((anim) => (
                      <button
                        key={anim.name}
                        className={`rounded-lg border p-2 transition-all text-center ${
                          currentAnimation === anim.name
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm'
                            : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)] bg-[var(--color-surface-2)]'
                        }`}
                        onClick={() => handleSelectAnimation(anim.name)}
                      >
                        <div className="text-[9px] text-[var(--color-text-dim)] truncate">
                          {anim.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {/* 无动效选项 */}
            <button
              className={`w-full rounded-lg border-2 p-2 transition-all ${
                currentFx === null
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
              }`}
              onClick={handleRemoveFx}
            >
              <div className="text-[10px] text-[var(--color-text-dim)] text-center">无背景动效</div>
            </button>
            {/* FX 列表 */}
            <div className="grid grid-cols-2 gap-1.5">
              {fxList.map((fx) => (
                <button
                  key={fx.name}
                  className={`rounded-lg border-2 p-2 transition-all ${
                    currentFx === fx.name
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
                  }`}
                  onClick={() => handleSelectFx(fx.name)}
                >
                  <div className="text-[9px] text-[var(--color-text-dim)] text-center truncate">
                    {fx.label}
                  </div>
                  <div className="text-[8px] text-[var(--color-text-dim2)] text-center truncate mt-0.5">
                    {fx.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}