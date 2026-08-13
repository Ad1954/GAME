/**
 * Xreader - IndexedDB Database Utility
 * Handles persistent storage for Books, Chapters, and TTS Profiles.
 */

class XreaderDB {
  constructor() {
    this.dbName = 'XreaderDB';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initializes the database connection and object stores.
   */
  async init() {
    if (this.db) return this;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Database failed to open:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Books store (Metadata)
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }

        // Chapters store (Actual text)
        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chapterStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // TTS Settings Profiles
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'name' });
        }
      };
    });
  }

  // --- Books Management ---

  async saveBook(book) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.put({
        id: book.id,
        title: book.title,
        author: book.author || '未知作者',
        url: book.url || '',
        type: book.type || 'text', // 'web', 'file', 'paste'
        addedAt: book.addedAt || Date.now(),
        lastReadChapterIndex: book.lastReadChapterIndex || 0,
        lastReadSentenceIndex: book.lastReadSentenceIndex || 0
      });

      request.onsuccess = () => resolve(book.id);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getBook(bookId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.get(bookId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllBooks() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by added date descending
        const books = request.result || [];
        books.sort((a, b) => b.addedAt - a.addedAt);
        resolve(books);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteBook(bookId) {
    await this.init();
    return new Promise(async (resolve, reject) => {
      const transaction = this.db.transaction(['books', 'chapters'], 'readwrite');
      
      // 1. Delete book metadata
      transaction.objectStore('books').delete(bookId);

      // 2. Delete all chapters associated with this book
      const chapterStore = transaction.objectStore('chapters');
      const index = chapterStore.index('bookId');
      const request = index.openCursor(IDBKeyRange.only(bookId));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          chapterStore.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };

      transaction.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Chapters Management ---

  async saveChapter(chapter) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chapters'], 'readwrite');
      const store = transaction.objectStore('chapters');
      
      const id = `${chapter.bookId}_${chapter.chapterIndex}`;
      const request = store.put({
        id: id,
        bookId: chapter.bookId,
        chapterIndex: chapter.chapterIndex,
        title: chapter.title || `第 ${chapter.chapterIndex + 1} 章`,
        url: chapter.url || '',
        content: chapter.content // can be a raw string or array of sentences
      });

      request.onsuccess = () => resolve(id);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getChapter(bookId, chapterIndex) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chapters'], 'readonly');
      const store = transaction.objectStore('chapters');
      const id = `${bookId}_${chapterIndex}`;
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getBookChaptersList(bookId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chapters'], 'readonly');
      const store = transaction.objectStore('chapters');
      const index = store.index('bookId');
      const request = index.getAll(IDBKeyRange.only(bookId));

      request.onsuccess = () => {
        const list = request.result || [];
        // Sort by chapter index ascending
        list.sort((a, b) => a.chapterIndex - b.chapterIndex);
        resolve(list);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- TTS Settings Profiles Management ---

  async saveProfile(profile) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['profiles'], 'readwrite');
      const store = transaction.objectStore('profiles');
      const request = store.put(profile); // profile has keyPath 'name'

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getProfile(name) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['profiles'], 'readonly');
      const store = transaction.objectStore('profiles');
      const request = store.get(name);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllProfiles() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['profiles'], 'readonly');
      const store = transaction.objectStore('profiles');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteProfile(name) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['profiles'], 'readwrite');
      const store = transaction.objectStore('profiles');
      const request = store.delete(name);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

export const db = new XreaderDB();
export default db;
