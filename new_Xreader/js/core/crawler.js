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

/**
 * 智慧環境檢測：判定當前是否為本地伺服器環境 (如透過 .bat 啟動訪問 localhost 或 127.0.0.1)
 */
export function isLocalEnvironment() {
  if (typeof window === 'undefined' || !window.location) return true;
  const host = window.location.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' || host === '';
}

export class CrawlerService {
  constructor() {
    this.isCancelled = false;
  }

  getActiveProxyTemplate() {
    const isLocal = isLocalEnvironment();
    let proxyMode = localStorage.getItem('activeProxyMode');

    // 本機預設 local，雲端預設 dedicated；若雲端殘留 local 則自動安全回退
    if (!proxyMode) {
      proxyMode = isLocal ? 'local' : 'dedicated';
    } else if (!isLocal && proxyMode === 'local') {
      proxyMode = 'dedicated';
    }

    const custom = localStorage.getItem('customProxyTemplate');
    if (proxyMode === 'custom' && custom && custom.includes('{url}')) {
      return custom;
    }
    const found = DEFAULT_PROXIES.find(p => p.id === proxyMode);
    return found ? found.template : DEFAULT_PROXIES[1].template;
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
      const isLocal = isLocalEnvironment();
      let hint = '';
      if (resp.status === 404 && !isLocal) {
        hint = '（雲端環境無法使用本機 /proxy，請確認跳板選擇「專屬 Cloudflare 代理」）';
      }
      throw new Error(`代理連線錯誤: HTTP ${resp.status} ${hint}`.trim());
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

    // 1. Extract Book Title (Story 43)
    let title = '';
    const h1 = doc.querySelector('h1, .novel-title, .book-title, .info h1');
    if (h1 && h1.textContent.trim()) {
      title = h1.textContent.trim();
    } else {
      const titleTag = doc.querySelector('title');
      if (titleTag) {
        const bookMatch = titleTag.textContent.match(/《([^》]+)》/);
        if (bookMatch) {
          title = bookMatch[1].trim();
        } else {
          title = titleTag.textContent.replace(/目錄|最新章節|小說|線上看|全文閱讀/g, '').trim();
        }
      } else {
        title = '未命名小說';
      }
    }

    // 2. Extract Author
    let author = '未知';
    const authorEl = doc.querySelector('.author, [itemprop="author"], #info p');
    if (authorEl) {
      author = authorEl.textContent.replace(/作者[：:]/g, '').trim();
    }

    // 3. Extract Chapter Links with Dedicated Container Targeting (Story 40, Story 42, Story 43)
    // First, search for dedicated chapter containers BEFORE modifying the DOM
    const containerSelectors = [
      '#chapter-list', '.chapter-list', '#chapterlist', '#chapters', '.chapters',
      '#list', '.list-group', '.catalog', '#catalog',
      'ul[class*="chapter"]', 'div[class*="chapter"]',
      '#defualtlist', '#alllist'
    ];

    let containerEl = null;
    for (const sel of containerSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.querySelectorAll('a[href]').length >= 3) {
        containerEl = el;
        break;
      }
    }

    if (!containerEl) {
      // Only remove header/footer/nav if dedicated container was not found,
      // and protect any element containing 5+ links to prevent deleting mislabeled chapter lists
      doc.querySelectorAll('header, footer, nav, .header, .footer, .nav, .menu, #header, #footer').forEach(el => {
        if (el.querySelectorAll('a[href]').length >= 5) return;
        el.remove();
      });
    }

    const searchRoot = containerEl || doc.body;
    const linkElements = searchRoot.querySelectorAll('a[href]');
    const chapterLinks = [];
    const seenUrls = new Set();

    const nonChapterTextRegex = /^(登入|註冊|常見問題|問題解答|投稿|排行榜|人氣榜|收藏榜|完本榜|精選排行|作者專欄|狂人原創|修改|隱私權政策|防詐騙宣導|首頁|上一頁|下一頁|目錄|分享|回報錯誤|書架|書籤|加入書籤|免責聲明|客戶服務|聯絡我們|繁體中文版|簡體中文版|移動版|手機版|下載app)$/i;
    const nonChapterUrlRegex = /(login|register|booklist|history|comment|search|editor|qa|privacy|anti-scam|category|creator|faq|channel|download)/i;
    const chapterPatternRegex = /第.+[章回節卷部話]|序言|前言|後記|尾聲|番外|chapter|prologue|epilogue/i;

    linkElements.forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      if (!href || text.length < 1) return;

      try {
        const absoluteUrl = new URL(href, catalogUrl).href;
        if (absoluteUrl === catalogUrl || seenUrls.has(absoluteUrl)) return;

        // URL filter
        if (nonChapterUrlRegex.test(absoluteUrl) || href.startsWith('javascript:')) return;

        seenUrls.add(absoluteUrl);

        // Smart classification: is this likely a real novel chapter?
        const isBlacklisted = nonChapterTextRegex.test(text);
        const hasChapterWord = chapterPatternRegex.test(text);

        let isLikelyChapter = true;
        if (isBlacklisted) {
          isLikelyChapter = false;
        } else if (!containerEl && !hasChapterWord && text.length < 2) {
          isLikelyChapter = false;
        }

        chapterLinks.push({
          title: text,
          url: absoluteUrl,
          isLikelyChapter
        });
      } catch (e) {
        // invalid URL
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

    // Target content selectors common in novel sites (Story 40)
    const contentSelectors = [
      '#content', '.content', '#chaptercontent', '#htmlContent',
      'article', '.read-content', '#TextContent', 'div[id*="content"]',
      'div[style*="font-size: 20px"]', 'div[style*="word-wrap: break-word"]'
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
      // Fallback: search div/td with highest paragraph and text density
      let bestEl = null;
      let maxLen = 0;
      doc.querySelectorAll('div, td, section, article').forEach(el => {
        const len = el.textContent.trim().length;
        const pCount = el.querySelectorAll('p, br').length;
        if (len > 150 && pCount >= 3 && len > maxLen) {
          maxLen = len;
          bestEl = el;
        }
      });
      if (bestEl) {
        const cloned = bestEl.cloneNode(true);
        cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        cloned.querySelectorAll('p').forEach(p => p.append('\n'));
        text = cloned.textContent || '';
      } else {
        text = doc.body.textContent || '';
      }
    }

    // Clean whitespace
    const cleanText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Anti-bot and challenge validation (Story 40, GWT 40.1, 40.2)
    const lowerText = cleanText.toLowerCase();
    if (
      /you browse can't suppport javascript|your browser can't support javascript|please enable javascript|人機驗證|cloudflare/i.test(lowerText) ||
      (cleanText.length < 80 && /javascript|forbidden|waf|captcha/i.test(lowerText))
    ) {
      throw new Error('來源網頁回傳防爬蟲驗證挑戰 (JavaScript/WAF)');
    }

    return cleanText;
  }

  /**
   * Sequentially crawl whole book with atomic incremental saves and checkpointing (ADR 0003, Story 40, Story 42)
   */
  async crawlBook(catalogUrl, options = {}) {
    const {
      delay = 2.0,
      categoryId = 'uncategorized',
      targetBookId = null,
      recordId = null,
      customTitle = '',
      selectedChapters = null, // Story 42
      onProgress = () => {}
    } = options;
    this.isCancelled = false;

    let targetChapters = selectedChapters;
    let catalog = null;
    if (!targetChapters || targetChapters.length === 0) {
      onProgress({ status: 'parsing_catalog', message: '正在連線專屬代理解析全書目錄...' });
      catalog = await this.parseCatalog(catalogUrl);
      targetChapters = catalog.chapters;
    }

    let bookId = targetBookId;
    let book = null;
    if (bookId) {
      book = await storage.getBook(bookId);
    }

    const bookTitle = customTitle.trim() || (book ? book.title : (catalog ? catalog.title : '未命名小說'));
    const bookAuthor = (book ? book.author : (catalog ? catalog.author : '未知'));

    if (!book) {
      bookId = `book_web_${Date.now()}`;
      book = {
        id: bookId,
        title: bookTitle,
        author: bookAuthor,
        sourceType: 'web',
        sourceUrl: catalogUrl,
        categoryId: categoryId || 'uncategorized',
        totalChapters: targetChapters.length,
        downloadedChaptersCount: 0,
        lastChapterIndex: 0,
        lastSentenceIndex: 0
      };
    } else {
      book.totalChapters = targetChapters.length;
      book.downloadedChaptersCount = 0;
      book.updatedAt = Date.now();
    }

    // Save initial book record
    await storage.saveBook(book);

    // Existing downloaded chapters check (for resumption)
    const existingChapters = await storage.getChaptersByBook(bookId);
    const existingMap = new Map(existingChapters.map(c => [c.index, c]));

    const total = targetChapters.length;

    for (let i = 0; i < total; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '下載已手動取消' });
        break;
      }

      const chapMeta = targetChapters[i];

      // Checkpoint check - skip if already validly downloaded and not an error placeholder
      if (existingMap.has(i)) {
        const existChap = existingMap.get(i);
        if (existChap.content && existChap.content.length > 50 && !existChap.content.includes('[本章下載受阻')) {
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
      }

      onProgress({
        status: 'downloading',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        title: chapMeta.title,
        message: `正在下載 (${i + 1}/${total}): ${chapMeta.title}`
      });

      // Story 40: Auto-retry up to 2 times with 2.5s delay
      const MAX_RETRIES = 2;
      let rawContent = '';
      let downloadError = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (this.isCancelled) break;
        try {
          rawContent = await this.fetchChapterContent(chapMeta.url);
          downloadError = null;
          break;
        } catch (err) {
          downloadError = err;
          if (attempt < MAX_RETRIES && !this.isCancelled) {
            onProgress({
              status: 'downloading',
              current: i + 1,
              total,
              percent: Math.round(((i + 1) / total) * 100),
              title: chapMeta.title,
              message: `⚠️ 第 ${i + 1} 章受阻 (${err.message})，2.5秒後自動重試 (${attempt + 1}/${MAX_RETRIES})...`
            });
            await new Promise(r => setTimeout(r, 2500));
          }
        }
      }

      if (downloadError) {
        // GWT 40.2, 40.3: 保留章節佔位（不缺號）
        rawContent = `${chapMeta.title}\n\n[本章下載受阻：來源網頁回傳防爬蟲驗證或連線異常（${downloadError.message}），章節已保留以維持全書序號連貫。點擊右上角「編輯本章」可手動貼上內容，來源網址：${chapMeta.url}]`;
        console.warn(`第 ${i + 1} 章下載受阻，已建立佔位章節維持序號:`, downloadError.message);
      }

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

      // Respectful delay to avoid WAF IP blocking
      if (i < total - 1 && delay > 0) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    // 自動保存爬蟲歷史紀錄 (Story 27)
    const allUrls = (catalog ? catalog.chapters : targetChapters).map(c => c.url).filter(Boolean);
    const lastUrl = allUrls.length > 0 ? allUrls[allUrls.length - 1] : '';
    storage.saveCrawlerRecord({
      id: recordId || undefined,
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
   * 增量下載新發布章節並附加至既有書籍末端 (Story 27, Story 40)
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

      // Story 40: Auto-retry up to 2 times with 2.5s delay
      const MAX_RETRIES = 2;
      let rawContent = '';
      let downloadError = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (this.isCancelled) break;
        try {
          rawContent = await this.fetchChapterContent(chapMeta.url);
          downloadError = null;
          break;
        } catch (err) {
          downloadError = err;
          if (attempt < MAX_RETRIES && !this.isCancelled) {
            onProgress({
              status: 'downloading',
              current: i + 1,
              total,
              percent: Math.round(((i + 1) / total) * 100),
              title: chapMeta.title,
              message: `⚠️ 新章節受阻 (${err.message})，2.5秒後自動重試 (${attempt + 1}/${MAX_RETRIES})...`
            });
            await new Promise(r => setTimeout(r, 2500));
          }
        }
      }

      if (downloadError) {
        // GWT 40.2, 40.3: 保留章節佔位（不缺號）
        rawContent = `${chapMeta.title}\n\n[本章追更受阻：來源網頁回傳防爬蟲驗證或連線異常（${downloadError.message}），章節已保留以維持全書序號連貫。點擊右上角「編輯本章」可手動貼上內容，來源網址：${chapMeta.url}]`;
        console.warn(`新章節 ${chapMeta.title} 下載受阻，已建立佔位章節:`, downloadError.message);
      }

      const { paragraphs, flatSentences } = TextSegmenter.segment(rawContent);

      downloadedList.push({
        title: chapMeta.title,
        url: chapMeta.url,
        content: rawContent,
        paragraphs,
        sentencesCount: flatSentences.length
      });

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
 * 智慧萃取章節標題中之回數/章節數 (支援主回數與子篇章語意權重，如 35(上) -> 35.1, 35(下) -> 35.3)
 */
export function parseChapterNumber(title) {
  if (!title) return null;
  const t = title.trim();

  let mainNum = null;

  // 1. 阿拉伯數字: 第105章, 第 105 回, 105., Episode 105
  const m1 = t.match(/第\s*(\d+)\s*[章回節卷部話]/i);
  if (m1) {
    mainNum = parseInt(m1[1], 10);
  } else {
    const m2 = t.match(/(?:ch|episode|ep|chapter)\s*(\d+)/i);
    if (m2) {
      mainNum = parseInt(m2[1], 10);
    } else {
      const m3 = t.match(/^(\d+)[.、\s]/);
      if (m3) {
        mainNum = parseInt(m3[1], 10);
      } else {
        // 2. 中文大寫數字: 第一百零五章, 第廿回, 第十五章
        const mCn = t.match(/第\s*([零〇一二兩三四五六七八九十拾廿百佰千仟萬]+)\s*[章回節卷部話]/);
        if (mCn) {
          mainNum = chineseToNumber(mCn[1]);
        }
      }
    }
  }

  if (mainNum === null) return null;

  // 3. 探測子篇章語意標記 (上/中/下、前篇/後篇、其之一、(1)/(2) 等)
  // 必須被括號包裹，或位於標題末尾且前面有空白/分隔符號，避免誤判一般標題中的字（如「前夕」、「天下」、「結果」）
  let subOffset = 0.0;
  const isPart1 = /[（\(【\[]\s*(?:上|上篇|前篇|前|其之一|其一|Part\s*1)\s*[）\)】\]]/i.test(t) ||
                  /(?:[\s\-_:：/]+)(?:上|上篇|前篇|其之一|其一|Part\s*1)\s*$/i.test(t);

  const isPart2 = /[（\(【\[]\s*(?:中|中篇|其之二|其二|Part\s*2)\s*[）\)】\]]/i.test(t) ||
                  /(?:[\s\-_:：/]+)(?:中|中篇|其之二|其二|Part\s*2)\s*$/i.test(t);

  const isPart3 = /[（\(【\[]\s*(?:下|下篇|後篇|後|其之三|其三|Part\s*3)\s*[）\)】\]]/i.test(t) ||
                  /(?:[\s\-_:：/]+)(?:下|下篇|後篇|其之三|其三|Part\s*3)\s*$/i.test(t);

  const isPart4 = /[（\(【\[]\s*(?:完|終|其之四|其四|Part\s*4|完結篇)\s*[）\)】\]]/i.test(t) ||
                  /(?:[\s\-_:：/]+)(?:完|終|其之四|其四|Part\s*4|完結篇)\s*$/i.test(t);

  if (isPart1 && !isPart3) {
    subOffset = 0.1;
  } else if (isPart2) {
    subOffset = 0.2;
  } else if (isPart3) {
    subOffset = 0.3;
  } else if (isPart4) {
    subOffset = 0.4;
  } else {
    // 括號數字子章節, 如: (1), (2), [3] (出現在章號之後)
    const mSubNum = t.match(/[（\(【\[]\s*(\d+)\s*[）\)】\]]/);
    if (mSubNum && parseInt(mSubNum[1], 10) !== mainNum) {
      subOffset = Math.min(0.9, parseInt(mSubNum[1], 10) * 0.01);
    }
  }

  return Math.round((mainNum + subOffset) * 100) / 100;
}

/**
 * 增量章節比對與自然拓撲排序核心演算法 (四級優先級 + 子篇章排序)
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

  // 2. 排除現存於書籍與歷史庫存池之章節 (全維度排重: CSN + URL + 完整標準化標題)
  const existingSet = new Set();
  const existingTitles = new Set();

  existingBookChapters.forEach(c => {
    if (c.url) existingSet.add(c.url);
    if (c.csn) existingSet.add(String(c.csn));
    if (c.title) existingTitles.add(c.title.trim().toLowerCase());
  });

  const historySet = new Set((historicalKeys || []).map(String));

  const candidates = uniqueList.filter(ch => {
    const urlKey = ch.url;
    const csnKey = ch.csn ? String(ch.csn) : null;
    const titleKey = (ch.title || '').trim().toLowerCase();

    const inBook = (urlKey && existingSet.has(urlKey)) ||
                   (csnKey && existingSet.has(csnKey)) ||
                   (titleKey && existingTitles.has(titleKey));

    const inHistory = (urlKey && historySet.has(urlKey)) ||
                      (csnKey && historySet.has(csnKey)) ||
                      (titleKey && historySet.has(titleKey));

    return !inBook && !inHistory;
  });

  // 3. 自然數值拓撲排序 (支援主回數與子篇章語意權重正序排列)
  let parsedCount = 0;
  const withNumbers = candidates.map(ch => {
    const num = parseChapterNumber(ch.title);
    if (num !== null) parsedCount++;
    return { ...ch, parsedNumber: num };
  });

  if (parsedCount >= Math.max(2, candidates.length * 0.4)) {
    // 依章節回數與子篇章正序排列
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

