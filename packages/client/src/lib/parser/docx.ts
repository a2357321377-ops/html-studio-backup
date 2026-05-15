import type { Slide } from '@html-studio/shared';
import { getLayoutMeta } from '@html-studio/shared';
import mammoth from 'mammoth';

let nextId = 0;
function nanoid() {
  return `s${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

interface DocxSection {
  title: string;
  content: string;
  items: string[];
}

function htmlToSections(html: string): DocxSection[] {
  const sections: DocxSection[] = [];

  // Parse the HTML to extract text content
  // mammoth returns HTML, so we can parse it
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Get all paragraphs and headings
  const elements = doc.body.querySelectorAll('h1, h2, h3, h4, p, ul, ol');
  let currentSection: DocxSection | null = null;
  const allSections: DocxSection[] = [];

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim() || '';

    if (!text) return;

    if (tag === 'h1' || tag === 'h2') {
      // New section
      if (currentSection) {
        allSections.push(currentSection);
      }
      currentSection = { title: text, content: '', items: [] };
    } else if (tag === 'h3' || tag === 'h4') {
      // Sub-heading becomes an item
      if (currentSection) {
        currentSection.items.push(text);
      } else {
        currentSection = { title: text, content: '', items: [] };
      }
    } else if (tag === 'ul' || tag === 'ol') {
      // List items
      const listItems = el.querySelectorAll('li');
      listItems.forEach((li) => {
        const liText = li.textContent?.trim() || '';
        if (liText) {
          if (currentSection) {
            currentSection.items.push(liText);
          }
        }
      });
    } else if (tag === 'p') {
      if (currentSection) {
        if (currentSection.content) {
          currentSection.content += ' ' + text;
        } else {
          currentSection.content = text;
        }
        // If paragraph is short enough, also add as item
        if (text.length < 100 && text.length > 5) {
          currentSection.items.push(text);
        }
      } else {
        // No section yet, create one with this as title
        currentSection = { title: text.slice(0, 60), content: text, items: [] };
      }
    }
  });

  if (currentSection) {
    allSections.push(currentSection);
  }

  // If no sections found, try to split by paragraphs
  if (allSections.length === 0) {
    const paragraphs = doc.body.querySelectorAll('p');
    const texts: string[] = [];
    paragraphs.forEach(p => {
      const t = p.textContent?.trim();
      if (t && t.length > 3) texts.push(t);
    });

    if (texts.length > 0) {
      allSections.push({
        title: texts[0].slice(0, 60),
        content: texts.slice(1).join(' '),
        items: texts.slice(1).filter(t => t.length < 100),
      });
    }
  }

  return allSections;
}

export async function parseDocx(arrayBuffer: ArrayBuffer): Promise<Slide[]> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const sections = htmlToSections(result.value);

    if (sections.length === 0) {
      const meta = getLayoutMeta('cover');
      return [{
        id: nanoid(), layout: 'cover', theme: 'tokyo-night', animation: 'fade-up', fx: null,
        slots: meta.slotDefs.map(def => ({
          id: def.id, type: def.type,
          value: def.id === 'title' ? 'Word 文档（无文本内容）' : def.default,
          label: def.label,
        })),
        notes: '', order: 0,
      }];
    }

    return sections.map((section, index) => {
      const isCover = index === 0;
      const layout = isCover ? 'cover' as const : 'bullets' as const;
      const meta = getLayoutMeta(layout);

      const slotValues: Record<string, string> = isCover
        ? {
            kicker: '',
            title: section.title || `第 ${index + 1} 页`,
            subtitle: section.content.slice(0, 120),
            pills: '[]',
          }
        : {
            kicker: '',
            title: section.title || `第 ${index + 1} 页`,
            lede: section.content.slice(0, 80),
            items: JSON.stringify(section.items.slice(0, 6)),
          };

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
  } catch (err) {
    const meta = getLayoutMeta('cover');
    return [{
      id: nanoid(), layout: 'cover', theme: 'tokyo-night', animation: 'fade-up', fx: null,
      slots: meta.slotDefs.map(def => ({
        id: def.id, type: def.type,
        value: def.id === 'title' ? 'Word 文档（解析失败）' : def.default,
        label: def.label,
      })),
      notes: '', order: 0,
    }];
  }
}