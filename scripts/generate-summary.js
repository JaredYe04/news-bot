import OpenAI from "openai";

const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1";

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用 LLM API 生成摘要（单次尝试）
 */
async function callLLMAPI(client, prompt, attempt = 1) {
  try {
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
      return summary;
    } else {
      throw new Error("Empty response from LLM API");
    }
  } catch (error) {
    // 详细的错误信息
    let errorMsg = error.message || 'Unknown error';
    
    if (error.status) {
      errorMsg += ` (HTTP ${error.status})`;
    }
    
    if (error.response) {
      const responseData = error.response;
      if (responseData.status) {
        errorMsg += ` - Status: ${responseData.status}`;
      }
      if (responseData.data) {
        try {
          const errorData = typeof responseData.data === 'string' 
            ? JSON.parse(responseData.data) 
            : responseData.data;
          if (errorData.error) {
            errorMsg += ` - ${JSON.stringify(errorData.error)}`;
          }
        } catch (e) {
          errorMsg += ` - Response: ${JSON.stringify(responseData.data).substring(0, 200)}`;
        }
      }
    }
    
    // OpenAI SDK 错误处理
    if (error.statusCode) {
      errorMsg += ` (Status Code: ${error.statusCode})`;
    }
    
    throw new Error(errorMsg);
  }
}

/**
 * 带重试的 LLM 摘要生成
 */
export async function generateSummary(newsData, timestamp, maxRetries = 5) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️  SILICONFLOW_API_KEY not set, skipping summary generation");
    return null;
  }

  // 初始化 OpenAI 客户端，使用硅基流动的 API 端点
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: SILICONFLOW_API_URL,
    timeout: 60000,  // 60秒超时
    maxRetries: 0,   // 禁用 OpenAI SDK 自己的重试，我们自己控制
  });

  // 构建基础提示词（不包含新闻内容部分）
  const basePromptPrefix = `当前时间戳：${timestamp}

以下是今日（${new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })})收集的科研与技术热点新闻：

`;

  const basePromptSuffix = `

请为以上新闻生成一份简洁的今日总结，包括：
1. 今日最重要的技术趋势和热点（分点描述）
2. 值得关注的研究方向或突破
3. 简要的分析或展望
4. 对于开发者、研究人员、学生等不同角色，给出不同的建议和指导。

要求：语言专业，并且要富含技术性，可以有趣味性，但要符合事实，要用通俗易懂的语言。用中文输出，600-1200字左右，根据实际情况调整。`;

  const basePromptLength = basePromptPrefix.length + basePromptSuffix.length;
  const MAX_TOTAL_LENGTH = 30000;
  const availableLength = MAX_TOTAL_LENGTH - basePromptLength;

  console.log(`   📏 基础提示词长度: ${basePromptLength} 字符`);
  console.log(`   📏 可用新闻内容长度: ${availableLength} 字符`);

  // 收集所有新闻项目和内容
  const newsItems = [];
  for (const block of newsData) {
    if (block.items.length === 0) continue;
    
    block.items.slice(0, 5).forEach((item, idx) => {
      const content = item.fullContent || item.snippet || "";
      let trimmedContent = "";
      let contentType = "";
      
      if (content && content.trim().length > 50) {
        // 初始限制内容长度
        trimmedContent = content.length > 800 
          ? content.substring(0, 800).trim() + '...'
          : content.trim();
        trimmedContent = trimmedContent.replace(/\n/g, ' ');
        contentType = item.contentType === 'fulltext' ? '全文' : 'RSS摘要';
      }
      
      newsItems.push({
        category: block.category,
        title: item.title || 'Untitled',
        source: item.source,
        link: item.link || '#',
        content: trimmedContent,
        contentType: contentType,
        hasContent: trimmedContent.length > 0
      });
    });
  }

  // 构建新闻内容的框架文本（不包括实际内容）
  let newsContentFramework = "今日科研与技术新闻内容：\n\n";
  let currentCategory = "";
  let itemIndex = 1;
  
  for (let idx = 0; idx < newsItems.length; idx++) {
    const item = newsItems[idx];
    
    if (item.category !== currentCategory) {
      newsContentFramework += `【${item.category}】\n`;
      currentCategory = item.category;
      itemIndex = 1;
    }
    
    newsContentFramework += `\n${itemIndex}. ${item.title} (来源: ${item.source})\n`;
    // 移除链接，因为链接对AI来说没有意义
    newsContentFramework += `   内容（${item.contentType || '无'}）: `;
    
    // 为内容预留位置，使用新闻项目在数组中的索引
    newsContentFramework += `{CONTENT_${idx}}\n`;
    itemIndex++;
  }

  // 计算框架文本长度
  const frameworkLength = newsContentFramework.length;
  const totalContentPlaceholderLength = newsItems.reduce((sum, item, idx) => {
    return sum + `{CONTENT_${idx}}`.length;
  }, 0);
  
  const actualAvailableLength = availableLength - frameworkLength + totalContentPlaceholderLength;
  console.log(`   📏 新闻框架长度: ${frameworkLength} 字符`);
  console.log(`   📏 实际可用于新闻内容的长度: ${actualAvailableLength} 字符`);

  // 计算所有新闻内容的总长度
  const totalContentLength = newsItems.reduce((sum, item) => sum + item.content.length, 0);
  console.log(`   📏 所有新闻内容总长度: ${totalContentLength} 字符`);

  // 如果超过限制，对每个新闻内容进行等比例缩减排减
  let newsContent = newsContentFramework;
  
  if (totalContentLength > actualAvailableLength) {
    const reductionRatio = actualAvailableLength / totalContentLength;
    console.log(`   ⚠️  内容超限，需要缩减至 ${actualAvailableLength.toFixed(0)} 字符（缩减比例: ${(reductionRatio * 100).toFixed(1)}%）`);
    
    // 对每个新闻内容进行缩减
    newsItems.forEach((item, idx) => {
      const originalLength = item.content.length;
      const targetLength = Math.floor(originalLength * reductionRatio);
      const truncatedContent = item.content.substring(0, Math.max(100, targetLength - 10)).trim() + '...';
      
      // 替换占位符
      const placeholder = `{CONTENT_${idx}}`;
      newsContent = newsContent.replace(placeholder, truncatedContent);
      
      console.log(`      - 新闻 ${idx + 1}: ${originalLength} → ${truncatedContent.length} 字符`);
    });
  } else {
    // 不需要缩减，直接填充内容
    newsItems.forEach((item, idx) => {
      const placeholder = `{CONTENT_${idx}}`;
      const contentToInsert = item.hasContent ? item.content : '(仅标题，无详细内容)';
      newsContent = newsContent.replace(placeholder, contentToInsert);
    });
  }

  // 组装完整 prompt
  const prompt = basePromptPrefix + newsContent + basePromptSuffix;
  
  console.log(`   📏 最终 Prompt 长度: ${prompt.length} 字符 (限制: ${MAX_TOTAL_LENGTH} 字符)`);
  
  if (prompt.length > MAX_TOTAL_LENGTH) {
    console.error(`   ❌ 警告: Prompt 仍然超过限制 (${prompt.length} > ${MAX_TOTAL_LENGTH})`);
    // 强制截断
    const truncatedPrompt = prompt.substring(0, MAX_TOTAL_LENGTH - 100) + '\n\n(内容已强制截断)';
    console.log(`   ⚠️  已强制截断至 ${truncatedPrompt.length} 字符`);
    
    // 使用截断后的 prompt 继续重试逻辑
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delayMs = Math.min(2000 * Math.pow(2, attempt - 2), 30000);
          console.log(`   ⏳ 等待 ${delayMs / 1000} 秒后重试 (第 ${attempt}/${maxRetries} 次尝试)...`);
          await sleep(delayMs);
        }
        
        console.log(`   🔄 尝试生成摘要 (第 ${attempt}/${maxRetries} 次，使用截断后的 prompt)...`);
        const summary = await callLLMAPI(client, truncatedPrompt, attempt);
        console.log(`   ✅ 摘要生成成功 (${summary.length} 字符)`);
        return summary;
      } catch (error) {
        lastError = error;
        console.error(`   ❌ 第 ${attempt}/${maxRetries} 次尝试失败:`, error.message);
        if (attempt === maxRetries) {
          console.error(`   ⚠️  所有尝试均失败`);
          return null;
        }
      }
    }
    return null;
  }

  // 重试逻辑
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        // 指数退避：2秒、4秒、8秒、16秒、32秒，最大30秒
        const delayMs = Math.min(2000 * Math.pow(2, attempt - 2), 30000);
        console.log(`   ⏳ 等待 ${delayMs / 1000} 秒后重试 (第 ${attempt}/${maxRetries} 次尝试)...`);
        await sleep(delayMs);
      }
      
      console.log(`   🔄 尝试生成摘要 (第 ${attempt}/${maxRetries} 次)...`);
      const summary = await callLLMAPI(client, prompt, attempt);
      
      console.log(`   ✅ 摘要生成成功 (${summary.length} 字符)`);
      return summary;
      
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      
      console.error(`   ❌ 第 ${attempt}/${maxRetries} 次尝试失败:`, error.message);
      
      // 如果是最后一次尝试，不继续
      if (isLastAttempt) {
        console.error(`   ⚠️  所有 ${maxRetries} 次尝试均失败，放弃生成摘要`);
        console.error(`   📋 最后错误详情: ${error.message}`);
        
        // 如果是 400 错误，可能是请求参数问题，给出提示
        if (error.message.includes('400')) {
          console.error(`   💡 提示: 400 错误通常表示请求参数有问题，可能是:`);
          console.error(`      - prompt 过长（当前 ${prompt.length} 字符）`);
          console.error(`      - max_tokens 或 thinking_budget 设置过大`);
          console.error(`      - API 参数不合法`);
        } else if (error.message.includes('429')) {
          console.error(`   💡 提示: 429 错误表示请求频率过高，请稍后再试`);
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          console.error(`   💡 提示: 服务器错误，可能是 API 服务暂时不可用`);
        }
        
        return null;
      }
    }
  }
  
  return null;
}
