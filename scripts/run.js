import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { SOURCES, canFetchFullText, isArxivSource } from "./sources.js";
import { fetchRSS } from "./fetch-rss.js";
import { fetchArticleContent } from "./fetch-content.js";
import { generateMarkdown } from "./generate-md.js";
import { generateSummary } from "./generate-summary.js";

// 启用 dayjs 的 timezone 插件
dayjs.extend(utc);
dayjs.extend(timezone);

const today = dayjs().format("YYYY-MM-DD");
const timestamp = new Date().toISOString();

// 判断是上午还是下午
// GitHub Actions 运行在 UTC 时区：
// - 09:00 UTC+8 = 01:00 UTC → morning
// - 21:00 UTC+8 = 13:00 UTC → evening
const utcHour = dayjs().utc().hour();
const timeSlot = utcHour < 12 ? 'morning' : 'evening';  // 01:00 UTC = morning, 13:00 UTC = evening
const timeSlotLabel = utcHour < 12 ? '上午' : '晚上';

// 获取北京时间用于显示
const beijingTime = dayjs().tz('Asia/Shanghai');

console.log(`\n${'='.repeat(60)}`);
console.log(`📰 科研 & 技术热点日报 - ${today} ${timeSlotLabel}`);
console.log(`⏰ 开始时间: ${beijingTime.format('YYYY-MM-DD HH:mm:ss')} (UTC+8)`);
console.log(`${'='.repeat(60)}\n`);

const results = [];

// 获取所有新闻
for (const block of SOURCES) {
  console.log(`\n📂 Processing category: ${block.category}`);
  const items = [];

  for (const src of block.sources) {
    console.log(`  🔍 Fetching ${src.name} from ${src.url}...`);
    const feed = await fetchRSS(src.url);
    if (!feed) {
      console.log(`  ⚠️  Failed to fetch from ${src.name}`);
      continue;
    }

    const feedTitle = feed.title || 'Unknown';
    const feedItems = feed.items || [];
    console.log(`  ✓ Successfully fetched: "${feedTitle}" (${feedItems.length} items)`);

    // 根据源类型决定抓取数量：arXiv 抓2个（补充型），其他抓3-5个（稳定输出）
    const isArxiv = isArxivSource(src.name);
    const maxItems = isArxiv ? 2 : (src.type === 'blog' ? 4 : 3);
    const selectedItems = feedItems.slice(0, maxItems);
    
    console.log(`  📰 Selected ${selectedItems.length} items (${isArxiv ? 'arXiv补充型' : '稳定输出型'}):`);
    
    // 处理每个文章：优先使用RSS摘要，只有白名单才抓全文
    const contentPromises = selectedItems.map(async (i, idx) => {
      const item = {
        title: i.title || 'Untitled',
        link: i.link || '#',
        source: src.name,
        sourceType: src.type || 'unknown',
        // 优先使用RSS自带的摘要字段
        snippet: i.contentSnippet || i.content || i.summary || i.description || "",
        fullContent: null,  // 只有白名单站点才会有
        contentType: "rss-snippet"  // 或 "fulltext"
      };
      
      console.log(`    ${idx + 1}. ${item.title}`);
      console.log(`       🔗 ${item.link}`);
      
      // 提取RSS摘要
      if (item.snippet) {
        const preview = item.snippet.substring(0, 100).replace(/\n/g, ' ').trim();
        console.log(`       📄 RSS摘要 (${item.snippet.length} chars): ${preview}...`);
      }
      
      // 只有白名单站点才尝试抓取全文
      const shouldFetchFullText = canFetchFullText(item.link);
      
      if (shouldFetchFullText) {
        console.log(`       🔍 白名单站点，尝试抓取全文...`);
        item.fullContent = await fetchArticleContent(item.link);
        
        if (item.fullContent) {
          item.contentType = "fulltext";
          const preview = item.fullContent.substring(0, 100).replace(/\n/g, ' ').trim();
          console.log(`       ✅ 全文提取成功 (${item.fullContent.length} chars): ${preview}...`);
        } else {
          console.log(`       ⚠️  全文提取失败，使用RSS摘要`);
        }
      } else {
        console.log(`       ℹ️  非白名单站点，仅使用RSS摘要`);
      }
      
      return item;
    });
    
    const fetchedItems = await Promise.all(contentPromises);
    items.push(...fetchedItems);
  }

  console.log(`  ✅ Category "${block.category}": collected ${items.length} items total`);
  results.push({
    category: block.category,
    items
  });
}

// 统计摘要
const totalItems = results.reduce((sum, block) => sum + block.items.length, 0);
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 数据统计:`);
console.log(`   - 分类数量: ${results.length}`);
console.log(`   - 文章总数: ${totalItems}`);
console.log(`${'='.repeat(60)}\n`);

// 生成 LLM 摘要（带重试机制）
let summary = null;
try {
  console.log(`🤖 开始生成 LLM 摘要（最多重试5次）...`);
  summary = await generateSummary(results, timestamp, 5);
  if (summary) {
    console.log(`✅ LLM 摘要生成成功 (${summary.length} 字符)`);
    console.log(`\n📝 摘要内容:\n${summary}\n`);
  } else {
    console.log(`⚠️  LLM 摘要生成失败，将继续生成不含摘要的报告`);
  }
} catch (error) {
  console.error(`❌ 摘要生成过程异常:`, error.message);
  console.log(`⚠️  将继续生成不含摘要的报告`);
}

// 生成 Markdown
const md = generateMarkdown(today, results, summary, timestamp, timeSlotLabel);
const dailyDir = path.join(process.cwd(), "daily");

// Ensure daily directory exists
if (!fs.existsSync(dailyDir)) {
  fs.mkdirSync(dailyDir, { recursive: true });
}

// 生成文件名：YYYY-MM-DD-morning.md 或 YYYY-MM-DD-evening.md
const filename = `${today}-${timeSlot}.md`;
const out = path.join(dailyDir, filename);
fs.writeFileSync(out, md, "utf-8");

const fileSize = (fs.statSync(out).size / 1024).toFixed(2);
console.log(`\n${'='.repeat(60)}`);
console.log(`✅ 报告生成完成!`);
console.log(`   📄 文件路径: ${out}`);
console.log(`   📏 文件大小: ${fileSize} KB`);
console.log(`⏰ 结束时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
console.log(`${'='.repeat(60)}\n`);

// 强制退出，确保脚本正常结束
process.exit(0);

