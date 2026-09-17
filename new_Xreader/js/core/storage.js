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
   * 勾選章節分割至新書籍 (Story 25, GWT 25.1, 25.2, 25.3)
   * @param {string} sourceBookId - 原書籍 ID
   * @param {string[]} chapterIds - 欲分割抽出的章節 ID 陣列
   * @param {string} newBookTitle - 新書籍標題
   * @param {Object} options - { removeFromSource: true } (true 為剪下移轉，false 為複製)
   * @returns {Promise<{ newBook: Object, remainingChapters: Array }>}
   */
  async splitChaptersToNewBook(sourceBookId, chapterIds, newBookTitle, options = { removeFromSource: true }) {
    await this.init();
    const sourceBook = await this.getBook(sourceBookId);
    if (!sourceBook) throw new Error('找不到來源書籍');

    const allChaps = await this.getChaptersByBook(sourceBookId);
    const targetIdSet = new Set(chapterIds);

    const selectedChaps = allChaps.filter(c => targetIdSet.has(c.id));
    const remainingChaps = allChaps.filter(c => !targetIdSet.has(c.id));

    if (selectedChaps.length === 0) {
      throw new Error('未選取任何欲分割的章節！');
    }

    const title = (newBookTitle || '').trim() || `${sourceBook.title} - 分割作品`;
    const newBookId = `book_split_${Date.now()}`;
    const newBook = {
      id: newBookId,
      title,
      author: sourceBook.author,
      sourceType: sourceBook.sourceType || 'local',
      sourceUrl: sourceBook.sourceUrl || '',
      totalChapters: selectedChaps.length,
      downloadedChaptersCount: selectedChaps.length,
      lastChapterIndex: 0,
      lastSentenceIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 1. 建立並儲存新書籍主記錄
    await this.saveBook(newBook);

    // 2. 將選取的章節以全新 ID 與連續序號 (0, 1, 2...) 寫入新書籍
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['chapters'], 'readwrite');
      const store = tx.objectStore('chapters');
      selectedChaps.forEach((chap, i) => {
        const newChap = {
          ...chap,
          id: `chap_${newBookId}_${i}`,
          bookId: newBookId,
          index: i
        };
        store.put(newChap);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    // 3. 若為「剪下移轉」模式，自原書籍中刪除已分割章節並平滑遞補原書序號
    if (options.removeFromSource) {
      // 3.1 刪除原章節記錄
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        selectedChaps.forEach(c => store.delete(c.id));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      // 3.2 剩餘章節兩階段平滑重排 (避免索引衝突)
      // 階段 A: 負數過渡
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        remainingChaps.forEach((chap, i) => {
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
        remainingChaps.forEach((chap, i) => {
          chap.index = i;
          store.put(chap);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      // 3.3 更新原書籍總章數與進度守衛
      sourceBook.totalChapters = remainingChaps.length;
      sourceBook.downloadedChaptersCount = remainingChaps.length;
      sourceBook.lastChapterIndex = Math.min(sourceBook.lastChapterIndex || 0, Math.max(0, remainingChaps.length - 1));
      sourceBook.updatedAt = Date.now();
      await this.saveBook(sourceBook);
    }

    return {
      newBook,
      remainingChapters: options.removeFromSource ? remainingChaps : allChaps
    };
  }

  /**
   * 勾選章節移轉/追加至既有書籍 (Story 26, GWT 26.1, 26.2, 26.3)
   * @param {string} sourceBookId - 來源書籍 ID
   * @param {string} targetBookId - 目標既有書籍 ID
   * @param {string[]} chapterIds - 欲移轉的章節 ID 陣列
   * @param {'start'|'end'} position - 'start' 插入至開頭，'end' 追加至末尾
   * @param {Object} options - { removeFromSource: true } (true 為剪下移轉，false 為複製)
   * @returns {Promise<{ targetBook: Object, remainingChapters: Array }>}
   */
  async transferChaptersToExistingBook(sourceBookId, targetBookId, chapterIds, position = 'end', options = { removeFromSource: true }) {
    await this.init();
    if (sourceBookId === targetBookId) {
      throw new Error('來源書籍與目標書籍不能為同一本書！');
    }

    const sourceBook = await this.getBook(sourceBookId);
    if (!sourceBook) throw new Error('找不到來源書籍');

    const targetBook = await this.getBook(targetBookId);
    if (!targetBook) throw new Error('找不到目標書籍');

    const sourceChaps = await this.getChaptersByBook(sourceBookId);
    const targetChaps = await this.getChaptersByBook(targetBookId);
    const targetIdSet = new Set(chapterIds);

    const selectedChaps = sourceChaps.filter(c => targetIdSet.has(c.id));
    const remainingSourceChaps = sourceChaps.filter(c => !targetIdSet.has(c.id));

    if (selectedChaps.length === 0) {
      throw new Error('未選取任何欲移轉的章節！');
    }

    const timestamp = Date.now();

    // 1. 處理目標書籍章節注入
    if (position === 'start') {
      // 1.1 插入至開頭：新章節排在前面 (0 .. selected.length - 1)，原目標篇章往後順延
      const newChaps = selectedChaps.map((c, i) => ({
        ...c,
        id: `chap_${targetBookId}_${timestamp}_${i}`,
        bookId: targetBookId,
        index: i
      }));

      const combined = [...newChaps, ...targetChaps];

      // 階段 A: 負數過渡
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        combined.forEach((chap, i) => {
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
        combined.forEach((chap, i) => {
          chap.index = i;
          store.put(chap);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      // 目標書籍進度若指向原本的章節，往後平移
      if (targetBook.lastChapterIndex !== undefined && targetBook.lastChapterIndex !== null) {
        targetBook.lastChapterIndex += selectedChaps.length;
      }
      targetBook.totalChapters = combined.length;
      targetBook.downloadedChaptersCount = combined.length;
    } else {
      // 1.2 追加至末尾：新章節依序接續在 targetChaps 後面
      const startIdx = targetChaps.length;
      const newChaps = selectedChaps.map((c, i) => ({
        ...c,
        id: `chap_${targetBookId}_${timestamp}_${i}`,
        bookId: targetBookId,
        index: startIdx + i
      }));

      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        newChaps.forEach(c => store.put(c));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      targetBook.totalChapters = targetChaps.length + newChaps.length;
      targetBook.downloadedChaptersCount = targetChaps.length + newChaps.length;
    }

    targetBook.updatedAt = timestamp;
    await this.saveBook(targetBook);

    // 2. 處理來源書籍（若為剪下移轉）
    if (options.removeFromSource) {
      // 2.1 刪除來源章節
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        selectedChaps.forEach(c => store.delete(c.id));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      // 2.2 剩餘章節兩階段平滑重排
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        remainingSourceChaps.forEach((chap, i) => {
          chap.index = -1000 - i;
          store.put(chap);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['chapters'], 'readwrite');
        const store = tx.objectStore('chapters');
        remainingSourceChaps.forEach((chap, i) => {
          chap.index = i;
          store.put(chap);
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });

      // 2.3 更新來源書籍
      sourceBook.totalChapters = remainingSourceChaps.length;
      sourceBook.downloadedChaptersCount = remainingSourceChaps.length;
      sourceBook.lastChapterIndex = Math.min(sourceBook.lastChapterIndex || 0, Math.max(0, remainingSourceChaps.length - 1));
      sourceBook.updatedAt = timestamp;
      await this.saveBook(sourceBook);
    }

    return {
      targetBook,
      remainingChapters: options.removeFromSource ? remainingSourceChaps : sourceChaps
    };
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

  // ==========================================================
  // 書櫃自訂分類管理 (Story 28)
  // ==========================================================

  /**
   * 取得所有分類列表 (依 order 遞增排序)
   * @returns {Array<Object>}
   */
  getCategories() {
    const key = 'xreader_categories';
    const defaultCat = { id: 'uncategorized', name: '未分類', order: 0, isDefault: true };
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify([defaultCat]));
        return [defaultCat];
      }
      const cats = JSON.parse(raw);
      if (!Array.isArray(cats) || cats.length === 0) {
        localStorage.setItem(key, JSON.stringify([defaultCat]));
        return [defaultCat];
      }
      // 確保「未分類」一定存在
      if (!cats.some(c => c.id === 'uncategorized')) {
        cats.unshift(defaultCat);
      }
      cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return cats;
    } catch (e) {
      console.warn('載入分類失敗，使用預設值:', e);
      return [defaultCat];
    }
  }

  /**
   * 新增自訂分類 (若無名稱則自動順號「分類1」、「分類2」...)
   * @param {string|null} name 
   * @returns {Object}
   */
  createCategory(name = null) {
    const cats = this.getCategories();
    let finalName = (name || '').trim();

    if (!finalName) {
      // 尋找現有已命名的最大順號
      let maxNum = 0;
      cats.forEach(c => {
        const m = (c.name || '').match(/^分類(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      finalName = `分類${maxNum + 1}`;
    }

    const maxOrder = cats.reduce((max, c) => Math.max(max, c.order ?? 0), 0);
    const newCat = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: finalName,
      order: maxOrder + 1,
      isDefault: false
    };

    cats.push(newCat);
    localStorage.setItem('xreader_categories', JSON.stringify(cats));
    return newCat;
  }

  /**
   * 更新分類資訊 (名稱、排序等)
   * @param {string} id 
   * @param {Object} updates 
   * @returns {Object}
   */
  updateCategory(id, updates = {}) {
    if (id === 'uncategorized' && updates.name && updates.name !== '未分類') {
      throw new Error('原生系統「未分類」不可修改名稱！');
    }

    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) throw new Error(`找不到分類 ${id}`);

    cats[idx] = { ...cats[idx], ...updates };
    localStorage.setItem('xreader_categories', JSON.stringify(cats));
    return cats[idx];
  }

  /**
   * 批次更新分類排序
   * @param {Array<string>} orderedIds 
   * @returns {Array<Object>}
   */
  reorderCategories(orderedIds) {
    const cats = this.getCategories();
    const map = new Map(cats.map(c => [c.id, c]));

    const newCats = [];
    orderedIds.forEach((id, idx) => {
      if (map.has(id)) {
        const c = map.get(id);
        c.order = idx;
        newCats.push(c);
        map.delete(id);
      }
    });

    // 將未包含在 orderedIds 的其餘分類依序補在最後
    let nextOrder = newCats.length;
    map.forEach(c => {
      c.order = nextOrder++;
      newCats.push(c);
    });

    localStorage.setItem('xreader_categories', JSON.stringify(newCats));
    return newCats;
  }

  /**
   * 安全刪除自訂分類：該分類下之所有書籍自動平移至「未分類」防呆保護
   * @param {string} id 
   * @returns {Promise<{ movedBooksCount: number }>}
   */
  async deleteCategorySafe(id) {
    if (id === 'uncategorized') {
      throw new Error('原生系統保護之「未分類」不可刪除！');
    }

    // 1. 搬移該分類下所有書籍至未分類
    const allBooks = await this.getAllBooks();
    let movedBooksCount = 0;

    for (const b of allBooks) {
      if (b.categoryId === id) {
        b.categoryId = 'uncategorized';
        await this.saveBook(b);
        movedBooksCount++;
      }
    }

    // 2. 移除該分類紀錄
    const cats = this.getCategories().filter(c => c.id !== id);
    localStorage.setItem('xreader_categories', JSON.stringify(cats));

    return { movedBooksCount };
  }

  /**
   * 更新單一書籍所屬分類
   * @param {string} bookId 
   * @param {string} categoryId 
   * @returns {Promise<Object>}
   */
  async updateBookCategory(bookId, categoryId) {
    const book = await this.getBook(bookId);
    if (!book) throw new Error(`找不到書籍 ${bookId}`);

    book.categoryId = categoryId || 'uncategorized';
    book.updatedAt = Date.now();
    await this.saveBook(book);
    return book;
  }

  // ==========================================================
  // 爬蟲歷史紀錄與追更管理 (Story 27)
  // ==========================================================

  /**
   * 儲存或更新爬蟲歷史紀錄
   * @param {Object} record 
   * @returns {Object}
   */
  saveCrawlerRecord(record) {
    const key = 'xreader_crawler_records';
    let records = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) records = JSON.parse(raw);
    } catch (e) {
      records = [];
    }

    if (!record.id) {
      record.id = `crawl_rec_${Date.now()}`;
    }
    record.lastCrawlTime = Date.now();

    // 確保 historicalKeys 陣列存在
    if (!Array.isArray(record.historicalKeys)) {
      record.historicalKeys = [];
    }

    const idx = records.findIndex(r => r.id === record.id || (record.bookId && r.bookId === record.bookId));
    if (idx >= 0) {
      // 合併歷史已抓取鍵值池
      const mergedKeys = new Set([...(records[idx].historicalKeys || []), ...record.historicalKeys]);
      record.historicalKeys = Array.from(mergedKeys);
      records[idx] = { ...records[idx], ...record };
    } else {
      records.unshift(record);
    }

    localStorage.setItem(key, JSON.stringify(records));
    return record;
  }

  /**
   * 取得所有爬蟲歷史紀錄 (時間最新在前)
   * @returns {Array<Object>}
   */
  getCrawlerRecords() {
    const key = 'xreader_crawler_records';
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const records = JSON.parse(raw);
      if (!Array.isArray(records)) return [];
      records.sort((a, b) => (b.lastCrawlTime || 0) - (a.lastCrawlTime || 0));
      return records;
    } catch (e) {
      return [];
    }
  }

  /**
   * 依 ID 取得單筆爬蟲紀錄
   * @param {string} id 
   * @returns {Object|null}
   */
  getCrawlerRecord(id) {
    const records = this.getCrawlerRecords();
    return records.find(r => r.id === id) || null;
  }

  /**
   * 依書籍 ID 取得關聯的爬蟲紀錄
   * @param {string} bookId 
   * @returns {Object|null}
   */
  getCrawlerRecordByBookId(bookId) {
    const records = this.getCrawlerRecords();
    return records.find(r => r.bookId === bookId) || null;
  }

  /**
   * 單筆刪除爬蟲歷史紀錄 (可選是否連帶刪除已建書籍)
   * @param {string} id 
   * @param {boolean} deleteBookAlso 
   * @returns {Promise<boolean>}
   */
  async deleteCrawlerRecord(id, deleteBookAlso = false) {
    const record = this.getCrawlerRecord(id);
    if (record && deleteBookAlso && record.bookId) {
      try {
        await this.deleteBook(record.bookId);
      } catch (e) {
        console.warn('連帶刪除書籍失敗 (可能已被刪除):', e);
      }
    }

    const records = this.getCrawlerRecords().filter(r => r.id !== id);
    localStorage.setItem('xreader_crawler_records', JSON.stringify(records));
    return true;
  }

  /**
   * 增量追加新章節至既有書籍末端 (正序接續)
   * @param {string} bookId 
   * @param {Array<Object>} newChapters - 已抓取並分段好之章節陣列 [{ title, content, paragraphs, url, csn }]
   * @param {string|null} recordId 
   * @returns {Promise<{ book: Object, appendedCount: number }>}
   */
  async appendChaptersToBook(bookId, newChapters, recordId = null) {
    await this.init();
    const book = await this.getBook(bookId);
    if (!book) throw new Error(`找不到書籍 ${bookId}`);

    const existingChaps = await this.getChaptersByBook(bookId);
    const startIndex = existingChaps.length;

    // 依序寫入新章節
    for (let i = 0; i < newChapters.length; i++) {
      const nc = newChapters[i];
      const targetIndex = startIndex + i;
      const chapter = {
        id: `${bookId}_${targetIndex}`,
        bookId,
        index: targetIndex,
        title: nc.title,
        url: nc.url || '',
        csn: nc.csn || null,
        content: nc.content || '',
        paragraphs: nc.paragraphs || [],
        sentences: nc.sentences || null,
        sentencesCount: nc.sentencesCount || (nc.paragraphs ? nc.paragraphs.reduce((acc, p) => acc + (p.sentences?.length || 0), 0) : 0)
      };
      await this.saveChapter(chapter);
    }

    // 更新書籍整體資訊
    book.totalChapters = startIndex + newChapters.length;
    book.downloadedChaptersCount = startIndex + newChapters.length;
    book.updatedAt = Date.now();
    await this.saveBook(book);

    // 更新對應爬蟲紀錄
    const rec = recordId ? this.getCrawlerRecord(recordId) : this.getCrawlerRecordByBookId(bookId);
    if (rec) {
      rec.lastCrawlTime = Date.now();
      rec.totalChaptersCrawled = book.totalChapters;
      if (newChapters.length > 0) {
        const lastChap = newChapters[newChapters.length - 1];
        if (lastChap.url) rec.lastChapterUrl = lastChap.url;
        if (lastChap.csn) rec.lastChapterCsn = lastChap.csn;
      }
      // 將新抓章節加入歷史鍵值池
      const keySet = new Set(rec.historicalKeys || []);
      newChapters.forEach(c => {
        if (c.url) keySet.add(c.url);
        if (c.csn) keySet.add(String(c.csn));
      });
      rec.historicalKeys = Array.from(keySet);
      this.saveCrawlerRecord(rec);
    }

    return {
      book,
      appendedCount: newChapters.length
    };
  }
}

export const storage = new StorageModule();


