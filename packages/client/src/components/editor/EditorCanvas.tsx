import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../hooks/useEditorStore';

/**
 * 编辑器中间区域：iframe 预览 + 编辑 runtime
 *
 * 注入的 runtime 脚本负责：
 * 1. 点击元素 → 高亮选中 + postMessage 通知外层
 * 2. 双击文字 → contenteditable 开启
 * 3. 失焦 → 关闭 contenteditable + postMessage 同步修改
 */
export function EditorCanvas() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deckHtml = useEditorStore((s) => s.deckHtml);
  const currentSlideIndex = useEditorStore((s) => s.currentSlideIndex);
  const setIframeRef = useEditorStore((s) => s.setIframeRef);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);
  const setTotalSlides = useEditorStore((s) => s.setTotalSlides);
  const syncFromIframe = useEditorStore((s) => s.syncFromIframe);
  const [scale, setScale] = useState(1);

  // 【修复4】防止 syncFromIframe → deckHtml 更新 → iframe 重新加载
  // 用 ref 追踪上次写入 iframe 的 HTML，只在真正需要时才更新 srcDoc
  const lastWrittenHtmlRef = useRef<string>('');
  // 是否正在从 iframe 同步（syncFromIframe 期间不重写 iframe）
  const syncingRef = useRef(false);
  // 追踪 deckHtml 是否是外部更新（非 syncFromIframe 导致的）
  const [iframeKey, setIframeKey] = useState(0);

  // 计算 iframe 缩放
  const updateScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const maxW = width - 48;
    const maxH = height - 48;
    const scaleX = maxW / 960;
    const scaleY = maxH / 540;
    setScale(Math.min(scaleX, scaleY, 1));
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  // 注册 iframe ref 到 store（iframe key 变化后也需要更新）
  useEffect(() => {
    if (iframeRef.current) {
      setIframeRef(iframeRef.current);
    }
  }, [setIframeRef, iframeKey]);

  // iframe 加载后：注入编辑 runtime + 设置当前页
  // 【修复4】只在 iframeKey 变化时重新注入（即外部更新 deckHtml 时）
  // 不依赖 deckHtml，避免 syncFromIframe 循环触发
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        // 计算幻灯片总数
        const slides = doc.querySelectorAll('.slide');
        setTotalSlides(slides.length);

        // 设置当前页为 active
        slides.forEach((s, i) => {
          s.classList.toggle('is-active', i === currentSlideIndex);
          s.classList.toggle('is-prev', i < currentSlideIndex);
        });

        // 注入编辑 runtime 脚本
        const script = doc.createElement('script');
        script.textContent = `
          (function() {
            var currentSelected = null;
            var highlightEl = null;

            function getHighlight(doc) {
              if (!highlightEl) {
                highlightEl = doc.createElement('div');
                highlightEl.style.cssText = 'position:absolute;pointer-events:none;border:2px solid #3b6cff;border-radius:4px;z-index:9999;transition:all 0.15s ease;';
                doc.body.appendChild(highlightEl);
              }
              return highlightEl;
            }

            function updateHighlight(el) {
              if (!el) { getHighlight(document).style.display = 'none'; return; }
              var rect = el.getBoundingClientRect();
              var slide = el.closest('.slide');
              if (!slide) return;
              var slideRect = slide.getBoundingClientRect();
              var h = getHighlight(document);
              h.style.display = 'block';
              h.style.left = (rect.left - 2) + 'px';
              h.style.top = (rect.top - 2) + 'px';
              h.style.width = (rect.width + 4) + 'px';
              h.style.height = (rect.height + 4) + 'px';
            }

            function getCssPath(el) {
              if (el.id) return '#' + el.id;
              var path = [];
              while (el && el !== document.body) {
                var selector = el.tagName.toLowerCase();
                if (el.className && typeof el.className === 'string') {
                  var cls = el.className.split(/\\s+/).filter(c => c && c !== 'is-active' && c !== 'is-prev' && c !== 'contenteditable').join('.');
                  if (cls) selector += '.' + cls;
                }
                // 添加 nth-child 以确保选择器唯一
                var parent = el.parentElement;
                if (parent) {
                  var siblings = Array.from(parent.children).filter(function(s) { return s.tagName === el.tagName; });
                  if (siblings.length > 1) {
                    var idx = siblings.indexOf(el) + 1;
                    selector += ':nth-of-type(' + idx + ')';
                  }
                }
                path.unshift(selector);
                el = el.parentElement;
              }
              return path.join(' > ');
            }

            function getElementInfo(el) {
              var cs = window.getComputedStyle(el);
              return {
                tagName: el.tagName,
                textContent: (el.textContent || '').substring(0, 200),
                color: cs.color,
                backgroundColor: cs.backgroundColor,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                textAlign: cs.textAlign,
                cssPath: getCssPath(el),
                isImage: el.tagName === 'IMG',
                imageSrc: el.tagName === 'IMG' ? el.src : ''
              };
            }

            // 【修复1】覆盖 runtime.js 的键盘拦截
            // 在捕获阶段拦截键盘事件，当 contentEditable 元素获得焦点时
            // 阻止事件传播到 runtime.js 的 keydown 监听器
            document.addEventListener('keydown', function(e) {
              var active = document.activeElement;
              if (active && active.contentEditable === 'true') {
                e.stopPropagation();
              }
            }, true);

            // 点击选中
            document.addEventListener('click', function(e) {
              var el = e.target;
              // 忽略高亮框自身和 slide 容器
              if (el === highlightEl || el.classList.contains('slide')) return;
              // 找到有意义的元素（非纯容器 div）
              while (el && el.parentElement && !el.parentElement.classList.contains('slide') && el.tagName !== 'IMG' && el.tagName !== 'H1' && el.tagName !== 'H2' && el.tagName !== 'H3' && el.tagName !== 'P' && el.tagName !== 'SPAN' && el.tagName !== 'LI' && el.tagName !== 'A') {
                el = el.parentElement;
              }
              if (el === document.body || el === document.documentElement) return;
              e.preventDefault();
              e.stopPropagation();

              // 取消之前的选中
              if (currentSelected && currentSelected.contentEditable === 'true') {
                currentSelected.contentEditable = 'false';
                // 同步之前编辑的内容
                window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
              }
              currentSelected = el;
              updateHighlight(el);
              window.parent.postMessage({ type: 'editor-element-selected', info: getElementInfo(el) }, '*');
            }, true);

            // 双击编辑文字
            document.addEventListener('dblclick', function(e) {
              var el = e.target;
              while (el && el.parentElement && !el.parentElement.classList.contains('slide') && el.tagName !== 'IMG' && el.tagName !== 'H1' && el.tagName !== 'H2' && el.tagName !== 'H3' && el.tagName !== 'P' && el.tagName !== 'SPAN' && el.tagName !== 'LI' && el.tagName !== 'A') {
                el = el.parentElement;
              }
              if (el.tagName === 'IMG') return;
              if (el === document.body || el === document.documentElement) return;
              e.preventDefault();
              e.stopPropagation();
              currentSelected = el;
              el.contentEditable = 'true';
              el.focus();
              // 选中全部文字
              var range = document.createRange();
              range.selectNodeContents(el);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            }, true);

            // 【修复2】使用 focusout 替代 blur（focusout 会冒泡）
            document.addEventListener('focusout', function() {
              if (currentSelected && currentSelected.contentEditable === 'true') {
                currentSelected.contentEditable = 'false';
                window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
              }
            }, true);

            // 监听外层翻页指令
            window.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'editor-goto') {
                var idx = e.data.idx;
                var slides = document.querySelectorAll('.slide');
                slides.forEach(function(s, i) {
                  s.classList.toggle('is-active', i === idx);
                  s.classList.toggle('is-prev', i < idx);
                });
              }
              if (e.data && e.data.type === 'editor-style-update') {
                var path = e.data.cssPath;
                var props = e.data.props;
                try {
                  // 【修复3】限定在当前 active slide 范围内查找元素
                  var activeSlide = document.querySelector('.slide.is-active');
                  var target = activeSlide ? activeSlide.querySelector(path) : document.querySelector(path);
                  if (target) {
                    Object.keys(props).forEach(function(k) { target.style[k] = props[k]; });
                    updateHighlight(target);
                    window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(target) }, '*');
                  }
                } catch(err) {}
              }
              if (e.data && e.data.type === 'editor-theme-update') {
                var themeName = e.data.themeName;
                var links = document.querySelectorAll('link[rel="stylesheet"]');
                links.forEach(function(link) {
                  var href = link.getAttribute('href') || '';
                  if (href.indexOf('/themes/') !== -1) {
                    link.setAttribute('href', '/html-ppt/assets/themes/' + themeName + '.css');
                  }
                });
              }
              if (e.data && e.data.type === 'editor-fx-update') {
                // 移除旧 canvas + script
                var oldCanvas = document.querySelector('canvas.fx-canvas');
                if (oldCanvas) oldCanvas.remove();
                var oldScript = document.querySelector('script[data-fx]');
                if (oldScript) oldScript.remove();
                // 插入新 canvas + script
                if (e.data.fxName) {
                  var canvas = document.createElement('canvas');
                  canvas.className = 'fx-canvas';
                  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
                  document.body.appendChild(canvas);
                  var fxScript = document.createElement('script');
                  fxScript.setAttribute('data-fx', e.data.fxName);
                  fxScript.src = '/html-ppt/assets/fx/' + e.data.fxName + '.js';
                  document.body.appendChild(fxScript);
                }
                window.parent.postMessage({ type: 'editor-content-changed' }, '*');
              }
              if (e.data && e.data.type === 'editor-animation-update') {
                var links = document.querySelectorAll('link[rel="stylesheet"]');
                links.forEach(function(link) {
                  var href = link.getAttribute('href') || '';
                  if (href.indexOf('/animations/') !== -1) {
                    link.setAttribute('href', '/html-ppt/assets/animations/' + e.data.animName + '.css');
                  }
                });
              }
            });
          })();
        `;
        doc.body.appendChild(script);
      } catch {
        // cross-origin
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [currentSlideIndex, setTotalSlides, iframeKey]);

  // 监听 iframe postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'editor-element-selected') {
        setSelectedElement(e.data.info);
      }
      if (e.data?.type === 'editor-content-changed') {
        // 【修复4】syncFromIframe 更新 deckHtml，但不触发 iframe 重新加载
        syncingRef.current = true;
        syncFromIframe();
        // 同步完成后，更新 lastWrittenHtmlRef 以匹配当前 deckHtml
        requestAnimationFrame(() => {
          syncingRef.current = false;
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSelectedElement, syncFromIframe]);

  // 【修复4】只在 deckHtml 外部更新时重写 iframe srcDoc
  // syncFromIframe 导致的 deckHtml 变化不重写（避免循环刷新丢失修改）
  useEffect(() => {
    if (!deckHtml || syncingRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    // 只在 HTML 确实不同时才更新
    if (deckHtml !== lastWrittenHtmlRef.current) {
      lastWrittenHtmlRef.current = deckHtml;
      // 通过 key 变化强制 iframe 重新加载
      setIframeKey((k) => k + 1);
    }
  }, [deckHtml]);

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center p-5 relative overflow-hidden bg-[#111118]">
      {deckHtml ? (
        <div
          className="relative"
          style={{
            width: 960 * scale,
            height: 540 * scale,
            overflow: 'hidden',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
        >
          <iframe
            key={iframeKey}
            ref={iframeRef}
            srcDoc={deckHtml}
            width="960"
            height="540"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none' }}
            title="幻灯片编辑器"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <div className="text-[var(--color-text-dim2)] text-xs">
          请先在首页生成幻灯片，然后点击"进入编辑器"
        </div>
      )}
    </div>
  );
}
