/**
 * Xreader - Novel Catalog Sequential Crawler
 * Handles fetching, parsing directory pages, and downloading chapters with polite rate limiting.
 */

import { db } from './db.js';
import { TextSegmenter } from './segmenter.js';

// Pre-configured public CORS proxies
export const PROXIES = [
  { name: 'CorsProxy.io', template: 'https://corsproxy.io/?{url}' },
  { name: 'AllOrigins', template: 'https://api.allorigins.win/raw?url={url}' }
];

export class XreaderCrawler {
  constructor() {
    this.currentProxyIndex = 0;
    this.isCancelled = false;
  }

  /**
   * Helper to fetch HTML through a CORS proxy.
   * Cycles through proxies on failure.
   */
  async fetchHTML(url, customProxy = '') {
    const fetchWithProxy = async (proxyTemplate, targetUrl) => {
      const proxyUrl = proxyTemplate.replace('{url}', encodeURIComponent(targetUrl));
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.text();
    };

    if (customProxy) {
      try {
        return await fetchWithProxy(customProxy, url);
      } catch (e) {
        console.error(`Custom proxy failed, falling back to built-ins:`, e);
      }
    }

    // Try built-in proxies starting from current index
    let lastError = null;
    for (let i = 0; i < PROXIES.length; i++) {
      const idx = (this.currentProxyIndex + i) % PROXIES.length;
      const proxy = PROXIES[idx];
      try {
        console.log(`Fetching via proxy: ${proxy.name}`);
        const html = await fetchWithProxy(proxy.template, url);
        this.currentProxyIndex = idx; // Update current success proxy
        return html;
      } catch (e) {
        console.warn(`Proxy ${proxy.name} failed:`, e);
        lastError = e;
      }
    }
    throw lastError || new Error('All CORS proxies failed to fetch content.');
  }

  /**
   * Parses a directory/catalog URL and extracts chapter link list.
   * @param {string} catalogUrl - The URL of the table of contents.
   * @param {string} [customProxy]
   * @returns {Promise<{bookTitle: string, chapters: Array<{title: string, url: string}>}>}
   */
  async parseCatalog(catalogUrl, customProxy = '') {
    const html = await this.fetchHTML(catalogUrl, customProxy);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Guess Book Title
    let bookTitle = '未命名書籍';
    const h1 = doc.querySelector('h1');
    if (h1) {
      bookTitle = h1.textContent.trim();
    } else {
      const titleTag = doc.querySelector('title');
      if (titleTag) {
        bookTitle = titleTag.textContent.replace(/目錄|最新章節|小說|黃金屋/g, '').trim();
      }
    }

    // 2. Extract Links
    const anchors = Array.from(doc.querySelectorAll('a'));
    const parsedChapters = [];
    const absoluteBase = new URL(catalogUrl);

    // Filter rules:
    // Identify links with common patterns or located in lists/tables
    const urlPattern = /\/Book\/Read\/|\/read\/|\/chapter\/|chapter/i;

    for (const a of anchors) {
      const href = a.getAttribute('href');
      if (!href) continue;

      try {
        const fullUrl = new URL(href, absoluteBase).href;
        const text = a.textContent.trim();

        // Validate if it is a chapter link:
        // Must contain text and look like a chapter title, or match typical novel site route patterns
        const isChapterText = /第.+[章節回]|\d+|Chapter|Part/i.test(text);
        const matchesRoute = urlPattern.test(href);

        if (text && (isChapterText || matchesRoute) && text.length < 50) {
          // Avoid duplicate links
          if (!parsedChapters.some(c => c.url === fullUrl)) {
            parsedChapters.push({
              title: text,
              url: fullUrl
            });
          }
        }
      } catch (e) {
        // Skip invalid URL conversions
      }
    }

    if (parsedChapters.length === 0) {
      throw new Error('未能在目錄頁中自動識別出任何章節連結，請嘗試書籤小工具擷取。');
    }

    return {
      bookTitle,
      chapters: parsedChapters
    };
  }

  /**
   * Crawls a list of chapters sequentially with polite delays.
   * Saves progress incrementally.
   */
  async downloadChapters(bookId, chaptersList, options = {}) {
    const {
      delayMs = 2000,
      customProxy = '',
      onProgress = () => {},
      onComplete = () => {}
    } = options;

    this.isCancelled = false;
    let successCount = 0;

    // Load `@mozilla/readability` dynamically
    let Readability;
    try {
      const readabilityModule = await import('https://esm.sh/@mozilla/readability@0.5.0');
      Readability = readabilityModule.Readability;
    } catch (e) {
      console.error('Failed to load Readability from CDN:', e);
      // Fallback parser placeholder
      Readability = class {
        constructor(doc) { this.doc = doc; }
        parse() {
          const bodyClone = this.doc.body.cloneNode(true);
          // Strip tags
          bodyClone.querySelectorAll('script, style, iframe, nav, footer, header').forEach(el => el.remove());
          return { textContent: bodyClone.textContent.trim() };
        }
      };
    }

    for (let i = 0; i < chaptersList.length; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '已取消下載' });
        return;
      }

      const chap = chaptersList[i];
      onProgress({
        status: 'fetching',
        index: i,
        total: chaptersList.length,
        chapterTitle: chap.title,
        message: `正在下載第 ${i + 1}/${chaptersList.length} 章：${chap.title}`
      });

      try {
        // Check if chapter already exists in database (to support resuming)
        const existing = await db.getChapter(bookId, i);
        if (existing && existing.content && existing.content.length > 0) {
          console.log(`Chapter ${i} already exists in DB. Skipping fetch.`);
          successCount++;
          continue;
        }

        // Fetch HTML via proxy
        const html = await this.fetchHTML(chap.url, customProxy);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        // Extract content using Readability
        const reader = new Readability(doc);
        const article = reader.parse();
        let contentText = '';

        if (article && article.textContent) {
          contentText = article.textContent;
        } else {
          // Fallback: search for typical content divs
          const contentDiv = doc.querySelector('#content, .content, #article, .article, .post-content, #htmlContent');
          contentText = contentDiv ? contentDiv.textContent : doc.body.textContent;
        }

        // Clean content text (remove excess HTML entities, watermarks)
        contentText = contentText
          .replace(/&nbsp;/g, ' ')
          .replace(/　　/g, '\n') // Keep paragraph indentations
          .replace(/\n{3,}/g, '\n\n'); // Collapse excessive newlines

        // Segment text into structured paragraph/sentence array
        const segmented = TextSegmenter.segment(contentText);

        // Save to IndexedDB
        await db.saveChapter({
          bookId: bookId,
          chapterIndex: i,
          title: chap.title,
          url: chap.url,
          content: segmented
        });

        successCount++;

        // Polite sleep (jitter delay of +/- 25% of delayMs)
        if (i < chaptersList.length - 1) {
          const jitter = (Math.random() - 0.5) * 0.5 * delayMs;
          const sleepTime = Math.max(500, delayMs + jitter);
          console.log(`Sleeping for ${Math.round(sleepTime)}ms...`);
          await new Promise(resolve => setTimeout(resolve, sleepTime));
        }

      } catch (err) {
        console.error(`Failed to download chapter ${i}: ${chap.title}`, err);
        onProgress({
          status: 'error',
          index: i,
          total: chaptersList.length,
          chapterTitle: chap.title,
          message: `下載失敗：${chap.title} (${err.message})`
        });
        
        // Wait longer before continuing on error
        await new Promise(resolve => setTimeout(resolve, delayMs * 2));
      }
    }

    onProgress({
      status: 'complete',
      message: `下載完成！成功 ${successCount} 章，失敗 ${chaptersList.length - successCount} 章`
    });
    onComplete();
  }

  cancel() {
    this.isCancelled = true;
  }
}

export const crawler = new XreaderCrawler();
export default crawler;
