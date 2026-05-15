/** 布局类型 — 对应 templates/single-page/*.html 文件名 */
export type LayoutType =
  | 'cover' | 'toc' | 'section-divider'
  | 'bullets' | 'two-column' | 'three-column' | 'big-quote'
  | 'stat-highlight' | 'kpi-grid' | 'table'
  | 'chart-bar' | 'chart-line' | 'chart-pie' | 'chart-radar'
  | 'code' | 'diff' | 'terminal'
  | 'flow-diagram' | 'arch-diagram' | 'process-steps' | 'mindmap'
  | 'timeline' | 'roadmap' | 'gantt' | 'comparison' | 'pros-cons' | 'todo-checklist'
  | 'image-hero' | 'image-grid'
  | 'cta' | 'thanks';

/** 插槽值类型 */
export type SlotType = 'text' | 'richtext' | 'image' | 'list' | 'counter';

/** 插槽值 */
export interface SlotValue {
  id: string;
  type: SlotType;
  value: string;
  label: string;
}

/** 单页幻灯片 */
export interface Slide {
  id: string;
  layout: LayoutType;
  theme: string;
  animation: string;
  fx: string | null;
  slots: SlotValue[];
  notes: string;
  order: number;
}

/** 整个幻灯片组 */
export interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  globalTheme: string;
  createdAt: number;
  updatedAt: number;
}

/** 主题分类 */
export type ThemeCategory =
  | 'light-calm' | 'bold-statement' | 'cool-dark'
  | 'warm-vibrant' | 'effect-heavy'
  | 'light-professional' | 'bold-editorial' | 'dramatic';

/** 主题元数据 */
export interface ThemeMeta {
  name: string;
  label: string;
  category: ThemeCategory;
  previewColors: string[];
  description: string;
  recommended?: boolean;
}

/** 布局分类 */
export type LayoutCategory =
  | 'openers' | 'text-centric' | 'numbers-data'
  | 'code-terminal' | 'diagrams-flows' | 'plans-comparisons'
  | 'visuals' | 'closers';

/** 布局元数据 */
export interface LayoutMeta {
  name: LayoutType;
  label: string;
  category: LayoutCategory;
  slotDefs: SlotDef[];
}

/** 插槽定义 */
export interface SlotDef {
  id: string;
  type: SlotType;
  label: string;
  default: string;
}

/** CSS 动效元数据 */
export interface AnimMeta {
  name: string;
  label: string;
  category: string;
  description: string;
}

/** Canvas FX 元数据 */
export interface FxMeta {
  name: string;
  label: string;
  description: string;
}

/** 文件类型 */
export type FileType = 'markdown' | 'txt' | 'pdf' | 'docx';

/** 解析结果 */
export interface ParseResult {
  slides: Slide[];
  title: string;
  fileType: FileType;
}