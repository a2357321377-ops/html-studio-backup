import type { Slide, Deck } from '@html-studio/shared';
import { loadTemplate } from './template-loader';
import { injectSlotValues } from './slot-resolver';

interface RenderOptions {
  includeRuntime?: boolean;
  includeAnimations?: boolean;
  includeFx?: boolean;
  includePresenter?: boolean;
  includeSourceData?: boolean;
}

const ASSETS_BASE = '/html-ppt/assets';

export async function renderDeck(deck: Deck, options: RenderOptions = {}): Promise<string> {
  const {
    includeRuntime = true,
    includeAnimations = true,
    includeFx = true,
    includePresenter = true,
    includeSourceData = false,
  } = options;

  const themeNames = new Set<string>();
  themeNames.add(deck.globalTheme);
  deck.slides.forEach(s => themeNames.add(s.theme));
  const themeListStr = Array.from(themeNames).join(',');

  const slideHtmls: string[] = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const html = await renderSlide(slide, i === 0, slide.theme || deck.globalTheme);
    slideHtmls.push(html);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${deck.globalTheme}">
<head>
<meta charset="utf-8">
<title>${deck.title}</title>
<link rel="stylesheet" href="${ASSETS_BASE}/fonts.css">
<link rel="stylesheet" href="${ASSETS_BASE}/base.css">
<link rel="stylesheet" id="theme-link" href="${ASSETS_BASE}/themes/${deck.globalTheme}.css">
${includeAnimations ? `<link rel="stylesheet" href="${ASSETS_BASE}/animations/animations.css">` : ''}
<style>
.slide { display: none; }
.slide.is-active { display: flex; }
</style>
</head>
<body>
<div class="deck" data-themes="${themeListStr}" data-theme-base="${ASSETS_BASE}/themes/">
${slideHtmls.join('\n')}
</div>
${includeRuntime ? `<script src="${ASSETS_BASE}/runtime.js"></script>` : ''}
${includeFx ? `<script src="${ASSETS_BASE}/animations/fx-runtime.js"></script>` : ''}
${includeSourceData ? `<script id="deck-source-data" type="application/json">${JSON.stringify(deck)}</script>` : ''}
</body>
</html>`;
}

async function renderSlide(slide: Slide, isFirst: boolean, theme: string): Promise<string> {
  try {
    const templateHtml = await loadTemplate(slide.layout);
    const injectedHtml = injectSlotValues(templateHtml, slide.slots);

    const parser = new DOMParser();
    const doc = parser.parseFromString(injectedHtml, 'text/html');
    const section = doc.querySelector('section.slide');

    if (section) {
      const titleSlot = slide.slots.find(s => s.id === 'title');
      if (titleSlot) section.setAttribute('data-title', titleSlot.value);

      if (isFirst) section.classList.add('is-active');
      else section.classList.remove('is-active');

      if (slide.animation) section.setAttribute('data-anim', slide.animation);

      if (slide.fx) {
        const fxDiv = doc.createElement('div');
        fxDiv.setAttribute('data-fx', slide.fx);
        fxDiv.style.cssText = 'width:100%;height:360px;position:absolute;inset:0;pointer-events:none';
        (section as HTMLElement).style.position = 'relative';
        section.insertBefore(fxDiv, section.firstChild);
      }

      if (slide.notes) {
        let notesEl = section.querySelector('.notes');
        if (!notesEl) {
          notesEl = doc.createElement('div');
          notesEl.classList.add('notes');
          section.appendChild(notesEl);
        }
        notesEl.innerHTML = slide.notes;
      }

      return section.outerHTML;
    }

    const title = slide.slots.find(s => s.id === 'title')?.value || '';
    return `<section class="slide${isFirst ? ' is-active' : ''}" data-title="${title}">${injectedHtml}</section>`;
  } catch {
    const title = slide.slots.find(s => s.id === 'title')?.value || '';
    const subtitle = slide.slots.find(s => s.id === 'subtitle')?.value || '';
    return `<section class="slide${isFirst ? ' is-active' : ''}" data-title="${title}">
  <h1 class="h1">${title}</h1>
  <p class="lede">${subtitle}</p>
</section>`;
  }
}

/** 渲染单个 slide 为独立 HTML（用于 iframe 预览） */
export async function renderSlidePreview(slide: Slide, theme: string): Promise<string> {
  const templateHtml = await loadTemplate(slide.layout);
  const injectedHtml = injectSlotValues(templateHtml, slide.slots);

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${ASSETS_BASE}/fonts.css">
<link rel="stylesheet" href="${ASSETS_BASE}/base.css">
<link rel="stylesheet" id="theme-link" href="${ASSETS_BASE}/themes/${theme}.css">
<link rel="stylesheet" href="${ASSETS_BASE}/animations/animations.css">
</head>
<body class="single">
${injectedHtml}
<script src="${ASSETS_BASE}/runtime.js"></script>
</body>
</html>`;
}