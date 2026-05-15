import type { ThemeMeta, ThemeCategory } from './types';

export const THEME_CATEGORIES: Record<ThemeCategory, string> = {
  'light-calm': '柔和亮色',
  'bold-statement': '大胆宣言',
  'cool-dark': '冷调暗色',
  'warm-vibrant': '温暖活力',
  'effect-heavy': '特效风格',
  'light-professional': '专业亮色',
  'bold-editorial': '编辑风格',
  'dramatic': '戏剧风格',
};

export const themes: ThemeMeta[] = [
  // Light & calm
  { name: 'minimal-white', label: 'Minimal White', category: 'light-calm', previewColors: ['#ffffff', '#f7f7f8'], description: '极简白，克制优雅', recommended: true },
  { name: 'editorial-serif', label: 'Editorial Serif', category: 'light-calm', previewColors: ['#f5f0e8', '#2c2c2c'], description: '杂志风衬线体' },
  { name: 'soft-pastel', label: 'Soft Pastel', category: 'light-calm', previewColors: ['#ffeaa7', '#fab1a0'], description: '柔和马卡龙三色渐变' },
  { name: 'xiaohongshu-white', label: 'Xiaohongshu White', category: 'light-calm', previewColors: ['#fff5f5', '#ff4757'], description: '小红书白 + 暖红点缀' },
  { name: 'solarized-light', label: 'Solarized Light', category: 'light-calm', previewColors: ['#fdf6e3', '#93a1a1'], description: '经典低眩光配色' },
  { name: 'catppuccin-latte', label: 'Catppuccin Latte', category: 'light-calm', previewColors: ['#eff1f5', '#8839ef'], description: 'Catppuccin 亮色变体' },

  // Bold & statement
  { name: 'sharp-mono', label: 'Sharp Mono', category: 'bold-statement', previewColors: ['#000000', '#ffffff'], description: '纯黑白 + 硬阴影' },
  { name: 'neo-brutalism', label: 'Neo Brutalism', category: 'bold-statement', previewColors: ['#fef9c3', '#facc15'], description: '粗描边 + 硬阴影 + 亮黄' },
  { name: 'bauhaus', label: 'Bauhaus', category: 'bold-statement', previewColors: ['#ef4444', '#eab308'], description: '几何 + 红黄蓝三原色' },
  { name: 'swiss-grid', label: 'Swiss Grid', category: 'bold-statement', previewColors: ['#ffffff', '#1a1a1a'], description: '瑞士网格 + Helvetica 感' },
  { name: 'memphis-pop', label: 'Memphis Pop', category: 'bold-statement', previewColors: ['#ff6b6b', '#feca57'], description: 'Memphis 波普风 + 圆点背景' },

  // Cool & dark
  { name: 'tokyo-night', label: 'Tokyo Night', category: 'cool-dark', previewColors: ['#1a1b26', '#7aa2f7'], description: '东京夜蓝调', recommended: true },
  { name: 'dracula', label: 'Dracula', category: 'cool-dark', previewColors: ['#282a36', '#bd93f9'], description: '经典 Dracula 紫红' },
  { name: 'catppuccin-mocha', label: 'Catppuccin Mocha', category: 'cool-dark', previewColors: ['#1e1e2e', '#cba6f7'], description: 'Catppuccin 暗色变体' },
  { name: 'nord', label: 'Nord', category: 'cool-dark', previewColors: ['#2e3440', '#88c0d0'], description: '北欧冷蓝白' },
  { name: 'gruvbox-dark', label: 'Gruvbox Dark', category: 'cool-dark', previewColors: ['#282828', '#fe8019'], description: '暖复古暗色' },
  { name: 'rose-pine', label: 'Rose Pine', category: 'cool-dark', previewColors: ['#191724', '#eb6f92'], description: 'Rose Pine 柔暗调' },
  { name: 'arctic-cool', label: 'Arctic Cool', category: 'cool-dark', previewColors: ['#e8f4f8', '#0c4a6e'], description: '蓝/青/石板冷色' },

  // Warm & vibrant
  { name: 'sunset-warm', label: 'Sunset Warm', category: 'warm-vibrant', previewColors: ['#ffecd2', '#fcb69f'], description: '橙/珊瑚/琥珀渐变', recommended: true },

  // Effect-heavy
  { name: 'glassmorphism', label: 'Glassmorphism', category: 'effect-heavy', previewColors: ['#0b1024', '#7dd3fc'], description: '毛玻璃 + 多彩光斑' },
  { name: 'aurora', label: 'Aurora', category: 'effect-heavy', previewColors: ['#a18cd1', '#fbc2eb'], description: '极光渐变 + 模糊' },
  { name: 'rainbow-gradient', label: 'Rainbow Gradient', category: 'effect-heavy', previewColors: ['#ff6b6b', '#48dbfb'], description: '白底 + 彩虹流动渐变' },
  { name: 'blueprint', label: 'Blueprint', category: 'effect-heavy', previewColors: ['#0a1628', '#4a9eff'], description: '蓝图工程 + 网格底纹' },
  { name: 'terminal-green', label: 'Terminal Green', category: 'effect-heavy', previewColors: ['#0a0a0a', '#33ff33'], description: '绿屏终端 + 等宽字体' },

  // v2 Light & professional
  { name: 'corporate-clean', label: 'Corporate Clean', category: 'light-professional', previewColors: ['#ffffff', '#1e3a5f'], description: '纯白 + 海军蓝 + 保守边框' },
  { name: 'pitch-deck-vc', label: 'Pitch Deck VC', category: 'light-professional', previewColors: ['#ffffff', '#6366f1'], description: 'YC 风 + 蓝紫渐变 + 大留白' },
  { name: 'academic-paper', label: 'Academic Paper', category: 'light-professional', previewColors: ['#fefefe', '#1a1a2e'], description: '论文白 + 衬线正文 + 蓝色链接' },
  { name: 'japanese-minimal', label: 'Japanese Minimal', category: 'light-professional', previewColors: ['#f8f4e8', '#c0392b'], description: '象牙白 + 朱红 + 极致留白' },
  { name: 'engineering-whiteprint', label: 'Engineering Whiteprint', category: 'light-professional', previewColors: ['#ffffff', '#1e3a5f'], description: '白底 + 坐标纸网格 + 海军蓝墨线' },

  // v2 Bold & editorial
  { name: 'magazine-bold', label: 'Magazine Bold', category: 'bold-editorial', previewColors: ['#f5f0e8', '#ff6b35'], description: '奶油底 + 超大 Playfair + 橙色点缀' },
  { name: 'news-broadcast', label: 'News Broadcast', category: 'bold-editorial', previewColors: ['#ffffff', '#dc2626'], description: '白 + 红竖条 + Oswald 大写' },
  { name: 'midcentury', label: 'Midcentury', category: 'bold-editorial', previewColors: ['#f5f0e8', '#d4a574'], description: '奶油底 + 芥末/青绿/焦橙' },
  { name: 'retro-tv', label: 'Retro TV', category: 'bold-editorial', previewColors: ['#f5e6c8', '#e8a838'], description: '暖奶油 + CRT 扫描线 + 琥珀橙' },

  // v2 Dramatic
  { name: 'cyberpunk-neon', label: 'Cyberpunk Neon', category: 'dramatic', previewColors: ['#000000', '#ff2bd6'], description: '纯黑 + 霓虹粉/青/黄' },
  { name: 'vaporwave', label: 'Vaporwave', category: 'dramatic', previewColors: ['#2d1b69', '#ff6ad5'], description: '深紫 + 粉/青/蓝渐变' },
  { name: 'y2k-chrome', label: 'Y2K Chrome', category: 'dramatic', previewColors: ['#c0c0c0', '#ff69b4'], description: '银铬渐变 + 彩虹点缀 + 大圆角' },
];

/** 首页推荐的 3 个主题 */
export const recommendedThemes = themes.filter(t => t.recommended);