import type { SlotValue } from '@html-studio/shared';

/**
 * 将 SlotValue 数据注入到模板 HTML 中
 * 使用 DOMParser 解析模板，根据类名和结构定位可编辑区域
 */
export function injectSlotValues(templateHtml: string, slots: SlotValue[]): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(templateHtml, 'text/html');
  const slotMap = new Map(slots.map(s => [s.id, s.value]));

  // 注入 kicker
  const kicker = doc.querySelector('.kicker');
  if (kicker && slotMap.has('kicker')) kicker.textContent = slotMap.get('kicker')!;

  // 注入 title (h1.h1 或 h1.title)
  const h1 = doc.querySelector('h1.h1, h1.title, h1');
  if (h1 && slotMap.has('title')) {
    const gradSpan = h1.querySelector('.gradient-text');
    if (gradSpan) {
      gradSpan.textContent = slotMap.get('title')!;
    } else {
      h1.textContent = slotMap.get('title')!;
    }
  }

  // 注入 h2 title
  const h2 = doc.querySelector('h2.h2, h2.title, h2');
  if (h2 && slotMap.has('title') && !h1) h2.textContent = slotMap.get('title')!;

  // 注入 subtitle / lede
  const lede = doc.querySelector('.lede');
  if (lede && slotMap.has('subtitle')) lede.textContent = slotMap.get('subtitle')!;
  if (lede && slotMap.has('lede') && !slotMap.has('subtitle')) lede.textContent = slotMap.get('lede')!;

  // 注入 pills
  const pillRow = doc.querySelector('.row.wrap, .row');
  if (pillRow && slotMap.has('pills')) {
    try {
      const pills: string[] = JSON.parse(slotMap.get('pills')!);
      if (pills.length > 0) {
        pillRow.innerHTML = pills.map(p => `<span class="pill pill-accent">${p}</span>`).join('');
      }
    } catch { /* ignore parse errors */ }
  }

  // 注入 items (bullets)
  const listEl = doc.querySelector('ul.grid, ul');
  if (listEl && slotMap.has('items')) {
    try {
      const items: string[] = JSON.parse(slotMap.get('items')!);
      if (items.length > 0) {
        listEl.innerHTML = items.map(item => `<li class="card card-accent"><p>${item}</p></li>`).join('');
      }
    } catch { /* ignore */ }
  }

  // 注入 counter values
  const counters = doc.querySelectorAll('.counter');
  const counterSlotIds = ['counterValue', 'kpi1Value', 'kpi2Value', 'kpi3Value', 'kpi4Value'];
  counters.forEach((counter, i) => {
    const slotId = counterSlotIds[i];
    if (slotId && slotMap.has(slotId)) {
      counter.setAttribute('data-to', slotMap.get(slotId)!);
      counter.textContent = '0';
    }
  });

  // 注入 KPI labels
  const eyebrows = doc.querySelectorAll('.eyebrow');
  const kpiLabelIds = ['kpi1Label', 'kpi2Label', 'kpi3Label', 'kpi4Label'];
  eyebrows.forEach((el, i) => {
    const slotId = kpiLabelIds[i];
    if (slotId && slotMap.has(slotId)) el.textContent = slotMap.get(slotId)!;
  });

  // 注入 KPI deltas
  const dimEls = doc.querySelectorAll('.dim');
  const kpiDeltaIds = ['kpi1Delta', 'kpi2Delta', 'kpi3Delta', 'kpi4Delta'];
  dimEls.forEach((el, i) => {
    const slotId = kpiDeltaIds[i];
    if (slotId && slotMap.has(slotId)) el.textContent = slotMap.get(slotId)!;
  });

  return doc.body.innerHTML;
}