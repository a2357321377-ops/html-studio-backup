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
  var isEditing = false;
  var DRAG_THRESHOLD = 3;

  function getHighlight(doc) {
    if (!highlightEl) {
      highlightEl = doc.createElement('div');
      highlightEl.setAttribute('data-editor-highlight', '1');
      highlightEl.style.cssText = 'position:absolute;pointer-events:auto;border:2px solid #3b6cff;border-radius:4px;z-index:9999;display:none;cursor:move;';
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
    // 编辑模式：选择框仍显示但不可拖动（PPT 行为）
    if (isEditing) {
      h.style.pointerEvents = 'none';
      h.style.cursor = 'default';
    } else {
      h.style.pointerEvents = 'auto';
      h.style.cursor = 'move';
    }
  }

  function enterEditing(el) {
    if (isEditing && currentSelected === el) return;
    // 先退出当前编辑
    if (isEditing && currentSelected) {
      exitEditing();
    }
    originalContent = el.innerHTML;
    currentSelected = el;
    el.contentEditable = 'true';
    el.style.cursor = 'text';
    isEditing = true;
    updateHighlight(el);
    // 延迟 focus，确保 contentEditable 已生效
    // 直接 focus + selectNodeContents 可能因浏览器尚未准备好而失败
    requestAnimationFrame(function() {
      if (!isEditing || currentSelected !== el) return;
      el.focus();
    });
  }

  function exitEditing() {
    if (!isEditing || !currentSelected) return;
    currentSelected.contentEditable = 'false';
    currentSelected.style.cursor = '';
    // 如果内容变了，通知父页面
    if (originalContent !== null && currentSelected.innerHTML !== originalContent) {
      window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
    }
    originalContent = null;
    isEditing = false;
    updateHighlight(currentSelected);
  }

  function deselectCurrent() {
    if (isEditing && currentSelected) {
      currentSelected.contentEditable = 'false';
      currentSelected.style.cursor = '';
      var changed = originalContent !== null && currentSelected.innerHTML !== originalContent;
      if (changed) {
        window.parent.postMessage({ type: 'editor-content-changed', info: getElementInfo(currentSelected) }, '*');
      }
      originalContent = null;
      isEditing = false;
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

  function ensureRelative(el) {
    if (el.style.position !== 'relative' && el.style.position !== 'absolute') {
      el.style.position = 'relative';
      el.style.left = '0px';
      el.style.top = '0px';
    }
  }

  // 查找最近的可编辑祖先元素（向上冒泡到 slide 边界）
  function findEditableTarget(el) {
    var target = el;
    while (target && target.parentElement && !target.parentElement.classList.contains('slide') && target.tagName !== 'IMG' && target.tagName !== 'H1' && target.tagName !== 'H2' && target.tagName !== 'H3' && target.tagName !== 'P' && target.tagName !== 'SPAN' && target.tagName !== 'LI' && target.tagName !== 'A') {
      target = target.parentElement;
    }
    var isMeaningful = target && target !== document.body && target !== document.documentElement && !target.classList.contains('slide');
    return isMeaningful ? target : null;
  }

  // --- 拖拽移动 ---
  function startDragMove(e) {
    if (!currentSelected || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    var el = currentSelected;
    if (isEditing) {
      exitEditing();
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
      updateHighlight(el);

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
    if (isEditing) {
      exitEditing();
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

      if (dir.indexOf('e') >= 0) newWidth = startWidth + dx;
      if (dir.indexOf('w') >= 0) newWidth = startWidth - dx;
      if (dir.indexOf('s') >= 0) newHeight = startHeight + dy;
      if (dir.indexOf('n') >= 0) newHeight = startHeight - dy;

      newWidth = Math.max(30, newWidth);
      newHeight = Math.max(20, newHeight);

      if (isImg) {
        el.style.width = newWidth + 'px';
        el.style.height = newHeight + 'px';
      } else {
        if (dir.length === 2) {
          var startDiag = Math.sqrt(startWidth * startWidth + startHeight * startHeight);
          var newDiag = Math.sqrt(newWidth * newWidth + newHeight * newHeight);
          var diagScale = newDiag / startDiag;
          var newFontSize = Math.max(8, Math.round(startFontSize * diagScale));
          el.style.fontSize = newFontSize + 'px';
          el.style.width = Math.max(30, Math.round(startWidth * diagScale)) + 'px';
        } else {
          if (dir.indexOf('e') >= 0 || dir.indexOf('w') >= 0) {
            el.style.width = newWidth + 'px';
          }
          if (dir === 'n' || dir === 's') {
            var vScale = newHeight / startHeight;
            var newFontSize = Math.max(8, Math.round(startFontSize * vScale));
            el.style.fontSize = newFontSize + 'px';
          }
        }
      }

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
      updateHighlight(el);

      window.parent.postMessage({ type: 'editor-element-resized', info: getElementInfo(el) }, '*');
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // --- 事件监听 ---

  // 键盘：编辑模式下拦截导航键，ESC 退出编辑 → 取消选中
  document.addEventListener('keydown', function(e) {
    // 编辑模式：左右键/上下键/空格/PageUp/PageDn/Home/End 用于移动光标，不翻页
    if (isEditing && currentSelected && currentSelected.contentEditable === 'true') {
      var navKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown',' '];
      if (navKeys.indexOf(e.key) >= 0) {
        e.stopPropagation(); // 阻止 runtime.js 翻页
        return; // 让浏览器默认行为（移动光标）正常执行
      }
      // Enter 在编辑模式下也不翻页
      if (e.key === 'Enter') {
        e.stopPropagation();
        return;
      }
    }
    // ESC：退出编辑 → 取消选中
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isEditing) {
        exitEditing();
      } else if (currentSelected) {
        deselectCurrent();
        window.parent.postMessage({ type: 'editor-element-deselected' }, '*');
      }
      return;
    }
    // 选中但未编辑时：左右键也不应该翻页（PPT行为）
    if (currentSelected && !isEditing) {
      var preventNavKeys = ['ArrowLeft','ArrowRight',' '];
      if (preventNavKeys.indexOf(e.key) >= 0) {
        e.stopPropagation();
        return;
      }
    }
  }, true);

  // mousedown：选择框拖拽 / resize 手柄 / 选中元素
  document.addEventListener('mousedown', function(e) {
    if (!currentSelected) return;
    if (isDragging || isResizing) return;

    // 选择框拖拽
    if (e.target === highlightEl) {
      startDragMove(e);
      return;
    }
    // resize 手柄
    if (e.target.hasAttribute && e.target.hasAttribute('data-resize-handle')) {
      var dir = e.target.getAttribute('data-resize-handle');
      startResize(e, dir);
      return;
    }
  }, true);

  // click：选中元素（PPT 行为 — 单击选中，不进入编辑）
  document.addEventListener('click', function(e) {
    if (isDragging || isResizing) return;
    var el = e.target;
    // 忽略选择框和 resize 手柄
    if (el === highlightEl) return;
    if (el.hasAttribute && el.hasAttribute('data-resize-handle')) return;

    // 如果正在编辑，点击编辑区域外退出编辑
    if (isEditing && currentSelected) {
      // 点击当前编辑元素内部：不处理（让 contentEditable 正常工作）
      if (el === currentSelected || currentSelected.contains(el)) return;
      // 点击其他位置：退出编辑
      exitEditing();
    }

    // 查找可编辑目标
    var target = findEditableTarget(el);
    if (!target) {
      // 点击空白区域：取消选中
      deselectCurrent();
      window.parent.postMessage({ type: 'editor-element-deselected' }, '*');
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // 如果点击的是已选中元素，不重复选中
    if (currentSelected === target) return;

    // 选中新元素（单击只选中，不进入编辑）
    deselectCurrent();
    currentSelected = target;
    updateHighlight(target);
    window.parent.postMessage({ type: 'editor-element-selected', info: getElementInfo(target) }, '*');
  }, true);

  // dblclick：进入文字编辑模式
  document.addEventListener('dblclick', function(e) {
    if (isDragging || isResizing) return;
    var el = e.target;
    if (el === highlightEl) return;
    if (el.hasAttribute && el.hasAttribute('data-resize-handle')) return;

    var target = findEditableTarget(el);
    if (!target) return;
    // 图片不支持文字编辑
    if (target.tagName === 'IMG') return;

    e.preventDefault();
    e.stopPropagation();

    // 选中并进入编辑
    if (currentSelected !== target) {
      deselectCurrent();
      currentSelected = target;
    }
    enterEditing(target);
    // 选中全部文字延迟到下一帧，确保 contentEditable + focus 已生效
    requestAnimationFrame(function() {
      if (!isEditing || currentSelected !== target) return;
      var range = document.createRange();
      range.selectNodeContents(target);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    window.parent.postMessage({ type: 'editor-element-selected', info: getElementInfo(target) }, '*');
  }, true);

  // focusout：编辑失焦时退出编辑（用延迟避免双击进入编辑后立即触发）
  document.addEventListener('focusout', function(e) {
    if (isDragging || isResizing) return;
    if (!isEditing || !currentSelected) return;
    // 延迟检查：如果 focusout 后 focus 又回到了当前编辑元素，则不退出
    setTimeout(function() {
      if (!isEditing || !currentSelected) return;
      var active = document.activeElement;
      // 焦点还在当前编辑元素或其子元素内：不退出
      if (active && (active === currentSelected || currentSelected.contains(active))) return;
      exitEditing();
    }, 50);
  }, true);

  // postMessage 通信
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'editor-goto') {
      var idx = e.data.idx;
      // 翻页：清除选中/编辑状态（不触发 content-changed）
      if (isEditing && currentSelected) {
        currentSelected.contentEditable = 'false';
        currentSelected.style.cursor = '';
        originalContent = null;
        isEditing = false;
      }
      currentSelected = null;
      isDragging = false;
      isResizing = false;
      updateHighlight(null);
      var slides = document.querySelectorAll('.slide');
      slides.forEach(function(s, i) {
        s.classList.toggle('is-active', i === idx);
        s.classList.toggle('is-prev', i < idx);
      });
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

  // iframeSrcDoc 始终跟踪 deckHtml
  // 每次 deckHtml 外部变化时，更新 srcDoc + bump key，让 iframe 从头重新加载
  // 这比 DOM 替换更可靠，避免了各种 contentDocument 时序问题
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSrcDoc, setIframeSrcDoc] = useState('');
  const lastExternalHtmlRef = useRef<string>(''); // 记录最后一次外部传入的 deckHtml

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

  // 注入 runtime 到 iframe
  const injectRuntime = useCallback((doc: Document) => {
    // 如果已有 runtime script，说明已经注入过了，跳过
    const existingRuntime = doc.querySelector('script[data-editor-runtime]');
    if (existingRuntime) return;

    const slides = doc.querySelectorAll('.slide');
    setTotalSlides(slides.length);
    const idx = useEditorStore.getState().currentSlideIndex;
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.classList.toggle('is-prev', i < idx);
    });
    const script = doc.createElement('script');
    script.setAttribute('data-editor-runtime', '1');
    script.textContent = runtimeScript;
    doc.body.appendChild(script);
  }, [setTotalSlides]);

  // 当 deckHtml 从外部变化时（初始化、undo/redo、AI 同步），重新加载 iframe
  useLayoutEffect(() => {
    if (!deckHtml) return;
    // 区分外部更新和 syncFromIframe 回写：
    // syncFromIframe 更新 deckHtml 后，lastExternalHtmlRef 已经被同步更新了，
    // 所以不会触发重复加载
    if (deckHtml !== lastExternalHtmlRef.current) {
      lastExternalHtmlRef.current = deckHtml;
      setIframeSrcDoc(deckHtml);
      setIframeKey((k) => k + 1);
    }
  }, [deckHtml]);

  // 注册 iframe ref 到 store + 注入 runtime
  // 使用 useLayoutEffect 确保 load 事件监听在浏览器绘制前注册
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // 注册 ref
    setIframeRef(iframe);

    // 尝试立即注入 runtime（iframe 可能已加载完毕）
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.querySelector('.slide') && !doc.querySelector('script[data-editor-runtime]')) {
        injectRuntime(doc);
      }
    } catch {
      // cross-origin
    }

    // 注册 load 事件，确保 runtime 被注入
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
    return () => {
      iframe.removeEventListener('load', handleLoad);
      setIframeRef(null);
    };
  }, [setIframeRef, injectRuntime, iframeKey]);

  // 监听 iframe postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'editor-element-selected') {
        setSelectedElement(e.data.info);
      }
      if (e.data?.type === 'editor-element-deselected') {
        setSelectedElement(null);
        // 取消选择时也同步 HTML，确保编辑内容反映到缩略图
        syncFromIframe();
        lastExternalHtmlRef.current = useEditorStore.getState().deckHtml;
      }
      if (e.data?.type === 'editor-content-changed') {
        syncFromIframe();
        // syncFromIframe 更新了 deckHtml，需要更新 lastExternalHtmlRef
        // 防止 useLayoutEffect 以为这是外部变化而重新加载 iframe
        lastExternalHtmlRef.current = useEditorStore.getState().deckHtml;
      }
      if (e.data?.type === 'editor-element-moved' || e.data?.type === 'editor-element-resized') {
        setSelectedElement(e.data.info);
        syncFromIframe();
        lastExternalHtmlRef.current = useEditorStore.getState().deckHtml;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSelectedElement, syncFromIframe]);

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
