/**
 * new_Xreader - Crawler Service
 * Handles sequential chapter downloads via dedicated/custom Cloudflare Worker proxy (Story 8, ADR 0003)
 */

import { storage } from './storage.js?v=9.24';
import { TextSegmenter } from './segmenter.js?v=9.24';

export const DEFAULT_PROXIES = [
  { id: 'local', name: '本地伺服器直通代理 (住宅 IP/免 403 封鎖)', template: '/proxy?url={url}' },
  { id: 'dedicated', name: '專屬 Cloudflare 代理 (遠端/機房 IP: flat-dust-dbde)', template: 'https://flat-dust-dbde.zwaxchu1954.workers.dev/?url={url}' },
  { id: 'allorigins', name: 'AllOrigins (公開備用節點)', template: 'https://api.allorigins.win/raw?url={url}' }
];

/**
 * 智慧環境檢測：判定當前是否為本地伺服器或區域網路直連環境 (localhost / 127.0.0.1 / 192.168.x.x / 10.x.x.x / 172.16~31.x.x)
 */
export function isLocalEnvironment() {
  if (typeof window === 'undefined' || !window.location) return true;
  const host = window.location.hostname || '';
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return true;
  if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return true;
  return false;
}

export class CrawlerService {
  constructor() {
    this.isCancelled = false;
    this.isPaused = false;
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

    // 1. Extract Book Title (Story 43, Story 53)
    let title = '';
    const titleEl = doc.querySelector('h1, .novel-title, .book-title, .info h1, .info .title, .novel-info .title, .info-wrap .title, [itemprop="name"]');
    if (titleEl && titleEl.textContent.trim()) {
      let t = titleEl.textContent.trim();
      const m = t.match(/《([^》]+)》/);
      title = m ? m[1].trim() : t;
    } else {
      const metaTitle = doc.querySelector('meta[property="og:title"], meta[name="title"]')?.content;
      const titleTag = doc.querySelector('title');
      const candidateStr = metaTitle || titleTag?.textContent || '';
      if (candidateStr) {
        const bookMatch = candidateStr.match(/《([^》]+)》/);
        if (bookMatch) {
          title = bookMatch[1].trim();
        } else {
          title = candidateStr.replace(/【[^】]+】/g, '').replace(/目錄|最新章節|小說|線上看|全文閱讀|小说|最新章节|全文阅读/g, '').split(/[|\-_]/)[0].trim();
        }
      }
    }
    if (!title) {
      title = '未命名小說';
    }

    // 2. Extract Author (Story 43, Story 53)
    let author = '未知';
    const authorEl = doc.querySelector('.author, [itemprop="author"], #info p, .info .author, .novel-info .author, [itemprop="creator"]');
    if (authorEl && authorEl.textContent.trim()) {
      author = authorEl.textContent.replace(/作者[：:]/g, '').trim();
    } else {
      const metaAuthor = doc.querySelector('meta[property="og:novel:author"], meta[name="author"]')?.content;
      if (metaAuthor && metaAuthor.trim()) {
        author = metaAuthor.trim();
      }
    }

    // 3. Extract Chapter Links with Dedicated Container Targeting (Story 40, Story 42, Story 43)
    // First, search for dedicated chapter containers BEFORE modifying the DOM
    const containerSelectors = [
      '#allchapter',
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
   * Helper: Fetch a single HTML page and extract text, chapterTitle, nextUrl, and nextLinkText
   * @param {string} pageUrl
   */
  async _fetchSinglePage(pageUrl) {
    const html = await this.fetchHTML(pageUrl);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract nextUrl & chapterTitle BEFORE removing headers/nav
    let nextUrl = null;
    let nextLinkText = '';
    let pageChapterTitle = '';

    const titleH1 = doc.querySelector('h1, .txtnav h1, .title, .chapter-title');
    if (titleH1 && titleH1.textContent.trim()) {
      pageChapterTitle = titleH1.textContent.trim();
    }

    const allLinks = Array.from(doc.querySelectorAll('a'));

    // Prioritize explicit next page / section link ('下一頁', '下一页', '下一節', '下一节')
    let nextLink = allLinks.find(a => {
      const t = a.textContent.trim();
      return t === '下一頁' || t === '下一页' || t === '下一節' || t === '下一节' ||
             t.includes('下一頁') || t.includes('下一页') || t.includes('下一節') || t.includes('下一节');
    });

    // Fallback: look for '下一章'
    if (!nextLink) {
      nextLink = allLinks.find(a => {
        const t = a.textContent.trim();
        return t === '下一章' || t.includes('下一章');
      });
    }

    if (nextLink) {
      nextLinkText = nextLink.textContent.trim();
      const href = nextLink.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.includes('index.html') && !href.includes('/dir')) {
        try {
          nextUrl = new URL(href, pageUrl).href;
        } catch (e) {}
      }
    }

    // Remove scripts, styles, comments, ad containers, and novel543 clickforce blocks
    doc.querySelectorAll('script, style, noscript, iframe, .ad, .ads, .gadBlock, [data-ad], ins, header, footer, nav').forEach(el => el.remove());

    // Target content selectors common in novel sites (Story 40)
    const contentSelectors = [
      '#content', '.content', '#chaptercontent', '#htmlContent',
      '#txtcontent', '.txtcontent',
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

    return {
      content: cleanText,
      nextUrl,
      nextLinkText,
      chapterTitle: pageChapterTitle
    };
  }

  /**
   * Fetch chapter content from URL with automatic multi-page stitching (Story 54)
   * @param {string} chapterUrl - URL of chapter
   * @param {boolean} [returnDetails=false] - If true, returns { content, nextUrl, chapterTitle }
   */
  async fetchChapterContent(chapterUrl, returnDetails = false) {
    const page1 = await this._fetchSinglePage(chapterUrl);
    let mergedContent = page1.content;
    let pageChapterTitle = page1.chapterTitle;
    let lastNextUrl = page1.nextUrl;

    // Detect if this chapter is split into multiple sub-pages (e.g. 1/2, 2/2 or _2.html)
    let rootBase = '';
    try {
      const parsedRoot = new URL(chapterUrl);
      const rootFilename = parsedRoot.pathname.split('/').filter(Boolean).pop() || '';
      rootBase = rootFilename.replace(/\.(html?|php|aspx?)$/i, '');
    } catch (e) {}

    const isSubpageUrl = (candidateUrl) => {
      if (!candidateUrl || !rootBase) return false;
      try {
        const parsed = new URL(candidateUrl);
        const candFilename = parsed.pathname.split('/').filter(Boolean).pop() || '';
        const candBase = candFilename.replace(/\.(html?|php|aspx?)$/i, '');
        const escaped = rootBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}[_-]\\d+$`, 'i').test(candBase);
      } catch (e) {
        return false;
      }
    };

    let curPart = null;
    let totalParts = null;
    if (pageChapterTitle) {
      const fractionMatch = pageChapterTitle.match(/[\(（](\d+)\s*[/／]\s*(\d+)[\)）]/);
      if (fractionMatch) {
        curPart = parseInt(fractionMatch[1], 10);
        totalParts = parseInt(fractionMatch[2], 10);
      }
    }

    let currentUrl = chapterUrl;
    let currentNextUrl = page1.nextUrl;
    let currentNextText = page1.nextLinkText;
    const visitedUrls = new Set([chapterUrl]);
    const MAX_SUBPAGES = 10;
    let subpageCount = 0;

    while (currentNextUrl && subpageCount < MAX_SUBPAGES) {
      if (visitedUrls.has(currentNextUrl)) break;

      const isExplicitNextPage = currentNextText && (
        currentNextText === '下一頁' || currentNextText === '下一页' ||
        currentNextText === '下一節' || currentNextText === '下一节' ||
        currentNextText.includes('下一頁') || currentNextText.includes('下一页') ||
        currentNextText.includes('下一節') || currentNextText.includes('下一节')
      );
      const isSubUrl = isSubpageUrl(currentNextUrl);
      const isTitleFractionNext = (totalParts !== null && curPart !== null && curPart < totalParts && isSubUrl);

      // If this next link is definitely a continuation of the same chapter:
      if (isExplicitNextPage || isSubUrl || isTitleFractionNext) {
        visitedUrls.add(currentNextUrl);
        subpageCount++;

        try {
          // Polite delay between sub-pages
          await new Promise(r => setTimeout(r, 400));
          const subPage = await this._fetchSinglePage(currentNextUrl);

          if (subPage.content) {
            mergedContent += '\n\n' + subPage.content;
          }

          currentUrl = currentNextUrl;
          currentNextUrl = subPage.nextUrl;
          currentNextText = subPage.nextLinkText;
          lastNextUrl = subPage.nextUrl;

          // Check if sub-page title has new fraction
          if (subPage.chapterTitle) {
            const subFraction = subPage.chapterTitle.match(/[\(（](\d+)\s*[/／]\s*(\d+)[\)）]/);
            if (subFraction) {
              curPart = parseInt(subFraction[1], 10);
              totalParts = parseInt(subFraction[2], 10);
            }
          }

          // If reached final part (e.g. 2/2 or 3/3), stop fetching further sub-pages
          if (totalParts !== null && curPart !== null && curPart >= totalParts) {
            break;
          }
        } catch (subErr) {
          console.warn(`[Crawler] 抓取同章第 ${subpageCount + 1} 頁 (${currentNextUrl}) 受阻:`, subErr.message);
          break;
        }
      } else {
        // Not a continuation sub-page (points to next chapter or elsewhere)
        break;
      }
    }

    // Clean (1/2) fraction from pageChapterTitle for canonical display
    if (pageChapterTitle) {
      pageChapterTitle = pageChapterTitle.replace(/[\(（]\s*\d+\s*[/／]\s*\d+\s*[\)）]/g, '').trim();
    }

    if (returnDetails) {
      return {
        content: mergedContent,
        nextUrl: lastNextUrl,
        chapterTitle: pageChapterTitle
      };
    }

    return mergedContent;
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
      author = '',
      selectedChapters = null, // Story 42
      onProgress = () => {}
    } = options;
    this.isCancelled = false;
    this.isPaused = false;

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
    } else {
      // Story 2: 若未明確提供 targetBookId，先查詢是否已有相同 sourceUrl 的既有書籍，以利續傳與去重
      try {
        const allBooks = await storage.getBooks();
        const existingBook = allBooks.find(b => b.sourceUrl === catalogUrl || (b.sourceUrl && b.sourceUrl.replace(/\/$/, '') === catalogUrl.replace(/\/$/, '')));
        if (existingBook) {
          bookId = existingBook.id;
          book = existingBook;
        }
      } catch (err) {
        console.warn('Find existing book by sourceUrl error:', err);
      }
    }

    // Story 53: 若傳入自訂章節且未指定書名/作者，且為新書，回退解析一次目錄以取得標準書名與作者
    if (!customTitle.trim() && !book && (!catalog || !catalog.title)) {
      try {
        catalog = await this.parseCatalog(catalogUrl);
      } catch (e) {
        console.warn('Fallback parseCatalog for title/author failed:', e);
      }
    }

    const bookTitle = customTitle.trim() || (book ? book.title : (catalog ? catalog.title : '未命名小說'));
    const bookAuthor = author.trim() || (book ? book.author : (catalog ? catalog.author : '未知'));

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

    // Existing downloaded chapters check (for resumption & deduplication by index or URL)
    const existingChapters = await storage.getChaptersByBook(bookId);
    const existingMap = new Map(existingChapters.map(c => [c.index, c]));
    const existingUrlMap = new Map(existingChapters.filter(c => c.url).map(c => [c.url, c]));

    let total = targetChapters.length;
    const isTwkan = Boolean(catalogUrl && catalogUrl.includes('twkan.com'));
    const seenQueueUrls = new Set(targetChapters.map(c => c.url).filter(Boolean));

    for (let i = 0; i < total; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '下載已手動取消' });
        break;
      }
      if (this.isPaused) {
        onProgress({ status: 'paused', book, bookId, message: '下載已安全暫停（進度已保存）' });
        break;
      }

      const chapMeta = targetChapters[i];

      // Checkpoint check - skip if already validly downloaded by index or URL (and not an error placeholder)
      const existChap = existingMap.get(i) || (chapMeta.url ? existingUrlMap.get(chapMeta.url) : null);
      if (existChap) {
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
        } else if (!chapMeta.url) {
          // If this chapter was a placeholder, restore its source url so it can be re-downloaded
          if (existChap.url) {
            chapMeta.url = existChap.url;
          } else if (existChap.content && existChap.content.includes('來源網址：')) {
            const m = existChap.content.match(/來源網址：\s*(https?:\/\/[^\s\]]+)/);
            if (m) chapMeta.url = m[1].trim();
          }
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

      // Story 40 & Smart Backoff: 一般錯誤重試 2 次 (2.5s)；遇 HTTP 429 (Too Many Requests) 則進行指數退避重試最多 4 次 (6s, 10s, 15s, 20s)
      const DEFAULT_MAX_RETRIES = 2;
      let rawContent = '';
      let downloadError = null;
      let chapterDetails = null;

      for (let attempt = 0; attempt <= 4; attempt++) {
        if (this.isCancelled || this.isPaused) break;
        try {
          if (isTwkan) {
            chapterDetails = await this.fetchChapterContent(chapMeta.url, true);
            rawContent = chapterDetails.content;
            if (chapterDetails.chapterTitle && (!chapMeta.title || chapMeta.title.includes('連載章節') || chapMeta.title.includes('未命名') || chapMeta.title.includes('探測中'))) {
              chapMeta.title = chapterDetails.chapterTitle;
            }
          } else {
            rawContent = await this.fetchChapterContent(chapMeta.url);
          }
          downloadError = null;
          break;
        } catch (err) {
          downloadError = err;
          const is429 = String(err.message).includes('429');
          const maxRetries = is429 ? 4 : DEFAULT_MAX_RETRIES;

          if (attempt < maxRetries && !this.isCancelled && !this.isPaused) {
            const backoffDelays = [6000, 10000, 15000, 20000];
            const waitMs = is429 ? (backoffDelays[attempt] || 15000) : 2500;
            const waitSec = Math.round(waitMs / 1000);

            onProgress({
              status: 'downloading',
              current: i + 1,
              total,
              percent: Math.round(((i + 1) / total) * 100),
              title: chapMeta.title,
              message: is429
                ? `⚠️ 第 ${i + 1} 章遇頻率限制 (HTTP 429)，冷卻等待 ${waitSec} 秒後自動重試 (${attempt + 1}/${maxRetries})...`
                : `⚠️ 第 ${i + 1} 章受阻 (${err.message})，${waitSec}秒後自動重試 (${attempt + 1}/${maxRetries})...`
            });
            await new Promise(r => setTimeout(r, waitMs));
          } else {
            break;
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
      if (chapMeta.url) {
        existingUrlMap.set(chapMeta.url, chapter);
      }
      existingMap.set(i, chapter);

      // Update downloaded count on book
      book.downloadedChaptersCount = i + 1;
      await storage.saveBook(book);

      // twkan 專屬特製：內文「下一章」鏈式接力探測（補足被收納按鍵隱藏的中間章節）
      if (isTwkan && chapterDetails && chapterDetails.nextUrl) {
        const nextUrl = chapterDetails.nextUrl;
        const nextInQueue = targetChapters[i + 1]?.url;
        if (
          nextUrl.includes('/txt/') &&
          nextUrl !== nextInQueue &&
          !existingUrlMap.has(nextUrl) &&
          !seenQueueUrls.has(nextUrl)
        ) {
          seenQueueUrls.add(nextUrl);
          targetChapters.splice(i + 1, 0, {
            title: `連載章節 (接力探測中...)`,
            url: nextUrl,
            isLikelyChapter: true
          });
          total = targetChapters.length;
          book.totalChapters = total;
        }
      }

      // Story 2: 即時更新爬蟲斷點記錄，確保隨時中斷皆能精確記錄進度與最後章節網址
      storage.saveCrawlerRecord({
        id: recordId || undefined,
        bookId: book.id,
        bookTitle: book.title,
        sourceUrl: catalogUrl,
        sourceType: 'web',
        totalChaptersCrawled: book.downloadedChaptersCount,
        lastChapterUrl: chapMeta.url || '',
        targetCategoryId: book.categoryId,
        historicalKeys: targetChapters.slice(0, i + 1).map(c => c.url).filter(Boolean)
      });

      // Respectful delay to avoid WAF / Rate Limit IP blocking (twkan 限制每章間隔至少 3.0 秒)
      const effectiveDelay = isTwkan ? Math.max(delay, 3.0) : delay;
      if (i < total - 1 && effectiveDelay > 0 && !this.isCancelled && !this.isPaused) {
        await new Promise(r => setTimeout(r, effectiveDelay * 1000));
      }
    }

    // 自動保存爬蟲歷史紀錄 (Story 27, Story 51: 僅記錄實際下載之章節，避免未選取章節被永久判定已處理)
    const allUrls = targetChapters.map(c => c.url).filter(Boolean);
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

    if (!this.isCancelled && !this.isPaused) {
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
    this.isPaused = false;

    const record = storage.getCrawlerRecord(recordId);
    if (!record) throw new Error(`找不到爬蟲紀錄 ${recordId}`);
    const book = await storage.getBook(record.bookId);
    if (!book) throw new Error(`找不到對應書籍 ${record.bookId}`);

    // 先取得書本中現存章節 URL，避免續傳時重複抓取已追加的章節
    const existingChapters = await storage.getChaptersByBook(book.id);
    const existingUrlSet = new Set(existingChapters.map(c => c.url).filter(Boolean));
    const pendingChapters = newChapters.filter(c => !existingUrlSet.has(c.url));

    const total = newChapters.length;
    const downloadedList = [];
    const alreadyDoneCount = total - pendingChapters.length;

    onProgress({
      status: 'downloading',
      current: alreadyDoneCount,
      total,
      percent: Math.round((alreadyDoneCount / total) * 100),
      message: alreadyDoneCount > 0 ? `接關續傳追更 (${alreadyDoneCount}/${total} 篇)...` : `開始增量下載 ${total} 篇全新章節...`
    });

    for (let i = 0; i < pendingChapters.length; i++) {
      if (this.isCancelled) {
        if (downloadedList.length > 0) {
          await storage.appendChaptersToBook(book.id, downloadedList, recordId, options);
        }
        onProgress({ status: 'cancelled', message: '增量下載已取消' });
        break;
      }

      if (this.isPaused) {
        if (downloadedList.length > 0) {
          await storage.appendChaptersToBook(book.id, downloadedList, recordId, options);
        }
        const currentDone = alreadyDoneCount + downloadedList.length;
        onProgress({
          status: 'paused',
          current: currentDone,
          total,
          percent: Math.round((currentDone / total) * 100),
          message: `追更已安全暫停（已保存至第 ${currentDone} 篇，剩餘章節可接關續傳）`,
          book
        });
        return book;
      }

      const chapMeta = pendingChapters[i];
      const curIndex = alreadyDoneCount + i + 1;
      onProgress({
        status: 'downloading',
        current: curIndex,
        total,
        percent: Math.round((curIndex / total) * 100),
        title: chapMeta.title,
        message: `正在下載新章節 (${curIndex}/${total}): ${chapMeta.title}`
      });

      // Story 40: Auto-retry up to 2 times with 2.5s delay
      const MAX_RETRIES = 2;
      let rawContent = '';
      let downloadError = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (this.isCancelled || this.isPaused) break;
        try {
          rawContent = await this.fetchChapterContent(chapMeta.url);
          downloadError = null;
          break;
        } catch (err) {
          downloadError = err;
          if (attempt < MAX_RETRIES && !this.isCancelled && !this.isPaused) {
            onProgress({
              status: 'downloading',
              current: curIndex,
              total,
              percent: Math.round((curIndex / total) * 100),
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
        isBackfill: !!chapMeta.isBackfill,
        onlineIndex: chapMeta.onlineIndex !== undefined ? chapMeta.onlineIndex : null,
        content: rawContent,
        paragraphs,
        sentencesCount: flatSentences.length
      });

      if (i < pendingChapters.length - 1 && delay > 0) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    if (downloadedList.length > 0) {
      // 附加至原書 (支援補抓章節自動重整順序)
      await storage.appendChaptersToBook(book.id, downloadedList, recordId, options);
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

  pause() {
    this.isPaused = true;
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
 * 增量章節比對與自然拓撲排序核心演算法 (Story 51: 支援區分最新連載與先前未下載補抓)
 * @param {Array<Object>} onlineChapters - [{ title, url, csn }]
 * @param {Array<Object>} existingBookChapters - 書籍中現存章節 [{ title, url, csn }]
 * @param {Array<string>} historicalKeys - 爬蟲歷史已抓取池
 * @returns {{ newChapters: Array<Object>, newReleases: Array<Object>, backfillChapters: Array<Object>, totalOnline: number, maxExistingOnlineIndex: number }}
 */
export function diffOnlineChapters(onlineChapters = [], existingBookChapters = [], historicalKeys = []) {
  // 1. URL/CSN 唯一碼去重並記錄線上自然順序
  const uniqueList = [];
  const seenUrls = new Set();

  for (let i = 0; i < onlineChapters.length; i++) {
    const ch = onlineChapters[i];
    const key = ch.url || (ch.csn ? `csn_${ch.csn}` : null);
    if (key && !seenUrls.has(key)) {
      seenUrls.add(key);
      uniqueList.push({
        ...ch,
        onlineIndex: uniqueList.length
      });
    }
  }

  // 2. 建立現存章節集合與最大已存在之線上目錄位置
  const existingSet = new Set();
  const existingTitles = new Set();

  existingBookChapters.forEach(c => {
    if (c.url) existingSet.add(c.url);
    if (c.csn) existingSet.add(String(c.csn));
    if (c.title) existingTitles.add(c.title.trim().toLowerCase());
  });

  let maxExistingOnlineIndex = -1;
  uniqueList.forEach(ch => {
    const urlKey = ch.url;
    const csnKey = ch.csn ? String(ch.csn) : null;
    const titleKey = (ch.title || '').trim().toLowerCase();

    const inBook = (urlKey && existingSet.has(urlKey)) ||
                   (csnKey && existingSet.has(csnKey)) ||
                   (titleKey && existingTitles.has(titleKey));

    if (inBook && ch.onlineIndex > maxExistingOnlineIndex) {
      maxExistingOnlineIndex = ch.onlineIndex;
    }
  });

  // 3. 篩選缺漏章節並區分「最新連載」與「先前未下載 (補抓)」(Story 51, GWT 51.1)
  const candidates = [];
  uniqueList.forEach(ch => {
    const urlKey = ch.url;
    const csnKey = ch.csn ? String(ch.csn) : null;
    const titleKey = (ch.title || '').trim().toLowerCase();

    const inBook = (urlKey && existingSet.has(urlKey)) ||
                   (csnKey && existingSet.has(csnKey)) ||
                   (titleKey && existingTitles.has(titleKey));

    if (!inBook) {
      // 若章節在線上目錄中的位置小於等於目前書庫擁有的最大目錄序號，代表為先前跳過/未下載之章節 (補抓)
      const isBackfill = (maxExistingOnlineIndex >= 0 && ch.onlineIndex <= maxExistingOnlineIndex);
      const isNewRelease = !isBackfill;

      candidates.push({
        ...ch,
        isBackfill,
        isNewRelease
      });
    }
  });

  // 4. 自然目錄拓撲排序 (Story 53: 嚴格以線上目錄發布順序 onlineIndex 為基準主排序，避免跨卷 VIP 重新編號穿插錯亂)
  const withNumbers = candidates.map(ch => {
    const num = parseChapterNumber(ch.title);
    return { ...ch, parsedNumber: num };
  });

  // 線上目錄索引已忠實反映作者與網站發布之自然順序，依 onlineIndex 穩定排序
  withNumbers.sort((a, b) => (a.onlineIndex || 0) - (b.onlineIndex || 0));

  const newReleases = withNumbers.filter(c => c.isNewRelease);
  const backfillChapters = withNumbers.filter(c => c.isBackfill);

  return {
    newChapters: withNumbers,
    newReleases,
    backfillChapters,
    totalOnline: uniqueList.length,
    maxExistingOnlineIndex
  };
}

export const crawler = new CrawlerService();

