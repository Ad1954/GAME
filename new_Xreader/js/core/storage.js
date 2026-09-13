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
}

export const storage = new StorageModule();
