# HTML Studio — 顶部导航栏 + AI 模型集成设计

## 概述

为 HTML Studio 添加全局顶部导航栏（方案 B 风格）和 AI 大模型 API 集成。用户可在设置页配置 OpenAI 兼容或 Anthropic Claude API，实现 AI 自动排版生成和编辑器 AI 优化功能。

## 路由变更

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 文件对话页 | 现有 Home 页面 |
| `/editor` | 编辑页 | 现有 Editor 页面 |
| `/settings` | 设置页 | 新增 |

## 全局导航栏（方案 B）

宽顶栏 + tab 标签式导航 + AI 状态指示器 + 下拉快速切换 + 齿轮图标。

### 结构

```
┌─────────────────────────────────────────────────────────┐
│ [HTML Studio]  [文件对话] [编辑]     [🟢 AI 已连接 ▾] [⚙] │
└─────────────────────────────────────────────────────────┘
```

- 左侧：Logo + 三个 tab 标签（当前页高亮，圆角顶部 tab 样式）
- 右侧：AI 状态指示器（绿点=已连接 / 灰点=未配置）+ 下拉快速切换 provider + 齿轮图标跳转 `/settings`
- 点击 AI 状态指示器下拉：显示当前 provider/model，可快速切换 provider 类型
- 齿轮图标：跳转设置页

### 组件

- `Navbar` — 全局顶栏组件，所有页面共用
- `AIStatusIndicator` — AI 连接状态组件（绿点/灰点 + 文字 + 下拉）

## 设置页面

独立页面 `/settings`，两大区块：

### 区块 1：AI 模型配置

- **API 类型切换**：OpenAI 兼容 / Anthropic Claude，按钮式切换
- **API Base URL**：文本输入，默认值 `https://api.openai.com/v1`（OpenAI）或 `https://api.anthropic.com`（Anthropic，不含 `/v1`）
- **API Key**：遮罩输入（`sk-••••••`），可点击显示原文
- **模型名称**：文本输入，默认 `gpt-4o`（OpenAI）或 `claude-sonnet-4-6-20250514`（Anthropic）
- **测试连接按钮**：发一条简单请求验证 Key 和 URL
- **保存配置按钮**：写入 localStorage

Key 仅存储在浏览器 localStorage，不上传服务器。输入框下方提示文字说明这一点。

### 区块 2：AI 功能开关

- **自动排版生成**（toggle）：上传文档后 AI 自动选择布局和主题。默认开启。
- **编辑器 AI 优化**（toggle）：在编辑器中让 AI 优化单页内容。默认开启。

## AI 配置 Store

新增 Zustand store `useAIConfig`，持久化到 localStorage：

```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic';
  baseUrl: string;        // 默认: https://api.openai.com/v1
  apiKey: string;
  model: string;          // 默认: gpt-4o
  connected: boolean;     // 测试连接后的状态
  autoLayout: boolean;    // 默认: true
  editorAssist: boolean;  // 默认: true
}
```

切换 provider 时自动更新 baseUrl 和 model 的默认值。

## AI 调用层

新增 `lib/ai-client.ts`，前端直连 AI API，不经过后端。

### OpenAI 兼容格式

- 端点：`${baseUrl}/chat/completions`
- 请求体：`{ model, messages, temperature }`
- 响应：`choices[0].message.content`

### Anthropic Claude 格式

- 端点：`${baseUrl}/messages`（注意 Anthropic 的 baseUrl 是 `https://api.anthropic.com`，不含 `/v1`）
- 请求头：`x-api-key: apiKey`, `anthropic-version: 2023-06-01`
- 请求体：`{ model, messages, max_tokens }`
- 响应：`content[0].text`

### 三个核心函数

1. **`testConnection()`** — 发一条 `"Hi"` 消息，验证 Key 和 URL 是否有效。成功则设置 `connected = true`。
2. **`optimizeLayout(content: string, fileType: FileType)`** — 文件对话页用。AI 分析文档内容，返回每页的 layout 类型 + slots 内容建议。返回格式为 JSON 数组。
3. **`optimizeSlide(slide: Slide, theme: string)`** — 编辑器用。AI 根据当前幻灯片内容和主题，优化 slots 内容，可能建议更换 layout。返回优化后的 Slide 数据。

### Prompt 设计

- `optimizeLayout`：将解析后的文档内容（标题、段落、列表等）发给 AI，要求返回 JSON 格式的幻灯片布局建议，每页指定 layout 和 slots。
- `optimizeSlide`：将当前 slide 的 layout、slots、theme 发给 AI，要求返回优化后的 slots 内容和可选的 layout 建议。

## 编辑器 AI 优化按钮

在编辑器 StylePanel 中新增 `AIOptimizeButton`：

- 仅当 `editorAssist` 开启且 `connected = true` 时显示
- 点击后：将当前 slide 数据发给 AI，返回优化结果
- 优化结果直接更新 store 中的 slide slots
- 如果 AI 建议更换 layout，也一并更新

## 文件对话页 AI 自动排版

在 Home 页面的 `handleGenerate` 流程中：

- 如果 `autoLayout` 开启且 `connected = true`：
  1. 先用现有 parser 解析文档得到 `ParseResult`
  2. 将解析内容发给 AI 的 `optimizeLayout`
  3. AI 返回优化后的 layout + slots 建议
  4. 用 AI 结果覆盖 parser 的默认布局选择
  5. 生成 Deck 并进入编辑器
- 如果 AI 未配置或开关关闭：保持现有流程不变

## CORS 处理

前端直连 AI API 可能遇到 CORS 问题：
- OpenAI API 默认允许浏览器请求
- Anthropic API 不允许浏览器直接请求（需要后端代理）
- 自部署的兼容 API（如 vLLM、Ollama）通常可配置 CORS

对于 Anthropic，如果遇到 CORS 错误，提示用户配置后端代理或使用 OpenAI 兼容格式的转发服务。

## 页面布局调整

现有 Home 页面有自己的顶部导航（Logo + 示例/帮助），需要替换为全局 Navbar。Editor 页面也需要在顶部加入 Navbar，整体布局从 `h-screen` 调整为导航栏高度 + 剩余空间。

```
┌─────────────── Navbar (固定高度 ~48px) ──────────────┐
├───────────────────────────────────────────────────────┤
│                                                       │
│              页面内容 (剩余高度)                        │
│                                                       │
└───────────────────────────────────────────────────────┘
```