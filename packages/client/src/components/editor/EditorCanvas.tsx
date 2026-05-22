import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore, cleanEditorArtifacts } from '../../hooks/useEditorStore';
import { useAIChat } from '../../hooks/useAIChat';

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

  // 【关键修复】iframe srcDoc 使用独立状态，与 deckHtml 解耦
  // 问题：之前 srcDoc={deckHtml} 直接绑定 store，syncFromIframe 更新 deckHtml 时
  // React 会将新 srcDoc 值设置到 iframe DOM 属性上，导致 iframe 重新加载
  // 解决：srcDoc 只在外部更新 deckHtml 时才更新，syncFromIframe 不触发 srcDoc 变化
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSrcDoc, setIframeSrcDoc] = useState(deckHtml);
  const lastWrittenHtmlRef = useRef<string>(deckHtml || '');

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
        script.setAttribute('data-editor-runtime', '1');
        script.textContent = `
          (function() {
            var currentSelected = null;
            var highlightEl = null;

            function getHighlight(doc) {
              if (!highlightEl) {
                highlightEl = doc.createElement('div');
                highlightEl.setAttribute('data-editor-highlight', '1');
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
              // 忽略高亮框自身
              if (el === highlightEl) return;

              // 检查是否点击了 slide 区域
              var clickedSlide = el.closest ? el.closest('.slide') : null;

              // 找到有意义的元素（非纯容器 div）
              var target = el;
              while (target && target.parentElement && !target.parentElement.classList.contains('slide') && target.tagName !== 'IMG' && target.tagName !== 'H1' && target.tagName !== 'H2' && target.tagName !== 'H3' && target.tagName !== 'P' && target.tagName !== 'SPAN' && target.tagName !== 'LI' && target.tagName !== 'A') {
                target = target.parentElement;
              }

              // 如果没找到有意义的元素，或点击的是 slide 本身/body → 取消选中
              var isMeaningful = target && target !== document.body && target !== document.documentElement && !target.classList.contains('slide');

              if (!isMeaningful) {
                if (currentSelected) {
                  if (currentSelected.contentEditable === 'true') {
                    currentSelected.contentEditable = 'false';
                    currentSelected.style.caretColor = '';
                    window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
                  }
                  currentSelected = null;
                }
                updateHighlight(null);
                window.parent.postMessage({ type: 'editor-element-deselected' }, '*');
                return;
              }

              e.preventDefault();
              e.stopPropagation();

              // 取消之前的选中
              if (currentSelected && currentSelected.contentEditable === 'true') {
                currentSelected.contentEditable = 'false';
                currentSelected.style.caretColor = '';
                window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
              }
              currentSelected = target;
              updateHighlight(target);
              // 文字元素单击即进入编辑模式，显示光标
              if (target.tagName !== 'IMG') {
                target.contentEditable = 'true';
                target.style.caretColor = '#000';
                target.focus();
              }
              window.parent.postMessage({ type: 'editor-element-selected', info: getElementInfo(target) }, '*');
            }, true);

            // 双击编辑文字
            document.addEventListener('dblclick', function(e) {
              var el = e.target;
              // 点击 slide 空白或高亮框 → 不触发编辑，阻止默认选中文字行为
              if (el.classList.contains('slide') || el === highlightEl) {
                e.preventDefault();
                return;
              }
              while (el && el.parentElement && !el.parentElement.classList.contains('slide') && el.tagName !== 'IMG' && el.tagName !== 'H1' && el.tagName !== 'H2' && el.tagName !== 'H3' && el.tagName !== 'P' && el.tagName !== 'SPAN' && el.tagName !== 'LI' && el.tagName !== 'A') {
                el = el.parentElement;
              }
              if (el.tagName === 'IMG') return;
              if (el === document.body || el === document.documentElement || el.classList.contains('slide')) return;
              e.preventDefault();
              e.stopPropagation();
              currentSelected = el;
              el.contentEditable = 'true';
              el.style.caretColor = '#000';
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
                // 清除编辑时设置的光标颜色，避免残留到导出 HTML
                currentSelected.style.caretColor = '';
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
                // 翻页时清除选中状态，避免选择框遗留到下一页
                if (currentSelected) {
                  if (currentSelected.contentEditable === 'true') {
                    currentSelected.contentEditable = 'false';
                    currentSelected.style.caretColor = '';
                    window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
                  }
                  currentSelected = null;
                }
                updateHighlight(null);
                window.parent.postMessage({ type: 'editor-element-deselected' }, '*');
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
        // 选中时同步 HTML（高亮框出现在 DOM 中，需清理后同步到 store/localStorage）
        syncFromIframe();
        // 立即更新 ref，防止 useEffect 检测到 deckHtml 变化后重新加载 iframe
        lastWrittenHtmlRef.current = useEditorStore.getState().deckHtml;
      }
      if (e.data?.type === 'editor-element-deselected') {
        setSelectedElement(null);
        // 取消选中时同步 HTML（高亮框被隐藏但 DOM 仍在，需清理后同步到 store/localStorage）
        syncFromIframe();
        lastWrittenHtmlRef.current = useEditorStore.getState().deckHtml;
      }
      if (e.data?.type === 'editor-content-changed') {
        // 内容变化时同步 HTML 到 store/localStorage
        syncFromIframe();
        lastWrittenHtmlRef.current = useEditorStore.getState().deckHtml;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSelectedElement, syncFromIframe]);

  // 【关键修复】只在 deckHtml 外部更新时重写 iframe
  // 通过比较 deckHtml 与 lastWrittenHtmlRef 判断是否是外部更新
  // syncFromIframe 后会更新 lastWrittenHtmlRef，所以不会触发循环
  useEffect(() => {
    if (!deckHtml) return;
    if (deckHtml !== lastWrittenHtmlRef.current) {
      lastWrittenHtmlRef.current = deckHtml;
      setIframeSrcDoc(deckHtml);
      setIframeKey((k) => k + 1);
    }
  }, [deckHtml]);

  // 组件卸载时：同步清理后的 HTML 回 store（不修改 iframe DOM）
  // 确保离开编辑器时 deckHtml 不包含编辑器残留
  useEffect(() => {
    return () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) return;
      const doc = iframe.contentDocument;
      // 直接读取 outerHTML，不修改 iframe DOM
      const rawHtml = doc.documentElement.outerHTML;
      const finalHtml = cleanEditorArtifacts(`<!DOCTYPE html>\n${rawHtml}`);
      useEditorStore.setState({ deckHtml: finalHtml });
      // 同步到 AI store（首页使用 AI store 的 deckHtml）
      useAIChat.getState().setDeckHtml(finalHtml);
    };
  }, []);

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
            srcDoc={iframeSrcDoc}
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
