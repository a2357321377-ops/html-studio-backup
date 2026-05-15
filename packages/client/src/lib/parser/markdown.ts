import type { Slide } from '@html-studio/shared';
import { getLayoutMeta } from '@html-studio/shared';

let nextId = 0;
function nanoid() {
  return `s${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

interface MarkdownSection {
  level: number;
  title: string;
  content: string;
}

function splitMarkdown(text: string): MarkdownSection[] {
  const lines = text.split('\n');
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);

    if (h1Match) {
      current = { level: 1, title: h1Match[1], content: '' };
      sections.push(current);
    } else if (h2Match) {
      current = { level: 2, title: h2Match[1], content: '' };
      sections.push(current);
    } else if (h3Match) {
      current = { level: 3, title: h3Match[1], content: '' };
      sections.push(current);
    } else if (current) {
      current.content += line + '\n';
    }
  }

  return sections;
}

function contentToItems(content: string): string[] {
  const items: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      items.push(trimmed.slice(2));
    } else if (trimmed.match(/^\d+\.\s/)) {
      items.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed.length > 0) {
      items.push(trimmed);
    }
  }
  return items;
}

export function parseMarkdown(text: string): Slide[] {
  const sections = splitMarkdown(text);
  if (sections.length === 0) {
    // No headings found — treat entire content as one cover slide
    const content = text.trim();
    return [{
      id: nanoid(),
      layout: 'cover',
      theme: 'tokyo-night',
      animation: 'fade-up',
      fx: null,
      slots: [
        { id: 'kicker', type: 'text', value: '', label: '标签' },
        { id: 'title', type: 'text', value: content.split('\n')[0] || '未命名', label: '标题' },
        { id: 'subtitle', type: 'text', value: content.split('\n').slice(1).join(' ').slice(0, 100), label: '副标题' },
        { id: 'pills', type: 'list', value: '[]', label: '标签列表' },
      ],
      notes: '',
      order: 0,
    }];
  }

  return sections.map((section, index) => {
    const isCover = index === 0 && section.level === 1;
    const items = contentToItems(section.content);
    const layout = isCover ? 'cover' as const : 'bullets' as const;
    const meta = getLayoutMeta(layout);

    const slotValues: Record<string, string> = isCover
      ? { kicker: '', title: section.title, subtitle: section.content.trim().slice(0, 100), pills: '[]' }
      : { kicker: '', title: section.title, lede: '', items: JSON.stringify(items) };

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