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
    const { delay = 2.0, onProgress = () => {} } = options;
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

    if (!this.isCancelled) {
      onProgress({ status: 'completed', book, bookId, message: `全書 ${total} 章下載完成並已全數入庫！` });
    }

    return book;
  }

  cancel() {
    this.isCancelled = true;
  }
}

export const crawler = new CrawlerService();
