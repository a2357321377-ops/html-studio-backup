/* html-ppt :: fx-runtime.js
 * Canvas FX autoloader + lifecycle manager.
 * - Loads fx-bundle.js (single file containing all FX modules)
 * - Initializes [data-fx] elements when their slide becomes active
 * - Calls handle.stop() when the slide leaves
 *
 * Previous version loaded 21 individual FX files serially (s.async=false),
 * causing slow iframe rendering. Now uses a single bundle for 1 HTTP request.
 *
 * In embedded srcDoc iframe (detected via about: protocol), FX loading
 * is deferred with a small delay to prioritize content rendering.
 */
(function(){
  'use strict';

  // Check if we're in an embedded srcDoc iframe — delay FX loading there
  var isEmbedded = false;
  try {
    isEmbedded = window.parent !== window && (location.href.indexOf('about:') === 0 || location.protocol === 'about:');
  } catch(e) {}

  // Resolve base path of this script so it works from any page location.
  const myScript = document.currentScript || (function(){
    const all = document.getElementsByTagName('script');
    for (const s of all){ if (s.src && s.src.indexOf('fx-runtime.js')>-1) return s; }
    return null;
  })();
  const base = myScript ? myScript.src.replace(/fx-runtime\.js.*$/, '') : '/html-ppt/assets/animations/';

  // In embedded iframe: delay FX bundle loading so content renders first
  var loadDelay = isEmbedded ? 500 : 0;

  var ready = new Promise((resolve) => {
    setTimeout(() => {
      var s = document.createElement('script');
      s.src = base + 'fx-bundle.js';
      s.onload = () => resolve();
      s.onerror = () => { console.warn('[hpx-fx] Failed to load fx-bundle.js'); resolve(); };
      document.head.appendChild(s);
    }, loadDelay);
  });

  window.__hpxActive = window.__hpxActive || new Map();

  function initFxIn(root){
    if (!window.HPX) return;
    const els = root.querySelectorAll('[data-fx]');
    els.forEach((el) => {
      if (window.__hpxActive.has(el)) return;
      const name = el.getAttribute('data-fx');
      const fn = window.HPX[name];
      if (typeof fn !== 'function') return;
      try {
        const handle = fn(el, {}) || { stop(){} };
        window.__hpxActive.set(el, handle);
      } catch(e){ console.warn('[hpx-fx]', name, e); }
    });
  }

  function stopFxIn(root){
    const els = root.querySelectorAll('[data-fx]');
    els.forEach((el) => {
      const h = window.__hpxActive.get(el);
      if (h && typeof h.stop === 'function'){
        try{ h.stop(); }catch(e){}
      }
      window.__hpxActive.delete(el);
    });
  }

  function reinitFxIn(root){
    stopFxIn(root);
    initFxIn(root);
  }
  window.__hpxReinit = reinitFxIn;

  function boot(){
    ready.then(() => {
      const active = document.querySelector('.slide.is-active') || document.querySelector('.slide');
      if (active) initFxIn(active);

      // Watch all slides for class changes
      const slides = document.querySelectorAll('.slide');
      slides.forEach((sl) => {
        const mo = new MutationObserver((muts) => {
          for (const m of muts){
            if (m.attributeName === 'class'){
              if (sl.classList.contains('is-active')) initFxIn(sl);
              else stopFxIn(sl);
            }
          }
        });
        mo.observe(sl, { attributes: true, attributeFilter: ['class'] });
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();