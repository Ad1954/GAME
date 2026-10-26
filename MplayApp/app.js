/**
 * Mplay 隨身影格播放器 - iPad Pro USB Drive Local Media PWA (v1.2.3)
 * Core Features:
 * 1. Zero-copy, zero-stat instant ingestion for 100GB+ USB folders (only stores lightweight File pointers)
 * 2. Strict Single-Active-File loading: only loads current file on demand; lazy virtualized playlist
 * 3. Folder Depth Protection: prevents accidental root-directory recursive overload
 * 4. State-based gesture routing + Full-Stage Tap to Play/Pause video
 * 5. Proportional Fit-to-Boundary (等比例放大至長或寬抵到畫面邊界，絕不變形) + Pinch-to-Zoom & Pan for WebP/GIF/Images
 */

const STORAGE_KEY = 'mplay_user_settings_v2';

const DEFAULT_SETTINGS = {
  leftAction: 'rewind',        // 'rewind' | 'forward' | 'next' | 'prev' | 'none'
  leftSeconds: 30,
  rightAction: 'forward',      // 'forward' | 'rewind' | 'prev' | 'next' | 'none'
  rightSeconds: 30,
  folderVideoPolicy: 'include', // 'include' (load videos + images + audio) | 'exclude' (images + audio only)
  folderDepthMode: 'shallow',  // 'shallow' (only chosen folder level) | 'recursive' (include subfolders)
  tapPlayingBehavior: 'pause', // 'pause' | 'toggleHud'
  swipeThreshold: 45           // px
};

const fastCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const state = {
  allFiles: [],          // Lightweight pointers: { id, file, name, type, ext, isDemo, demoUrl, posterUrl }
  filteredFiles: [],
  activeFilter: 'all',
  currentIndex: 0,
  renderToken: 0,
  isPlaying: false,
  isManualFullscreen: false,
  activeMediaEl: null,
  activeObjectUrls: new Map(), // Keeps strictly active item ObjectURL to guarantee minimal memory
  imageFitMode: 'boundary',    // 'boundary' (等比例撐到邊界) | 'original' (原始 1:1)
  imageZoom: 1,
  imagePanX: 0,
  imagePanY: 0,
  playlistRenderLimit: 80,
  settings: loadSettings(),
  feedbackTimer: null
};

// DOM References
const dom = {
  app: document.getElementById('app'),
  btnHomeLogo: document.getElementById('btnHomeLogo'),
  topHud: document.getElementById('topHud'),
  bottomHud: document.getElementById('bottomHud'),
  offlineBadge: document.getElementById('offlineBadge'),
  currentFileTitle: document.getElementById('currentFileTitle'),
  filterBar: document.getElementById('filterBar'),
  countAll: document.getElementById('countAll'),
  countVideo: document.getElementById('countVideo'),
  countImage: document.getElementById('countImage'),
  countAudio: document.getElementById('countAudio'),
  fileInputFolder: document.getElementById('fileInputFolder'),
  fileInputMultiple: document.getElementById('fileInputMultiple'),
  btnOpenFolder: document.getElementById('btnOpenFolder'),
  btnOpenFiles: document.getElementById('btnOpenFiles'),
  btnHeroSelectFolder: document.getElementById('btnHeroSelectFolder'),
  btnHeroSelectFiles: document.getElementById('btnHeroSelectFiles'),
  btnLoadDemo: document.getElementById('btnLoadDemo'),
  btnTogglePlaylist: document.getElementById('btnTogglePlaylist'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  emptyState: document.getElementById('emptyState'),
  mediaStage: document.getElementById('mediaStage'),
  slideViewport: document.getElementById('slideViewport'),
  modeStateDot: document.getElementById('modeStateDot'),
  modeStateText: document.getElementById('modeStateText'),
  centerPlayBtn: document.getElementById('centerPlayBtn'),
  gestureFeedback: document.getElementById('gestureFeedback'),
  gestureFeedbackIcon: document.getElementById('gestureFeedbackIcon'),
  gestureFeedbackText: document.getElementById('gestureFeedbackText'),
  gestureFeedbackSub: document.getElementById('gestureFeedbackSub'),
  btnPrevFile: document.getElementById('btnPrevFile'),
  btnNextFile: document.getElementById('btnNextFile'),
  playbackControlsRow: document.getElementById('playbackControlsRow'),
  btnBottomPlayPause: document.getElementById('btnBottomPlayPause'),
  iconPlay: document.getElementById('iconPlay'),
  iconPause: document.getElementById('iconPause'),
  btnQuickLeftGesture: document.getElementById('btnQuickLeftGesture'),
  btnQuickRightGesture: document.getElementById('btnQuickRightGesture'),
  timeCurrent: document.getElementById('timeCurrent'),
  timeDuration: document.getElementById('timeDuration'),
  seekSlider: document.getElementById('seekSlider'),
  playbackRateSelect: document.getElementById('playbackRateSelect'),
  fileTypeBadge: document.getElementById('fileTypeBadge'),
  filePositionInfo: document.getElementById('filePositionInfo'),
  gestureHintFooter: document.getElementById('gestureHintFooter'),
  guideGestureSummary: document.getElementById('guideGestureSummary'),
  btnToggleFitMode: document.getElementById('btnToggleFitMode'),
  btnZoomReset: document.getElementById('btnZoomReset'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  btnRestoreHud: document.getElementById('btnRestoreHud'),
  playlistDrawer: document.getElementById('playlistDrawer'),
  playlistHeaderTitle: document.getElementById('playlistHeaderTitle'),
  btnClosePlaylist: document.getElementById('btnClosePlaylist'),
  playlistContainer: document.getElementById('playlistContainer'),
  settingsModal: document.getElementById('settingsModal'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  selectLeftAction: document.getElementById('selectLeftAction'),
  inputLeftSeconds: document.getElementById('inputLeftSeconds'),
  leftSecondsGroup: document.getElementById('leftSecondsGroup'),
  selectRightAction: document.getElementById('selectRightAction'),
  inputRightSeconds: document.getElementById('inputRightSeconds'),
  rightSecondsGroup: document.getElementById('rightSecondsGroup'),
  selectFolderVideoPolicy: document.getElementById('selectFolderVideoPolicy'),
  selectFolderDepthMode: document.getElementById('selectFolderDepthMode'),
  selectTapPlayingBehavior: document.getElementById('selectTapPlayingBehavior'),
  inputSwipeThreshold: document.getElementById('inputSwipeThreshold'),
  swipeThresholdLabel: document.getElementById('swipeThresholdLabel'),
  btnResetSettings: document.getElementById('btnResetSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  dropZoneOverlay: document.getElementById('dropZoneOverlay')
};

/* =========================================
   1. INITIALIZATION & PWA SERVICE WORKER
   ========================================= */
function initApp() {
  registerServiceWorker();
  setupNetworkStatus();
  applySettingsToUI();
  bindEvents();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('ServiceWorker registration info:', err);
      });
    });
  }
}

function setupNetworkStatus() {
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      dom.offlineBadge.textContent = '離線就緒';
      dom.offlineBadge.classList.remove('offline');
    } else {
      dom.offlineBadge.textContent = '✈️ 離線模式';
      dom.offlineBadge.classList.add('offline');
    }
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

/* =========================================
   2. SETTINGS PERSISTENCE
   ========================================= */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      leftSeconds: Math.max(1, Math.min(600, Number(parsed.leftSeconds) || 30)),
      rightSeconds: Math.max(1, Math.min(600, Number(parsed.rightSeconds) || 30)),
      swipeThreshold: Math.max(25, Math.min(120, Number(parsed.swipeThreshold) || 45))
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(newSettings) {
  state.settings = { ...newSettings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
  applySettingsToUI();
  updateStageStateUI();
}

function describeGestureAction(action, sec) {
  switch (action) {
    case 'rewind': return `倒退 ${sec} 秒`;
    case 'forward': return `快轉 ${sec} 秒`;
    case 'next': return '下一檔案';
    case 'prev': return '上一檔案';
    case 'none': return '無動作';
    default: return '';
  }
}

function formatButtonLabel(action, sec) {
  if (action === 'rewind') return `-${sec}s`;
  if (action === 'forward') return `+${sec}s`;
  if (action === 'next') return '⏭️';
  if (action === 'prev') return '⏮️';
  return '—';
}

function applySettingsToUI() {
  const s = state.settings;
  dom.selectLeftAction.value = s.leftAction;
  dom.inputLeftSeconds.value = s.leftSeconds;
  dom.leftSecondsGroup.classList.toggle('hidden', s.leftAction !== 'rewind' && s.leftAction !== 'forward');

  dom.selectRightAction.value = s.rightAction;
  dom.inputRightSeconds.value = s.rightSeconds;
  dom.rightSecondsGroup.classList.toggle('hidden', s.rightAction !== 'rewind' && s.rightAction !== 'forward');

  if (dom.selectFolderVideoPolicy) {
    dom.selectFolderVideoPolicy.value = s.folderVideoPolicy || 'include';
  }
  dom.selectFolderDepthMode.value = s.folderDepthMode || 'shallow';
  dom.selectTapPlayingBehavior.value = s.tapPlayingBehavior;
  dom.inputSwipeThreshold.value = s.swipeThreshold;
  dom.swipeThresholdLabel.textContent = s.swipeThreshold;

  syncPresetChips('inputLeftSeconds', s.leftSeconds);
  syncPresetChips('inputRightSeconds', s.rightSeconds);

  const summary = `往左${describeGestureAction(s.leftAction, s.leftSeconds)} / 往右${describeGestureAction(s.rightAction, s.rightSeconds)}`;
  dom.guideGestureSummary.textContent = summary;

  dom.btnQuickLeftGesture.textContent = formatButtonLabel(s.leftAction, s.leftSeconds);
  dom.btnQuickRightGesture.textContent = formatButtonLabel(s.rightAction, s.rightSeconds);
}

function syncPresetChips(targetInputId, val) {
  const container = document.querySelector(`.preset-chips[data-target="${targetInputId}"]`);
  if (!container) return;
  container.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('active', Number(chip.dataset.sec) === Number(val));
  });
}

/* =========================================
   3. ZERO-STAT INSTANT FILE INGESTION
   ========================================= */
const VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'ogv', '3gp', 'ts']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg', 'bmp', 'avif']);
const AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'opus']);

/**
 * Classifies file purely by filename extension first so iPadOS never has to stat() file metadata over USB.
 */
function classifyByNameFast(fileName) {
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const ext = fileName.slice(dotIdx + 1).toLowerCase();

  if (VIDEO_EXTS.has(ext)) return { type: 'video', ext: ext.toUpperCase() };
  if (IMAGE_EXTS.has(ext)) return { type: 'image', ext: ext.toUpperCase() };
  if (AUDIO_EXTS.has(ext)) return { type: 'audio', ext: ext.toUpperCase() };
  return null;
}

function getRelativeDepth(file) {
  const rel = file.webkitRelativePath || '';
  if (!rel) return 1;
  // e.g. "SelectedFolder/video.mp4" -> 2 parts (depth 1 inside SelectedFolder)
  // e.g. "SelectedFolder/Sub/video.mp4" -> 3 parts (depth 2)
  let slashes = 0;
  for (let i = 0; i < rel.length; i++) {
    if (rel.charCodeAt(i) === 47) slashes++;
  }
  return slashes;
}

function ingestFileList(fileList, isFromFolderPicker = false, excludeVideo = false) {
  const totalRaw = fileList ? fileList.length : 0;
  if (totalRaw === 0) return;

  const isShallowMode = isFromFolderPicker && state.settings.folderDepthMode === 'shallow';
  const shallowItems = [];
  const allCandidates = [];
  let skippedSubfolderCount = 0;
  let skippedVideoCount = 0;

  // Ultra-fast loop: only reads file.name and file.webkitRelativePath (in-memory strings, zero USB disk I/O!)
  for (let i = 0; i < totalRaw; i++) {
    const file = fileList[i];
    const name = file.name || '';
    if (!name || name.charCodeAt(0) === 46) continue; // skip hidden dot files like ._file

    const info = classifyByNameFast(name);
    if (!info) continue;

    if (excludeVideo && info.type === 'video') {
      skippedVideoCount++;
      continue;
    }

    const depth = getRelativeDepth(file);
    const pointerItem = {
      id: `f-${i}-${name}`,
      file,
      handle: null,
      name,
      depth,
      type: info.type,
      ext: info.ext,
      isDemo: false
    };

    allCandidates.push(pointerItem);
    if (depth <= 1) {
      shallowItems.push(pointerItem);
    } else {
      skippedSubfolderCount++;
    }
  }

  // Decide which list to use based on folder depth protection
  let validItems = allCandidates;
  if (isShallowMode) {
    if (shallowItems.length > 0) {
      validItems = shallowItems;
    } else if (allCandidates.length > 0) {
      let minDepth = Infinity;
      for (let i = 0; i < allCandidates.length; i++) {
        if (allCandidates[i].depth < minDepth) minDepth = allCandidates[i].depth;
      }
      validItems = allCandidates.filter((item) => item.depth === minDepth);
    }
  }

  if (validItems.length === 0) {
    if (excludeVideo && skippedVideoCount > 0) {
      showFeedbackToast('🎬', '資料夾模式已排除影片檔', '觀看影片請點擊「🎬 選影片/單檔」按鈕');
    } else {
      showFeedbackToast('⚠️', '未偵測到支援的媒體檔案', '支援圖片/WebP/GIF/MP3 或單選影片');
    }
    return;
  }

  commitIngestedItems(validItems, {
    isShallowMode,
    skippedSubfolderCount,
    skippedVideoCount
  });
}

function commitIngestedItems(validItems, meta = {}) {
  // Fast natural sort via Intl.Collator
  validItems.sort((a, b) => fastCollator.compare(a.name, b.name));

  // Release any previous session decoders & URLs
  releaseAllObjectUrls();
  destroyActiveMediaDecoder();

  state.allFiles = validItems;
  state.activeFilter = 'all';
  state.playlistRenderLimit = 80;

  updateCategoryCounts();
  applyFilter('all');

  if (meta.skippedVideoCount > 0) {
    showFeedbackToast(
      '📂',
      `已載入 ${validItems.length} 個圖片/音訊`,
      `已自動略過 ${meta.skippedVideoCount} 部影片（看影片請用選單檔）`
    );
  } else if (meta.isShallowMode && meta.skippedSubfolderCount > 0) {
    showFeedbackToast(
      '📂',
      `已載入當層 ${validItems.length} 個檔案`,
      `已自動略過子資料夾 ${meta.skippedSubfolderCount} 個檔案`
    );
  } else {
    showFeedbackToast(
      '⚡',
      `瞬時載入 ${validItems.length} 個項目`,
      '僅按需讀取當前第 1 個檔案'
    );
  }
}

/**
 * Modern File System Access API (showDirectoryPicker):
 * Avoids the browser "Upload N files to this site?" prompt on PC Chrome/Edge and reads FileHandles lazily!
 */
async function openFolderSmart() {
  const excludeVideo = state.settings.folderVideoPolicy === 'exclude';
  if (typeof window.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      const allowRecursive = state.settings.folderDepthMode === 'recursive';
      const collected = [];
      const counter = { idx: 0, skippedVideos: 0 };

      await collectHandlesFromDir(dirHandle, collected, 1, allowRecursive, excludeVideo, counter);

      if (collected.length === 0) {
        if (counter.skippedVideos > 0) {
          showFeedbackToast('🎬', '目前設定為資料夾排除影片', '可於⚙️設定開啟資料夾載入影片，或點「選單檔」');
        } else {
          showFeedbackToast('⚠️', '資料夾內無支援的媒體檔案', '支援 MP4/MOV/JPG/PNG/WebP/GIF/MP3');
        }
        return;
      }

      commitIngestedItems(collected, {
        isShallowMode: !allowRecursive,
        skippedSubfolderCount: 0,
        skippedVideoCount: counter.skippedVideos
      });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.warn('showDirectoryPicker fallback to input:', err);
    }
  }

  // Fallback for iPadOS Safari
  dom.fileInputFolder.value = '';
  dom.fileInputFolder.click();
}

async function collectHandlesFromDir(dirHandle, outList, depth, allowRecursive, excludeVideo, counter) {
  for await (const entry of dirHandle.values()) {
    const name = entry.name || '';
    if (!name || name.charCodeAt(0) === 46) continue;

    if (entry.kind === 'file') {
      const info = classifyByNameFast(name);
      if (!info) continue;
      if (excludeVideo && info.type === 'video') {
        counter.skippedVideos++;
        continue;
      }
      counter.idx++;
      outList.push({
        id: `h-${counter.idx}-${name}`,
        file: null,
        handle: entry,
        name,
        depth,
        type: info.type,
        ext: info.ext,
        isDemo: false
      });
    } else if (entry.kind === 'directory' && allowRecursive && depth < 5) {
      await collectHandlesFromDir(entry, outList, depth + 1, allowRecursive, excludeVideo, counter);
    }
  }
}

/**
 * Modern File System Access API (showOpenFilePicker) for Single/Few Video or Media files:
 */
async function openFilesSmart() {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true
      });
      if (!handles || handles.length === 0) return;

      const items = [];
      for (let i = 0; i < handles.length; i++) {
        const h = handles[i];
        const name = h.name || '';
        const info = classifyByNameFast(name);
        if (!info) continue;
        items.push({
          id: `fh-${i}-${name}`,
          file: null,
          handle: h,
          name,
          depth: 1,
          type: info.type,
          ext: info.ext,
          isDemo: false
        });
      }

      if (items.length === 0) {
        showFeedbackToast('⚠️', '未偵測到支援的媒體檔案', '支援 MP4/MOV/WebM/圖片/MP3');
        return;
      }

      commitIngestedItems(items, {});
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.warn('showOpenFilePicker fallback to input:', err);
    }
  }

  // Fallback for iPadOS Safari
  dom.fileInputMultiple.value = '';
  dom.fileInputMultiple.click();
}

function updateCategoryCounts() {
  const counts = { all: state.allFiles.length, video: 0, image: 0, audio: 0 };
  for (let i = 0; i < state.allFiles.length; i++) {
    const t = state.allFiles[i].type;
    counts[t] = (counts[t] || 0) + 1;
  }
  dom.countAll.textContent = counts.all;
  dom.countVideo.textContent = counts.video;
  dom.countImage.textContent = counts.image;
  dom.countAudio.textContent = counts.audio;

  dom.filterBar.classList.toggle('hidden', counts.all === 0);
  dom.btnTogglePlaylist.classList.toggle('hidden', counts.all === 0);
}

function applyFilter(filterType) {
  state.activeFilter = filterType;
  document.querySelectorAll('.filter-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filterType);
  });

  state.filteredFiles = filterType === 'all'
    ? state.allFiles
    : state.allFiles.filter((f) => f.type === filterType);

  if (state.filteredFiles.length === 0) {
    dom.emptyState.classList.remove('hidden');
    dom.mediaStage.classList.add('hidden');
    dom.bottomHud.classList.add('hidden');
    return;
  }

  dom.emptyState.classList.add('hidden');
  dom.mediaStage.classList.remove('hidden');
  dom.bottomHud.classList.remove('hidden');

  // Immediately display the first file! Do NOT block on rendering playlist DOM until opened.
  loadMediaAtIndex(0);
  if (!dom.playlistDrawer.classList.contains('hidden')) {
    renderPlaylist();
  }
}

/* =========================================
   4. STRICT SINGLE-ACTIVE-FILE MEMORY ENGINE
   ========================================= */
function getOrCreateObjectUrlSync(index) {
  const item = state.filteredFiles[index];
  if (!item) return '';
  if (item.isDemo && item.demoUrl) return item.demoUrl;

  if (state.activeObjectUrls.has(item.id)) {
    return state.activeObjectUrls.get(item.id);
  }
  if (item.file) {
    const url = URL.createObjectURL(item.file);
    state.activeObjectUrls.set(item.id, url);
    return url;
  }
  return '';
}

async function getOrCreateObjectUrlAsync(index) {
  const syncUrl = getOrCreateObjectUrlSync(index);
  if (syncUrl) return syncUrl;

  const item = state.filteredFiles[index];
  if (!item || !item.handle) return '';

  const fileObj = await item.handle.getFile();
  item.file = fileObj;
  const url = URL.createObjectURL(fileObj);
  state.activeObjectUrls.set(item.id, url);
  return url;
}

/**
 * Only keeps the current active file's ObjectURL in memory so even 100GB folders
 * only ever open 1 file handle on the USB drive at a time!
 */
function pruneObjectUrlsStrict(centerIndex) {
  const currentItem = state.filteredFiles[centerIndex];
  const keepId = currentItem ? currentItem.id : null;

  for (const [id, url] of state.activeObjectUrls.entries()) {
    if (id !== keepId) {
      URL.revokeObjectURL(url);
      state.activeObjectUrls.delete(id);
    }
  }
}

function releaseAllObjectUrls() {
  for (const url of state.activeObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  state.activeObjectUrls.clear();
}

function destroyActiveMediaDecoder() {
  if (state.activeMediaEl) {
    try {
      state.activeMediaEl.pause();
      state.activeMediaEl.removeAttribute('src');
      state.activeMediaEl.load();
    } catch {
      // ignore cleanup errors
    }
    state.activeMediaEl = null;
  }
  state.isPlaying = false;
  if (!state.isManualFullscreen) {
    dom.app.classList.remove('hud-hidden');
  }
}

/* =========================================
   5. CORE STAGE RENDERING & PLAYBACK STATE
   ========================================= */
async function loadMediaAtIndex(index, slideDirection = 0) {
  const total = state.filteredFiles.length;
  if (total === 0) return;

  const targetIndex = (index + total) % total;
  const token = ++state.renderToken;

  // Always stop previous decoder and reset to NOT PLAYING when switching files
  destroyActiveMediaDecoder();
  state.currentIndex = targetIndex;
  state.imageZoom = 1;
  state.imagePanX = 0;
  state.imagePanY = 0;
  dom.btnZoomReset.classList.add('hidden');

  const item = state.filteredFiles[targetIndex];
  pruneObjectUrlsStrict(targetIndex);

  // Subtle slide transition effect
  if (slideDirection !== 0) {
    dom.slideViewport.style.transition = 'none';
    dom.slideViewport.style.transform = `translateX(${slideDirection > 0 ? '36px' : '-36px'})`;
    dom.slideViewport.style.opacity = '0.4';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dom.slideViewport.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.16s ease';
        dom.slideViewport.style.transform = 'translateX(0)';
        dom.slideViewport.style.opacity = '1';
      });
    });
  }

  dom.slideViewport.innerHTML = '';

  if (item.type === 'image') {
    const mediaUrl = await getOrCreateObjectUrlAsync(targetIndex);
    if (token !== state.renderToken) return;

    const img = document.createElement('img');
    img.className = `media-element-image ${state.imageFitMode === 'boundary' ? 'fit-boundary' : 'fit-original'}`;
    img.src = mediaUrl;
    img.alt = item.name;
    img.draggable = false;
    dom.slideViewport.appendChild(img);

    dom.centerPlayBtn.classList.add('hidden');
    dom.playbackControlsRow.classList.add('hidden');
    dom.btnToggleFitMode.classList.remove('hidden');
    updateFitModeButtonLabel();
  } else if (item.type === 'video') {
    const video = document.createElement('video');
    video.className = 'media-element-video';
    if (item.posterUrl) {
      video.poster = item.posterUrl;
    }
    // Zero-preload standby: 0 bytes read from USB drive until user taps to play!
    video.preload = 'none';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.controls = false;
    video.playbackRate = Number(dom.playbackRateSelect.value) || 1;

    video.addEventListener('loadedmetadata', () => {
      dom.timeDuration.textContent = formatTime(video.duration);
      dom.timeCurrent.textContent = formatTime(video.currentTime);
    });

    const standbyBadge = document.createElement('div');
    standbyBadge.id = 'videoStandbyTitle';
    standbyBadge.className = 'video-standby-title';
    standbyBadge.textContent = `🎬 ${item.name}`;

    bindMediaEvents(video, item);
    dom.slideViewport.appendChild(video);
    dom.slideViewport.appendChild(standbyBadge);
    state.activeMediaEl = video;

    // Default to NOT playing; tapping anywhere on the video stage attaches stream & starts playback
    dom.centerPlayBtn.classList.remove('hidden');
    dom.playbackControlsRow.classList.remove('hidden');
    dom.btnToggleFitMode.classList.add('hidden');
    resetScrubberUI();
  } else if (item.type === 'audio') {
    const deck = document.createElement('div');
    deck.className = 'audio-deck-card';
    deck.innerHTML = `
      <div id="vinylDisc" class="vinyl-disc">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#f8fafc" stroke-width="1.8">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      </div>
      <div class="audio-title">${escapeHtml(item.name)}</div>
      <div class="audio-sub">輕點畫面任意處開始播放 / 暫停</div>
    `;

    const audio = document.createElement('audio');
    audio.preload = 'none';
    audio.playbackRate = Number(dom.playbackRateSelect.value) || 1;

    audio.addEventListener('loadedmetadata', () => {
      dom.timeDuration.textContent = formatTime(audio.duration);
      dom.timeCurrent.textContent = formatTime(audio.currentTime);
    });

    bindMediaEvents(audio, item);
    deck.appendChild(audio);
    dom.slideViewport.appendChild(deck);
    state.activeMediaEl = audio;

    dom.centerPlayBtn.classList.remove('hidden');
    dom.playbackControlsRow.classList.remove('hidden');
    dom.btnToggleFitMode.classList.add('hidden');
    resetScrubberUI();
  }

  // Update Header & Footer Metadata
  dom.currentFileTitle.textContent = item.name;
  dom.fileTypeBadge.textContent = `${item.type.toUpperCase()} · ${item.ext}`;
  dom.filePositionInfo.textContent = `${targetIndex + 1} / ${total}`;

  if (!dom.playlistDrawer.classList.contains('hidden')) {
    highlightPlaylistActive();
  }
  updateStageStateUI();
  updateMediaSessionMetadata(item);
}

function resetScrubberUI() {
  dom.seekSlider.value = 0;
  dom.timeCurrent.textContent = '00:00';
  dom.timeDuration.textContent = '00:00';
}

function bindMediaEvents(mediaEl, item) {
  mediaEl.addEventListener('play', () => {
    state.isPlaying = true;
    dom.app.classList.add('hud-hidden');
    dom.centerPlayBtn.classList.add('hidden');
    const standbyTitle = document.getElementById('videoStandbyTitle');
    if (standbyTitle) standbyTitle.classList.add('hidden');
    const disc = document.getElementById('vinylDisc');
    if (disc) disc.classList.add('spinning');
    updateStageStateUI();
  });

  mediaEl.addEventListener('pause', () => {
    state.isPlaying = false;
    if (!state.isManualFullscreen) {
      dom.app.classList.remove('hud-hidden');
    }
    dom.centerPlayBtn.classList.remove('hidden');
    const disc = document.getElementById('vinylDisc');
    if (disc) disc.classList.remove('spinning');
    updateStageStateUI();
  });

  mediaEl.addEventListener('ended', () => {
    state.isPlaying = false;
    if (!state.isManualFullscreen) {
      dom.app.classList.remove('hud-hidden');
    }
    dom.centerPlayBtn.classList.remove('hidden');
    const disc = document.getElementById('vinylDisc');
    if (disc) disc.classList.remove('spinning');
    updateStageStateUI();

    if (item.type === 'audio' && state.filteredFiles.length > 1) {
      showFeedbackToast('🎵', '播放完畢', '左右滑動可切換下一首');
    }
  });

  mediaEl.addEventListener('timeupdate', () => {
    if (!mediaEl.duration || isNaN(mediaEl.duration)) return;
    const pct = (mediaEl.currentTime / mediaEl.duration) * 100;
    dom.seekSlider.value = pct;
    dom.timeCurrent.textContent = formatTime(mediaEl.currentTime);
    dom.timeDuration.textContent = formatTime(mediaEl.duration);
  });
}

async function togglePlayPause() {
  const mediaEl = state.activeMediaEl;
  if (!mediaEl) return;

  if (mediaEl.paused) {
    // Attach ObjectURL on-demand at the exact moment user taps Play!
    if (!mediaEl.getAttribute('src')) {
      const idx = state.currentIndex;
      const syncUrl = getOrCreateObjectUrlSync(idx);
      if (syncUrl) {
        mediaEl.src = syncUrl;
      } else {
        const asyncUrl = await getOrCreateObjectUrlAsync(idx);
        if (!asyncUrl || state.activeMediaEl !== mediaEl) return;
        mediaEl.src = asyncUrl;
      }
      pruneObjectUrlsStrict(idx);
    }

    mediaEl.play().catch((err) => {
      console.warn('Play blocked or failed:', err);
      showFeedbackToast('⚠️', '無法播放此格式', '請確認編碼格式是否受系統支援');
    });
  } else {
    mediaEl.pause();
  }
}

function updateStageStateUI() {
  const s = state.settings;
  const currentItem = state.filteredFiles[state.currentIndex];
  if (state.isPlaying) {
    dom.modeStateDot.className = 'state-dot playing';
    const leftText = describeGestureAction(s.leftAction, s.leftSeconds);
    const rightText = describeGestureAction(s.rightAction, s.rightSeconds);
    dom.modeStateText.textContent = `播放中：左滑${leftText} · 右滑${rightText}（輕點畫面暫停）`;
    dom.gestureHintFooter.textContent = `播放中手勢：左滑${leftText} / 右滑${rightText}`;
    dom.iconPlay.classList.add('hidden');
    dom.iconPause.classList.remove('hidden');
  } else {
    dom.modeStateDot.className = 'state-dot idle';
    if (currentItem && currentItem.type === 'image') {
      dom.modeStateText.textContent = '看圖模式：左右滑動換張 · 輕點切換等比例邊界放大 · 雙指縮放';
      dom.gestureHintFooter.textContent = '左右滑動切換檔案 ｜ 輕點切換等比例撐滿邊界';
    } else {
      dom.modeStateText.textContent = '未播放：左右滑動切換檔案 · 輕點畫面任意處開始播放';
      dom.gestureHintFooter.textContent = '未播放：左右滑動換檔 ｜ 輕點畫面任意處開始播放';
    }
    dom.iconPlay.classList.remove('hidden');
    dom.iconPause.classList.add('hidden');
  }
}

function prevFile() {
  if (state.filteredFiles.length === 0) return;
  loadMediaAtIndex(state.currentIndex - 1, -1);
  showFeedbackToast('⏮️', '上一個檔案', `${state.currentIndex + 1} / ${state.filteredFiles.length}`);
}

function nextFile() {
  if (state.filteredFiles.length === 0) return;
  loadMediaAtIndex(state.currentIndex + 1, 1);
  showFeedbackToast('⏭️', '下一個檔案', `${state.currentIndex + 1} / ${state.filteredFiles.length}`);
}

/* =========================================
   6. IMAGE PROPORTIONAL FIT-TO-BOUNDARY & ZOOM
   ========================================= */
function toggleImageFitMode() {
  const currentItem = state.filteredFiles[state.currentIndex];
  if (!currentItem || currentItem.type !== 'image') return;

  // If currently pinch-zoomed in, reset zoom first
  if (state.imageZoom > 1.02) {
    resetImageTransform();
    showFeedbackToast('📐', '已重置縮放', '等比例配合畫面邊界');
    return;
  }

  state.imageFitMode = state.imageFitMode === 'boundary' ? 'original' : 'boundary';
  const img = dom.slideViewport.querySelector('.media-element-image');
  if (img) {
    img.classList.toggle('fit-boundary', state.imageFitMode === 'boundary');
    img.classList.toggle('fit-original', state.imageFitMode === 'original');
  }
  updateFitModeButtonLabel();

  if (state.imageFitMode === 'boundary') {
    showFeedbackToast('📐', '等比例放大至邊界', '長或寬抵到畫面邊界（維持原比例不變形）');
  } else {
    showFeedbackToast('🔎', '原始 1:1 尺寸', '顯示圖片原始像素大小');
  }
}

function updateFitModeButtonLabel() {
  if (state.imageFitMode === 'boundary') {
    dom.btnToggleFitMode.textContent = '📐 等比例撐滿邊界';
  } else {
    dom.btnToggleFitMode.textContent = '🔎 原始 1:1 比例';
  }
}

function applyImageTransform() {
  const img = dom.slideViewport.querySelector('.media-element-image');
  if (!img) return;
  img.style.transform = `translate3d(${state.imagePanX}px, ${state.imagePanY}px, 0) scale(${state.imageZoom})`;
  dom.btnZoomReset.classList.toggle('hidden', state.imageZoom <= 1.02);
}

function resetImageTransform() {
  state.imageZoom = 1;
  state.imagePanX = 0;
  state.imagePanY = 0;
  applyImageTransform();
}

/* =========================================
   7. STATE-AWARE GESTURE ENGINE (FULL-STAGE TAP, SWIPE, PINCH & PAN)
   ========================================= */
function executePlayingGesture(direction) {
  const s = state.settings;
  const action = direction === 'left' ? s.leftAction : s.rightAction;
  const seconds = direction === 'left' ? s.leftSeconds : s.rightSeconds;

  if (action === 'none') return;

  if (action === 'next') {
    nextFile();
    return;
  }
  if (action === 'prev') {
    prevFile();
    return;
  }

  if (!state.activeMediaEl) return;
  const media = state.activeMediaEl;
  const delta = action === 'rewind' ? -seconds : seconds;
  const duration = media.duration || Infinity;
  const targetTime = Math.max(0, Math.min(duration, (media.currentTime || 0) + delta));
  media.currentTime = targetTime;

  const icon = delta < 0 ? '⏪' : '⏩';
  const sign = delta > 0 ? '+' : '';
  const timeInfo = isFinite(duration)
    ? `${formatTime(targetTime)} / ${formatTime(duration)}`
    : formatTime(targetTime);

  showFeedbackToast(icon, `${sign}${delta} 秒`, timeInfo);
}

function setupStageGestures() {
  let startX = 0;
  let startY = 0;
  let lastPanX = 0;
  let lastPanY = 0;
  let startTime = 0;
  let isTracking = false;
  let isPanningZoomedImage = false;
  let initialPinchDist = null;
  let initialZoom = 1;

  const stage = dom.mediaStage;

  // Touch events for iPad Pro
  stage.addEventListener('touchstart', (e) => {
    if (e.target.closest('button, input, select')) return;

    const currentItem = state.filteredFiles[state.currentIndex];

    if (e.touches.length === 2 && currentItem && currentItem.type === 'image') {
      isTracking = false;
      isPanningZoomedImage = false;
      initialPinchDist = getPinchDistance(e.touches);
      initialZoom = state.imageZoom;
      return;
    }

    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isTracking = true;

      if (currentItem && currentItem.type === 'image' && state.imageZoom > 1.05) {
        isPanningZoomedImage = true;
        lastPanX = state.imagePanX;
        lastPanY = state.imagePanY;
      } else {
        isPanningZoomedImage = false;
      }
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    const currentItem = state.filteredFiles[state.currentIndex];
    if (!currentItem || currentItem.type !== 'image') return;

    if (e.touches.length === 2 && initialPinchDist) {
      const dist = getPinchDistance(e.touches);
      const scale = Math.max(1, Math.min(5, initialZoom * (dist / initialPinchDist)));
      state.imageZoom = scale;
      if (scale <= 1.02) {
        state.imagePanX = 0;
        state.imagePanY = 0;
      }
      applyImageTransform();
      return;
    }

    if (e.touches.length === 1 && isPanningZoomedImage && state.imageZoom > 1.05) {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      state.imagePanX = lastPanX + dx;
      state.imagePanY = lastPanY + dy;
      applyImageTransform();
    }
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    if (initialPinchDist && e.touches.length < 2) {
      initialPinchDist = null;
      return;
    }
    if (!isTracking || e.changedTouches.length === 0) return;
    isTracking = false;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const elapsed = Date.now() - startTime;

    if (isPanningZoomedImage) {
      isPanningZoomedImage = false;
      // If it was just a quick tap while zoomed in, toggle/reset zoom
      if (Math.abs(endX - startX) < 12 && Math.abs(endY - startY) < 12 && elapsed < 350) {
        resetImageTransform();
        showFeedbackToast('📐', '已重置縮放 (100%)', '恢復左右滑動切換檔案');
      }
      return;
    }

    handlePointerGestureEnd(startX, startY, endX, endY, elapsed);
  }, { passive: true });

  // Mouse fallback & wheel zoom for desktop testing
  stage.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, input, select')) return;
    startX = e.clientX;
    startY = e.clientY;
    startTime = Date.now();
    isTracking = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (!isTracking) return;
    isTracking = false;
    handlePointerGestureEnd(startX, startY, e.clientX, e.clientY, Date.now() - startTime);
  });

  stage.addEventListener('wheel', (e) => {
    const currentItem = state.filteredFiles[state.currentIndex];
    if (!currentItem || currentItem.type !== 'image') return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    state.imageZoom = Math.max(1, Math.min(5, state.imageZoom + delta));
    if (state.imageZoom <= 1.02) {
      state.imagePanX = 0;
      state.imagePanY = 0;
    }
    applyImageTransform();
  }, { passive: false });
}

function handlePointerGestureEnd(startX, startY, endX, endY, elapsedMs) {
  const dx = endX - startX;
  const dy = endY - startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const threshold = state.settings.swipeThreshold;

  // 1. Horizontal Swipe Detection
  if (absX >= threshold && absX > absY * 1.2) {
    if (!state.isPlaying) {
      // IDLE / NOT PLAYING STATE -> Switch File!
      if (dx < 0) {
        nextFile();
      } else {
        prevFile();
      }
    } else {
      // PLAYING STATE -> Lock file switching, execute custom left/right seek gesture!
      if (dx < 0) {
        executePlayingGesture('left');
      } else {
        executePlayingGesture('right');
      }
    }
    return;
  }

  // 2. Full-Stage Single Tap Detection (Requirement #4 & #5)
  if (absX < 16 && absY < 16 && elapsedMs < 480) {
    const currentItem = state.filteredFiles[state.currentIndex];
    if (!currentItem) return;

    if (currentItem.type === 'video' || currentItem.type === 'audio') {
      // Requirement #4: Tap ANYWHERE on the video/audio playback area triggers Play or Pause!
      if (!state.isPlaying) {
        togglePlayPause();
      } else {
        if (state.settings.tapPlayingBehavior === 'pause') {
          if (state.activeMediaEl) state.activeMediaEl.pause();
          showFeedbackToast('⏸️', '已暫停播放', '現在可左右滑動切換檔案');
        } else {
          dom.app.classList.toggle('hud-hidden');
        }
      }
    } else if (currentItem.type === 'image') {
      // Requirement #5: Tap on image/WebP toggles proportional Fit-to-Boundary vs Original 1:1 size
      toggleImageFitMode();
    }
  }
}

function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

/* =========================================
   8. MEDIA SESSION API (iPadOS Lock Screen)
   ========================================= */
function updateMediaSessionMetadata(item) {
  if (!('mediaSession' in navigator) || !item) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.name,
      artist: 'Mplay 隨身影格播放器',
      album: item.type.toUpperCase(),
      artwork: [
        { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => prevFile());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextFile());
    navigator.mediaSession.setActionHandler('seekbackward', () => executePlayingGesture('left'));
    navigator.mediaSession.setActionHandler('seekforward', () => executePlayingGesture('right'));
  } catch {
    // ignore unsupported handlers
  }
}

/* =========================================
   9. LAZY VIRTUALIZED PLAYLIST & DEMO GENERATOR
   ========================================= */
function renderPlaylist() {
  const total = state.filteredFiles.length;
  dom.playlistHeaderTitle.textContent = `📂 已載入檔案 (${total})`;
  dom.playlistContainer.innerHTML = '';

  const limit = Math.min(total, state.playlistRenderLimit);
  const fragment = document.createDocumentFragment();

  for (let idx = 0; idx < limit; idx++) {
    const item = state.filteredFiles[idx];
    const btn = document.createElement('button');
    btn.className = `playlist-item ${idx === state.currentIndex ? 'active' : ''}`;
    btn.dataset.idx = idx;
    const icon = item.type === 'video' ? '🎬' : item.type === 'image' ? '🖼️' : '🎵';
    btn.innerHTML = `
      <span>${icon}</span>
      <span class="playlist-item-name">${escapeHtml(item.name)}</span>
      <span class="type-badge">${item.ext}</span>
    `;
    btn.addEventListener('click', () => {
      loadMediaAtIndex(idx);
      dom.playlistDrawer.classList.add('hidden');
    });
    fragment.appendChild(btn);
  }

  if (total > limit) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'demo-link-btn';
    moreBtn.textContent = `顯示更多檔案（尚有 ${total - limit} 個）...`;
    moreBtn.addEventListener('click', () => {
      state.playlistRenderLimit += 150;
      renderPlaylist();
    });
    fragment.appendChild(moreBtn);
  }

  dom.playlistContainer.appendChild(fragment);
}

function highlightPlaylistActive() {
  const items = dom.playlistContainer.querySelectorAll('.playlist-item');
  items.forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.idx) === state.currentIndex);
  });
}

/**
 * Generates offline demo samples including a small 500x100 banner WebP-style image
 * to demonstrate proportional Fit-to-Boundary scaling without distortion.
 */
async function loadDemoSamples() {
  releaseAllObjectUrls();
  destroyActiveMediaDecoder();

  const demoItems = [];

  // 1. Small 500x100 Wide Banner Image to prove proportional scaling to left/right edge without distortion!
  const svgWideBanner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 100" width="500" height="100">
    <defs>
      <linearGradient id="gw" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#31102f"/><stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="500" height="100" fill="url(#gw)" stroke="#f59e0b" stroke-width="4"/>
    <circle cx="50" cy="50" r="35" fill="none" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="450" cy="50" r="35" fill="none" stroke="#f43f5e" stroke-width="3"/>
    <text x="250" y="44" fill="#f8fafc" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">01. 小尺寸寬幅圖測試 (原圖僅 500×100)</text>
    <text x="250" y="72" fill="#fbbf24" font-size="13" font-family="sans-serif" text-anchor="middle">自動等比例放大到橫向抵住畫面邊界（左右正圓形絕不變形！輕點可切換 1:1）</text>
  </svg>`;
  const imgBlob1 = new Blob([svgWideBanner], { type: 'image/svg+xml' });
  demoItems.push({
    id: 'demo-img-1',
    file: imgBlob1,
    name: '01_寬幅小圖等比例放大測試_500x100.webp',
    type: 'image',
    ext: 'WEBP',
    isDemo: true,
    demoUrl: URL.createObjectURL(imgBlob1)
  });

  // 2. Animated WebP / GIF-style Motion Image
  const svgAnim = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <rect width="800" height="600" fill="#090d16"/>
    <g transform="translate(400, 250)">
      <circle r="110" fill="none" stroke="#f59e0b" stroke-width="7" stroke-dasharray="36 18">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite"/>
      </circle>
      <circle r="72" fill="none" stroke="#f43f5e" stroke-width="7" stroke-dasharray="24 14">
        <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle r="24" fill="#6366f1">
        <animate attributeName="r" values="18;36;18" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </g>
    <text x="400" y="440" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">02. 動態 WebP / GIF 範例（支援雙指縮放與點擊切換）</text>
    <text x="400" y="490" fill="#38bdf8" font-size="22" font-family="sans-serif" text-anchor="middle">往左滑動體驗「全畫面任意處點擊播放影片」</text>
  </svg>`;
  const imgBlob2 = new Blob([svgAnim], { type: 'image/svg+xml' });
  demoItems.push({
    id: 'demo-img-2',
    file: imgBlob2,
    name: '02_動態圖檔範例_MotionLoop.webp',
    type: 'image',
    ext: 'WEBP',
    isDemo: true,
    demoUrl: URL.createObjectURL(imgBlob2)
  });

  // 3. Playable Video (120s seekable test)
  const svgVideoPoster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <rect width="1200" height="800" fill="#0b0e17"/>
    <rect x="80" y="80" width="1040" height="640" rx="28" fill="#131826" stroke="#f59e0b" stroke-width="4" stroke-dasharray="18 10"/>
    <text x="600" y="240" fill="#f59e0b" font-size="46" font-family="sans-serif" font-weight="bold" text-anchor="middle">🎬 03. 全畫面點擊播放 + 手勢快轉測試 (120秒)</text>
    <text x="600" y="330" fill="#38bdf8" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">👆 現在無須瞄準正中間，輕點整個影片畫面任意處即可開始播放！</text>
    <text x="600" y="405" fill="#fb7185" font-size="30" font-family="sans-serif" font-weight="bold" text-anchor="middle">• 播放中：左右滑動 ＝ 快轉/倒退 30 秒（再輕點任意處即暫停）</text>
    <text x="600" y="590" fill="#94a3b8" font-size="24" font-family="sans-serif" text-anchor="middle">• 未播放時：左右滑動 ＝ 切換上/下一個檔案</text>
  </svg>`;
  const videoPosterBlob = new Blob([svgVideoPoster], { type: 'image/svg+xml' });
  const videoTestBlob = createDemoWavBlob(120);
  demoItems.push({
    id: 'demo-video-3',
    file: videoTestBlob,
    name: '03_隨身碟影片測試_全畫面點擊播放_120s.mp4',
    type: 'video',
    ext: 'MP4',
    isDemo: true,
    demoUrl: URL.createObjectURL(videoTestBlob),
    posterUrl: URL.createObjectURL(videoPosterBlob)
  });

  // 4. Playable Audio Track
  const wavBlob = createDemoWavBlob(90);
  demoItems.push({
    id: 'demo-audio-4',
    file: wavBlob,
    name: '04_隨身碟音樂範例_AmbientSynth_90s.mp3',
    type: 'audio',
    ext: 'MP3',
    isDemo: true,
    demoUrl: URL.createObjectURL(wavBlob)
  });

  state.allFiles = demoItems;
  updateCategoryCounts();
  applyFilter('all');
  showFeedbackToast('✨', '已載入 4 個測試樣本', '第1張為 500×100 寬幅圖等比例邊界放大展示');
}

function createDemoWavBlob(durationSeconds = 90) {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const freqs = [261.63, 329.63, 392.00, 523.25];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteFreq = freqs[Math.floor(t / 2) % freqs.length];
    const env = 0.15 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.5 * t));
    const sample = Math.sin(2 * Math.PI * noteFreq * t) * env;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/* =========================================
   10. UI HELPERS & EVENT BINDINGS
   ========================================= */
function showFeedbackToast(icon, mainText, subText = '') {
  dom.gestureFeedbackIcon.textContent = icon;
  dom.gestureFeedbackText.textContent = mainText;
  dom.gestureFeedbackSub.textContent = subText;
  dom.gestureFeedback.classList.remove('hidden');

  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  state.feedbackTimer = setTimeout(() => {
    dom.gestureFeedback.classList.add('hidden');
  }, 550);
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const totalSec = Math.floor(sec);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function returnToHome() {
  state.isManualFullscreen = false;
  destroyActiveMediaDecoder();
  releaseAllObjectUrls();
  state.allFiles = [];
  state.filteredFiles = [];
  dom.slideViewport.innerHTML = '';
  dom.mediaStage.classList.add('hidden');
  dom.bottomHud.classList.add('hidden');
  dom.filterBar.classList.add('hidden');
  dom.btnTogglePlaylist.classList.add('hidden');
  dom.playlistDrawer.classList.add('hidden');
  dom.emptyState.classList.remove('hidden');
  dom.currentFileTitle.textContent = '請選擇外接隨身碟資料夾或檔案';
}

function bindEvents() {
  // Click Top-Left Logo to Return to Home Screen
  if (dom.btnHomeLogo) {
    dom.btnHomeLogo.addEventListener('click', () => {
      returnToHome();
    });
  }

  // Primary Action: Open Image/Audio Folder (excludes video files to prevent folder overload)
  dom.btnOpenFolder.addEventListener('click', () => openFolderSmart());
  dom.btnHeroSelectFolder.addEventListener('click', () => openFolderSmart());

  // Secondary Action: Open Single/Few Files (supports video files!)
  dom.btnOpenFiles.addEventListener('click', () => openFilesSmart());
  dom.btnHeroSelectFiles.addEventListener('click', () => openFilesSmart());

  dom.fileInputFolder.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const excludeVideo = state.settings.folderVideoPolicy === 'exclude';
      ingestFileList(e.target.files, true, excludeVideo);
    }
  });

  dom.fileInputMultiple.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      ingestFileList(e.target.files, false, false);
    }
  });

  dom.btnLoadDemo.addEventListener('click', () => {
    loadDemoSamples();
  });

  // Category Filter Pills
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      applyFilter(pill.dataset.filter);
    });
  });

  // Bottom Play/Pause button
  dom.btnBottomPlayPause.addEventListener('click', () => {
    togglePlayPause();
  });

  // Quick Left / Right Gesture Buttons in Bottom Bar
  dom.btnQuickLeftGesture.addEventListener('click', () => executePlayingGesture('left'));
  dom.btnQuickRightGesture.addEventListener('click', () => executePlayingGesture('right'));

  // Seek Slider
  dom.seekSlider.addEventListener('input', (e) => {
    if (!state.activeMediaEl || !state.activeMediaEl.duration) return;
    const pct = Number(e.target.value);
    state.activeMediaEl.currentTime = (pct / 100) * state.activeMediaEl.duration;
  });

  // Playback Rate
  dom.playbackRateSelect.addEventListener('change', (e) => {
    const rate = Number(e.target.value) || 1;
    if (state.activeMediaEl) {
      state.activeMediaEl.playbackRate = rate;
    }
  });

  // Prev / Next Chevrons
  dom.btnPrevFile.addEventListener('click', (e) => {
    e.stopPropagation();
    prevFile();
  });
  dom.btnNextFile.addEventListener('click', (e) => {
    e.stopPropagation();
    nextFile();
  });

  // Image Fit Mode Toggle & Zoom Reset & Fullscreen (Hide HUD)
  dom.btnToggleFitMode.addEventListener('click', () => toggleImageFitMode());
  dom.btnZoomReset.addEventListener('click', () => resetImageTransform());

  dom.btnFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    state.isManualFullscreen = true;
    dom.app.classList.add('hud-hidden');
    const docEl = document.documentElement;
    const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (reqFs && !document.fullscreenElement && !document.webkitFullscreenElement) {
      try {
        reqFs.call(docEl)?.catch?.(() => {});
      } catch {
        // Ignore on iPadOS standalone mode where system fullscreen is already active
      }
    }
    showFeedbackToast('🖥️', '已鎖定全螢幕隱藏介面', '滑動換檔將持續維持全螢幕');
  });

  if (dom.btnRestoreHud) {
    dom.btnRestoreHud.addEventListener('click', (e) => {
      e.stopPropagation();
      state.isManualFullscreen = false;
      dom.app.classList.remove('hud-hidden');
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
        try {
          exitFs.call(document)?.catch?.(() => {});
        } catch {
          // Ignore
        }
      }
    });
  }

  // Lazy Playlist Drawer (Only builds DOM when opened!)
  dom.btnTogglePlaylist.addEventListener('click', () => {
    const willOpen = dom.playlistDrawer.classList.contains('hidden');
    if (willOpen) {
      renderPlaylist();
      dom.playlistDrawer.classList.remove('hidden');
    } else {
      dom.playlistDrawer.classList.add('hidden');
    }
  });
  dom.btnClosePlaylist.addEventListener('click', () => {
    dom.playlistDrawer.classList.add('hidden');
  });

  // Settings Modal
  dom.btnOpenSettings.addEventListener('click', () => {
    applySettingsToUI();
    dom.settingsModal.classList.remove('hidden');
  });
  dom.btnCloseSettings.addEventListener('click', () => {
    dom.settingsModal.classList.add('hidden');
  });

  dom.selectLeftAction.addEventListener('change', (e) => {
    const val = e.target.value;
    dom.leftSecondsGroup.classList.toggle('hidden', val !== 'rewind' && val !== 'forward');
  });

  dom.selectRightAction.addEventListener('change', (e) => {
    const val = e.target.value;
    dom.rightSecondsGroup.classList.toggle('hidden', val !== 'rewind' && val !== 'forward');
  });

  document.querySelectorAll('.preset-chips').forEach((group) => {
    const targetId = group.dataset.target;
    const inputEl = document.getElementById(targetId);
    group.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        inputEl.value = chip.dataset.sec;
        syncPresetChips(targetId, chip.dataset.sec);
      });
    });
    inputEl.addEventListener('input', () => {
      syncPresetChips(targetId, inputEl.value);
    });
  });

  dom.inputSwipeThreshold.addEventListener('input', (e) => {
    dom.swipeThresholdLabel.textContent = e.target.value;
  });

  dom.btnResetSettings.addEventListener('click', () => {
    saveSettings({ ...DEFAULT_SETTINGS });
    showFeedbackToast('🔄', '已恢復預設設定', '左滑倒退 30 秒 / 右滑快轉 30 秒');
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    const updated = {
      leftAction: dom.selectLeftAction.value,
      leftSeconds: Math.max(1, Math.min(600, Number(dom.inputLeftSeconds.value) || 30)),
      rightAction: dom.selectRightAction.value,
      rightSeconds: Math.max(1, Math.min(600, Number(dom.inputRightSeconds.value) || 30)),
      folderVideoPolicy: dom.selectFolderVideoPolicy ? dom.selectFolderVideoPolicy.value : 'include',
      folderDepthMode: dom.selectFolderDepthMode.value,
      tapPlayingBehavior: dom.selectTapPlayingBehavior.value,
      swipeThreshold: Number(dom.inputSwipeThreshold.value) || 45
    };
    saveSettings(updated);
    dom.settingsModal.classList.add('hidden');
    showFeedbackToast('✅', '設定已儲存', `${describeGestureAction(updated.leftAction, updated.leftSeconds)} / ${describeGestureAction(updated.rightAction, updated.rightSeconds)}`);
  });

  // Drag & Drop Support
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZoneOverlay.classList.remove('hidden');
  });

  dom.dropZoneOverlay.addEventListener('dragleave', (e) => {
    if (e.target === dom.dropZoneOverlay) {
      dom.dropZoneOverlay.classList.add('hidden');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dom.dropZoneOverlay.classList.add('hidden');
    if (!e.dataTransfer) return;

    const collectedFiles = await extractDroppedFiles(e.dataTransfer);
    if (collectedFiles.length > 0) {
      ingestFileList(collectedFiles, false);
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (!dom.settingsModal.classList.contains('hidden')) return;
    if (state.filteredFiles.length === 0) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      if (state.isPlaying) executePlayingGesture('left');
      else prevFile();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (state.isPlaying) executePlayingGesture('right');
      else nextFile();
    }
  });

  setupStageGestures();
}

async function extractDroppedFiles(dataTransfer) {
  const files = [];
  const allowSubfolders = state.settings.folderDepthMode === 'recursive';
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries = [];
    for (const item of dataTransfer.items) {
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) entries.push(entry);
      } else if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    for (const entry of entries) {
      await traverseFileTree(entry, files, 0, allowSubfolders);
    }
  } else if (dataTransfer.files) {
    files.push(...Array.from(dataTransfer.files));
  }
  return files;
}

function traverseFileTree(entry, outFiles, currentDepth, allowSubfolders) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        outFiles.push(file);
        resolve();
      }, () => resolve());
    } else if (entry.isDirectory) {
      if (currentDepth >= 1 && !allowSubfolders) {
        resolve();
        return;
      }
      const dirReader = entry.createReader();
      const readBatch = () => {
        dirReader.readEntries(async (entries) => {
          if (!entries || entries.length === 0) {
            resolve();
            return;
          }
          for (const child of entries) {
            await traverseFileTree(child, outFiles, currentDepth + 1, allowSubfolders);
          }
          readBatch();
        }, () => resolve());
      };
      readBatch();
    } else {
      resolve();
    }
  });
}

// Boot the app
initApp();
