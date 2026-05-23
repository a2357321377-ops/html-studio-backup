const templateCache = new Map<string, string>();

const fullDeckCache = new Map<string, { indexHtml: string; styleCss: string }>();

export async function loadTemplate(layout: string): Promise<string> {
  if (templateCache.has(layout)) return templateCache.get(layout)!;

  const url = `/html-ppt/assets/templates/single-page/${layout}.html`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load template: ${layout}`);
  const html = await response.text();
  templateCache.set(layout, html);
  return html;
}

export function clearTemplateCache() {
  templateCache.clear();
}

/** 加载 full-deck 模板（index.html + style.css），并行 fetch 并缓存 */
export async function loadFullDeckTemplate(templateId: string): Promise<{
  indexHtml: string;
  styleCss: string;
}> {
  if (fullDeckCache.has(templateId)) {
    return fullDeckCache.get(templateId)!;
  }

  const baseUrl = `/html-ppt/assets/templates/full-decks/${templateId}`;

  const [indexRes, styleRes] = await Promise.all([
    fetch(`${baseUrl}/index.html`),
    fetch(`${baseUrl}/style.css`),
  ]);

  if (!indexRes.ok) throw new Error(`Failed to load full-deck template: ${templateId}/index.html`);
  if (!styleRes.ok) throw new Error(`Failed to load full-deck template style: ${templateId}/style.css`);

  const [indexHtml, styleCss] = await Promise.all([
    indexRes.text(),
    styleRes.text(),
  ]);

  const result = { indexHtml, styleCss };
  fullDeckCache.set(templateId, result);
  return result;
}

export function clearFullDeckCache() {
  fullDeckCache.clear();
}