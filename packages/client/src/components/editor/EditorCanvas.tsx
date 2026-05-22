import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useEditorStore, cleanEditorArtifacts } from '../../hooks/useEditorStore';
import { useAIChat } from '../../hooks/useAIChat';

/** 编辑器 runtime 脚本内容，提取为常量以便 doc.write 后重新注入 */
const runtimeScript = `
(function() {
  var currentSelected = null;
  var highlightEl = null;
  var originalContent = null;
  var isDragging = false;
  var isResizing = false;
  var DRAG_THRESHOLD = 3;

  function getHighlight(doc) {
    if (!highlightEl) {
      highlightEl = doc.createElement('div');
      highlightEl.setAttribute('data-editor-highlight', '1');
      highlightEl.style.cssText = 'position:absolute;pointer-events:none;border:2px solid #3b6cff;border-radius:4px;z-index:9999;';
      doc.body.appendChild(highlightEl);

      // 8 个 resize 手柄
      var dirs = ['nw','n','ne','w','e','sw','s','se'];
      var cursors = {nw:'nw-resize',n:'n-resize',ne:'ne-resize',w:'w-resize',e:'e-resize',sw:'sw-resize',s:'s-resize',se:'se-resize'};
      dirs.forEach(function(dir) {
        var h = doc.createElement('div');
        h.setAttribute('data-resize-handle', dir);
        h.style.cssText = 'position:absolute;width:8px;height:8px;background:#3b6cff;border:1px solid #fff;border-radius:2px;pointer-events:auto;z-index:10001;cursor:' + cursors[dir] + ';';
        if (dir.indexOf('n') >= 0) h.style.top = '-5px';
        if (dir.indexOf('s') >= 0) h.style.bottom = '-5px';
        if (dir.indexOf('w') >= 0) h.style.left = '-5px';
        if (dir.indexOf('e') >= 0) h.style.right = '-5px';
        if (dir === 'n' || dir === 's') h.style.left = 'calc(50% - 4px)';
        if (dir === 'w' || dir === 'e') h.style.top = 'calc(50% - 4px)';
        highlightEl.appendChild(h);
      });
    }
    return highlightEl;
  }

  function updateHighlight(el) {
    if (!el) { getHighlight(document).style.display = 'none'; return; }
    var rect = el.getBoundingClientRect();
    var slide = el.closest('.slide');
    if (!slide) return;
    var h = getHighlight(document);
    h.style.display = 'block';
    h.style.left = (rect.left - 2) + 'px';
    h.style.top = (rect.top - 2) + 'px';
    h.style.width = (rect.width + 4) + 'px';
    h.style.height = (rect.height + 4) + 'px';
    // 选中元素时允许高亮框交互（拖拽移动）
    h.style.pointerEvents = 'auto';
    h.style.cursor = 'move';
  }

  function deselectCurrent() {
    if (currentSelected && currentSelected.contentEditable === 'true') {
      currentSelected.contentEditable = 'false';
      currentSelected.style.caretColor = '';
      var changed = originalContent !== null && currentSelected.innerHTML !== originalContent;
      if (changed) {
        window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
      }
      originalContent = null;
    }
    currentSelected = null;
    isDragging = false;
    isResizing = false;
    updateHighlight(null);
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
      imageSrc: el.tagName === 'IMG' ? el.src : '',
      position: el.style.position || cs.position,
      left: el.style.left || '0px',
      top: el.style.top || '0px',
      width: el.style.width || '',
      height: el.style.height || ''
    };
  }

  // 确保 position: relative，用于拖拽移动
  function ensureRelative(el) {
    if (el.style.position !== 'relative' && el.style.position !== 'absolute') {
      el.style.position = 'relative';
      el.style.left = '0px';
      el.style.top = '0px';
    }
  }

  // --- 拖拽移动 ---
  function startDragMove(e) {
    if (!currentSelected || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    var el = currentSelected;
    var wasEditable = el.contentEditable === 'true';
    if (wasEditable) {
      el.contentEditable = 'false';
      el.blur();
    }

    ensureRelative(el);
    var startLeft = parseFloat(el.style.left) || 0;
    var startTop = parseFloat(el.style.top) || 0;
    var startX = e.clientX;
    var startY = e.clientY;
    var moved = false;

    document.body.style.userSelect = 'none';

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      moved = true;
      isDragging = true;
      el.style.left = (startLeft + dx) + 'px';
      el.style.top = (startTop + dy) + 'px';
      updateHighlight(el);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      isDragging = false;

      if (wasEditable && el.tagName !== 'IMG') {
        el.contentEditable = 'true';
        el.style.caretColor = '#000';
      }

      if (moved) {
        window.parent.postMessage({ type: 'editor-element-moved', info: getElementInfo(el) }, '*');
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // --- 缩放 ---
  function startResize(e, dir) {
    if (!currentSelected || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    var el = currentSelected;
    var wasEditable = el.contentEditable === 'true';
    if (wasEditable) {
      el.contentEditable = 'false';
      el.blur();
    }

    var isImg = el.tagName === 'IMG';
    var startX = e.clientX;
    var startY = e.clientY;
    var startRect = el.getBoundingClientRect();
    var startWidth = startRect.width;
    var startHeight = startRect.height;
    var startFontSize = parseFloat(window.getComputedStyle(el).fontSize);
    var startLeft = parseFloat(el.style.left) || 0;
    var startTop = parseFloat(el.style.top) || 0;
    isResizing = true;

    document.body.style.userSelect = 'none';

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      var newWidth = startWidth;
      var newHeight = startHeight;

      // 根据方向计算新尺寸
      if (dir.indexOf('e') >= 0) newWidth = startWidth + dx;
      if (dir.indexOf('w') >= 0) newWidth = startWidth - dx;
      if (dir.indexOf('s') >= 0) newHeight = startHeight + dy;
      if (dir.indexOf('n') >= 0) newHeight = startHeight - dy;

      newWidth = Math.max(30, newWidth);
      newHeight = Math.max(20, newHeight);

      if (isImg) {
        // 图片：设置宽高
        el.style.width = newWidth + 'px';
        el.style.height = newHeight + 'px';
      } else {
        // 文本元素缩放
        if (dir.length === 2) {
          // 角落缩放：用对角线距离比例缩放字号 + 宽度
          var startDiag = Math.sqrt(startWidth * startWidth + startHeight * startHeight);
          var newDiag = Math.sqrt(newWidth * newWidth + newHeight * newHeight);
          var diagScale = newDiag / startDiag;
          var newFontSize = Math.max(8, Math.round(startFontSize * diagScale));
          el.style.fontSize = newFontSize + 'px';
          el.style.width = Math.max(30, Math.round(startWidth * diagScale)) + 'px';
        } else {
          // 边缘缩放（n/s/e/w）：只改宽度
          if (dir.indexOf('e') >= 0 || dir.indexOf('w') >= 0) {
            el.style.width = newWidth + 'px';
          }
          // n/s 边缘对文本：按纵向比例缩放字号
          if (dir === 'n' || dir === 's') {
            var vScale = newHeight / startHeight;
            var newFontSize = Math.max(8, Math.round(startFontSize * vScale));
            el.style.fontSize = newFontSize + 'px';
          }
        }
      }

      // 左/上方向缩放时调整位置
      if (dir.indexOf('w') >= 0) {
        ensureRelative(el);
        el.style.left = (startLeft + (startWidth - newWidth)) + 'px';
      }
      if (dir.indexOf('n') >= 0) {
        ensureRelative(el);
        el.style.top = (startTop + (startHeight - newHeight)) + 'px';
      }

      updateHighlight(el);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      isResizing = false;

      if (wasEditable && el.tagName !== 'IMG') {
        el.contentEditable = 'true';
        el.style.caretColor = '#000';
      }

      window.parent.postMessage({ type: 'editor-element-resized', info: getElementInfo(el) }, '*');
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // --- 事件监听 ---

  document.addEventListener('keydown', function(e) {
    var active = document.activeElement;
    if (active && active.contentEditable === 'true') {
      e.stopPropagation();
    }
  }, true);

  // 高亮框 mousedown：拖拽移动
  document.addEventListener('mousedown', function(e) {
    if (!highlightEl || !currentSelected) return;
    if (e.target === highlightEl) {
      startDragMove(e);
      return;
    }
    // resize 手柄 mousedown
    if (e.target.hasAttribute && e.target.hasAttribute('data-resize-handle')) {
      var dir = e.target.getAttribute('data-resize-handle');
      startResize(e, dir);
      return;
    }
  }, true);

  document.addEventListener('click', function(e) {
    // 拖拽/缩放进行中不处理点击
    if (isDragging || isResizing) return;
    var el = e.target;
    // 忽略高亮框和 resize 手柄的点击
    if (el === highlightEl) return;
    if (el.hasAttribute && el.hasAttribute('data-resize-handle')) return;

    var clickedSlide = el.closest ? el.closest('.slide') : null;
    var target = el;
    while (target && target.parentElement && !target.parentElement.classList.contains('slide') && target.tagName !== 'IMG' && target.tagName !== 'H1' && target.tagName !== 'H2' && target.tagName !== 'H3' && target.tagName !== 'P' && target.tagName !== 'SPAN' && target.tagName !== 'LI' && target.tagName !== 'A') {
      target = target.parentElement;
    }
    var isMeaningful = target && target !== document.body && target !== document.documentElement && !target.classList.contains('slide');
    if (!isMeaningful) {
      deselectCurrent();
      window.parent.postMessage({ type: 'editor-element-deselected' }, '*');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    deselectCurrent();
    currentSelected = target;
    updateHighlight(target);
    if (target.tagName !== 'IMG') {
      originalContent = target.innerHTML;
      target.contentEditable = 'true';
      target.style.caretColor = '#000';
      target.focus();
    }
    window.parent.postMessage({ type: 'editor-element-selected', info: getElementInfo(target) }, '*');
  }, true);

  document.addEventListener('dblclick', function(e) {
    if (isDragging || isResizing) return;
    var el = e.target;
    if (el.classList.contains('slide') || el === highlightEl) {
      e.preventDefault();
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-resize-handle')) return;
    while (el && el.parentElement && !el.parentElement.classList.contains('slide') && el.tagName !== 'IMG' && el.tagName !== 'H1' && el.tagName !== 'H2' && el.tagName !== 'H3' && el.tagName !== 'P' && el.tagName !== 'SPAN' && el.tagName !== 'LI' && el.tagName !== 'A') {
      el = el.parentElement;
    }
    if (el.tagName === 'IMG') return;
    if (el === document.body || el === document.documentElement || el.classList.contains('slide')) return;
    e.preventDefault();
    e.stopPropagation();
    deselectCurrent();
    currentSelected = el;
    originalContent = el.innerHTML;
    el.contentEditable = 'true';
    el.style.caretColor = '#000';
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }, true);

  document.addEventListener('focusout', function() {
    if (isDragging || isResizing) return;
    if (currentSelected && currentSelected.contentEditable === 'true') {
      currentSelected.contentEditable = 'false';
      currentSelected.style.caretColor = '';
      var changed = originalContent !== null && currentSelected.innerHTML !== originalContent;
      if (changed) {
        window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
      }
      originalContent = null;
    }
  }, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'editor-goto') {
      var idx = e.data.idx;
      var slides = document.querySelectorAll('.slide');
      slides.forEach(function(s, i) {
        s.classList.toggle('is-active', i === idx);
        s.classList.toggle('is-prev', i < idx);
      });
      deselectCurrent();
      window.parent.postMessage({ type: 'editor-element-deselected' }, '*');
    }
    if (e.data && e.data.type === 'editor-style-update') {
      var path = e.data.cssPath;
      var props = e.data.props;
      try {
        var activeSlide = document.querySelector('.slide.is-active');
        var target = activeSlide ? activeSlide.querySelector(path) : document.querySelector(path);
        if (target) {
          Object.keys(props).forEach(function(k) { target.style[k] = props[k]; });
          updateHighlight(target);
          window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(target) }, '*');
        }
      } catch(err) {}
    }
    if (e.data && e.data.type === 'editor-position-update') {
      var path = e.data.cssPath;
      try {
        var activeSlide = document.querySelector('.slide.is-active');
        var target = activeSlide ? activeSlide.querySelector(path) : document.querySelector(path);
        if (target) {
          target.style.position = 'relative';
          target.style.left = e.data.left;
          target.style.top = e.data.top;
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
      var oldCanvas = document.querySelector('canvas.fx-canvas');
      if (oldCanvas) oldCanvas.remove();
      var oldScript = document.querySelector('script[data-fx]');
      if (oldScript) oldScript.remove();
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

/**
 * 编辑器中间区域：iframe 预览 + 编辑 runtime
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

  // 注册 iframe ref 到 store
  useEffect(() => {
    if (iframeRef.current) {
      setIframeRef(iframeRef.current);
    }
  }, [setIframeRef, iframeKey]);

  // 注入 runtime 到 iframe
  const injectRuntime = useCallback((doc: Document) => {
    const slides = doc.querySelectorAll('.slide');
    setTotalSlides(slides.length);
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === currentSlideIndex);
      s.classList.toggle('is-prev', i < currentSlideIndex);
    });
    const script = doc.createElement('script');
    script.setAttribute('data-editor-runtime', '1');
    script.textContent = runtimeScript;
    doc.body.appendChild(script);
  }, [currentSlideIndex, setTotalSlides]);

  // iframe 加载后：注入编辑 runtime + 设置当前页
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        injectRuntime(doc);
      } catch {
        // cross-origin
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [injectRuntime, iframeKey]);

  // 监听 iframe postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'editor-element-selected') {
        setSelectedElement(e.data.info);
      }
      if (e.data?.type === 'editor-element-deselected') {
        setSelectedElement(null);
      }
      if (e.data?.type === 'editor-content-changed') {
        syncFromIframe();
        lastWrittenHtmlRef.current = useEditorStore.getState().deckHtml;
      }
      if (e.data?.type === 'editor-element-moved' || e.data?.type === 'editor-element-resized') {
        setSelectedElement(e.data.info);
        syncFromIframe();
        lastWrittenHtmlRef.current = useEditorStore.getState().deckHtml;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSelectedElement, syncFromIframe]);

  // deckHtml 变化时更新 iframe
  // 用 useLayoutEffect 在浏览器绘制前同步执行，避免闪烁
  useLayoutEffect(() => {
    if (!deckHtml) return;
    if (deckHtml !== lastWrittenHtmlRef.current) {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        try {
          const doc = iframe.contentDocument;
          const parser = new DOMParser();
          const newDoc = parser.parseFromString(deckHtml, 'text/html');
          // 替换 head 内容（样式表等）
          const oldHead = doc.head;
          const newHead = doc.adoptNode(newDoc.head);
          const newHeadChildren = Array.from(newHead.childNodes);
          while (oldHead.firstChild) oldHead.removeChild(oldHead.firstChild);
          newHeadChildren.forEach(node => oldHead.appendChild(node));
          // 替换 body 内容
          const oldBody = doc.body;
          const newBody = doc.adoptNode(newDoc.body);
          const newBodyChildren = Array.from(newBody.childNodes);
          while (oldBody.firstChild) oldBody.removeChild(oldBody.firstChild);
          newBodyChildren.forEach(node => oldBody.appendChild(node));
          // 复制 body 属性
          oldBody.className = newBody.className;
          Array.from(newBody.attributes).forEach(attr => {
            if (attr.name !== 'class') oldBody.setAttribute(attr.name, attr.value);
          });
          lastWrittenHtmlRef.current = deckHtml;
          injectRuntime(doc);
          return;
        } catch {
          // fallback to full reload
        }
      }
      lastWrittenHtmlRef.current = deckHtml;
      setIframeSrcDoc(deckHtml);
      setIframeKey((k) => k + 1);
    }
  }, [deckHtml, injectRuntime]);

  // 组件卸载时：同步清理后的 HTML 回 store
  useEffect(() => {
    return () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) return;
      const doc = iframe.contentDocument;
      const rawHtml = doc.documentElement.outerHTML;
      const finalHtml = cleanEditorArtifacts(`<!DOCTYPE html>\n${rawHtml}`);
      useEditorStore.setState({ deckHtml: finalHtml });
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
