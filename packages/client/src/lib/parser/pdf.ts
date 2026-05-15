import type { Slide } from '@html-studio/shared';
import { getLayoutMeta } from '@html-studio/shared';
import * as pdfjsLib from 'pdfjs-dist';

let nextId = 0;
function nanoid() {
  return `s${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

// Set worker path for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = '/html-ppt/pdf.worker.min.mjs';

interface PdfPage {
  title: string;
  content: string;
  items: string[];
}

async function extractPagesFromPdf(arrayBuffer: ArrayBuffer): Promise<PdfPage[]> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const textItems = textContent.items
      .filter((item: any) => item.str && item.str.trim())
      .map((item: any) => item.str.trim());

    if (textItems.length === 0) continue;

    // Try to detect title vs content
    // First large text item is likely the title
    const title = textItems[0] || '';
    const remainingText = textItems.slice(1);

    // Split remaining text into items (paragraphs or bullet points)
    const items: string[] = [];
    let currentItem = '';
    for (const text of remainingText) {
      if (text.length < 3 && currentItem) {
        items.push(currentItem);
        currentItem = '';
      } else {
        currentItem += (currentItem ? ' ' : '') + text;
      }
    }
    if (currentItem) items.push(currentItem);

    pages.push({
      title,
      content: remainingText.join(' '),
      items: items.filter(s => s.length > 5),
    });
  }

  return pages;
}

export async function parsePdf(arrayBuffer: ArrayBuffer): Promise<Slide[]> {
  try {
    const pages = await extractPagesFromPdf(arrayBuffer);

    if (pages.length === 0) {
      const meta = getLayoutMeta('cover');
      return [{
        id: nanoid(), layout: 'cover', theme: 'tokyo-night', animation: 'fade-up', fx: null,
        slots: meta.slotDefs.map(def => ({
          id: def.id, type: def.type,
          value: def.id === 'title' ? 'PDF 文档（无文本内容）' : def.default,
          label: def.label,
        })),
        notes: '', order: 0,
      }];
    }

    return pages.map((page, index) => {
      const isCover = index === 0;
      const layout = isCover ? 'cover' as const : 'bullets' as const;
      const meta = getLayoutMeta(layout);

      const slotValues: Record<string, string> = isCover
        ? {
            kicker: '',
            title: page.title || `第 ${index + 1} 页`,
            subtitle: page.content.slice(0, 120),
            pills: '[]',
          }
        : {
            kicker: '',
            title: page.title || `第 ${index + 1} 页`,
            lede: page.content.slice(0, 80),
            items: JSON.stringify(page.items.slice(0, 6)),
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
    // If pdfjs fails, fall back to a simple placeholder
    const meta = getLayoutMeta('cover');
    return [{
      id: nanoid(), layout: 'cover', theme: 'tokyo-night', animation: 'fade-up', fx: null,
      slots: meta.slotDefs.map(def => ({
        id: def.id, type: def.type,
        value: def.id === 'title' ? 'PDF 文档（解析失败）' : def.default,
        label: def.label,
      })),
      notes: '', order: 0,
    }];
  }
}