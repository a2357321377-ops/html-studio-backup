const templateCache = new Map<string, string>();

export async function loadTemplate(layout: string): Promise<string> {
  if (templateCache.has(layout)) return templateCache.get(layout)!;

  const url = `/html-ppt/templates/single-page/${layout}.html`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load template: ${layout}`);
  const html = await response.text();
  templateCache.set(layout, html);
  return html;
}

export function clearTemplateCache() {
  templateCache.clear();
}