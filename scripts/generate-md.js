/**
 * Neutralize GitHub @mentions so issue/PR bodies do not notify users.
 * Matches @user and @org/team (1–39 chars, alphanumeric/hyphens).
 * Does not match emails (character before @ is part of an address).
 */
export function neutralizeGithubMentions(text) {
  if (!text) return text;
  return text.replace(
    /(^|[^A-Za-z0-9._%+-])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?(?:\/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,37}[A-Za-z0-9])?)?)/g,
    (match, prefix, name) => `${prefix}\`@\u200B${name}\``
  );
}

export function generateMarkdown(date, data, summary = null, timestamp = null, timeSlot = '') {
  let md = `# 🧠 科研 & 技术热点日报\n\n日期：${date}${timeSlot ? ` ${timeSlot}` : ''}\n`;

  // 如果有时间戳，显示具体时间
  if (timestamp) {
    const timeStr = new Date(timestamp).toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    md += `生成时间：${timeStr}\n\n`;
  } else {
    md += "\n";
  }

  // 如果有摘要，放在最前面
  if (summary) {
    md += `## 📝 今日总结\n\n${summary}\n\n---\n\n`;
  }

  // 新闻列表
  for (const block of data) {
    if (block.items.length === 0) continue;
    
    md += `## 🔥 ${block.category}\n\n`;
    for (const item of block.items.slice(0, 5)) {
      md += `- **${item.title}**  \n`;
      
      // 标注来源类型
      const sourceTypeLabel = item.sourceType === 'arxiv' ? 'arXiv（论文摘要）' :
                             item.sourceType === 'blog' ? '博客' :
                             item.sourceType === 'news' ? '新闻' : '未知';
      
      md += `  来源：${item.source} (${sourceTypeLabel})  \n`;
      
      // 如果有摘要，显示摘要
      const content = item.fullContent || item.snippet;
      if (content && content.trim().length > 0) {
        const contentType = item.contentType === 'fulltext' ? '全文' : 'RSS摘要';
        // 限制摘要长度
        const preview = content.length > 500 
          ? content.substring(0, 500).trim() + '...'
          : content.trim();
        md += `  摘要（${contentType}）：${preview.replace(/\n/g, ' ')}\n`;
      }
      
      md += `  链接：${item.link}\n\n`;
    }
  }

  md += "---\n_自动生成 · GitHub Actions_\n";
  return neutralizeGithubMentions(md);
}
