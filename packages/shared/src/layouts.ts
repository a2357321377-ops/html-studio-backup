import type { LayoutMeta, LayoutCategory, LayoutType, SlotDef } from './types';

export const LAYOUT_CATEGORIES: Record<LayoutCategory, string> = {
  'openers': '开场过渡',
  'text-centric': '文字内容',
  'numbers-data': '数字数据',
  'code-terminal': '代码终端',
  'diagrams-flows': '图表流程',
  'plans-comparisons': '计划对比',
  'visuals': '视觉图片',
  'closers': '结尾行动',
};

const coverSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: 'Tech Sharing · 纯干货' },
  { id: 'title', type: 'text', label: '标题', default: '演示标题' },
  { id: 'subtitle', type: 'text', label: '副标题', default: '从文档到演示，一键生成' },
  { id: 'pills', type: 'list', label: '标签列表', default: '[]' },
];

const bulletsSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: 'Why · 为什么' },
  { id: 'title', type: 'text', label: '标题', default: '好的演讲系统，帮你做三件事' },
  { id: 'lede', type: 'text', label: '引导语', default: '' },
  { id: 'items', type: 'list', label: '要点列表', default: '[]' },
];

const twoColSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'title', type: 'text', label: '标题', default: '' },
  { id: 'leftTitle', type: 'text', label: '左栏标题', default: '' },
  { id: 'leftBody', type: 'richtext', label: '左栏内容', default: '' },
  { id: 'rightTitle', type: 'text', label: '右栏标题', default: '' },
  { id: 'rightBody', type: 'richtext', label: '右栏内容', default: '' },
];

const kpiSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'title', type: 'text', label: '标题', default: '' },
  { id: 'kpi1Label', type: 'text', label: 'KPI1 标签', default: '' },
  { id: 'kpi1Value', type: 'counter', label: 'KPI1 数值', default: '0' },
  { id: 'kpi1Delta', type: 'text', label: 'KPI1 变化', default: '' },
  { id: 'kpi2Label', type: 'text', label: 'KPI2 标签', default: '' },
  { id: 'kpi2Value', type: 'counter', label: 'KPI2 数值', default: '0' },
  { id: 'kpi2Delta', type: 'text', label: 'KPI2 变化', default: '' },
  { id: 'kpi3Label', type: 'text', label: 'KPI3 标签', default: '' },
  { id: 'kpi3Value', type: 'counter', label: 'KPI3 数值', default: '0' },
  { id: 'kpi3Delta', type: 'text', label: 'KPI3 变化', default: '' },
  { id: 'kpi4Label', type: 'text', label: 'KPI4 标签', default: '' },
  { id: 'kpi4Value', type: 'counter', label: 'KPI4 数值', default: '0' },
  { id: 'kpi4Delta', type: 'text', label: 'KPI4 变化', default: '' },
];

const statSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'counterValue', type: 'counter', label: '数字', default: '92' },
  { id: 'unit', type: 'text', label: '单位', default: '%' },
  { id: 'subtitle', type: 'text', label: '说明', default: '' },
  { id: 'lede', type: 'text', label: '引导语', default: '' },
];

const thanksSlots: SlotDef[] = [
  { id: 'title', type: 'text', label: '标题', default: 'Thanks' },
  { id: 'subtitle', type: 'text', label: '副标题', default: '' },
  { id: 'contact', type: 'text', label: '联系信息', default: '' },
];

const genericSlots: SlotDef[] = [
  { id: 'kicker', type: 'text', label: '标签', default: '' },
  { id: 'title', type: 'text', label: '标题', default: '' },
  { id: 'body', type: 'richtext', label: '内容', default: '' },
];

export const layouts: LayoutMeta[] = [
  // Openers & transitions
  { name: 'cover', label: '封面', category: 'openers', slotDefs: coverSlots },
  { name: 'toc', label: '目录', category: 'openers', slotDefs: genericSlots },
  { name: 'section-divider', label: '章节分隔', category: 'openers', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'number', type: 'text', label: '章节号', default: '01' }] },

  // Text-centric
  { name: 'bullets', label: '要点列表', category: 'text-centric', slotDefs: bulletsSlots },
  { name: 'two-column', label: '双栏', category: 'text-centric', slotDefs: twoColSlots },
  { name: 'three-column', label: '三栏', category: 'text-centric', slotDefs: genericSlots },
  { name: 'big-quote', label: '大引用', category: 'text-centric', slotDefs: [{ id: 'quote', type: 'richtext', label: '引用内容', default: '' }, { id: 'author', type: 'text', label: '作者', default: '' }] },

  // Numbers & data
  { name: 'stat-highlight', label: '数据高亮', category: 'numbers-data', slotDefs: statSlots },
  { name: 'kpi-grid', label: 'KPI 网格', category: 'numbers-data', slotDefs: kpiSlots },
  { name: 'table', label: '数据表格', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-bar', label: '柱状图', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-line', label: '折线图', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-pie', label: '饼图', category: 'numbers-data', slotDefs: genericSlots },
  { name: 'chart-radar', label: '雷达图', category: 'numbers-data', slotDefs: genericSlots },

  // Code & terminal
  { name: 'code', label: '代码', category: 'code-terminal', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'code', type: 'richtext', label: '代码', default: '' }] },
  { name: 'diff', label: '差异对比', category: 'code-terminal', slotDefs: genericSlots },
  { name: 'terminal', label: '终端', category: 'code-terminal', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'command', type: 'richtext', label: '命令输出', default: '' }] },

  // Diagrams & flows
  { name: 'flow-diagram', label: '流程图', category: 'diagrams-flows', slotDefs: genericSlots },
  { name: 'arch-diagram', label: '架构图', category: 'diagrams-flows', slotDefs: genericSlots },
  { name: 'process-steps', label: '步骤', category: 'diagrams-flows', slotDefs: genericSlots },
  { name: 'mindmap', label: '思维导图', category: 'diagrams-flows', slotDefs: genericSlots },

  // Plans & comparisons
  { name: 'timeline', label: '时间线', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'roadmap', label: '路线图', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'gantt', label: '甘特图', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'comparison', label: '对比', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'pros-cons', label: '优缺点', category: 'plans-comparisons', slotDefs: genericSlots },
  { name: 'todo-checklist', label: '待办清单', category: 'plans-comparisons', slotDefs: genericSlots },

  // Visuals
  { name: 'image-hero', label: '图片英雄', category: 'visuals', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'image', type: 'image', label: '图片', default: '' }] },
  { name: 'image-grid', label: '图片网格', category: 'visuals', slotDefs: [{ id: 'images', type: 'list', label: '图片列表', default: '[]' }] },

  // Closers
  { name: 'cta', label: '行动号召', category: 'closers', slotDefs: [{ id: 'title', type: 'text', label: '标题', default: '' }, { id: 'subtitle', type: 'text', label: '副标题', default: '' }] },
  { name: 'thanks', label: '致谢', category: 'closers', slotDefs: thanksSlots },
];

export function getLayoutMeta(name: LayoutType): LayoutMeta {
  return layouts.find(l => l.name === name)!;
}