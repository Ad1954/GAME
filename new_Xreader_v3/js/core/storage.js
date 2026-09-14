/**
 * new_Xreader - StorageModule (IndexedDB)
 * Database: NewXreaderDB (Decoupled from legacy database per ADR 0001)
 */

import { TextSegmenter } from './segmenter.js';

export async function sendServerLog(tag, message, level = 'info') {
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, message, level })
    }).catch(() => {});
  } catch (e) {}
}

const DB_NAME = 'NewXreaderDB';
const DB_VERSION = 1;

class StorageModule {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Books Store
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Chapters Store
        if (!db.objectStoreNames.contains('chapters')) {
          const chapStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chapStore.createIndex('bookId', 'bookId', { unique: false });
          chapStore.createIndex('bookId_index', ['bookId', 'index'], { unique: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[Storage] NewXreaderDB initialized successfully.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[Storage] IndexedDB initialization failed:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveBook(book) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books'], 'readwrite');
      const store = tx.objectStore('books');
      book.updatedAt = Date.now();
      if (!book.createdAt) book.createdAt = Date.now();
      const req = store.put(book);
      req.onsuccess = () => resolve(book);
      req.onerror = () => reject(req.error);
    });
  }

  async getBook(bookId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books'], 'readonly');
      const store = tx.objectStore('books');
      const req = store.get(bookId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllBooks() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books'], 'readonly');
      const store = tx.objectStore('books');
      const req = store.getAll();
      req.onsuccess = () => {
        const books = req.result || [];
        // Sort by updatedAt descending
        books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(books);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteBook(bookId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['books', 'chapters'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const chapStore = tx.objectStore('chapters');

      // Delete book
      bookStore.delete(bookId);

      // Delete all chapters belonging to bookId
      const index = chapStore.index('bookId');
      const req = index.openKeyCursor(IDBKeyRange.only(bookId));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          chapStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        console.log(`[Storage] Book ${bookId} and its chapters deleted.`);
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveChapter(chapter) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      const req = store.put(chapter);
      req.onsuccess = () => resolve(chapter);
      req.onerror = () => reject(req.error);
    });
  }

  async getChapter(bookId, index) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readonly');
      const store = tx.objectStore('chapters');
      const idx = store.index('bookId_index');
      const req = idx.get([bookId, index]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getChaptersByBook(bookId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readonly');
      const store = tx.objectStore('chapters');
      const idx = store.index('bookId');
      const req = idx.getAll(IDBKeyRange.only(bookId));
      req.onsuccess = () => {
        const chapters = req.result || [];
        chapters.sort((a, b) => a.index - b.index);
        resolve(chapters);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updateProgress(bookId, chapterIndex, sentenceIndex = 0) {
    await this.init();
    const book = await this.getBook(bookId);
    if (!book) return;
    book.lastChapterIndex = chapterIndex;
    book.lastSentenceIndex = sentenceIndex;
    book.updatedAt = Date.now();
    await this.saveBook(book);
  }

  async exportBookAsText(bookId) {
    const book = await this.getBook(bookId);
    if (!book) throw new Error('找不到書籍');
    const chapters = await this.getChaptersByBook(bookId);

    let textContent = `${book.title}\n作者: ${book.author || '未知'}\n\n`;
    for (const chap of chapters) {
      textContent += `\n\n====================\n${chap.title}\n====================\n\n`;
      textContent += chap.content || '';
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return { blob, filename: `${book.title}.txt` };
  }

  async exportBookAsJson(bookId) {
    const book = await this.getBook(bookId);
    if (!book) throw new Error('找不到書籍');
    const chapters = await this.getChaptersByBook(bookId);

    const backupData = {
      version: 'new_Xreader_v1',
      exportedAt: new Date().toISOString(),
      book,
      chapters
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json;charset=utf-8' });
    return { blob, filename: `${book.title}_backup.json` };
  }

  async importBookFromJson(jsonString, onProgress) {
    await this.init();
    const data = JSON.parse(jsonString);
    if (!data.book || !Array.isArray(data.chapters)) {
      throw new Error('無效的備份檔案格式');
    }
    const book = data.book;
    const bookId = book.id || `book_${Date.now()}`;
    book.id = bookId;
    book.lastChapterIndex = book.lastChapterIndex ?? book.lastReadChapterIndex ?? 0;
    book.lastSentenceIndex = book.lastSentenceIndex ?? book.lastReadSentenceIndex ?? 0;

    sendServerLog('Storage', `開始匯入書籍《${book.title}》共 ${data.chapters.length} 章...`);

    // 1. Purge any legacy/corrupted chapters for this bookId first
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      const idx = store.index('bookId');
      const req = idx.openKeyCursor(IDBKeyRange.only(bookId));

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve(true);
        }
      };
      tx.onerror = () => reject(tx.error);
    });

    // 2. Normalize all chapters (supporting old nested { type: 'paragraph', sentences: string[] })
    const normalizedChapters = [];
    for (let i = 0; i < data.chapters.length; i++) {
      const rawChap = data.chapters[i];
      const chapIdx = (rawChap.index !== undefined)
        ? rawChap.index
        : ((rawChap.chapterIndex !== undefined) ? rawChap.chapterIndex : i);

      let paragraphs = [];
      let rawContent = '';
      let sentencesCount = 0;

      // Check if rawChap.content is old Xreader paragraph array: [ { type: 'paragraph', sentences: [...] } ]
      if (Array.isArray(rawChap.content) && rawChap.content.length > 0 && typeof rawChap.content[0] === 'object' && rawChap.content[0] !== null && Array.isArray(rawChap.content[0].sentences)) {
        let globalIdx = 0;
        paragraphs = rawChap.content.map((p, pIdx) => {
          const sList = (p.sentences || []).map(s => {
            const text = (typeof s === 'object' && s !== null && s.text !== undefined) ? String(s.text).trim() : String(s).trim();
            return {
              globalIndex: globalIdx++,
              text: text
            };
          });
          return {
            id: pIdx,
            sentences: sList
          };
        });
        sentencesCount = globalIdx;
        rawContent = rawChap.content.map(p => (p.sentences || []).map(s => (typeof s === 'object' && s !== null && s.text !== undefined) ? s.text : s).join('')).join('\n\n');
      } else if (rawChap.paragraphs && Array.isArray(rawChap.paragraphs) && rawChap.paragraphs.length > 0) {
        let globalIdx = 0;
        paragraphs = rawChap.paragraphs.map((p, pIdx) => {
          const sList = (p.sentences || []).map(s => {
            const text = (typeof s === 'object' && s !== null && s.text !== undefined) ? String(s.text).trim() : String(s).trim();
            return {
              globalIndex: globalIdx++,
              text: text
            };
          });
          return {
            id: pIdx,
            sentences: sList
          };
        });
        sentencesCount = globalIdx;
        rawContent = typeof rawChap.content === 'string' ? rawChap.content : paragraphs.map(p => p.sentences.map(s => s.text).join('')).join('\n\n');
      } else {
        if (Array.isArray(rawChap.content)) {
          rawContent = rawChap.content.map(s => String(s)).join('\n');
        } else {
          rawContent = String(rawChap.content || '');
        }
        const seg = TextSegmenter.segment(rawContent);
        paragraphs = seg.paragraphs;
        sentencesCount = seg.flatSentences.length;
      }

      normalizedChapters.push({
        id: `${bookId}_${chapIdx}`,
        bookId: bookId,
        index: chapIdx,
        title: rawChap.title || `第 ${chapIdx + 1} 章`,
        url: rawChap.url || '',
        content: rawContent,
        paragraphs: paragraphs,
        sentencesCount: sentencesCount
      });
    }

    // 3. Batch write in chunks of 100 chapters with progress reporting
    const CHUNK_SIZE = 100;
    const totalChapters = normalizedChapters.length;
    const totalChunks = Math.ceil(totalChapters / CHUNK_SIZE);

    for (let c = 0; c < totalChapters; c += CHUNK_SIZE) {
      const chunk = normalizedChapters.slice(c, c + CHUNK_SIZE);
      const chunkNum = Math.floor(c / CHUNK_SIZE) + 1;

      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        for (const chap of chunk) {
          store.put(chap);
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => {
          const errMsg = tx.error ? tx.error.message : '未知寫入錯誤';
          sendServerLog('Storage', `批次 ${chunkNum}/${totalChunks} 寫入失敗: ${errMsg}`, 'error');
          reject(tx.error);
        };
      });

      const doneCount = Math.min(c + CHUNK_SIZE, totalChapters);
      if (onProgress) {
        onProgress(doneCount, totalChapters);
      }
      sendServerLog('Storage', `批次 ${chunkNum}/${totalChunks} 完成：已寫入 ${doneCount}/${totalChapters} 章 (${Math.round(doneCount / totalChapters * 100)}%)`);
    }

    // 4. Save book metadata
    book.totalChapters = totalChapters;
    book.downloadedChaptersCount = totalChapters;
    await this.saveBook(book);

    sendServerLog('Storage', `全數 ${totalChapters} 章寫入完成！書籍《${book.title}》入庫成功。`);
    return book;
  }

  /**
   * 批次刪除指定章節並重編序號 (GWT 21.5)
   * @param {string} bookId 
   * @param {string[]} chapterIds 
   * @returns {Promise<Array>} 剩餘的章節清單
   */
  async deleteChaptersBatch(bookId, chapterIds) {
    await this.init();
    const idSet = new Set(chapterIds);

    // 1. 刪除指定章節
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      for (const id of chapterIds) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    // 2. 取得剩餘章節並重新排序編號 (兩階段寫入避開 unique 索引衝突)
    const allChaps = await this.getChaptersByBook(bookId);
    const remaining = allChaps.filter(c => !idSet.has(c.id));
    remaining.sort((a, b) => a.index - b.index);

    // 階段 A: 負數過渡
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      remaining.forEach((chap, i) => {
        chap.index = -1000 - i;
        store.put(chap);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    // 階段 B: 正式平滑重排 0, 1, 2...
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      remaining.forEach((chap, i) => {
        chap.index = i;
        store.put(chap);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    // 3. 更新書籍總章數與進度守衛
    const book = await this.getBook(bookId);
    if (book) {
      book.totalChapters = remaining.length;
      book.downloadedChaptersCount = remaining.length;
      book.lastChapterIndex = Math.min(book.lastChapterIndex || 0, Math.max(0, remaining.length - 1));
      await this.saveBook(book);
    }

    return remaining;
  }

  /**
   * 批次重新排序章節 (GWT 21.6)
   * @param {string} bookId 
   * @param {string[]} orderedChapterIds - 依照新順序排列的章節 ID 陣列
   * @returns {Promise<Array>} 重新排序後的章節清單
   */
  async reorderChaptersBatch(bookId, orderedChapterIds) {
    await this.init();
    const allChaps = await this.getChaptersByBook(bookId);
    const chapMap = new Map(allChaps.map(c => [c.id, c]));

    const newOrdered = [];
    orderedChapterIds.forEach(id => {
      if (chapMap.has(id)) {
        newOrdered.push(chapMap.get(id));
      }
    });

    // 階段 A: 負數過渡避開 unique 索引衝突
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      newOrdered.forEach((chap, i) => {
        chap.index = -1000 - i;
        store.put(chap);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    // 階段 B: 平滑序號 0, 1, 2...
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      newOrdered.forEach((chap, i) => {
        chap.index = i;
        store.put(chap);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    return newOrdered;
  }

  /**
   * 更新單一章節標題與內文，並自動重新分段 (GWT 21.3)
   * @param {string} chapterId 
   * @param {string} newTitle 
   * @param {string} newContent 
   * @returns {Promise<Object>}
   */
  async updateChapterContent(chapterId, newTitle, newContent) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      const req = store.get(chapterId);

      req.onsuccess = () => {
        const chap = req.result;
        if (!chap) {
          reject(new Error(`找不到章節 ${chapterId}`));
          return;
        }

        if (newTitle && newTitle.trim()) {
          chap.title = newTitle.trim();
        }
        chap.content = newContent;

        // 重新進行智能斷句分段
        const seg = TextSegmenter.segment(newContent);
        chap.paragraphs = seg.paragraphs;

        const updateReq = store.put(chap);
        updateReq.onsuccess = () => resolve(chap);
        updateReq.onerror = () => reject(updateReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 批次搜尋與取代/清除小說內容 (GWT 21.4)
   * @param {string} bookId 
   * @param {string} findText 
   * @param {string} replaceText 
   * @param {number|null} targetChapterIndex - 若為 null 則套用全書
   * @param {Function|null} onProgress 
   * @returns {Promise<{ matchedCount: number, modifiedCount: number }>}
   */
  async batchReplaceBookContent(bookId, findText, replaceText = '', targetChapterIndex = null, onProgress = null) {
    await this.init();
    if (!findText) return { matchedCount: 0, modifiedCount: 0 };

    const tokens = findText.trim().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return { matchedCount: 0, modifiedCount: 0 };
    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(escapedTokens.join('\\s+'), 'g');
    const normalizedReplace = replaceText.replace(/\r\n/g, '\n');

    const chapters = await this.getChaptersByBook(bookId);
    const targetChapters = (typeof targetChapterIndex === 'number')
      ? chapters.filter(c => c.index === targetChapterIndex)
      : chapters;

    let matchedCount = 0;
    const modifiedChapters = [];

    // 計算符合次數並進行替換 (GWT 23.2: 彈性空白與換行容錯比對)
    targetChapters.forEach(chap => {
      const content = (chap.content || '').replace(/\r\n/g, '\n');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        matchedCount += matches.length;
        const newContent = content.replace(regex, normalizedReplace);
        chap.content = newContent;
        const seg = TextSegmenter.segment(newContent);
        chap.paragraphs = seg.paragraphs;
        modifiedChapters.push(chap);
      }
    });

    // 批次寫入修改過的章節
    if (modifiedChapters.length > 0) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        modifiedChapters.forEach(chap => {
          store.put(chap);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    }

    return {
      matchedCount,
      modifiedCount: modifiedChapters.length
    };
  }
}

export const storage = new StorageModule();

