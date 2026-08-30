# 📰 科研 & 技术热点日报机器人

自动抓取每日热点新闻、市场信息的 GitHub Actions 机器人。

## ✨ 功能特性

- 🤖 **自动运行**：每天定时抓取热点新闻和技术资讯（UTC+8 09:00 和 21:00）
- 📅 **每日存档**：自动生成 `daily/YYYY-MM-DD.md` 文件
- 🔥 **多源聚合**：整合 arXiv、技术博客、Hacker News 等多个信息源
- 📝 **结构化输出**：生成清晰的 Markdown 格式日报
- 🧠 **AI 摘要**：使用硅基流动 GLM-4.7 模型生成今日新闻总结
- 🎯 **精准分类**：包含 AI/LLM、Agent、RAG 等专业科研方向

## 📂 项目结构

```
news-bot/
├── .github/
│   └── workflows/
│       └── daily.yml          # GitHub Actions 工作流
├── scripts/
│   ├── fetch-rss.js           # RSS 抓取模块
│   ├── sources.js             # 信息源配置
│   ├── generate-md.js         # Markdown 生成器
│   ├── generate-summary.js    # LLM 摘要生成模块
│   └── run.js                 # 主执行脚本
├── daily/
│   └── .gitkeep               # 保持目录结构
├── package.json
└── README.md
```

## 🔌 信息源

### AI / LLM
- **arXiv**：cs.AI, cs.LG, cs.CL（自然语言处理）
- **官方博客**：OpenAI, DeepMind, Google Research

### Agent / 智能体
- **arXiv cs.AI**：AI 智能体研究
- **Google News**：AI Agents 相关新闻

### RAG / 检索增强生成
- **arXiv**：cs.AI, cs.IR（信息检索）
- **Google News**：RAG 相关新闻

### LLM / 大语言模型
- **arXiv cs.CL**：计算语言学
- **Google News**：大语言模型研究动态
- **OpenAI Blog**：官方更新

### 技术社区
- **GitHub Blog**：最新产品更新
- **Hacker News**：技术风向标
- **Rust Blog**：系统编程动态

## 🚀 使用方法

### 本地测试

```bash
# 安装依赖
npm install

# 运行脚本
npm start
```

### GitHub Actions

工作流会在每天 **UTC+8 09:00** 和 **21:00** 自动运行（对应 UTC 01:00 和 13:00），或可通过 `workflow_dispatch` 手动触发。

### ⚙️ 配置 API Key（必需）

为了启用 LLM 摘要功能，需要配置硅基流动的 API Key：

1. 进入 GitHub 仓库页面
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 名称填写：`SILICONFLOW_API_KEY`
5. 值填写：你的硅基流动 API Token
6. 点击 **Add secret**

配置完成后，工作流会自动使用该 Token 调用 deepseek-ai/DeepSeek-V3.2 模型生成摘要。

**本地测试时**，需要设置环境变量：
```bash
export SILICONFLOW_API_KEY="your-api-key-here"
npm start
```

或使用 `.env` 文件（需要安装 `dotenv` 包）。

## 📝 输出示例

每日生成的 Markdown 文件包含：

```markdown
# 🧠 科研 & 技术热点日报

日期：2026-01-06
生成时间：2026-01-06 09:00:00

## 📝 今日总结

根据今日收集的新闻，以下是主要技术趋势：

1. **大模型性能突破**：多个研究团队在模型架构和训练方法上取得新进展...
2. **RAG 技术优化**：检索增强生成在实际应用中的效果显著提升...
3. **智能体生态**：AI Agent 框架和工具链日趋完善...

---

## 🔥 AI / LLM

- **OpenAI releases GPT-5.x update**
  来源：OpenAI Blog
  链接：https://openai.com/...

## 🔥 Agent / 智能体

- **New multi-agent framework released**
  来源：arXiv cs.AI
  链接：https://arxiv.org/...

## 🔥 RAG / 检索增强生成

- **Advanced RAG architecture improves accuracy**
  来源：arXiv cs.IR
  链接：https://arxiv.org/...

---
_自动生成 · GitHub Actions_
```

## ⚙️ 高级配置

### 自定义信息源

在 `scripts/sources.js` 中可以自定义信息源和分类。

### 调整 LLM 参数

在 `scripts/generate-summary.js` 中可以调整模型参数（temperature, top_p 等）。

## 📄 License

MIT
