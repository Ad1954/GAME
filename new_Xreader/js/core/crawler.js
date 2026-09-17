/**
 * new_Xreader - Crawler Service
 * Handles sequential chapter downloads via dedicated/custom Cloudflare Worker proxy (Story 8, ADR 0003)
 */

import { storage } from './storage.js';
import { TextSegmenter } from './segmenter.js';

export const DEFAULT_PROXIES = [
  { id: 'local', name: '本地伺服器直通代理 (住宅 IP/免 403 封鎖)', template: '/proxy?url={url}' },
  { id: 'dedicated', name: '專屬 Cloudflare 代理 (遠端/機房 IP: flat-dust-dbde)', template: 'https://flat-dust-dbde.zwaxchu1954.workers.dev/?url={url}' },
  { id: 'allorigins', name: 'AllOrigins (公開備用節點)', template: 'https://api.allorigins.win/raw?url={url}' }
];

export class CrawlerService {
  constructor() {
    this.isCancelled = false;
  }

  getActiveProxyTemplate() {
    const custom = localStorage.getItem('customProxyTemplate');
    const proxyMode = localStorage.getItem('activeProxyMode') || 'local';

    if (proxyMode === 'custom' && custom && custom.includes('{url}')) {
      return custom;
    }
    const found = DEFAULT_PROXIES.find(p => p.id === proxyMode);
    return found ? found.template : DEFAULT_PROXIES[0].template;
  }

  async fetchHTML(url) {
    const template = this.getActiveProxyTemplate();
    const proxyUrl = template.replace('{url}', encodeURIComponent(url));

    const resp = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!resp.ok) {
      throw new Error(`代理連線錯誤: HTTP ${resp.status}`);
    }
    return await resp.text();
  }

  /**
   * Parse book catalog page
   */
  async parseCatalog(catalogUrl) {
    const html = await this.fetchHTML(catalogUrl);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Extract Book Title
    let title = '';
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent.trim()) {
      title = h1.textContent.trim();
    } else {
      const titleTag = doc.querySelector('title');
      title = titleTag ? titleTag.textContent.replace(/目錄|最新章節|小說/g, '').trim() : '未命名小說';
    }

    // 2. Extract Author
    let author = '未知';
    const authorEl = doc.querySelector('.author, [itemprop="author"], #info p');
    if (authorEl) {
      author = authorEl.textContent.replace(/作者[：:]/g, '').trim();
    }

    // 3. Extract Chapter Links
    const chapterLinks = [];
    const linkElements = doc.querySelectorAll('a[href]');
    const seenUrls = new Set();

    linkElements.forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      if (!href || text.length < 2) return;

      // Filter likely chapter links (e.g. Chapter, 第...章, etc.)
      const isChapterText = /第.+[章回節卷部話]|序言|前言|尾聲|番外|chapter/i.test(text);
      if (isChapterText || text.length >= 2) {
        try {
          const absoluteUrl = new URL(href, catalogUrl).href;
          // Avoid homepage/catalog self loops
          if (absoluteUrl !== catalogUrl && !seenUrls.has(absoluteUrl)) {
            // Check for common non-chapter keywords
            if (!/login|register|booklist|history|comment|search/i.test(absoluteUrl)) {
              seenUrls.add(absoluteUrl);
              chapterLinks.push({
                title: text,
                url: absoluteUrl
              });
            }
          }
        } catch (e) {
          // invalid URL
        }
      }
    });

    if (chapterLinks.length === 0) {
      throw new Error('未能解析出任何章節連結，請確認網址是否為目錄頁面。');
    }

    return {
      title,
      author,
      catalogUrl,
      chapters: chapterLinks
    };
  }

  /**
   * Fetch and extract text content from single chapter URL
   */
  async fetchChapterContent(chapterUrl) {
    const html = await this.fetchHTML(chapterUrl);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts, styles, comments, ad containers
    doc.querySelectorAll('script, style, noscript, iframe, .ad, .ads, header, footer, nav').forEach(el => el.remove());

    // Target content selectors common in novel sites
    const contentSelectors = [
      '#content', '.content', '#chaptercontent', '#htmlContent',
      'article', '.read-content', '#TextContent', 'div[id*="content"]'
    ];

    let contentEl = null;
    for (const sel of contentSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent.trim().length > 100) {
        contentEl = el;
        break;
      }
    }

    let text = '';
    if (contentEl) {
      // Convert <br> or <p> to newlines
      const cloned = contentEl.cloneNode(true);
      cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      cloned.querySelectorAll('p').forEach(p => p.append('\n'));
      text = cloned.textContent || '';
    } else {
      // Fallback to body text filtering
      text = doc.body.textContent || '';
    }

    // Clean whitespace
    const cleanText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return cleanText;
  }

  /**
   * Sequentially crawl whole book with atomic incremental saves and checkpointing (ADR 0003)
   */
  async crawlBook(catalogUrl, options = {}) {
    const { delay = 2.0, categoryId = 'uncategorized', onProgress = () => {} } = options;
    this.isCancelled = false;

    onProgress({ status: 'parsing_catalog', message: '正在連線專屬代理解析全書目錄...' });
    const catalog = await this.parseCatalog(catalogUrl);

    const bookId = `book_web_${Date.now()}`;
    const book = {
      id: bookId,
      title: catalog.title,
      author: catalog.author,
      sourceType: 'web',
      sourceUrl: catalogUrl,
      categoryId: categoryId || 'uncategorized',
      totalChapters: catalog.chapters.length,
      downloadedChaptersCount: 0,
      lastChapterIndex: 0,
      lastSentenceIndex: 0
    };

    // Save initial book record
    await storage.saveBook(book);

    // Existing downloaded chapters check (for resumption)
    const existingChapters = await storage.getChaptersByBook(bookId);
    const existingMap = new Map(existingChapters.map(c => [c.index, c]));

    const total = catalog.chapters.length;

    for (let i = 0; i < total; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '下載已手動取消' });
        break;
      }

      const chapMeta = catalog.chapters[i];

      // Checkpoint check
      if (existingMap.has(i) && existingMap.get(i).content.length > 50) {
        onProgress({
          status: 'downloading',
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          title: chapMeta.title,
          message: `[已略過快取] 第 ${i + 1} / ${total} 章: ${chapMeta.title}`
        });
        continue;
      }

      onProgress({
        status: 'downloading',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        title: chapMeta.title,
        message: `正在下載 (${i + 1}/${total}): ${chapMeta.title}`
      });

      try {
        const rawContent = await this.fetchChapterContent(chapMeta.url);
        const { paragraphs, flatSentences } = TextSegmenter.segment(rawContent);

        const chapter = {
          id: `${bookId}_${i}`,
          bookId,
          index: i,
          title: chapMeta.title,
          url: chapMeta.url,
          content: rawContent,
          paragraphs,
          sentencesCount: flatSentences.length
        };

        // Atomic commit to IndexedDB per chapter (ADR 0003)
        await storage.saveChapter(chapter);

        // Update downloaded count on book
        book.downloadedChaptersCount = i + 1;
        await storage.saveBook(book);
      } catch (err) {
        console.warn(`第 ${i + 1} 章下載失敗，將繼續下一章:`, err);
      }

      // Respectful delay to avoid WAF IP blocking
      if (i < total - 1 && delay > 0) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    // 自動保存爬蟲歷史紀錄 (Story 27)
    const allUrls = catalog.chapters.map(c => c.url).filter(Boolean);
    const lastUrl = allUrls.length > 0 ? allUrls[allUrls.length - 1] : '';
    storage.saveCrawlerRecord({
      bookId: book.id,
      bookTitle: book.title,
      sourceUrl: catalogUrl,
      sourceType: 'web',
      totalChaptersCrawled: book.downloadedChaptersCount,
      lastChapterUrl: lastUrl,
      targetCategoryId: book.categoryId,
      historicalKeys: allUrls
    });

    if (!this.isCancelled) {
      onProgress({ status: 'completed', book, bookId, message: `全書 ${total} 章下載完成並已全數入庫！` });
    }

    return book;
  }

  /**
   * 增量下載新發布章節並附加至既有書籍末端 (Story 27)
   */
  async crawlIncremental(recordId, newChapters, options = {}) {
    const { delay = 2.0, onProgress = () => {} } = options;
    this.isCancelled = false;

    const record = storage.getCrawlerRecord(recordId);
    if (!record) throw new Error(`找不到爬蟲紀錄 ${recordId}`);
    const book = await storage.getBook(record.bookId);
    if (!book) throw new Error(`找不到對應書籍 ${record.bookId}`);

    const total = newChapters.length;
    const downloadedList = [];

    onProgress({
      status: 'downloading',
      current: 0,
      total,
      percent: 0,
      message: `開始增量下載 ${total} 篇全新章節...`
    });

    for (let i = 0; i < total; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '增量下載已取消' });
        break;
      }

      const chapMeta = newChapters[i];
      onProgress({
        status: 'downloading',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        title: chapMeta.title,
        message: `正在下載新章節 (${i + 1}/${total}): ${chapMeta.title}`
      });

      try {
        const rawContent = await this.fetchChapterContent(chapMeta.url);
        const { paragraphs, flatSentences } = TextSegmenter.segment(rawContent);

        downloadedList.push({
          title: chapMeta.title,
          url: chapMeta.url,
          content: rawContent,
          paragraphs,
          sentencesCount: flatSentences.length
        });
      } catch (err) {
        console.warn(`新章節 ${chapMeta.title} 下載失敗:`, err);
      }

      if (i < total - 1 && delay > 0) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    if (downloadedList.length > 0) {
      // 附加至原書
      await storage.appendChaptersToBook(book.id, downloadedList, recordId);
      onProgress({
        status: 'completed',
        book,
        bookId: book.id,
        appendedCount: downloadedList.length,
        message: `《${book.title}》追更完成！成功追加 ${downloadedList.length} 篇新章節。`
      });
    }

    return book;
  }

  cancel() {
    this.isCancelled = true;
  }
}

/**
 * 中文大寫數字轉為整數 (例如 "一百零五" -> 105, "廿" -> 20, "十五" -> 15)
 */
export function chineseToNumber(cnStr) {
  if (!cnStr) return null;
  const digits = { '零': 0, '〇': 0, '一': 1, '二': 2, '兩': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  const units = { '十': 10, '拾': 10, '廿': 20, '百': 100, '佰': 100, '千': 1000, '仟': 1000, '萬': 10000 };

  // 純數字串情況 (如 一二三 -> 123)
  let isPure = true;
  for (const c of cnStr) {
    if (!digits.hasOwnProperty(c)) {
      isPure = false;
      break;
    }
  }
  if (isPure && cnStr.length > 0) {
    return parseInt([...cnStr].map(c => digits[c]).join(''), 10);
  }

  let total = 0;
  let section = 0;
  let currentUnit = 0;

  for (let i = 0; i < cnStr.length; i++) {
    const char = cnStr[i];
    if (char === '廿') {
      section += 20;
      currentUnit = 0;
    } else if (digits.hasOwnProperty(char)) {
      currentUnit = digits[char];
      if (i === cnStr.length - 1) {
        section += currentUnit;
      }
    } else if (units.hasOwnProperty(char)) {
      const uVal = units[char];
      if (uVal === 10000) {
        section += (currentUnit || 0);
        total += section * uVal;
        section = 0;
        currentUnit = 0;
      } else {
        if (currentUnit === 0 && uVal === 10 && (i === 0 || cnStr[i - 1] === '第')) {
          currentUnit = 1;
        }
        section += currentUnit * uVal;
        currentUnit = 0;
      }
    }
  }
  total += section;
  return total > 0 ? total : null;
}

/**
 * 智慧萃取章節標題中之回數/章節數
 */
export function parseChapterNumber(title) {
  if (!title) return null;
  const t = title.trim();

  // 1. 阿拉伯數字: 第105章, 第 105 回, 105., Episode 105
  const m1 = t.match(/第\s*(\d+)\s*[章回節卷部話]/i);
  if (m1) return parseInt(m1[1], 10);

  const m2 = t.match(/(?:ch|episode|ep|chapter)\s*(\d+)/i);
  if (m2) return parseInt(m2[1], 10);

  const m3 = t.match(/^(\d+)[.、\s]/);
  if (m3) return parseInt(m3[1], 10);

  // 2. 中文大寫數字: 第一百零五章, 第廿回, 第十五章
  const mCn = t.match(/第\s*([零〇一二兩三四五六七八九十拾廿百佰千仟萬]+)\s*[章回節卷部話]/);
  if (mCn) {
    const num = chineseToNumber(mCn[1]);
    if (num !== null) return num;
  }

  return null;
}

/**
 * 增量章節比對與自然拓撲排序核心演算法 (四級優先級)
 * @param {Array<Object>} onlineChapters - [{ title, url, csn }]
 * @param {Array<Object>} existingBookChapters - 書籍中現存章節 [{ title, url, csn }]
 * @param {Array<string>} historicalKeys - 爬蟲歷史已抓取池 (含手動刪除/分割過的章節防幽靈回溯)
 * @returns {{ newChapters: Array<Object>, totalOnline: number }}
 */
export function diffOnlineChapters(onlineChapters = [], existingBookChapters = [], historicalKeys = []) {
  // 1. URL/CSN 唯一碼去重 (解決小說網頁頂部置頂最新 10 章與底部目錄重複)
  const uniqueList = [];
  const seenUrls = new Set();

  for (const ch of onlineChapters) {
    const key = ch.url || (ch.csn ? `csn_${ch.csn}` : null);
    if (key && !seenUrls.has(key)) {
      seenUrls.add(key);
      uniqueList.push(ch);
    }
  }

  // 2. 排除現存於書籍與歷史庫存池之章節 (幽靈章節雙重防護)
  const existingSet = new Set(
    existingBookChapters
      .map(c => c.url || (c.csn ? String(c.csn) : null))
      .filter(Boolean)
  );
  const historySet = new Set((historicalKeys || []).map(String));

  const candidates = uniqueList.filter(ch => {
    const urlKey = ch.url;
    const csnKey = ch.csn ? String(ch.csn) : null;
    const inBook = (urlKey && existingSet.has(urlKey)) || (csnKey && existingSet.has(csnKey));
    const inHistory = (urlKey && historySet.has(urlKey)) || (csnKey && historySet.has(csnKey));
    return !inBook && !inHistory;
  });

  // 3. 自然數值拓撲排序 (解決最新 10 章置頂倒序排列問題)
  let parsedCount = 0;
  const withNumbers = candidates.map(ch => {
    const num = parseChapterNumber(ch.title);
    if (num !== null) parsedCount++;
    return { ...ch, parsedNumber: num };
  });

  if (parsedCount >= Math.max(2, candidates.length * 0.4)) {
    // 依章節回數正序排列
    withNumbers.sort((a, b) => {
      if (a.parsedNumber !== null && b.parsedNumber !== null) {
        return a.parsedNumber - b.parsedNumber;
      }
      return 0;
    });
  }

  return {
    newChapters: withNumbers,
    totalOnline: uniqueList.length
  };
}

export const crawler = new CrawlerService();

