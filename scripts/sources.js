// 白名单：允许抓取全文的站点
const FULLTEXT_WHITELIST = [
  "research.google",
  "github.blog",
  "blog.rust-lang.org"
];

// 检查URL是否在白名单中
export function canFetchFullText(url) {
  return FULLTEXT_WHITELIST.some(domain => url.includes(domain));
}

// 检查是否是arXiv源
export function isArxivSource(sourceName) {
  return sourceName && sourceName.toLowerCase().includes('arxiv');
}

export const SOURCES = [
  {
    category: "AI / LLM",
    sources: [
      { name: "arXiv cs.AI", url: "https://export.arxiv.org/rss/cs.AI", type: "arxiv" },
      { name: "arXiv cs.LG", url: "https://export.arxiv.org/rss/cs.LG", type: "arxiv" },
      { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", type: "blog" },
      { name: "DeepMind", url: "https://deepmind.google/rss.xml", type: "blog" },
      { name: "Google Research", url: "https://research.google/blog/rss", type: "blog" }
    ]
  },
  {
    category: "Agent / 智能体",
    sources: [
      { name: "arXiv cs.AI", url: "https://export.arxiv.org/rss/cs.AI", type: "arxiv" },
      { name: "Google News - AI Agents", url: "https://news.google.com/rss/search?q=AI+agents+research", type: "news" },
      { name: "Hacker News", url: "https://hnrss.org/frontpage", type: "news" }
    ]
  },
  {
    category: "RAG / 检索增强生成",
    sources: [
      { name: "arXiv cs.AI", url: "https://export.arxiv.org/rss/cs.AI", type: "arxiv" },
      { name: "arXiv cs.IR", url: "https://export.arxiv.org/rss/cs.IR", type: "arxiv" },
      { name: "Google News - RAG", url: "https://news.google.com/rss/search?q=RAG+retrieval+augmented+generation", type: "news" }
    ]
  },
  {
    category: "LLM / 大语言模型",
    sources: [
      { name: "arXiv cs.CL", url: "https://export.arxiv.org/rss/cs.CL", type: "arxiv" },
      { name: "Google News - LLM", url: "https://news.google.com/rss/search?q=large+language+model+research", type: "news" },
      { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", type: "blog" }
    ]
  },
  {
    category: "计算机科学 / 软件工程",
    sources: [
      { name: "arXiv cs.SE", url: "https://export.arxiv.org/rss/cs.SE", type: "arxiv" },
      { name: "arXiv cs.DC", url: "https://export.arxiv.org/rss/cs.DC", type: "arxiv" },
      { name: "GitHub Blog", url: "https://github.blog/rss", type: "blog" },
      { name: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml", type: "blog" },
      { name: "Hacker News", url: "https://hnrss.org/frontpage", type: "news" }
    ]
  },
  {
    category: "工程 / 系统 / 工具",
    sources: [
      { name: "GitHub Blog", url: "https://github.blog/rss", type: "blog" },
      { name: "Hacker News", url: "https://hnrss.org/frontpage", type: "news" }
    ]
  }
];

