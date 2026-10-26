/**
 * Mplay 隨身影格播放器 - iPad Pro USB Drive Local Media PWA
 * Core Features:
 * 1. Zero-copy local streaming via ObjectURL with strict single-decoder memory management
 * 2. State-based gesture routing:
 *    - Idle / Paused (isPlaying = false): Left/Right swipe switches files
 *    - Playing (isPlaying = true): Auto-hides HUD; Left/Right swipe executes custom seek/action
 * 3. Customizable gesture settings persisted in localStorage
 * 4. Offline PWA support & Media Session API integration
 */

const STORAGE_KEY = 'mplay_user_settings_v1';

const DEFAULT_SETTINGS = {
  leftAction: 'rewind',        // 'rewind' | 'forward' | 'next' | 'prev' | 'none'
  leftSeconds: 30,
  rightAction: 'forward',      // 'forward' | 'rewind' | 'prev' | 'next' | 'none'
  rightSeconds: 30,
  tapPlayingBehavior: 'pause', // 'pause' | 'toggleHud'
  swipeThreshold: 45           // px
};

const state = {
  allFiles: [],       // Array of { id, file, name, type: 'video'|'image'|'audio', ext, isDemo, demoUrl }
  filteredFiles: [],
  activeFilter: 'all',
  currentIndex: 0,
  isPlaying: false,
  activeMediaEl: null,
  activeObjectUrls: new Map(), // index -> objectURL (kept strictly <= 3 items)
  imageZoom: 1,
  settings: loadSettings(),
  feedbackTimer: null
};

// DOM References
const dom = {
  app: document.getElementById('app'),
  topHud: document.getElementById('topHud'),
  bottomHud: document.getElementById('bottomHud'),
  offlineBadge: document.getElementById('offlineBadge'),
  currentFileTitle: document.getElementById('currentFileTitle'),
  filterBar: document.getElementById('filterBar'),
  countAll: document.getElementById('countAll'),
  countVideo: document.getElementById('countVideo'),
  countImage: document.getElementById('countImage'),
  countAudio: document.getElementById('countAudio'),
  fileInputMultiple: document.getElementById('fileInputMultiple'),
  fileInputFolder: document.getElementById('fileInputFolder'),
  btnOpenFiles: document.getElementById('btnOpenFiles'),
  btnHeroSelectFiles: document.getElementById('btnHeroSelectFiles'),
  btnHeroSelectFolder: document.getElementById('btnHeroSelectFolder'),
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
  btnZoomReset: document.getElementById('btnZoomReset'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  playlistDrawer: document.getElementById('playlistDrawer'),
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
   3. FILE CLASSIFICATION & LOADING
   ========================================= */
const VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'ogv', '3gp', 'ts']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg', 'bmp', 'avif']);
const AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac', 'opus']);

function classifyFile(file) {
  const name = file.name || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const mime = (file.type || '').toLowerCase();

  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) return { type: 'video', ext: ext || 'mp4' };
  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/')) return { type: 'image', ext: ext || 'img' };
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) return { type: 'audio', ext: ext || 'mp3' };
  return null;
}

function ingestFileList(fileList) {
  const rawFiles = Array.from(fileList || []);
  const validItems = [];

  for (const file of rawFiles) {
    if (file.name.startsWith('.')) continue; // skip hidden macOS/USB dot files like ._file
    const info = classifyFile(file);
    if (info) {
      validItems.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        type: info.type,
        ext: info.ext.toUpperCase(),
        isDemo: false
      });
    }
  }

  if (validItems.length === 0) {
    showFeedbackToast('⚠️', '未偵測到支援的媒體檔案', '請選取 MP4/圖片/WebP/GIF/MP3 檔案');
    return;
  }

  // Natural alphanumeric sort (e.g. 1.jpg, 2.jpg, 10.jpg)
  validItems.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Clean up previous session resources
  releaseAllObjectUrls();
  destroyActiveMediaDecoder();

  state.allFiles = validItems;
  state.activeFilter = 'all';
  updateCategoryCounts();
  applyFilter('all');
}

function updateCategoryCounts() {
  const counts = { all: state.allFiles.length, video: 0, image: 0, audio: 0 };
  for (const item of state.allFiles) {
    counts[item.type] = (counts[item.type] || 0) + 1;
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
    ? [...state.allFiles]
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

  renderPlaylist();
  loadMediaAtIndex(0);
}

/* =========================================
   4. VIRTUAL SLIDE & MEMORY MANAGEMENT
   ========================================= */
function getOrCreateObjectUrl(index) {
  const item = state.filteredFiles[index];
  if (!item) return '';
  if (item.isDemo && item.demoUrl) return item.demoUrl;

  if (state.activeObjectUrls.has(item.id)) {
    return state.activeObjectUrls.get(item.id);
  }
  const url = URL.createObjectURL(item.file);
  state.activeObjectUrls.set(item.id, url);
  return url;
}

function pruneObjectUrlsAround(centerIndex) {
  const keepIds = new Set();
  const total = state.filteredFiles.length;
  if (total > 0) {
    const indices = [
      (centerIndex - 1 + total) % total,
      centerIndex,
      (centerIndex + 1) % total
    ];
    indices.forEach((idx) => {
      if (state.filteredFiles[idx]) keepIds.add(state.filteredFiles[idx].id);
    });
  }

  for (const [id, url] of state.activeObjectUrls.entries()) {
    if (!keepIds.has(id)) {
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
  dom.app.classList.remove('hud-hidden');
}

/* =========================================
   5. CORE STAGE RENDERING & PLAYBACK STATE
   ========================================= */
function loadMediaAtIndex(index, slideDirection = 0) {
  const total = state.filteredFiles.length;
  if (total === 0) return;

  // Wrap around seamlessly
  const targetIndex = (index + total) % total;

  // Always stop previous decoder and reset to NOT PLAYING when switching files
  destroyActiveMediaDecoder();
  state.currentIndex = targetIndex;
  state.imageZoom = 1;
  dom.btnZoomReset.classList.add('hidden');

  const item = state.filteredFiles[targetIndex];
  const mediaUrl = getOrCreateObjectUrl(targetIndex);
  pruneObjectUrlsAround(targetIndex);

  // Subtle slide transition effect
  if (slideDirection !== 0) {
    dom.slideViewport.style.transition = 'none';
    dom.slideViewport.style.transform = `translateX(${slideDirection > 0 ? '42px' : '-42px'})`;
    dom.slideViewport.style.opacity = '0.35';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dom.slideViewport.style.transition = 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease';
        dom.slideViewport.style.transform = 'translateX(0)';
        dom.slideViewport.style.opacity = '1';
      });
    });
  }

  dom.slideViewport.innerHTML = '';

  if (item.type === 'image') {
    const img = document.createElement('img');
    img.className = 'media-element-image';
    img.src = mediaUrl;
    img.alt = item.name;
    img.draggable = false;
    dom.slideViewport.appendChild(img);

    dom.centerPlayBtn.classList.add('hidden');
    dom.playbackControlsRow.classList.add('hidden');
  } else if (item.type === 'video') {
    const video = document.createElement('video');
    video.className = 'media-element-video';
    video.src = mediaUrl;
    if (item.posterUrl) {
      video.poster = item.posterUrl;
    }
    video.preload = 'metadata';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.controls = false;
    video.playbackRate = Number(dom.playbackRateSelect.value) || 1;

    // Fetch first frame preview cleanly on iPadOS Safari
    video.addEventListener('loadedmetadata', () => {
      dom.timeDuration.textContent = formatTime(video.duration);
      dom.timeCurrent.textContent = formatTime(video.currentTime);
      if (video.currentTime === 0) {
        video.currentTime = 0.001;
      }
    });

    bindMediaEvents(video, item);
    dom.slideViewport.appendChild(video);
    state.activeMediaEl = video;

    // Crucial requirement: Do NOT autoplay! Show Center Play Button.
    dom.centerPlayBtn.classList.remove('hidden');
    dom.playbackControlsRow.classList.remove('hidden');
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
      <div class="audio-sub">MP3 / 音訊隨身聽模式</div>
    `;

    const audio = document.createElement('audio');
    audio.src = mediaUrl;
    audio.preload = 'metadata';
    audio.playbackRate = Number(dom.playbackRateSelect.value) || 1;

    audio.addEventListener('loadedmetadata', () => {
      dom.timeDuration.textContent = formatTime(audio.duration);
      dom.timeCurrent.textContent = formatTime(audio.currentTime);
    });

    bindMediaEvents(audio, item);
    deck.appendChild(audio);
    dom.slideViewport.appendChild(deck);
    state.activeMediaEl = audio;

    // Do NOT autoplay when selected; wait for center Play button tap
    dom.centerPlayBtn.classList.remove('hidden');
    dom.playbackControlsRow.classList.remove('hidden');
    resetScrubberUI();
  }

  // Update Header & Footer Metadata
  dom.currentFileTitle.textContent = item.name;
  dom.fileTypeBadge.textContent = `${item.type.toUpperCase()} · ${item.ext}`;
  dom.filePositionInfo.textContent = `${targetIndex + 1} / ${total}`;

  highlightPlaylistActive();
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
    // Automatically hide HUD when playing starts
    dom.app.classList.add('hud-hidden');
    dom.centerPlayBtn.classList.add('hidden');
    const disc = document.getElementById('vinylDisc');
    if (disc) disc.classList.add('spinning');
    updateStageStateUI();
  });

  mediaEl.addEventListener('pause', () => {
    state.isPlaying = false;
    // Reveal HUD & Center Play Button when paused/stopped so user can swipe files
    dom.app.classList.remove('hud-hidden');
    dom.centerPlayBtn.classList.remove('hidden');
    const disc = document.getElementById('vinylDisc');
    if (disc) disc.classList.remove('spinning');
    updateStageStateUI();
  });

  mediaEl.addEventListener('ended', () => {
    state.isPlaying = false;
    dom.app.classList.remove('hud-hidden');
    dom.centerPlayBtn.classList.remove('hidden');
    const disc = document.getElementById('vinylDisc');
    if (disc) disc.classList.remove('spinning');
    updateStageStateUI();

    // If audio track ends, optionally advance or stay ready
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

function togglePlayPause() {
  if (!state.activeMediaEl) return;
  if (state.activeMediaEl.paused) {
    state.activeMediaEl.play().catch((err) => {
      console.warn('Play blocked or failed:', err);
      showFeedbackToast('⚠️', '無法播放此格式', '請確認編碼格式是否受 iPadOS 支援');
    });
  } else {
    state.activeMediaEl.pause();
  }
}

function updateStageStateUI() {
  const s = state.settings;
  if (state.isPlaying) {
    dom.modeStateDot.className = 'state-dot playing';
    const leftText = describeGestureAction(s.leftAction, s.leftSeconds);
    const rightText = describeGestureAction(s.rightAction, s.rightSeconds);
    dom.modeStateText.textContent = `播放中：左滑${leftText} · 右滑${rightText}`;
    dom.gestureHintFooter.textContent = `播放中手勢：左滑${leftText} / 右滑${rightText}`;
    dom.iconPlay.classList.add('hidden');
    dom.iconPause.classList.remove('hidden');
  } else {
    dom.modeStateDot.className = 'state-dot idle';
    dom.modeStateText.textContent = '未播放：左右滑動切換檔案';
    dom.gestureHintFooter.textContent = '未播放狀態：左右滑動切換上/下一個檔案';
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
   6. STATE-AWARE GESTURE ENGINE (TOUCH & MOUSE)
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
  let startTime = 0;
  let isTracking = false;
  let initialPinchDist = null;
  let initialZoom = 1;

  const stage = dom.mediaStage;

  // Touch events for iPad Pro
  stage.addEventListener('touchstart', (e) => {
    if (e.target.closest('button, input, select')) return;

    if (e.touches.length === 2) {
      // Pinch to zoom for images
      isTracking = false;
      initialPinchDist = getPinchDistance(e.touches);
      initialZoom = state.imageZoom;
      return;
    }

    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isTracking = true;
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDist) {
      const currentItem = state.filteredFiles[state.currentIndex];
      if (currentItem && currentItem.type === 'image') {
        const dist = getPinchDistance(e.touches);
        const scale = Math.max(1, Math.min(4, initialZoom * (dist / initialPinchDist)));
        setImageZoom(scale);
      }
      return;
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
    handlePointerGestureEnd(startX, startY, endX, endY, Date.now() - startTime);
  }, { passive: true });

  // Mouse fallback for desktop browser testing
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
}

function handlePointerGestureEnd(startX, startY, endX, endY, elapsedMs) {
  const dx = endX - startX;
  const dy = endY - startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const threshold = state.settings.swipeThreshold;

  // 1. Horizontal Swipe Detection
  if (absX >= threshold && absX > absY * 1.2) {
    // If image is zoomed in, reset zoom first or allow swipe
    if (!state.isPlaying) {
      // IDLE / NOT PLAYING STATE -> Switch File!
      // Swipe Left (finger moves right-to-left, dx < 0) -> Next File
      // Swipe Right (finger moves left-to-right, dx > 0) -> Previous File
      if (dx < 0) {
        nextFile();
      } else {
        prevFile();
      }
    } else {
      // PLAYING STATE -> Lock file switching, execute custom left/right gesture!
      if (dx < 0) {
        executePlayingGesture('left');
      } else {
        executePlayingGesture('right');
      }
    }
    return;
  }

  // 2. Single Tap Detection (minimal movement & short duration)
  if (absX < 14 && absY < 14 && elapsedMs < 450) {
    const currentItem = state.filteredFiles[state.currentIndex];
    if (!currentItem) return;

    if (state.isPlaying) {
      // When playing video/audio, tap either pauses (returning to file-switch state) or toggles HUD
      if (state.settings.tapPlayingBehavior === 'pause') {
        if (state.activeMediaEl) state.activeMediaEl.pause();
        showFeedbackToast('⏸️', '已暫停播放', '現在可左右滑動切換檔案');
      } else {
        dom.app.classList.toggle('hud-hidden');
      }
    } else {
      // When viewing an image, a tap can toggle HUD for clean full-bleed photo viewing
      if (currentItem.type === 'image') {
        dom.app.classList.toggle('hud-hidden');
      }
    }
  }
}

function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function setImageZoom(scale) {
  state.imageZoom = scale;
  const img = dom.slideViewport.querySelector('.media-element-image');
  if (img) {
    img.style.transform = `scale(${scale})`;
  }
  dom.btnZoomReset.classList.toggle('hidden', scale <= 1.02);
}

/* =========================================
   7. MEDIA SESSION API (iPadOS Lock Screen)
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
   8. PLAYLIST & BUILT-IN DEMO GENERATOR
   ========================================= */
function renderPlaylist() {
  dom.playlistContainer.innerHTML = '';
  state.filteredFiles.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = `playlist-item ${idx === state.currentIndex ? 'active' : ''}`;
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
    dom.playlistContainer.appendChild(btn);
  });
}

function highlightPlaylistActive() {
  const items = dom.playlistContainer.querySelectorAll('.playlist-item');
  items.forEach((el, idx) => {
    el.classList.toggle('active', idx === state.currentIndex);
  });
}

/**
 * Generates 100% offline local demo media (Images, Animated SVG/GIF-style frame, playable WAV audio, and playable Video)
 * so the user can test all gestures immediately.
 */
async function loadDemoSamples() {
  releaseAllObjectUrls();
  destroyActiveMediaDecoder();

  const demoItems = [];

  // 1. High-Res Film Poster Image (SVG Blob)
  const svgPoster1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#31102f"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#g1)"/>
    <circle cx="600" cy="360" r="180" fill="#f59e0b" opacity="0.18"/>
    <circle cx="600" cy="360" r="110" fill="#f43f5e" opacity="0.3"/>
    <text x="600" y="340" fill="#f8fafc" font-size="54" font-family="sans-serif" font-weight="bold" text-anchor="middle">01. 隨身碟靜態圖片範例 (JPG/PNG)</text>
    <text x="600" y="420" fill="#fbbf24" font-size="32" font-family="sans-serif" text-anchor="middle">👈 請往左滑動切換至下一個檔案 👉</text>
    <text x="600" y="480" fill="#94a3b8" font-size="24" font-family="sans-serif" text-anchor="middle">支援雙指縮放與全螢幕無縫看圖</text>
  </svg>`;
  const imgBlob1 = new Blob([svgPoster1], { type: 'image/svg+xml' });
  demoItems.push({
    id: 'demo-img-1',
    file: imgBlob1,
    name: '01_隨身碟相片範例_星夜影格.png',
    type: 'image',
    ext: 'PNG',
    isDemo: true,
    demoUrl: URL.createObjectURL(imgBlob1)
  });

  // 2. Animated WebP / GIF-style Motion Image (Animated SVG Blob)
  const svgAnim = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <rect width="1200" height="800" fill="#090d16"/>
    <g transform="translate(600, 340)">
      <circle r="130" fill="none" stroke="#f59e0b" stroke-width="8" stroke-dasharray="40 20">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite"/>
      </circle>
      <circle r="85" fill="none" stroke="#f43f5e" stroke-width="8" stroke-dasharray="30 15">
        <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle r="28" fill="#6366f1">
        <animate attributeName="r" values="22;42;22" dur="1.6s" repeatCount="indefinite"/>
      </circle>
    </g>
    <text x="600" y="560" fill="#f8fafc" font-size="48" font-family="sans-serif" font-weight="bold" text-anchor="middle">02. 動態圖片範例 (WebP / GIF 動圖自動播放)</text>
    <text x="600" y="625" fill="#38bdf8" font-size="28" font-family="sans-serif" text-anchor="middle">再往左滑動，體驗「影片預設不播放 vs 點擊播放後手勢快轉」</text>
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

  // 3. Synthesized Playable Audio (90-second stereo WAV Blob so user can test +/- 30s seek!)
  const wavBlob = createDemoWavBlob(90);
  demoItems.push({
    id: 'demo-audio-3',
    file: wavBlob,
    name: '03_隨身碟音樂範例_AmbientSynth_90s.mp3',
    type: 'audio',
    ext: 'MP3',
    isDemo: true,
    demoUrl: URL.createObjectURL(wavBlob)
  });

  // 4. Playable Video (Use WAV or Canvas Stream / Video element)
  const svgVideoPoster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <rect width="1200" height="800" fill="#0b0e17"/>
    <rect x="80" y="80" width="1040" height="640" rx="28" fill="#131826" stroke="#f59e0b" stroke-width="4" stroke-dasharray="18 10"/>
    <text x="600" y="250" fill="#f59e0b" font-size="46" font-family="sans-serif" font-weight="bold" text-anchor="middle">🎬 04. 影片手勢分流測試 (120 秒)</text>
    <text x="600" y="340" fill="#e2e8f0" font-size="30" font-family="sans-serif" text-anchor="middle">• 未播放時：左右滑動 ＝ 切換上/下一個檔案</text>
    <text x="600" y="405" fill="#fb7185" font-size="30" font-family="sans-serif" font-weight="bold" text-anchor="middle">• 點擊中央播放鍵後：自動隱藏介面，左右滑動 ＝ 快轉/倒退秒數！</text>
    <text x="600" y="590" fill="#94a3b8" font-size="24" font-family="sans-serif" text-anchor="middle">播放中點擊畫面中央即可暫停並恢復滑動換檔</text>
  </svg>`;
  const videoPosterBlob = new Blob([svgVideoPoster], { type: 'image/svg+xml' });
  const videoTestBlob = createDemoWavBlob(120);
  demoItems.push({
    id: 'demo-video-4',
    file: videoTestBlob,
    name: '04_隨身碟影片測試_120秒手勢快轉測試.mp4',
    type: 'video',
    ext: 'MP4',
    isDemo: true,
    demoUrl: URL.createObjectURL(videoTestBlob),
    posterUrl: URL.createObjectURL(videoPosterBlob)
  });

  state.allFiles = demoItems;
  updateCategoryCounts();
  applyFilter('all');
  showFeedbackToast('✨', '已載入 4 個測試檔案', '未播放可滑動換檔；播放中可滑動快轉');
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
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Soft harmonic chord progression
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
   9. UI HELPERS & EVENT BINDINGS
   ========================================= */
function showFeedbackToast(icon, mainText, subText = '') {
  dom.gestureFeedbackIcon.textContent = icon;
  dom.gestureFeedbackText.textContent = mainText;
  dom.gestureFeedbackSub.textContent = subText;
  dom.gestureFeedback.classList.remove('hidden');

  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  state.feedbackTimer = setTimeout(() => {
    dom.gestureFeedback.classList.add('hidden');
  }, 1100);
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

function bindEvents() {
  // File Picker Triggers
  const openMultiPicker = () => {
    dom.fileInputMultiple.value = '';
    dom.fileInputMultiple.click();
  };
  dom.btnOpenFiles.addEventListener('click', openMultiPicker);
  dom.btnHeroSelectFiles.addEventListener('click', openMultiPicker);

  dom.btnHeroSelectFolder.addEventListener('click', () => {
    dom.fileInputFolder.value = '';
    dom.fileInputFolder.click();
  });

  dom.fileInputMultiple.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      ingestFileList(e.target.files);
    }
  });

  dom.fileInputFolder.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      ingestFileList(e.target.files);
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

  // Center Big Play Button & Bottom Play/Pause
  dom.centerPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

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

  // Image Zoom Reset & Fullscreen
  dom.btnZoomReset.addEventListener('click', () => setImageZoom(1));
  dom.btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  // Playlist Drawer
  dom.btnTogglePlaylist.addEventListener('click', () => {
    dom.playlistDrawer.classList.toggle('hidden');
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
      tapPlayingBehavior: dom.selectTapPlayingBehavior.value,
      swipeThreshold: Number(dom.inputSwipeThreshold.value) || 45
    };
    saveSettings(updated);
    dom.settingsModal.classList.add('hidden');
    showFeedbackToast('✅', '手勢設定已儲存', `${describeGestureAction(updated.leftAction, updated.leftSeconds)} / ${describeGestureAction(updated.rightAction, updated.rightSeconds)}`);
  });

  // Drag & Drop Support (iPadOS Split View / Slide Over Files App Drag-and-Drop)
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
      ingestFileList(collectedFiles);
    }
  });

  // Keyboard shortcuts (for iPad Magic Keyboard or desktop testing)
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
      await traverseFileTree(entry, files);
    }
  } else if (dataTransfer.files) {
    files.push(...Array.from(dataTransfer.files));
  }
  return files;
}

function traverseFileTree(entry, outFiles) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        outFiles.push(file);
        resolve();
      }, () => resolve());
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readBatch = () => {
        dirReader.readEntries(async (entries) => {
          if (!entries || entries.length === 0) {
            resolve();
            return;
          }
          for (const child of entries) {
            await traverseFileTree(child, outFiles);
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
