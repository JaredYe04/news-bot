import OpenAI from "openai";

const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1";

export async function generateSummary(newsData, timestamp) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️  SILICONFLOW_API_KEY not set, skipping summary generation");
    return null;
  }

  // 初始化 OpenAI 客户端，使用硅基流动的 API 端点
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: SILICONFLOW_API_URL,
  });

  // 构建新闻内容摘要（优先使用RSS摘要，其次全文）
  let newsContent = "今日科研与技术新闻内容：\n\n";
  
  for (const block of newsData) {
    if (block.items.length === 0) continue;
    
    newsContent += `【${block.category}】\n`;
    block.items.slice(0, 5).forEach((item, idx) => {
      newsContent += `\n${idx + 1}. ${item.title} (来源: ${item.source})\n`;
      newsContent += `   链接: ${item.link}\n`;
      
      // 优先使用全文，其次RSS摘要，最后才用标题
      const content = item.fullContent || item.snippet || "";
      
      if (content && content.trim().length > 50) {
        // 限制内容长度，避免超出 token 限制
        const trimmedContent = content.length > 800 
          ? content.substring(0, 800).trim() + '...'
          : content.trim();
        
        const contentType = item.contentType === 'fulltext' ? '全文' : 'RSS摘要';
        newsContent += `   内容（${contentType}）: ${trimmedContent.replace(/\n/g, ' ')}\n`;
      } else {
        newsContent += `   (仅标题，无详细内容)\n`;
      }
    });
    newsContent += "\n";
  }

  const prompt = `当前时间戳：${timestamp}

以下是今日（${new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })})收集的科研与技术热点新闻：

${newsContent}

请为以上新闻生成一份简洁的今日总结，包括：
1. 今日最重要的技术趋势和热点（3-5点）
2. 值得关注的研究方向或突破
3. 简要的分析或展望

要求：语言简洁专业，中文输出，200-300字左右。`;

  try {
    console.log("🤖 Generating summary with LLM...");
    
    const response = await client.chat.completions.create({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false,
      max_tokens: 32767,
      thinking_budget: 32767,
      min_p: 0.05,
      temperature: 0.5,
      top_p: 0.7,
      top_k: 50,
      frequency_penalty: 0.5,
      n: 1,
      response_format: {
        type: "text"
      }
    });

    const summary = response.choices[0]?.message?.content?.trim();
    
    if (summary) {
      console.log("✓ Summary generated successfully");
      return summary;
    } else {
      console.warn("⚠️  Empty summary returned");
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to generate summary:", error.message);
    return null;
  }
}

