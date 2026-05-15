import type { Slide } from '@html-studio/shared';
import { getLayoutMeta } from '@html-studio/shared';

let nextId = 0;
function nanoid() {
  return `s${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

export function parseTxt(text: string): Slide[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  if (paragraphs.length === 0) {
    const meta = getLayoutMeta('cover');
    return [{
      id: nanoid(), layout: 'cover', theme: 'tokyo-night', animation: 'fade-up', fx: null,
      slots: meta.slotDefs.map(def => ({ id: def.id, type: def.type, value: def.default, label: def.label })),
      notes: '', order: 0,
    }];
  }

  return paragraphs.map((para, index) => {
    const trimmed = para.trim();
    const isCover = index === 0;
    const layout = isCover ? 'cover' as const : 'bullets' as const;
    const meta = getLayoutMeta(layout);

    const slotValues: Record<string, string> = isCover
      ? { kicker: '', title: trimmed.slice(0, 60), subtitle: trimmed.slice(60, 160), pills: '[]' }
      : { kicker: '', title: trimmed.slice(0, 40), lede: trimmed, items: '[]' };

    return {
      id: nanoid(),
      layout,
      theme: 'tokyo-night',
      animation: 'fade-up',
      fx: null,
      slots: meta.slotDefs.map(def => ({
        id: def.id,
        type: def.type,
        value: slotValues[def.id] ?? def.default,
        label: def.label,
      })),
      notes: '',
      order: index,
    };
  });
}