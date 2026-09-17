/**
 * new_Xreader - Bahamut Gamer Home Creation Crawler Service
 * Handles cross-page crawling, API parsing, and article extraction from Bahamut Gamer Home.
 */

import { storage } from './storage.js';
import { TextSegmenter } from './segmenter.js';
import { DEFAULT_PROXIES } from './crawler.js';

export class BahaCrawlerService {
  constructor() {
    this.isCancelled = false;
  }

  cancel() {
    this.isCancelled = true;
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

  /**
   * Fetch text or JSON via the active CORS proxy
   */
  async fetchViaProxy(url) {
    const template = this.getActiveProxyTemplate();
    const proxyUrl = template.replace('{url}', encodeURIComponent(url));

    const resp = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8'
      }
    });

    if (!resp.ok) {
      throw new Error(`代理請求失敗: HTTP ${resp.status}`);
    }
    return await resp.text();
  }

  /**
   * Parse user input into Bahamut owner, kind1, or folder
   * Supported formats:
   *  - https://home.gamer.com.tw/profile/index_creation.php?owner=play21210&kind1=2
   *  - https://home.gamer.com.tw/artwork.php?sn=6398988 (will detect creation)
   *  - https://home.gamer.com.tw/play21210
   *  - play21210 (raw username)
   */
  parseInput(input) {
    const trimmed = (input || '').trim();
    if (!trimmed) {
      throw new Error('請輸入巴哈小屋網址或帳號！');
    }

    let owner = '';
    let kind1 = null;
    let folder = null;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const urlObj = new URL(trimmed);
        const params = urlObj.searchParams;

        if (params.has('owner')) {
          owner = params.get('owner');
        } else {
          // Check path e.g. /play21210
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0 && !pathParts[0].includes('.')) {
            owner = pathParts[0];
          }
        }

        if (params.has('kind1')) {
          const k = parseInt(params.get('kind1'), 10);
          if (!isNaN(k) && k >= 0) kind1 = k;
        }

        if (params.has('folder')) {
          const f = parseInt(params.get('folder'), 10);
          if (!isNaN(f) && f >= 0) folder = f;
        }
      } catch (e) {
        throw new Error('無效的巴哈姆特網址格式: ' + e.message);
      }
    } else {
      // Direct username or query string
      if (trimmed.includes('owner=')) {
        const match = trimmed.match(/owner=([^&]+)/);
        if (match) owner = match[1];
        const kMatch = trimmed.match(/kind1=([^&]+)/);
        if (kMatch) kind1 = parseInt(kMatch[1], 10);
        const fMatch = trimmed.match(/folder=([^&]+)/);
        if (fMatch) folder = parseInt(fMatch[1], 10);
      } else {
        owner = trimmed;
      }
    }

    if (!owner) {
      throw new Error('未能自網址中辨識出巴哈姆特屋主帳號 (owner)！');
    }

    return { owner, kind1, folder };
  }

  /**
   * Fetch creation catalog across pages
   */
  async fetchCatalog(input, options = {}) {
    const { owner, kind1, folder } = typeof input === 'string' ? this.parseInput(input) : input;
    const {
      startPage = 1,
      endPage = null,
      sortOrder = 'asc', // 'asc': 舊到新, 'desc': 新到舊
      onProgress = () => {}
    } = options;

    onProgress({ status: 'fetching_catalog', message: `正在連線巴哈 API 探測屋主 [${owner}] 的創作清單...` });

    // Step 1: Fetch Page 1 to inspect totalPage
    const firstPageUrl = this.buildApiUrl(owner, 1, 30, kind1, folder);
    const firstPageText = await this.fetchViaProxy(firstPageUrl);
    let firstPageData;
    try {
      firstPageData = JSON.parse(firstPageText);
    } catch (e) {
      throw new Error('巴哈 API 回傳格式非合法 JSON: ' + firstPageText.substring(0, 100));
    }

    if (!firstPageData || !firstPageData.data) {
      throw new Error('巴哈 API 查無資料，請確認該屋主帳號或分類是否存在。');
    }

    const totalPage = parseInt(firstPageData.data.totalPage, 10) || 1;
    const firstPageList = firstPageData.data.list || [];

    if (firstPageList.length === 0) {
      throw new Error(`屋主 [${owner}] 此分類下查無任何創作文章。`);
    }

    // Determine page range
    const effectiveStartPage = Math.max(1, startPage);
    const effectiveEndPage = endPage && endPage > 0 ? Math.min(endPage, totalPage) : totalPage;

    if (effectiveStartPage > effectiveEndPage) {
      throw new Error(`起始頁數 (${effectiveStartPage}) 不得大於結束頁數 (${effectiveEndPage})！`);
    }

    onProgress({
      status: 'fetching_catalog',
      message: `偵測完成！總頁數為 ${totalPage} 頁，預計抓取第 ${effectiveStartPage} 頁至第 ${effectiveEndPage} 頁...`
    });

    let allArticles = [];

    // Loop through requested pages
    for (let p = effectiveStartPage; p <= effectiveEndPage; p++) {
      if (this.isCancelled) {
        throw new Error('目錄抓取已取消');
      }

      let pageItems = [];
      if (p === 1) {
        pageItems = firstPageList;
      } else {
        onProgress({
          status: 'fetching_catalog',
          message: `正在讀取創作清單 (第 ${p}/${effectiveEndPage} 頁)...`
        });
        const pageUrl = this.buildApiUrl(owner, p, 30, kind1, folder);
        const pageText = await this.fetchViaProxy(pageUrl);
        try {
          const pageJson = JSON.parse(pageText);
          pageItems = (pageJson && pageJson.data && pageJson.data.list) ? pageJson.data.list : [];
        } catch (e) {
          console.warn(`第 ${p} 頁清單解析失敗:`, e);
        }
      }

      allArticles.push(...pageItems);

      // Mild delay between page requests
      if (p < effectiveEndPage) {
        await new Promise(r => setTimeout(r, 350));
      }
    }

    if (allArticles.length === 0) {
      throw new Error('未能在指定分頁範圍內取得任何文章。');
    }

    // Sort order:
    // Bahamut API returns Page 1 newest first -> Page N oldest last.
    // 'asc' (正序: 舊到新) => reverse the entire collected array.
    // 'desc' (倒序: 新到舊) => preserve original order.
    if (sortOrder === 'asc') {
      allArticles.reverse();
    }

    // Attempt smart book title deduction (e.g. check for common 《...》)
    const inferredTitle = this.detectBookTitle(allArticles, owner, kind1);

    return {
      owner,
      kind1,
      folder,
      title: inferredTitle,
      author: owner,
      totalArticles: allArticles.length,
      totalPages: totalPage,
      articles: allArticles.map((a, idx) => ({
        csn: a.csn,
        title: a.title ? a.title.trim() : `第 ${idx + 1} 篇`,
        ctime: a.ctime || '',
        url: `https://home.gamer.com.tw/artwork.php?sn=${a.csn}`
      }))
    };
  }

  buildApiUrl(owner, page, row = 30, kind1 = null, folder = null) {
    let url = `https://api.gamer.com.tw/home/v2/creation_list.php?owner=${encodeURIComponent(owner)}&page=${page}&row=${row}`;
    if (kind1 !== null && kind1 !== undefined) {
      url += `&kind1=${kind1}`;
    }
    if (folder !== null && folder !== undefined) {
      url += `&folder=${folder}`;
    }
    return url;
  }

  /**
   * Smart deduction of book title based on common 《...》 or author
   */
  detectBookTitle(articles, owner, kind1) {
    const titleCounts = {};
    for (const a of articles) {
      const match = (a.title || '').match(/《([^》]+)》|【([^】]+)】/);
      if (match) {
        const bookName = match[1] || match[2];
        if (bookName && bookName.length >= 2) {
          titleCounts[bookName] = (titleCounts[bookName] || 0) + 1;
        }
      }
    }

    let topName = '';
    let maxCount = 0;
    for (const [name, count] of Object.entries(titleCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topName = name;
      }
    }

    // If more than 30% of articles share the same 《BookName》, use it
    if (topName && maxCount >= Math.max(2, articles.length * 0.3)) {
      return topName;
    }

    return `${owner} 的小屋創作${kind1 ? ` (分類:${kind1})` : ''}`;
  }

  /**
   * Fetch and clean article content from artwork.php
   */
  async fetchArticleContent(csn) {
    const url = `https://home.gamer.com.tw/artwork.php?sn=${csn}`;
    const html = await this.fetchViaProxy(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract title
    let title = '';
    const h1 = doc.querySelector('h1.article-title');
    if (h1 && h1.textContent.trim()) {
      title = h1.textContent.trim();
    } else {
      const titleTag = doc.querySelector('title');
      if (titleTag) {
        title = titleTag.textContent.replace(/ - [^-]+ - 巴哈姆特/g, '').trim();
      }
    }

    // Extract article content
    const contentEl = doc.querySelector('#article_content, .article_container, #article');
    if (!contentEl) {
      throw new Error(`無法在文章頁面 (sn=${csn}) 找到內文區塊！`);
    }

    // Clone and sanitize DOM
    const cloned = contentEl.cloneNode(true);
    cloned.querySelectorAll('script, style, noscript, iframe, .ad, .ads, .FM-cbox, .gallery-box-cover, .article-footer').forEach(el => el.remove());

    // Replace line breaking elements with newline
    cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    cloned.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li, tr').forEach(el => el.append('\n'));

    const rawText = cloned.textContent || '';
    const cleanText = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return {
      title: title || `文章 (sn:${csn})`,
      content: cleanText
    };
  }

  /**
   * Execute full Bahamut crawl with progress tracking and storage integration
   */
  async crawlBaha(input, options = {}) {
    const {
      delay = 1.5,
      customTitle = '',
      startPage = 1,
      endPage = null,
      sortOrder = 'asc',
      categoryId = 'uncategorized',
      onProgress = () => {}
    } = options;

    this.isCancelled = false;

    // 1. Fetch cross-page catalog
    const catalog = await this.fetchCatalog(input, {
      startPage,
      endPage,
      sortOrder,
      onProgress
    });

    const bookTitle = customTitle.trim() || catalog.title;
    const bookId = `book_baha_${Date.now()}`;
    const book = {
      id: bookId,
      title: bookTitle,
      author: catalog.author,
      sourceType: 'bahamut',
      sourceUrl: typeof input === 'string' ? input : `https://home.gamer.com.tw/profile/index_creation.php?owner=${catalog.owner}`,
      categoryId: categoryId || 'uncategorized',
      totalChapters: catalog.articles.length,
      downloadedChaptersCount: 0,
      lastChapterIndex: 0,
      lastSentenceIndex: 0
    };

    // Save initial book record
    await storage.saveBook(book);

    const total = catalog.articles.length;
    onProgress({
      status: 'downloading',
      current: 0,
      total,
      percent: 0,
      message: `已解析出 ${total} 篇作品，開始依序下載內文...`
    });

    for (let i = 0; i < total; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '巴哈創作下載已取消' });
        break;
      }

      const article = catalog.articles[i];
      try {
        const { title, content } = await this.fetchArticleContent(article.csn);
        const { paragraphs, flatSentences } = TextSegmenter.segment(content);

        const chapter = {
          id: `chap_${bookId}_${i}`,
          bookId,
          index: i,
          title: title || article.title,
          url: article.url,
          csn: article.csn,
          content,
          paragraphs,
          sentencesCount: flatSentences.length
        };

        await storage.saveChapter(chapter);
      } catch (err) {
        console.warn(`文章 [${article.title}] 下載失敗:`, err);
      }

      book.downloadedChaptersCount = i + 1;
      await storage.saveBook(book);

      const percent = Math.round(((i + 1) / total) * 100);
      onProgress({
        status: 'downloading',
        current: i + 1,
        total,
        percent,
        title: article.title,
        message: `下載中 (${i + 1}/${total}): ${article.title}`
      });

      if (i < total - 1 && delay > 0) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    // 自動保存爬蟲歷史紀錄 (Story 27)
    const allCsns = catalog.articles.map(a => String(a.csn)).filter(Boolean);
    const allUrls = catalog.articles.map(a => a.url).filter(Boolean);
    const lastArticle = catalog.articles[catalog.articles.length - 1];
    storage.saveCrawlerRecord({
      bookId: book.id,
      bookTitle: book.title,
      sourceUrl: book.sourceUrl,
      sourceType: 'bahamut',
      totalChaptersCrawled: book.downloadedChaptersCount,
      lastChapterUrl: lastArticle ? lastArticle.url : '',
      lastChapterCsn: lastArticle ? lastArticle.csn : null,
      targetCategoryId: book.categoryId,
      historicalKeys: [...allCsns, ...allUrls]
    });

    if (!this.isCancelled) {
      onProgress({
        status: 'completed',
        message: `《${book.title}》下載完成！共收錄 ${book.downloadedChaptersCount} 篇創作。`,
        book
      });
    }

    return book;
  }

  /**
   * 增量下載巴哈小屋新創作並附加至書籍末端 (Story 27)
   */
  async crawlBahaIncremental(recordId, newArticles, options = {}) {
    const { delay = 1.5, onProgress = () => {} } = options;
    this.isCancelled = false;

    const record = storage.getCrawlerRecord(recordId);
    if (!record) throw new Error(`找不到巴哈爬蟲紀錄 ${recordId}`);
    const book = await storage.getBook(record.bookId);
    if (!book) throw new Error(`找不到對應書籍 ${record.bookId}`);

    const total = newArticles.length;
    const downloadedList = [];

    onProgress({
      status: 'downloading',
      current: 0,
      total,
      percent: 0,
      message: `開始增量下載 ${total} 篇全新巴哈創作...`
    });

    for (let i = 0; i < total; i++) {
      if (this.isCancelled) {
        onProgress({ status: 'cancelled', message: '增量下載已取消' });
        break;
      }

      const art = newArticles[i];
      onProgress({
        status: 'downloading',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        title: art.title,
        message: `正在下載 (${i + 1}/${total}): ${art.title}`
      });

      try {
        const { title, content } = await this.fetchArticleContent(art.csn);
        const { paragraphs, flatSentences } = TextSegmenter.segment(content);

        downloadedList.push({
          title: title || art.title,
          url: art.url,
          csn: art.csn,
          content,
          paragraphs,
          sentencesCount: flatSentences.length
        });
      } catch (err) {
        console.warn(`文章 [${art.title}] 下載失敗:`, err);
      }

      if (i < total - 1 && delay > 0) {
        await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    if (downloadedList.length > 0) {
      await storage.appendChaptersToBook(book.id, downloadedList, recordId);
      onProgress({
        status: 'completed',
        book,
        bookId: book.id,
        appendedCount: downloadedList.length,
        message: `《${book.title}》追更完成！成功追加 ${downloadedList.length} 篇新創作。`
      });
    }

    return book;
  }
}

export const bahaCrawler = new BahaCrawlerService();

