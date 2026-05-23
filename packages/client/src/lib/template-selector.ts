/**
 * Full-deck 模板选择器
 * 根据用户提示词和文档内容，自动选择最匹配的 full-deck 模板
 */

export interface FullDeckTemplateMeta {
  id: string;
  nameZh: string;
  keywords: string[];
  description: string;
}

export const FULL_DECK_TEMPLATES: FullDeckTemplateMeta[] = [
  {
    id: 'pitch-deck',
    nameZh: '融资路演',
    keywords: ['融资', '路演', 'pitch', 'vc', '投资', '种子轮', 'angel', 'seed', 'fundraising', '商业计划书', 'bp', '融资金额', '股权', '融资路演'],
    description: '白底蓝紫渐变 YC/VC 风格，10页标准融资路演结构',
  },
  {
    id: 'product-launch',
    nameZh: '产品发布',
    keywords: ['产品发布', '发布会', 'launch', 'release', '上线', '新品', 'hero', 'unveil', '产品发布会', '发布'],
    description: '暗底英雄 + 暖橘色，8页产品发布结构',
  },
  {
    id: 'tech-sharing',
    nameZh: '技术分享',
    keywords: ['技术', 'tech', '分享', '工程', '架构', '开发', '代码', 'engineering', 'developer', '开源', 'api', 'sdk', '实现原理', '技术分享'],
    description: 'GitHub-dark + JetBrains Mono，8页技术分享结构',
  },
  {
    id: 'weekly-report',
    nameZh: '周报/业务回顾',
    keywords: ['周报', '日报', '月报', '汇报', '业务回顾', 'report', 'weekly', 'kpi', 'metrics', '复盘', 'standup', 'sprint', '进度', '季度汇报'],
    description: '企业风 KPI 网格 + 趋势图，7页周报结构',
  },
  {
    id: 'xhs-post',
    nameZh: '小红书图文',
    keywords: ['小红书', 'xhs', '种草', '图文', '竖版', '3:4', '810', '笔记', '安利'],
    description: '3:4 竖版 810x1080，9页小红书图文结构',
  },
  {
    id: 'xhs-white-editorial',
    nameZh: '小红书杂志风',
    keywords: ['小红书杂志', '白底杂志', 'editorial', '横版', 'ins', '生活美学', '慢生活', '杂志风'],
    description: '白底杂志风，小红书图文 + 横版演示双重用途',
  },
  {
    id: 'course-module',
    nameZh: '教学模块',
    keywords: ['教学', '课程', '培训', 'lecture', 'course', 'tutorial', 'workshop', '讲义', '课件', '教案', '课堂', '教学模块'],
    description: '暖色纸张 + Playfair 衬线，7页教学模块结构',
  },
  {
    id: 'presenter-mode-reveal',
    nameZh: '演讲者模式',
    keywords: ['演讲', '逐字稿', 'presenter', 'reveal', '演讲稿', '讲演', '演说', 'speech', 'keynote', '提词器', '演讲者'],
    description: '演讲者模式专用，6页演讲结构',
  },
  {
    id: 'knowledge-arch-blueprint',
    nameZh: '架构蓝图',
    keywords: ['架构', '蓝图', '系统设计', 'blueprint', 'architecture', '系统架构', '白皮书', '工程图', '拓扑', 'design doc', '架构蓝图'],
    description: '奶油蓝图架构，系统架构图/工程白皮书结构',
  },
  {
    id: 'testing-safety-alert',
    nameZh: '安全风险',
    keywords: ['安全', '风险', '漏洞', 'safety', 'security', 'alert', 'incident', 'postmortem', '测试', '告警', '风险控制', 'compliance'],
    description: '红琥珀警示，安全/风险/incident post-mortem 结构',
  },
  {
    id: 'dir-key-nav-minimal',
    nameZh: '极简Keynote',
    keywords: ['极简', 'keynote', '简约', 'minimal', '简洁', 'minimalist', 'clean', '方向键'],
    description: '方向键8色极简，keynote风格极简演讲结构',
  },
  {
    id: 'graphify-dark-graph',
    nameZh: '知识图谱',
    keywords: ['知识图谱', '图谱', 'graph', 'dev-tool', 'cli', '数据可视化', 'dataviz', '节点', '关系图'],
    description: '暗底知识图谱，dev-tool/CLI/数据可视化结构',
  },
  {
    id: 'hermes-cyber-terminal',
    nameZh: '赛博终端',
    keywords: ['终端', 'terminal', 'cyber', 'honest-review', 'agent', '评测', '工具评测', 'cli工具'],
    description: '暗终端 honest-review，CLI/agent工具评测结构',
  },
  {
    id: 'obsidian-claude-gradient',
    nameZh: '开发者工作流',
    keywords: ['工作流', 'workflow', 'mcp', 'agent', 'github', 'obsidian', 'claude', '开发者工作流'],
    description: 'GitHub暗紫渐变，开发者工作流/MCP/Agent结构',
  },
  {
    id: 'xhs-pastel-card',
    nameZh: '柔和慢生活',
    keywords: ['马卡龙', '慢生活', 'pastel', '柔和生活', '个人成长', '慢节奏', '治愈', 'lifestyle'],
    description: '柔和马卡龙慢生活，生活方式/个人成长/慢节奏结构',
  },
];

/**
 * 根据用户提示词和文档内容，选择最匹配的 full-deck 模板
 * 关键词长度作为权重，长关键词匹配得分更高
 * 无匹配时默认选 tech-sharing（通用性最强）
 */
export function selectTemplate(userPrompt: string, fileContent: string = ''): FullDeckTemplateMeta {
  const input = `${userPrompt} ${fileContent}`.toLowerCase();

  const scored = FULL_DECK_TEMPLATES.map(meta => {
    let score = 0;
    for (const kw of meta.keywords) {
      if (input.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
    return { meta, score };
  });

  const best = scored.reduce((a, b) => a.score > b.score ? a : b, scored[0]);

  if (best.score === 0) {
    return FULL_DECK_TEMPLATES.find(t => t.id === 'tech-sharing')!;
  }

  return best.meta;
}