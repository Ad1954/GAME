/**
 * Xreader - Main Application Controller
 * Handles UI coordination, bookmarklet handshakes, local file processing,
 * IndexedDB integration, and cross-platform Speech Synthesis wrappers.
 */

import { db } from './db.js';
import { TextSegmenter } from './segmenter.js';
import { crawler, PROXIES } from './crawler.js';
import { FileParser } from './fileParser.js';
import { BookmarkletGenerator } from './bookmarklet.js';

// --- State Variables ---
let currentBook = null;
let currentChapters = [];
let currentChapterIndex = 0;
let currentSentenceIndex = 0;
let flatSentences = []; // Flattened sentences of the current active chapter
let isPlaying = false;
let crawlerRunning = false;

// Speech synthesis properties
const synth = window.speechSynthesis;
let currentUtterance = null;
let activeVoice = null;
let voices = [];
let speechRate = 1.0;
let speechPitch = 1.0;
let speechVoiceName = '';

// Browser Emulated Platform
let emulatedPlatform = 'auto'; // 'auto', 'PC', 'iOS', 'Android'

// iOS & Chrome Keep-Alive timer
let chromeKeepAliveInterval = null;
let silentAudioSource = null;
let audioContext = null;
let silentAudioHTML5 = null;
let playTimeoutId = null;
let ignoreNextOnEnd = false;
let playlistSentences = [];
let speechEngine = 'google'; // 'google', 'native'
let googleAudio = null;

// --- DOM References ---
const DOMElements = {
  themeBtn: document.getElementById('theme-btn'),
  bookmarkletBtn: document.getElementById('bookmarklet-btn'),
  bookmarkletAnchor: document.getElementById('bookmarklet-anchor'),
  
  // Tab Elements
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Web Crawler Inputs
  webUrl: document.getElementById('web-url'),
  webProxy: document.getElementById('web-proxy'),
  customProxyGroup: document.getElementById('custom-proxy-group'),
  webCustomProxy: document.getElementById('web-custom-proxy'),
  crawlRecursive: document.getElementById('crawl-recursive'),
  crawlDelay: document.getElementById('crawl-delay'),
  delayVal: document.getElementById('delay-val'),
  btnFetchWeb: document.getElementById('btn-fetch-web'),
  
  // Paste Text Inputs
  pasteTitle: document.getElementById('paste-title'),
  pasteContent: document.getElementById('paste-content'),
  btnLoadPaste: document.getElementById('btn-load-paste'),
  
  // File Dropzone
  fileDropzone: document.getElementById('file-dropzone'),
  fileInput: document.getElementById('file-input'),
  fileStatus: document.getElementById('file-parsing-status'),
  
  // Book shelf
  bookShelf: document.getElementById('book-shelf'),
  
  // Reader Pane
  activeBookTitle: document.getElementById('active-book-title'),
  activeBookAuthor: document.getElementById('active-book-author'),
  chapterSelect: document.getElementById('chapter-select'),
  btnPrevChap: document.getElementById('btn-prev-chap'),
  btnNextChap: document.getElementById('btn-next-chap'),
  readerBody: document.getElementById('reader-body'),
  
  // Playback drawer
  playbackBar: document.getElementById('playback-bar'),
  playbackPrev: document.getElementById('playback-prev'),
  playbackPlay: document.getElementById('playback-play'),
  playbackNext: document.getElementById('playback-next'),
  playbackSlider: document.getElementById('playback-slider'),
  progressIndicator: document.getElementById('progress-indicator'),
  progressPercent: document.getElementById('progress-percent'),
  speechRateQuick: document.getElementById('speech-rate-quick'),
  speechRateQuickLbl: document.getElementById('speech-rate-quick-lbl'),
  btnExportContent: document.getElementById('btn-export-content'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  
  // Settings Drawer
  settingsDrawer: document.getElementById('settings-drawer'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  settingPlatform: document.getElementById('setting-platform'),
  settingEngine: document.getElementById('setting-engine'),
  settingVoice: document.getElementById('setting-voice'),
  settingRate: document.getElementById('setting-rate'),
  rateVal: document.getElementById('rate-val'),
  settingPitch: document.getElementById('setting-pitch'),
  pitchVal: document.getElementById('pitch-val'),
  newProfileName: document.getElementById('new-profile-name'),
  btnSaveProfile: document.getElementById('btn-save-profile'),
  headerProfileSelect: document.getElementById('header-profile-select'),
  exportMode: document.getElementById('export-mode'),
  exportChunkGroup: document.getElementById('export-chunk-group'),
  exportChunkSize: document.getElementById('export-chunk-size'),
  btnExportBook: document.getElementById('btn-export-book'),
  btnExportBackupJson: document.getElementById('btn-export-backup-json'),
  
  // Crawler Progress Overlay
  crawlerOverlay: document.getElementById('crawler-overlay'),
  crawlerTitle: document.getElementById('crawler-title'),
  crawlerStatusLbl: document.getElementById('crawler-status-lbl'),
  crawlerProgressFill: document.getElementById('crawler-progress-fill'),
  crawlerLog: document.getElementById('crawler-log'),
  btnCancelCrawler: document.getElementById('btn-cancel-crawler')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize DB
  await db.init();

  // 2. Setup event listeners
  setupThemeEvents();
  setupTabEvents();
  setupCrawlerEvents();
  setupPasteEvents();
  setupFileEvents();
  setupSettingsDrawerEvents();
  setupSpeechEvents();
  setupReaderNavigation();

  // 3. Load Library Books & Custom TTS Profiles
  await loadLibrary();
  await loadSpeechProfiles();
  
  // 4. Initialize voices
  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }

  // 5. Handle Bookmarklet Callback parameters (postMessage receiver)
  handleBookmarkletCallback();

  // 6. Set Bookmarklet Link code in settings panel
  updateBookmarkletLink();
});

// --- Theme Management ---
function setupThemeEvents() {
  // Set default theme from localStorage
  const savedTheme = localStorage.getItem('xreader-theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  
  DOMElements.themeBtn.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    let nextTheme = 'dark';
    if (currentTheme === 'dark') nextTheme = 'light';
    else if (currentTheme === 'light') nextTheme = 'sepia';
    
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('xreader-theme', nextTheme);
  });
}

// --- Tab Controls ---
function setupTabEvents() {
  DOMElements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOMElements.tabButtons.forEach(b => b.classList.remove('active'));
      DOMElements.tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetTab = document.getElementById(btn.getAttribute('data-tab'));
      if (targetTab) targetTab.classList.add('active');
    });
  });
}

// --- Web Crawler Core ---
function setupCrawlerEvents() {
  // Sync delay range text
  DOMElements.crawlDelay.addEventListener('input', (e) => {
    DOMElements.delayVal.textContent = `${parseFloat(e.target.value).toFixed(1)} 秒`;
  });

  // Handle custom proxy toggling
  DOMElements.webProxy.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      DOMElements.customProxyGroup.style.display = 'flex';
    } else {
      DOMElements.customProxyGroup.style.display = 'none';
    }
  });

  // Execute Web Scraping
  DOMElements.btnFetchWeb.addEventListener('click', async () => {
    const url = DOMElements.webUrl.value.trim();
    if (!url) {
      alert('請輸入有效的 URL 網址');
      return;
    }

    const isCatalogMode = DOMElements.crawlRecursive.checked;
    const delayMs = parseFloat(DOMElements.crawlDelay.value) * 1000;
    
    let selectedProxy = DOMElements.webProxy.value;
    if (selectedProxy === 'custom') {
      selectedProxy = DOMElements.webCustomProxy.value.trim();
      if (!selectedProxy.includes('{url}')) {
        alert('自訂代理網址必須包含 {url} 替換符號');
        return;
      }
    }

    try {
      if (isCatalogMode) {
        // --- Novel Catalog Crawling Mode (1-layer down sequential) ---
        showCrawlerOverlay(`讀取小說目錄中...`, `正在向代理請求：${url}`);
        
        // 1. Fetch and Parse Catalog
        const result = await crawler.parseCatalog(url, selectedProxy);
        updateCrawlerLog(`成功讀取目錄：「${result.bookTitle}」，解析出 ${result.chapters.length} 個章節。`);

        // 2. Save Book Metadata to DB
        const bookId = `web_${Date.now()}`;
        const newBook = {
          id: bookId,
          title: result.bookTitle,
          author: '網頁抓取',
          url: url,
          type: 'web'
        };
        await db.saveBook(newBook);

        // 3. Sequential chapter crawling queue
        updateCrawlerLog(`開始順序下載任務 (防阻擋延遲設定: ${DOMElements.crawlDelay.value} 秒)...`);
        
        crawlerRunning = true;

        await crawler.downloadChapters(bookId, result.chapters, {
          delayMs,
          customProxy: selectedProxy,
          onProgress: async (prog) => {
            DOMElements.crawlerStatusLbl.textContent = prog.message;
            if (prog.total) {
              const pct = Math.round((prog.index / prog.total) * 100);
              DOMElements.crawlerProgressFill.style.width = `${pct}%`;
            }
            updateCrawlerLog(prog.message);

            if (prog.status === 'cancelled') {
              crawlerRunning = false;
              DOMElements.btnCancelCrawler.textContent = '關閉並檢視已下載內容';
              DOMElements.btnCancelCrawler.className = 'btn btn-primary';
              await loadLibrary();
              await loadBook(bookId);
            } else if (prog.status === 'error') {
              crawlerRunning = false;
              DOMElements.btnCancelCrawler.textContent = '關閉視窗';
              DOMElements.btnCancelCrawler.className = 'btn btn-secondary';
            }
          },
          onComplete: async () => {
            crawlerRunning = false;
            hideCrawlerOverlay();
            await loadLibrary();
            await loadBook(bookId);
            alert(`已成功儲存書籍《${result.bookTitle}》與下載之章節！`);
          }
        });

      } else {
        // --- Single Page Reading Mode ---
        DOMElements.btnFetchWeb.disabled = true;
        DOMElements.btnFetchWeb.textContent = '擷取中...';
        
        const html = await crawler.fetchHTML(url, selectedProxy);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Dynamically load Readability
        const readabilityModule = await import('https://esm.sh/@mozilla/readability@0.5.0');
        const reader = new readabilityModule.Readability(doc);
        const article = reader.parse();
        
        let title = doc.title || '未命名網頁';
        let bodyText = html;
        if (article) {
          title = article.title;
          bodyText = article.textContent;
        }

        const bookId = `web_${Date.now()}`;
        await db.saveBook({
          id: bookId,
          title: title,
          author: '單網頁擷取',
          url: url,
          type: 'web'
        });

        const segmented = TextSegmenter.segment(bodyText);
        await db.saveChapter({
          bookId: bookId,
          chapterIndex: 0,
          title: '擷取文字',
          url: url,
          content: segmented
        });

        DOMElements.btnFetchWeb.disabled = false;
        DOMElements.btnFetchWeb.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/></svg> 擷取並載入內容`;

        await loadLibrary();
        await loadBook(bookId);
      }
    } catch (e) {
      console.error(e);
      hideCrawlerOverlay();
      DOMElements.btnFetchWeb.disabled = false;
      DOMElements.btnFetchWeb.innerHTML = `擷取失敗，重試`;
      alert(`網頁載入出錯：${e.message}`);
    }
  });

  // Cancel Crawler Queue
  DOMElements.btnCancelCrawler.addEventListener('click', () => {
    if (crawlerRunning) {
      crawler.cancel();
      updateCrawlerLog(`使用者取消下載隊列，正在中斷...`);
    } else {
      hideCrawlerOverlay();
    }
  });
}

function showCrawlerOverlay(title, initialStatus) {
  DOMElements.crawlerOverlay.classList.add('active');
  DOMElements.crawlerTitle.textContent = title;
  DOMElements.crawlerStatusLbl.textContent = initialStatus;
  DOMElements.crawlerProgressFill.style.width = '0%';
  DOMElements.crawlerLog.textContent = `[${new Date().toLocaleTimeString()}] ${initialStatus}`;
  
  // Reset cancel button to default active state
  DOMElements.btnCancelCrawler.textContent = '取消下載';
  DOMElements.btnCancelCrawler.className = 'btn btn-danger';
}

function updateCrawlerLog(msg) {
  DOMElements.crawlerLog.textContent += `\n[${new Date().toLocaleTimeString()}] ${msg}`;
  DOMElements.crawlerLog.scrollTop = DOMElements.crawlerLog.scrollHeight;
}

function hideCrawlerOverlay() {
  DOMElements.crawlerOverlay.classList.remove('active');
}

// --- Paste Text Controls ---
function setupPasteEvents() {
  DOMElements.btnLoadPaste.addEventListener('click', async () => {
    const title = DOMElements.pasteTitle.value.trim() || '無標題貼上文字';
    const text = DOMElements.pasteContent.value.trim();
    
    if (!text) {
      alert('請貼上朗讀內容文字！');
      return;
    }

    const bookId = `paste_${Date.now()}`;
    await db.saveBook({
      id: bookId,
      title: title,
      author: '手動輸入',
      type: 'paste'
    });

    const segmented = TextSegmenter.segment(text);
    await db.saveChapter({
      bookId: bookId,
      chapterIndex: 0,
      title: '全文內容',
      content: segmented
    });

    // Clear textarea
    DOMElements.pasteContent.value = '';

    await loadLibrary();
    await loadBook(bookId);
  });
}

// --- File Dropzone & Parsing ---
function setupFileEvents() {
  const dropzone = DOMElements.fileDropzone;

  dropzone.addEventListener('click', () => DOMElements.fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-primary)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  });

  DOMElements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  });
}

async function processUploadedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  DOMElements.fileStatus.style.display = 'block';
  
  const updateStatus = (text) => {
    DOMElements.fileStatus.textContent = text;
  };

  try {
    let result = null;
    
    // Handle JSON Book Backup Restore directly
    if (ext === 'json') {
      updateStatus('正在解析 Xreader 備份檔...');
      
      const backupText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('讀取備份檔失敗'));
        reader.readAsText(file);
      });

      const backupData = JSON.parse(backupText);
      if (backupData.type !== 'xreader-backup') {
        throw new Error('此檔案不是有效的 Xreader 書籍備份檔！');
      }

      const book = backupData.book;
      book.addedAt = Date.now(); // Update import date
      await db.saveBook(book);

      let chapCount = 0;
      for (const chap of backupData.chapters) {
        chapCount++;
        updateStatus(`正在還原章節：${chapCount}/${backupData.chapters.length}`);
        await db.saveChapter(chap);
      }

      DOMElements.fileStatus.style.display = 'none';
      await loadLibrary();
      await loadBook(book.id);
      alert(`書籍《${book.title}》已成功從備份檔還原匯入！`);
      return;
    }

    if (ext === 'txt') {
      result = await FileParser.parseTXT(file);
    } else if (ext === 'docx') {
      result = await FileParser.parseDOCX(file, updateStatus);
    } else if (ext === 'pdf') {
      result = await FileParser.parsePDF(file, updateStatus);
    } else if (ext === 'epub') {
      result = await FileParser.parseEPUB(file, updateStatus);
    } else {
      throw new Error('未支援的檔案格式，請上傳 .txt, .pdf, .docx, .epub 或 .json 備份檔');
    }

    // Save metadata
    const bookId = `file_${Date.now()}`;
    await db.saveBook({
      id: bookId,
      title: result.title,
      author: result.author || '本地檔案',
      type: 'file'
    });

    // Save all parsed chapters
    for (const chap of result.chapters) {
      await db.saveChapter({
        bookId: bookId,
        chapterIndex: chap.chapterIndex,
        title: chap.title,
        content: chap.content
      });
    }

    DOMElements.fileStatus.style.display = 'none';
    await loadLibrary();
    await loadBook(bookId);
    alert(`成功匯入書籍《${result.title}》！`);
    
  } catch (err) {
    console.error(err);
    DOMElements.fileStatus.textContent = '解析出錯';
    alert(err.message);
  }
}

// --- Library (Book Shelf) Loading ---
async function loadLibrary() {
  const books = await db.getAllBooks();
  const shelf = DOMElements.bookShelf;
  shelf.innerHTML = '';

  if (books.length === 0) {
    shelf.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px;">書架為空，請從上方匯入書籍</div>`;
    return;
  }

  books.forEach(b => {
    const item = document.createElement('div');
    item.className = 'book-item';
    if (currentBook && currentBook.id === b.id) item.classList.add('active');
    
    item.innerHTML = `
      <div class="book-info" style="flex: 1;">
        <span class="book-title" title="${b.title}">${b.title}</span>
        <span class="book-meta">${b.author} | ${new Date(b.addedAt).toLocaleDateString()}</span>
      </div>
      <button class="btn-delete-book" title="刪除書籍">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    `;

    item.addEventListener('click', (e) => {
      // Prevent deleting trigger book loading
      if (e.target.closest('.btn-delete-book')) return;
      loadBook(b.id);
    });

    item.querySelector('.btn-delete-book').addEventListener('click', async () => {
      if (confirm(`確定要從本機書架刪除《${b.title}》嗎？`)) {
        await db.deleteBook(b.id);
        if (currentBook && currentBook.id === b.id) {
          currentBook = null;
          currentChapters = [];
          flatSentences = [];
          DOMElements.activeBookTitle.textContent = '請選取或建立朗讀內容';
          DOMElements.activeBookAuthor.textContent = '尚未選擇書籍';
          DOMElements.chapterSelect.innerHTML = '<option value="">無章節</option>';
          DOMElements.readerBody.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">書籍已刪除</div>`;
          resetPlaybackState();
        }
        await loadLibrary();
      }
    });

    shelf.appendChild(item);
  });
}

// --- Load Book into Reader ---
async function loadBook(bookId) {
  const book = await db.getBook(bookId);
  if (!book) return;

  currentBook = book;
  currentChapters = await db.getBookChaptersList(bookId);

  DOMElements.activeBookTitle.textContent = book.title;
  DOMElements.activeBookAuthor.textContent = `來源：${book.author}`;

  // Re-highlight shelf
  document.querySelectorAll('.book-item').forEach((item, index) => {
    item.classList.remove('active');
  });
  await loadLibrary(); // Refresh shelf select status

  // Populate Chapter dropdown
  const selector = DOMElements.chapterSelect;
  selector.innerHTML = '';
  currentChapters.forEach((c, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = c.title;
    selector.appendChild(opt);
  });

  // Load last read chapter & sentence
  currentChapterIndex = book.lastReadChapterIndex || 0;
  if (currentChapterIndex >= currentChapters.length) currentChapterIndex = 0;
  selector.value = currentChapterIndex;

  await loadChapter(currentBook.id, currentChapterIndex, book.lastReadSentenceIndex || 0);
}

async function loadChapter(bookId, chapterIndex, sentenceIndexStart = 0) {
  if (currentChapters.length === 0) return;
  const chapter = currentChapters[chapterIndex];
  if (!chapter) return;

  currentChapterIndex = chapterIndex;
  
  // Highlight select option
  DOMElements.chapterSelect.value = chapterIndex;

  // Save progress metadata
  currentBook.lastReadChapterIndex = chapterIndex;
  currentBook.lastReadSentenceIndex = sentenceIndexStart;
  await db.saveBook(currentBook);

  // Render text block Nodes
  const readerBody = DOMElements.readerBody;
  readerBody.innerHTML = '';

  let linearIndex = 0;
  flatSentences = [];

  chapter.content.forEach((para, paraIdx) => {
    const pEl = document.createElement('p');
    pEl.style.marginBottom = '1.25em';
    pEl.style.textIndent = '2em';

    para.sentences.forEach(sentenceText => {
      const span = document.createElement('span');
      span.className = 'sentence-node';
      span.setAttribute('data-idx', linearIndex);
      span.textContent = sentenceText;
      
      flatSentences.push(sentenceText);

      // Event: click sentence to set starting position and speak
      const sentenceIdx = linearIndex;
      span.addEventListener('click', () => {
        jumpToSentence(sentenceIdx);
        if (!isPlaying) {
          togglePlayback();
        } else {
          // If already playing, cancel current speech and start from clicked sentence immediately
          playSentence(sentenceIdx);
        }
      });

      pEl.appendChild(span);
      linearIndex++;
    });

    readerBody.appendChild(pEl);
  });

  // Sync playback slider
  const maxIdx = Math.max(0, flatSentences.length - 1);
  DOMElements.playbackSlider.max = maxIdx;
  
  currentSentenceIndex = sentenceIndexStart;
  if (currentSentenceIndex > maxIdx) currentSentenceIndex = 0;
  
  DOMElements.playbackSlider.value = currentSentenceIndex;
  updateProgressUI();

  // Highlight starting sentence (if not empty)
  highlightSentenceNode(currentSentenceIndex);
}

function highlightSentenceNode(index) {
  document.querySelectorAll('.sentence-node').forEach(node => {
    node.classList.remove('active-reading');
  });

  const activeNode = document.querySelector(`.sentence-node[data-idx="${index}"]`);
  if (activeNode) {
    activeNode.classList.add('active-reading');
    
    // Smooth scroll active sentence to center 1/3 viewport (safe for both PC and iOS)
    const bodyEl = DOMElements.readerBody;
    const containerRect = bodyEl.getBoundingClientRect();
    const elemRect = activeNode.getBoundingClientRect();
    const relativeTop = elemRect.top - containerRect.top + bodyEl.scrollTop;
    const scrollTarget = relativeTop - (containerRect.height / 3);

    bodyEl.scrollTo({
      top: scrollTarget,
      behavior: 'smooth'
    });
  }
}

function jumpToSentence(index) {
  if (index < 0 || index >= flatSentences.length) return;
  currentSentenceIndex = index;
  DOMElements.playbackSlider.value = index;
  updateProgressUI();
  highlightSentenceNode(index);

  // Sync to database progress
  if (currentBook) {
    currentBook.lastReadSentenceIndex = index;
    db.saveBook(currentBook);
  }
}

// --- Chapter navigation triggers ---
function setupReaderNavigation() {
  DOMElements.chapterSelect.addEventListener('change', async (e) => {
    const idx = parseInt(e.target.value);
    await loadChapter(currentBook.id, idx, 0);
    if (isPlaying) {
      playSentence(0);
    }
  });

  DOMElements.btnPrevChap.addEventListener('click', async () => {
    if (currentChapterIndex > 0) {
      await loadChapter(currentBook.id, currentChapterIndex - 1, 0);
      if (isPlaying) {
        playSentence(0);
      }
    }
  });

  DOMElements.btnNextChap.addEventListener('click', async () => {
    if (currentChapterIndex < currentChapters.length - 1) {
      await loadChapter(currentBook.id, currentChapterIndex + 1, 0);
      if (isPlaying) {
        playSentence(0);
      }
    }
  });
}

// --- Web Speech API (TTS Core) ---
function loadVoices() {
  voices = synth.getVoices();
  const select = DOMElements.settingVoice;
  select.innerHTML = '';

  if (voices.length === 0) {
    select.innerHTML = '<option value="">未偵測到系統語音庫</option>';
    return;
  }

  // Pre-filter voices for common CJK locales
  const cjkVoices = voices.filter(v => v.lang.includes('zh') || v.lang.includes('zho') || v.lang.includes('en') || v.lang.includes('ja') || v.lang.includes('ko'));
  
  cjkVoices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });

  // Auto-detect and set appropriate default voice
  autoSelectPlatformDefaultVoice();
}

function autoSelectPlatformDefaultVoice() {
  const platform = DOMElements.settingPlatform.value;
  let userAgent = navigator.userAgent.toLowerCase();
  let detectedPlatform = 'PC';
  if (/iphone|ipad|ipod/.test(userAgent)) detectedPlatform = 'iOS';
  else if (/android/.test(userAgent)) detectedPlatform = 'Android';

  const activePlat = platform === 'auto' ? detectedPlatform : platform;
  let defaultVoice = null;

  if (activePlat === 'iOS') {
    // Apple Siri fallbacks
    defaultVoice = voices.find(v => v.name.includes('Siri') || v.name.includes('Mei-Jia') || v.name.includes('Sin-ji'));
  } else if (activePlat === 'Android') {
    // Google TTS engine fallbacks
    defaultVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('zh'));
  } else {
    // Desktop PC Windows/macOS fallbacks
    defaultVoice = voices.find(v => v.name.includes('Yating') || v.name.includes('Hanhan') || v.name.includes('Tingting') || v.name.includes('Microsoft') && v.lang.includes('zh'));
  }

  // Final fallback
  if (!defaultVoice) {
    defaultVoice = voices.find(v => v.lang.includes('zh')) || voices[0];
  }

  if (defaultVoice) {
    DOMElements.settingVoice.value = defaultVoice.name;
    activeVoice = defaultVoice;
    speechVoiceName = defaultVoice.name;
  }
}

function setupSpeechEvents() {
  // Sync sliders
  DOMElements.speechRateQuick.addEventListener('input', (e) => {
    speechRate = parseFloat(e.target.value);
    DOMElements.speechRateQuickLbl.textContent = speechRate.toFixed(1);
    DOMElements.settingRate.value = speechRate;
    DOMElements.rateVal.textContent = `${speechRate.toFixed(1)}x`;
    applySpeechSettingsChange();
  });

  DOMElements.settingRate.addEventListener('input', (e) => {
    speechRate = parseFloat(e.target.value);
    DOMElements.rateVal.textContent = `${speechRate.toFixed(1)}x`;
    DOMElements.speechRateQuick.value = speechRate;
    DOMElements.speechRateQuickLbl.textContent = speechRate.toFixed(1);
    applySpeechSettingsChange();
  });

  DOMElements.settingPitch.addEventListener('input', (e) => {
    speechPitch = parseFloat(e.target.value);
    DOMElements.pitchVal.textContent = speechPitch.toFixed(1);
    applySpeechSettingsChange();
  });

  DOMElements.settingVoice.addEventListener('change', (e) => {
    speechVoiceName = e.target.value;
    activeVoice = voices.find(v => v.name === speechVoiceName);
    applySpeechSettingsChange();
  });

  DOMElements.settingPlatform.addEventListener('change', () => {
    autoSelectPlatformDefaultVoice();
  });

  DOMElements.settingEngine.addEventListener('change', (e) => {
    speechEngine = e.target.value;
    applySpeechSettingsChange();
  });

  // Dynamic progress slider
  DOMElements.playbackSlider.addEventListener('input', (e) => {
    const idx = parseInt(e.target.value);
    jumpToSentence(idx);
    if (isPlaying) {
      playSentence(idx);
    }
  });

  // Playback control button clicks
  DOMElements.playbackPlay.addEventListener('click', togglePlayback);
  
  DOMElements.playbackPrev.addEventListener('click', () => {
    if (currentSentenceIndex > 0) {
      jumpToSentence(currentSentenceIndex - 1);
      if (isPlaying) playSentence(currentSentenceIndex);
    }
  });

  DOMElements.playbackNext.addEventListener('click', () => {
    if (currentSentenceIndex < flatSentences.length - 1) {
      jumpToSentence(currentSentenceIndex + 1);
      if (isPlaying) playSentence(currentSentenceIndex);
    }
  });

  // Export as Markdown
  DOMElements.btnExportContent.addEventListener('click', exportMarkdown);

  // Register Media Session (Bluetooth) remote controls
  setupMediaSessionHandlers();
}

function setupMediaSessionHandlers() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('Bluetooth / MediaSession: Play clicked');
      if (!isPlaying) togglePlayback();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('Bluetooth / MediaSession: Pause clicked');
      if (isPlaying) togglePlayback();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('Bluetooth / MediaSession: Prev sentence clicked');
      if (currentSentenceIndex > 0) {
        jumpToSentence(currentSentenceIndex - 1);
        if (isPlaying) playSentence(currentSentenceIndex);
      } else if (currentChapterIndex > 0) {
        // Go to previous chapter last sentence
        const prevChapIdx = currentChapterIndex - 1;
        loadChapter(currentBook.id, prevChapIdx, 0).then(() => {
          const lastSentenceIdx = flatSentences.length - 1;
          loadChapter(currentBook.id, prevChapIdx, lastSentenceIdx).then(() => {
            if (isPlaying) playSentence(lastSentenceIdx);
          });
        });
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('Bluetooth / MediaSession: Next sentence clicked');
      if (currentSentenceIndex < flatSentences.length - 1) {
        jumpToSentence(currentSentenceIndex + 1);
        if (isPlaying) playSentence(currentSentenceIndex);
      } else if (currentChapterIndex < currentChapters.length - 1) {
        const nextChapIdx = currentChapterIndex + 1;
        loadChapter(currentBook.id, nextChapIdx, 0).then(() => {
          if (isPlaying) playSentence(0);
        });
      }
    });
  }
}

function applySpeechSettingsChange() {
  if (isPlaying) {
    // If speaking, restart sentence with new parameters instantly
    playSentence(currentSentenceIndex);
  }
}

// --- Helper Functions for Media Metadata & Playlist Sync ---
function updateMediaSessionMetadata(chapterIndex, sentenceIndex) {
  if ('mediaSession' in navigator) {
    const chapter = currentChapters[chapterIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentBook ? currentBook.title : 'Xreader 朗讀中',
      artist: chapter ? chapter.title : `第 ${sentenceIndex + 1} 句`,
      album: 'Xreader 聽書工具',
      artwork: [
        { src: window.location.origin + window.location.pathname + 'icon.png', sizes: '512x512', type: 'image/png' }
      ]
    });
  }
}

function showEngineFallbackNotice() {
  let toast = document.getElementById('engine-fallback-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'engine-fallback-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '0.9rem';
    toast.style.zIndex = '9999';
    toast.style.pointerEvents = 'none';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toast.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(toast);
  }
  toast.textContent = '⚠️ 網路語音載入失敗，已自動切換至本機語音模式';
  toast.style.opacity = '1';
  
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 4000);
}

function advanceToNextSentence() {
  if (currentSentenceIndex < flatSentences.length - 1) {
    playSentence(currentSentenceIndex + 1, true);
  } else {
    // End of chapter! Advance to next chapter
    const nextChapterIdx = currentChapterIndex + 1;
    if (nextChapterIdx < currentChapters.length) {
      console.log('Chapter ended. Moving to next chapter synchronously.');
      currentChapterIndex = nextChapterIdx;
      const nextChapter = currentChapters[nextChapterIdx];
      
      // Rebuild flatSentences synchronously in memory
      flatSentences = [];
      nextChapter.content.forEach(para => {
        para.sentences.forEach(sentenceText => {
          flatSentences.push(sentenceText);
        });
      });
      
      // Play first sentence of new chapter instantly as natural transition
      playSentence(0, true);

      // Update UI DOM asynchronously
      setTimeout(() => {
        loadChapter(currentBook.id, nextChapterIdx, 0);
      }, 0);
    } else {
      // End of book
      resetPlaybackState();
      alert('已朗讀完畢全書內容！');
    }
  }
}

// --- TTS Engine Execution Loop & Bug Workarounds ---
function togglePlayback() {
  if (flatSentences.length === 0) return;

  if (isPlaying) {
    // Currently playing -> Pause it
    isPlaying = false;
    DOMElements.playbackPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="play-icon"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    
    // Pause active engine
    if (speechEngine === 'native') {
      synth.pause();
    } else {
      if (googleAudio) googleAudio.pause();
    }
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    stopAudioKeepAlive();
  } else {
    // Currently paused -> Resume it
    isPlaying = true;
    DOMElements.playbackPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="play-icon"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`;
    
    startAudioKeepAlive();
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }

    if (speechEngine === 'native') {
      if (synth.speaking) {
        synth.resume();
      } else {
        playSentence(currentSentenceIndex);
      }
    } else {
      if (googleAudio && googleAudio.src && !googleAudio.ended) {
        googleAudio.play().catch(e => console.warn('Resume Google audio failed:', e));
      } else {
        playSentence(currentSentenceIndex);
      }
    }
  }
}

function playSentence(index, isNaturalTransition = false) {
  if (playTimeoutId) clearTimeout(playTimeoutId);
  
  if (index < 0 || index >= flatSentences.length) return;

  // If this is a manual settings change or user jump while speaking, ignore the next onend event
  if (synth.speaking && !isNaturalTransition) {
    ignoreNextOnEnd = true;
  }

  // Update indices
  currentSentenceIndex = index;
  DOMElements.playbackSlider.value = index;
  updateProgressUI();
  highlightSentenceNode(index);

  // Sync to media session metadata
  updateMediaSessionMetadata(currentChapterIndex, index);

  if (speechEngine === 'native') {
    // Clean up Google Audio if running
    if (googleAudio) {
      googleAudio.pause();
      googleAudio.onended = null;
      googleAudio.onerror = null;
    }

    // Stop current native utterance cleanly (triggers currentUtterance.onend)
    synth.cancel();

    // iOS Safari Queue Freeze Workaround:
    playTimeoutId = setTimeout(() => {
      const textToSpeak = flatSentences[index];
      currentUtterance = new SpeechSynthesisUtterance(textToSpeak);

      if (activeVoice) currentUtterance.voice = activeVoice;
      currentUtterance.rate = speechRate;
      currentUtterance.pitch = speechPitch;

      currentUtterance.onend = () => {
        // If the skip control lock is active, consume it and return immediately without advancing
        if (ignoreNextOnEnd) {
          ignoreNextOnEnd = false;
          return;
        }

        if (isPlaying) {
          setTimeout(() => {
            if (isPlaying) advanceToNextSentence();
          }, 80);
        }
      };

      currentUtterance.onerror = (e) => {
        console.warn('SpeechSynthesisUtterance error event:', e);
        if (e.error !== 'interrupted' && isPlaying) {
          setTimeout(() => {
            if (isPlaying) advanceToNextSentence();
          }, 100);
        }
      };

      synth.speak(currentUtterance);
      synth.resume();
    }, 60);

  } else {
    // Google TTS Engine
    synth.cancel();

    if (googleAudio) {
      googleAudio.pause();
      googleAudio.onended = null;
      googleAudio.onerror = null;
    }

    playTimeoutId = setTimeout(async () => {
      const textToSpeak = flatSentences[index];
      const cleanedText = textToSpeak.replace(/\s+/g, ' ').trim();
      if (!cleanedText) {
        advanceToNextSentence();
        return;
      }

      try {
        const encodedText = encodeURIComponent(cleanedText);
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-TW&client=tw-ob&q=${encodedText}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(googleTtsUrl)}`;

        if (!googleAudio) {
          googleAudio = new Audio();
          googleAudio.addEventListener('pause', () => {
            if (isPlaying && speechEngine === 'google') {
              console.log('Google Audio paused by system interruption. Syncing state.');
              togglePlayback();
            }
          });
        }

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Proxy response error: ${res.status}`);
        const blob = await res.blob();
        const localBlobUrl = URL.createObjectURL(blob);

        googleAudio.src = localBlobUrl;
        googleAudio.playbackRate = speechRate;

        googleAudio.onended = () => {
          URL.revokeObjectURL(localBlobUrl);
          if (isPlaying) {
            advanceToNextSentence();
          }
        };

        googleAudio.onerror = (err) => {
          console.warn('Google Audio playback error. Falling back to native SpeechSynthesis:', err);
          URL.revokeObjectURL(localBlobUrl);
          
          showEngineFallbackNotice();
          speechEngine = 'native';
          DOMElements.settingEngine.value = 'native';
          playSentence(index, isNaturalTransition);
        };

        if (isPlaying) {
          googleAudio.play().catch(e => {
            console.warn('Google Audio play error:', e);
            speechEngine = 'native';
            DOMElements.settingEngine.value = 'native';
            playSentence(index, isNaturalTransition);
          });
        }
      } catch (e) {
        console.warn('Fetch Google TTS failed, falling back to Native engine:', e);
        showEngineFallbackNotice();
        speechEngine = 'native';
        DOMElements.settingEngine.value = 'native';
        playSentence(index, isNaturalTransition);
      }
    }, 60);
  }
}

function updateProgressUI() {
  const current = currentSentenceIndex + 1;
  const total = flatSentences.length;
  DOMElements.progressIndicator.textContent = `${total > 0 ? current : 0} / ${total} 句`;
  
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  DOMElements.progressPercent.textContent = `${pct}%`;
}

function resetPlaybackState() {
  isPlaying = false;
  synth.cancel();
  if (googleAudio) {
    googleAudio.pause();
    googleAudio.onended = null;
    googleAudio.onerror = null;
    googleAudio.src = '';
  }
  ignoreNextOnEnd = false; // Reset controls flag
  DOMElements.playbackPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="play-icon"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  DOMElements.playbackSlider.max = 0;
  DOMElements.playbackSlider.value = 0;
  DOMElements.progressIndicator.textContent = '0 / 0 句';
  DOMElements.progressPercent.textContent = '0%';
  stopAudioKeepAlive();
}

// --- Helper to dynamically generate a 10-second silent PCM WAV Blob ---
function createSilentWavBlob(duration = 10) {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = sampleRate * duration * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // File length
  view.setUint32(4, 36 + dataSize, true);
  // WAVE identifier
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // fmt chunk length (16)
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1)
  view.setUint16(22, numChannels, true);
  // sample rate (8000)
  view.setUint32(24, sampleRate, true);
  // byte rate
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  // block align
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  // bits per sample (16)
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  view.setUint32(38, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(42, dataSize, true);

  // ArrayBuffer is naturally zero-initialized (digital silence)
  return new Blob([buffer], { type: 'audio/wav' });
}

// --- Background Audio Wake Lock / Chrome Fixes ---
function startAudioKeepAlive() {
  // 1. Chrome Speech Heartbeat (Prevents 15-second speech timeout crash)
  if (chromeKeepAliveInterval) clearInterval(chromeKeepAliveInterval);
  chromeKeepAliveInterval = setInterval(() => {
    if (synth.speaking && !synth.paused) {
      console.log('TTS keep-alive: pause/resume cycle');
      synth.pause();
      synth.resume();
    }
  }, 10000);

  // 2. iOS Safari Wake Lock Audio Hack (Web Audio API)
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Generate low-frequency silent oscillator in a loop
    // Tells browser that active media is running so it won't sleep or kill webapp
    const buffer = audioContext.createBuffer(1, 44100, 44100);
    silentAudioSource = audioContext.createBufferSource();
    silentAudioSource.buffer = buffer;
    silentAudioSource.loop = true;
    
    // Connect to destination (zero gain to ensure silent output)
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.0001; 
    
    silentAudioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    silentAudioSource.start();
  } catch (e) {
    console.warn('AudioContext Wake Lock failed to initialize:', e);
  }

  // 3. HTML5 Audio Loop Wake Lock for iOS background tab execution & Media Session API
  try {
    if (!silentAudioHTML5) {
      const wavBlob = createSilentWavBlob(10); // Generate 10-second silent WAV
      const wavUrl = URL.createObjectURL(wavBlob);
      silentAudioHTML5 = new Audio(wavUrl);
      silentAudioHTML5.loop = true;
      
      // Audio session interruption handler (State 2 support)
      // If another app plays audio and interrupts us, iOS automatically pauses our audio tag.
      // We listen to the pause event and gracefully sync the player UI to paused state.
      silentAudioHTML5.addEventListener('pause', () => {
        if (isPlaying) {
          console.log('HTML5 silent audio paused by system interruption. Syncing state.');
          togglePlayback();
        }
      });
    }
    silentAudioHTML5.play().catch(e => console.warn('HTML5 silent audio play failed:', e));
  } catch (e) {
    console.warn('HTML5 silent audio failed to start:', e);
  }
}

function stopAudioKeepAlive() {
  if (chromeKeepAliveInterval) {
    clearInterval(chromeKeepAliveInterval);
    chromeKeepAliveInterval = null;
  }
  
  if (silentAudioSource) {
    try {
      silentAudioSource.stop();
    } catch(e){}
    silentAudioSource = null;
  }

  if (silentAudioHTML5) {
    try {
      silentAudioHTML5.pause();
    } catch(e){}
  }
}

// --- TTS Setting Custom Profile Managers ---
async function loadSpeechProfiles() {
  const profiles = await db.getAllProfiles();
  const headerSelect = DOMElements.headerProfileSelect;
  
  // Clean select
  headerSelect.innerHTML = '<option value="">預設語音設定</option>';
  
  profiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    headerSelect.appendChild(opt);
  });
}

function setupSettingsDrawerEvents() {
  const drawer = DOMElements.settingsDrawer;
  const overlay = DOMElements.drawerOverlay;
  
  DOMElements.btnOpenSettings.addEventListener('click', () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
  });

  DOMElements.btnClass = DOMElements.btnCloseSettings.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  });

  overlay.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Save current TTS Configuration as profile
  DOMElements.btnSaveProfile.addEventListener('click', async () => {
    const name = DOMElements.newProfileName.value.trim();
    if (!name) {
      alert('請輸入配套模組名稱！');
      return;
    }

    const newProfile = {
      name: name,
      platform: DOMElements.settingPlatform.value,
      voiceName: speechVoiceName,
      rate: speechRate,
      pitch: speechPitch
    };

    await db.saveProfile(newProfile);
    DOMElements.newProfileName.value = '';
    
    await loadSpeechProfiles();
    DOMElements.headerProfileSelect.value = name;
    alert(`模組「${name}」已儲存！`);
  });

  // Header quick load profile
  DOMElements.headerProfileSelect.addEventListener('change', async (e) => {
    const name = e.target.value;
    if (!name) return;

    const profile = await db.getProfile(name);
    if (profile) {
      DOMElements.settingPlatform.value = profile.platform;
      speechRate = profile.rate;
      speechPitch = profile.pitch;
      speechVoiceName = profile.voiceName;

      // Sync settings drawer controls
      DOMElements.settingRate.value = speechRate;
      DOMElements.rateVal.textContent = `${speechRate.toFixed(1)}x`;
      DOMElements.speechRateQuick.value = speechRate;
      DOMElements.speechRateQuickLbl.textContent = speechRate.toFixed(1);

      DOMElements.settingPitch.value = speechPitch;
      DOMElements.pitchVal.textContent = speechPitch.toFixed(1);

      applySpeechSettingsChange();
    }
  });

  // Handle export mode toggling
  DOMElements.exportMode.addEventListener('change', (e) => {
    if (e.target.value === 'split') {
      DOMElements.exportChunkGroup.style.display = 'flex';
    } else {
      DOMElements.exportChunkGroup.style.display = 'none';
    }
  });

  // Handle entire book backup export
  DOMElements.btnExportBook.addEventListener('click', exportEntireBook);

  // Handle entire book JSON backup export
  DOMElements.btnExportBackupJson.addEventListener('click', exportBookBackupJson);
}

// --- Content Exporter ---
function exportMarkdown() {
  if (!currentBook || currentChapters.length === 0) {
    alert('無可用內容可匯出');
    return;
  }

  const currentChapter = currentChapters[currentChapterIndex];
  let md = `# ${currentBook.title}\n\n`;
  md += `## ${currentChapter.title}\n\n`;

  currentChapter.content.forEach(para => {
    const paragraphText = para.sentences.join('');
    md += `${paragraphText}\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Format filename cleanly
  const filename = `${currentBook.title}_${currentChapter.title}.md`.replace(/\s+/g, '_');
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CDN_JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`無法載入組件：${url}`));
    document.head.appendChild(script);
  });
}

async function exportEntireBook() {
  if (!currentBook) {
    alert('尚未選取書籍，無法匯出');
    return;
  }

  // Load all chapters for the active book from IndexedDB
  const allChapters = await db.getBookChaptersList(currentBook.id);
  if (allChapters.length === 0) {
    alert('本機資料庫中無此書籍的章節內容，請先下載！');
    return;
  }

  const exportMode = DOMElements.exportMode.value;
  const bookTitle = currentBook.title.replace(/\s+/g, '_');

  if (exportMode === 'single') {
    // --- Mode 1: Merge into a single file ---
    DOMElements.btnExportBook.disabled = true;
    DOMElements.btnExportBook.textContent = '進行合併匯出中...';

    let md = `# ${currentBook.title}\n\n`;
    allChapters.forEach(chap => {
      md += `## ${chap.title}\n\n`;
      chap.content.forEach(para => {
        md += para.sentences.join('') + '\n\n';
      });
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle}_全本.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    DOMElements.btnExportBook.disabled = false;
    DOMElements.btnExportBook.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> 開始備份全書`;
    alert('全本合併匯出成功！');

  } else if (exportMode === 'split') {
    // --- Mode 2: Split and ZIP ---
    const chunkSize = parseInt(DOMElements.exportChunkSize.value) || 100;
    if (chunkSize < 10) {
      alert('每檔章節數不能小於 10 章！');
      return;
    }

    DOMElements.btnExportBook.disabled = true;
    DOMElements.btnExportBook.textContent = '打包壓縮中...';

    try {
      // Load JSZip dynamically
      await loadScript(CDN_JSZIP);
      if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip 壓縮套件載入錯誤');
      }

      const zip = new window.JSZip();
      const totalChapters = allChapters.length;

      for (let i = 0; i < totalChapters; i += chunkSize) {
        const chunk = allChapters.slice(i, i + chunkSize);
        
        // Extract actual chapter numbers from titles
        const startNum = extractChapterNumber(chunk[0].title);
        const endNum = extractChapterNumber(chunk[chunk.length - 1].title);

        let rangeLabel = '';
        if (startNum !== null && endNum !== null) {
          const startPad = String(startNum).padStart(4, '0');
          const endPad = String(endNum).padStart(4, '0');
          rangeLabel = `${startPad}~${endPad}`;
        } else {
          // Fallback to array indices if parsing fails (e.g. non-numbered titles)
          const startIdx = String(i + 1).padStart(4, '0');
          const endIdx = String(Math.min(totalChapters, i + chunkSize)).padStart(4, '0');
          rangeLabel = `${startIdx}~${endIdx}`;
        }

        const filename = `${bookTitle}_${rangeLabel}.md`;

        // Generate content for this chunk
        let md = `# ${currentBook.title} (${rangeLabel})\n\n`;
        chunk.forEach(chap => {
          md += `## ${chap.title}\n\n`;
          chap.content.forEach(para => {
            md += para.sentences.join('') + '\n\n';
          });
        });

        // Add file to ZIP archive
        zip.file(filename, md);
      }

      // Generate ZIP archive blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookTitle}_分段備份.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('分段打包 ZIP 備份成功！');
    } catch (err) {
      console.error(err);
      alert(`備份打包失敗: ${err.message}`);
    } finally {
      DOMElements.btnExportBook.disabled = false;
      DOMElements.btnExportBook.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> 開始備份全書`;
    }
  }
}

// --- Helper Functions to extract actual Chapter Numbers from titles ---
function extractChapterNumber(title) {
  // 1. Try standard digits, e.g. "第123章", "第 123 章" or "123"
  const digitMatch = title.match(/第\s*(\d+)\s*[章節回]/) || title.match(/(\d+)/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  // 2. Try Chinese numbers, e.g. "第六百九十六章"
  const cnMatch = title.match(/第\s*([零一二三四五六七八九十百千]+)\s*[章節回]/);
  if (cnMatch) {
    return chineseToNumber(cnMatch[1]);
  }

  return null;
}

function chineseToNumber(cn) {
  const cnChars = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000 };
  let result = 0;
  let temp = 0;
  for (let i = 0; i < cn.length; i++) {
    const char = cn[i];
    const val = cnChars[char];
    if (val === undefined) continue;

    if (val === 10 || val === 100 || val === 1000) {
      result += (temp || 1) * val;
      temp = 0;
    } else {
      temp = val;
    }
  }
  result += temp;
  return result;
}

async function exportBookBackupJson() {
  if (!currentBook) {
    alert('尚未選取書籍，無法匯出');
    return;
  }

  DOMElements.btnExportBackupJson.disabled = true;
  DOMElements.btnExportBackupJson.textContent = '備份生成中...';

  try {
    const allChapters = await db.getBookChaptersList(currentBook.id);
    if (allChapters.length === 0) {
      alert('本機資料庫中無此書籍的章節內容，請先下載！');
      return;
    }

    const backupData = {
      type: 'xreader-backup',
      version: 1,
      book: currentBook,
      chapters: allChapters
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const bookTitle = currentBook.title.replace(/\s+/g, '_');
    a.download = `${bookTitle}_Xreader備份.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('書籍備份包匯出成功！您可以將此 .json 檔案在其他版本的 Xreader 中拖曳上傳來還原！');
  } catch (err) {
    console.error(err);
    alert(`備份檔案生成失敗: ${err.message}`);
  } finally {
    DOMElements.btnExportBackupJson.disabled = false;
    DOMElements.btnExportBackupJson.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
      匯出 Xreader 備份檔 (.json)
    `;
  }
}

// --- Bookmarklet Handshake Receiver ---
function handleBookmarkletCallback() {
  if (window.location.search.includes('bookmarklet=active')) {
    // Notify opener that Xreader is loaded and ready
    if (window.opener) {
      console.log('Xreader bookmarklet receiver active. Sending ready ping.');
      window.opener.postMessage('xreader-ready', '*');
    }
  }

  // Listen for payload from bookmarklet
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'xreader-import') {
      const data = event.data;
      console.log('Received bookmarklet import payload:', data);

      if (data.isDirectory) {
        // --- Directory/Catalog Import ---
        const chaptersCount = data.links.length;
        const confirmCrawl = confirm(`書籤成功擷取目錄頁面「${data.title}」\n內含 ${chaptersCount} 個章節超連結。\n\n是否將其匯入並下載內容？`);
        
        if (confirmCrawl) {
          const bookId = `web_${Date.now()}`;
          await db.saveBook({
            id: bookId,
            title: data.title,
            author: '書籤目錄抓取',
            url: data.url,
            type: 'web'
          });

          // Open sequential downloader overlay
          showCrawlerOverlay(`書籤隊列下載：${data.title}`, `建立資料庫儲存點...`);
          
          crawlerRunning = true;

          await crawler.downloadChapters(bookId, data.links, {
            delayMs: 2000,
            onProgress: async (prog) => {
              DOMElements.crawlerStatusLbl.textContent = prog.message;
              if (prog.total) {
                const pct = Math.round((prog.index / prog.total) * 100);
                DOMElements.crawlerProgressFill.style.width = `${pct}%`;
              }
              updateCrawlerLog(prog.message);

              if (prog.status === 'cancelled') {
                crawlerRunning = false;
                DOMElements.btnCancelCrawler.textContent = '關閉並檢視已下載內容';
                DOMElements.btnCancelCrawler.className = 'btn btn-primary';
                await loadLibrary();
                await loadBook(bookId);
              } else if (prog.status === 'error') {
                crawlerRunning = false;
                DOMElements.btnCancelCrawler.textContent = '關閉視窗';
                DOMElements.btnCancelCrawler.className = 'btn btn-secondary';
              }
            },
            onComplete: async () => {
              crawlerRunning = false;
              hideCrawlerOverlay();
              await loadLibrary();
              await loadBook(bookId);
            }
          });
        }
      } else {
        // --- Single Page Content Import ---
        const bookId = `web_${Date.now()}`;
        await db.saveBook({
          id: bookId,
          title: data.title,
          author: '書籤網頁擷取',
          url: data.url,
          type: 'web'
        });

        const segmented = TextSegmenter.segment(data.content);
        await db.saveChapter({
          bookId: bookId,
          chapterIndex: 0,
          title: '書籤擷取全文',
          url: data.url,
          content: segmented
        });

        await loadLibrary();
        await loadBook(bookId);
        alert(`書籤已成功為您擷取文章「${data.title}」！`);
      }
    }
  });
}

// --- Generate & Update Bookmarklet Code link ---
function updateBookmarkletLink() {
  // Resolve active URL of Xreader page (works dynamically whether local or deployed)
  const currentAppUrl = window.location.origin + window.location.pathname;
  const bookmarkletHref = BookmarkletGenerator.generate(currentAppUrl);
  
  DOMElements.bookmarkletAnchor.href = bookmarkletHref;

  // Sync click event to show alert to drag/drop
  DOMElements.bookmarkletAnchor.addEventListener('click', (e) => {
    e.preventDefault();
    alert('【安裝說明】\n請用滑鼠將這個按鈕「直接拖曳」到您的瀏覽器「書籤列」中。\n當您瀏覽其他小說目錄網頁時，點擊該書籤即可匯入！');
  });

  DOMElements.bookmarkletBtn.addEventListener('click', () => {
    // Toggle settings drawer where the bookmarklet is located
    DOMElements.settingsDrawer.classList.toggle('open');
    DOMElements.drawerOverlay.classList.toggle('open');
  });
}
