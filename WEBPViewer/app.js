// Application State
const state = {
  files: [],            // File objects: { name, file, relativePath, url: null, aspect: null }
  currentIndex: 0,
  layoutMode: 'single', // 'single', 'double', 'scroll'
  fitMode: 'height',    // 'height', 'width', 'original'
  isPlaying: false,
  autoplaySpeed: 2000,
  loop: true,
  uiVisible: true,
  sidebarVisible: true,
};

// Autoplay Timer ID
let autoplayInterval = null;

// Intersection Observers for Virtual Scrolling & Thumbnails
let scrollIntersectionObserver = null;
let thumbnailIntersectionObserver = null;

// DOM Elements Cache
const el = {
  dropZone: document.getElementById('drop-zone'),
  btnSelectFolder: document.getElementById('btn-select-folder'),
  btnSelectFiles: document.getElementById('btn-select-files'),
  folderInput: document.getElementById('folder-input'),
  fileInput: document.getElementById('file-input'),
  appContainer: document.getElementById('app-container'),
  lblSourceTitle: document.getElementById('lbl-source-title'),
  lblFileCount: document.getElementById('lbl-file-count'),
  btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
  btnReupload: document.getElementById('btn-reupload'),
  sidebar: document.getElementById('sidebar'),
  txtSearch: document.getElementById('txt-search'),
  thumbnailList: document.getElementById('thumbnail-list'),
  viewerContainer: document.getElementById('viewer-container'),
  viewportReader: document.getElementById('viewport-reader'),
  viewportScroll: document.getElementById('viewport-scroll'),
  canvasArea: document.getElementById('canvas-area'),
  
  // Controls
  btnPrev: document.getElementById('btn-prev'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  btnNext: document.getElementById('btn-next'),
  lblPageIndicator: document.getElementById('lbl-page-indicator'),
  progressScrub: document.getElementById('progress-scrub'),
  selectSpeed: document.getElementById('select-speed'),
  chkLoop: document.getElementById('chk-loop'),
  
  // Layout buttons
  btnModeSingle: document.getElementById('btn-mode-single'),
  btnModeDouble: document.getElementById('btn-mode-double'),
  btnModeScroll: document.getElementById('btn-mode-scroll'),
  
  // Fit buttons
  btnFitHeight: document.getElementById('btn-fit-height'),
  btnFitWidth: document.getElementById('btn-fit-width'),
  btnFitOriginal: document.getElementById('btn-fit-original'),
  
  // Tap overlays
  prevZone: document.getElementById('prev-zone'),
  nextZone: document.getElementById('next-zone'),
  toggleUiZone: document.getElementById('toggle-ui-zone')
};

/* ==========================================
   1. Drag & Drop and File Upload Processing
   ========================================== */

// Prevent default browser drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  el.dropZone.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

// Highlight drop zone
['dragenter', 'dragover'].forEach(eventName => {
  el.dropZone.addEventListener(eventName, () => {
    el.dropZone.classList.add('dragover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  el.dropZone.addEventListener(eventName, () => {
    el.dropZone.classList.remove('dragover');
  }, false);
});

// Handle drop
el.dropZone.addEventListener('drop', e => {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFileSelection(files);
});

// Button triggers
el.btnSelectFolder.addEventListener('click', () => el.folderInput.click());
el.btnSelectFiles.addEventListener('click', () => el.fileInput.click());

el.folderInput.addEventListener('change', e => handleFileSelection(e.target.files));
el.fileInput.addEventListener('change', e => handleFileSelection(e.target.files));

el.btnReupload.addEventListener('click', () => {
  // Clear old URLs
  state.files.forEach(f => {
    if (f.url) URL.revokeObjectURL(f.url);
  });
  state.files = [];
  state.currentIndex = 0;
  
  // Stop autoplay
  pauseAutoplay();
  
  // Reset DOM
  el.viewportReader.innerHTML = '';
  el.viewportScroll.innerHTML = '';
  el.thumbnailList.innerHTML = '';
  el.appContainer.classList.add('hidden');
  el.dropZone.classList.remove('hidden');
});

// Main selection processor
function handleFileSelection(fileList) {
  if (!fileList || fileList.length === 0) return;
  
  const rawFiles = Array.from(fileList);
  // Filter for WebP files
  const webpFiles = rawFiles.filter(file => {
    const isWebP = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
    return isWebP;
  });

  if (webpFiles.length === 0) {
    alert('所選目錄或檔案中沒有找到 WebP 圖片！');
    return;
  }

  // Detect source title (first file's parent folder name or file count)
  let sourceName = 'WebP 序列';
  if (webpFiles[0].webkitRelativePath) {
    const parts = webpFiles[0].webkitRelativePath.split('/');
    if (parts.length > 1) {
      sourceName = parts[0];
    }
  }

  // Create state files database
  state.files = webpFiles.map(file => ({
    name: file.name,
    file: file,
    relativePath: file.webkitRelativePath || file.name,
    url: null,
    aspect: null
  }));

  // Perform Natural Sorting on Relative Path / Filename
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  state.files.sort((a, b) => collator.compare(a.relativePath, b.relativePath));

  // Initialize UI state
  state.currentIndex = 0;
  el.lblSourceTitle.textContent = sourceName;
  el.lblFileCount.textContent = `${state.files.length} 張圖`;
  el.dropZone.classList.add('hidden');
  el.appContainer.classList.remove('hidden');
  
  // Initialize range slider scrub limits
  el.progressScrub.max = state.files.length - 1;
  el.progressScrub.value = 0;

  // Build Sidebar items and lazy thumbnails
  renderSidebarList();
  
  // Load initial view
  switchLayoutMode(state.layoutMode);
}

/* ==========================================
   2. Natural Sorting & Sidebar Rendering
   ========================================== */

function renderSidebarList() {
  el.thumbnailList.innerHTML = '';
  
  // Disconnect previous observer if any
  if (thumbnailIntersectionObserver) {
    thumbnailIntersectionObserver.disconnect();
  }

  // Create lazy observer for thumbnails
  thumbnailIntersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const imgContainer = entry.target.querySelector('.thumb-preview-box');
      const index = parseInt(entry.target.dataset.index, 10);
      const fileObj = state.files[index];
      
      if (entry.isIntersecting) {
        // Load thumbnail image
        if (!fileObj.url) {
          fileObj.url = URL.createObjectURL(fileObj.file);
        }
        imgContainer.innerHTML = `<img src="${fileObj.url}" alt="Thumbnail" loading="lazy">`;
      } else {
        // Unload thumbnail to save memory on iOS!
        imgContainer.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        `;
        // Only revoke if this URL is NOT currently in the main reader viewport buffer!
        const bufferRange = getActiveBufferRange();
        if (!bufferRange.includes(index)) {
          if (fileObj.url) {
            URL.revokeObjectURL(fileObj.url);
            fileObj.url = null;
          }
        }
      }
    });
  }, {
    root: el.thumbnailList,
    rootMargin: '100px 0px' // Load thumbnails slightly ahead of viewport enter
  });

  state.files.forEach((fileObj, index) => {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    if (index === state.currentIndex) item.classList.add('active');
    item.dataset.index = index;
    
    item.innerHTML = `
      <div class="thumb-preview-box">
        <!-- SVG placeholder initially -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
      <div class="thumb-info">
        <span class="thumb-name" title="${fileObj.name}">${fileObj.name}</span>
        <span class="thumb-index">頁面 ${index + 1}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      navigateTo(index);
    });

    el.thumbnailList.appendChild(item);
    thumbnailIntersectionObserver.observe(item);
  });
}

function updateSidebarActiveState() {
  const children = el.thumbnailList.children;
  if (children.length === 0) return;
  
  for (let i = 0; i < children.length; i++) {
    if (i === state.currentIndex) {
      children[i].classList.add('active');
      // Scroll into view gently
      children[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      children[i].classList.remove('active');
    }
  }
}

function filterSidebarList(query) {
  const q = query.toLowerCase();
  const children = el.thumbnailList.children;
  
  state.files.forEach((fileObj, index) => {
    const matches = fileObj.name.toLowerCase().includes(q) || fileObj.relativePath.toLowerCase().includes(q);
    if (matches) {
      children[index].classList.remove('hidden');
    } else {
      children[index].classList.add('hidden');
    }
  });
}

el.txtSearch.addEventListener('input', e => filterSidebarList(e.target.value));

/* ==========================================
   3. Viewport Buffer & Memory Optimization
   ========================================== */

// Helper to determine active range of indices to keep in memory
function getActiveBufferRange() {
  const range = [];
  const total = state.files.length;
  if (total === 0) return range;

  if (state.layoutMode === 'scroll') {
    // Scroll mode handles its own virtual DOM intersections, so we return empty range or current view index
    range.push(state.currentIndex);
    return range;
  }

  const offsetBefore = 2;
  const offsetAfter = (state.layoutMode === 'double') ? 3 : 2;

  const start = Math.max(0, state.currentIndex - offsetBefore);
  const end = Math.min(total - 1, state.currentIndex + offsetAfter);

  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  return range;
}

// Re-evaluates URLs, creating new ones and revoking obsolete ones
function refreshMemoryBuffer() {
  const activeRange = getActiveBufferRange();
  
  state.files.forEach((fileObj, index) => {
    // If it's in the current viewport buffer range, load URL
    if (activeRange.includes(index)) {
      if (!fileObj.url) {
        fileObj.url = URL.createObjectURL(fileObj.file);
      }
    } else {
      // If outside buffer, check if it's currently rendered/used anywhere (e.g. visible scroll placeholders)
      // Otherwise, revoke to release RAM
      if (state.layoutMode !== 'scroll') {
        if (fileObj.url) {
          URL.revokeObjectURL(fileObj.url);
          fileObj.url = null;
        }
      }
    }
  });
}

/* ==========================================
   4. Render Views (Single / Double / Scroll)
   ========================================== */

function renderCurrentView() {
  if (state.files.length === 0) return;

  // Sync memory buffer
  refreshMemoryBuffer();
  
  // Render based on Layout Mode
  if (state.layoutMode === 'single') {
    renderSingleLayout();
  } else if (state.layoutMode === 'double') {
    renderDoubleLayout();
  } else if (state.layoutMode === 'scroll') {
    // Managed separately, navigateTo handles scrolling
    scrollToIndex(state.currentIndex);
  }

  // Update scrub bar and labels
  el.progressScrub.value = state.currentIndex;
  
  if (state.layoutMode === 'double') {
    const nextIdx = state.currentIndex + 1;
    if (nextIdx < state.files.length) {
      el.lblPageIndicator.textContent = `${state.currentIndex + 1}-${nextIdx + 1} / ${state.files.length}`;
    } else {
      el.lblPageIndicator.textContent = `${state.currentIndex + 1} / ${state.files.length}`;
    }
  } else {
    el.lblPageIndicator.textContent = `${state.currentIndex + 1} / ${state.files.length}`;
  }

  updateSidebarActiveState();
}

function renderSingleLayout() {
  const fileObj = state.files[state.currentIndex];
  
  el.viewportReader.innerHTML = `
    <div class="img-container">
      <img id="img-single" class="reader-img" src="${fileObj.url}" alt="Page ${state.currentIndex + 1}">
    </div>
  `;

  const img = document.getElementById('img-single');
  img.addEventListener('load', () => {
    img.classList.add('loaded');
    state.files[state.currentIndex].aspect = img.naturalWidth / img.naturalHeight;
  });
}

function renderDoubleLayout() {
  const leftObj = state.files[state.currentIndex];
  const nextIdx = state.currentIndex + 1;
  const rightObj = (nextIdx < state.files.length) ? state.files[nextIdx] : null;

  if (rightObj) {
    el.viewportReader.innerHTML = `
      <div class="img-container">
        <img id="img-left" class="reader-img" src="${leftObj.url}" alt="Page ${state.currentIndex + 1}">
      </div>
      <div class="img-container">
        <img id="img-right" class="reader-img" src="${rightObj.url}" alt="Page ${nextIdx + 1}">
      </div>
    `;

    const imgLeft = document.getElementById('img-left');
    const imgRight = document.getElementById('img-right');

    imgLeft.addEventListener('load', () => {
      imgLeft.classList.add('loaded');
      leftObj.aspect = imgLeft.naturalWidth / imgLeft.naturalHeight;
    });
    
    imgRight.addEventListener('load', () => {
      imgRight.classList.add('loaded');
      rightObj.aspect = imgRight.naturalWidth / imgRight.naturalHeight;
    });
  } else {
    // Fallback if double page is requested but we are at the last single page
    renderSingleLayout();
  }
}

/* ==========================================
   5. Virtual Scroll Implementation (Scroll Mode)
   ========================================== */

function setupScrollMode() {
  el.viewportScroll.innerHTML = '';
  
  if (scrollIntersectionObserver) {
    scrollIntersectionObserver.disconnect();
  }

  // Create virtual scroll placeholders
  state.files.forEach((fileObj, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-img-wrapper';
    wrapper.dataset.index = index;
    
    // Set estimated height or saved aspect ratio to prevent layouts shifting on load
    const aspect = fileObj.aspect || 0.75; // Default 3:4 aspect ratio
    wrapper.style.aspectRatio = aspect.toString();
    
    wrapper.innerHTML = `<span class="badge">讀取中... ${index + 1}</span>`;
    el.viewportScroll.appendChild(wrapper);
  });

  // Setup virtual loading scroll observer
  scrollIntersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const wrapper = entry.target;
      const index = parseInt(wrapper.dataset.index, 10);
      const fileObj = state.files[index];

      if (entry.isIntersecting) {
        // Load WebP file into memory and render
        if (!fileObj.url) {
          fileObj.url = URL.createObjectURL(fileObj.file);
        }
        
        wrapper.innerHTML = `<img src="${fileObj.url}" alt="Page ${index + 1}">`;
        const img = wrapper.querySelector('img');
        img.addEventListener('load', () => {
          // Record correct aspect ratio to fix spacing
          const actualAspect = img.naturalWidth / img.naturalHeight;
          fileObj.aspect = actualAspect;
          wrapper.style.aspectRatio = actualAspect.toString();
        });
      } else {
        // Unload WebP to conserve iOS memory!
        wrapper.innerHTML = `<span class="badge">頁面 ${index + 1}</span>`;
        
        // Revoke ObjectURL to keep RAM usage super low on iOS
        if (fileObj.url) {
          URL.revokeObjectURL(fileObj.url);
          fileObj.url = null;
        }
      }
    });
  }, {
    root: el.viewportScroll,
    rootMargin: '400px 0px' // Load pages 400px before they scroll into view
  });

  // Observe all wrappers
  const wrappers = el.viewportScroll.querySelectorAll('.scroll-img-wrapper');
  wrappers.forEach(w => scrollIntersectionObserver.observe(w));

  // Sync scroll height to currentIndex
  scrollToIndex(state.currentIndex);

  // Monitor scroll movements to dynamically update current active index
  el.viewportScroll.addEventListener('scroll', handleViewportScrollDebounced);
}

let scrollTimeout = null;
function handleViewportScrollDebounced() {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const scrollContainer = el.viewportScroll;
    const wrappers = scrollContainer.querySelectorAll('.scroll-img-wrapper');
    const containerCenter = scrollContainer.scrollTop + (scrollContainer.clientHeight / 2);
    
    let closestIndex = state.currentIndex;
    let minDistance = Infinity;

    wrappers.forEach(w => {
      const offsetTop = w.offsetTop;
      const distance = Math.abs(offsetTop - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = parseInt(w.dataset.index, 10);
      }
    });

    if (closestIndex !== state.currentIndex) {
      state.currentIndex = closestIndex;
      // Sync bottom progress scrub bar & page label without scrolling
      el.progressScrub.value = state.currentIndex;
      el.lblPageIndicator.textContent = `${state.currentIndex + 1} / ${state.files.length}`;
      updateSidebarActiveState();
    }
  }, 100);
}

function scrollToIndex(index) {
  const wrappers = el.viewportScroll.querySelectorAll('.scroll-img-wrapper');
  if (wrappers[index]) {
    // Disable scroll event listener temporarily to prevent indexing loop jitter
    el.viewportScroll.removeEventListener('scroll', handleViewportScrollDebounced);
    
    wrappers[index].scrollIntoView({ block: 'start', behavior: 'auto' });
    
    // Resume scroll event monitoring
    setTimeout(() => {
      el.viewportScroll.addEventListener('scroll', handleViewportScrollDebounced);
    }, 200);
  }
}

/* ==========================================
   6. Navigation Logic
   ========================================== */

function navigateTo(index) {
  if (state.files.length === 0) return;
  
  // Bound check
  index = Math.max(0, Math.min(state.files.length - 1, index));
  state.currentIndex = index;

  renderCurrentView();
}

function navigateNext() {
  if (state.files.length === 0) return;

  const step = (state.layoutMode === 'double') ? 2 : 1;
  let nextIdx = state.currentIndex + step;

  if (nextIdx >= state.files.length) {
    if (state.loop) {
      nextIdx = 0;
    } else {
      nextIdx = state.files.length - 1;
      pauseAutoplay();
    }
  }
  navigateTo(nextIdx);
}

function navigatePrev() {
  if (state.files.length === 0) return;

  const step = (state.layoutMode === 'double') ? 2 : 1;
  let prevIdx = state.currentIndex - step;

  if (prevIdx < 0) {
    if (state.loop) {
      prevIdx = Math.max(0, state.files.length - 1);
      // Align double page boundary if needed
      if (state.layoutMode === 'double' && prevIdx % 2 !== 0 && prevIdx > 0) {
        prevIdx--;
      }
    } else {
      prevIdx = 0;
    }
  }
  navigateTo(prevIdx);
}

// Nav Buttons
el.btnPrev.addEventListener('click', () => {
  pauseAutoplay();
  navigatePrev();
});
el.btnNext.addEventListener('click', () => {
  pauseAutoplay();
  navigateNext();
});

// Range scrubber change
el.progressScrub.addEventListener('input', e => {
  pauseAutoplay();
  navigateTo(parseInt(e.target.value, 10));
});

/* ==========================================
   7. Autoplay Timer Controls
   ========================================== */

function startAutoplay() {
  if (state.files.length === 0) return;
  state.isPlaying = true;
  
  el.btnPlayPause.querySelector('.icon-play').classList.add('hidden');
  el.btnPlayPause.querySelector('.icon-pause').classList.remove('hidden');
  
  // Set accurate timer
  autoplayInterval = setInterval(() => {
    navigateNext();
  }, state.autoplaySpeed);

  // Auto-hide UI components once play starts
  hideUI();
}

function pauseAutoplay() {
  state.isPlaying = false;
  
  el.btnPlayPause.querySelector('.icon-play').classList.remove('hidden');
  el.btnPlayPause.querySelector('.icon-pause').classList.add('hidden');
  
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
}

el.btnPlayPause.addEventListener('click', () => {
  if (state.isPlaying) {
    pauseAutoplay();
  } else {
    startAutoplay();
  }
});

el.selectSpeed.addEventListener('change', e => {
  state.autoplaySpeed = parseInt(e.target.value, 10);
  if (state.isPlaying) {
    pauseAutoplay();
    startAutoplay();
  }
});

el.chkLoop.addEventListener('change', e => {
  state.loop = e.target.checked;
});

/* ==========================================
   8. Layout / Image Resize Modes Settings
   ========================================== */

function switchLayoutMode(mode) {
  state.layoutMode = mode;

  // Update layout control buttons
  [el.btnModeSingle, el.btnModeDouble, el.btnModeScroll].forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (mode === 'scroll') {
    // Scroll mode
    el.viewportReader.classList.add('hidden');
    el.viewportScroll.classList.remove('hidden');
    el.prevZone.classList.add('hidden'); // Disable paging tap zones
    el.nextZone.classList.add('hidden');
    document.getElementById('fit-controls').classList.add('hidden'); // Fits don't apply to scroll stacking
    setupScrollMode();
  } else {
    // Reader mode (single or double)
    el.viewportScroll.classList.add('hidden');
    el.viewportReader.classList.remove('hidden');
    el.prevZone.classList.remove('hidden'); // Re-enable tap zones
    el.nextZone.classList.remove('hidden');
    document.getElementById('fit-controls').classList.remove('hidden');
    renderCurrentView();
  }
}

el.btnModeSingle.addEventListener('click', () => switchLayoutMode('single'));
el.btnModeDouble.addEventListener('click', () => switchLayoutMode('double'));
el.btnModeScroll.addEventListener('click', () => switchLayoutMode('scroll'));

function switchFitMode(fit) {
  state.fitMode = fit;

  // CSS class updates on canvas area
  el.canvasArea.className = `canvas-area fit-${fit}`;

  [el.btnFitHeight, el.btnFitWidth, el.btnFitOriginal].forEach(btn => {
    if (btn.dataset.fit === fit) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

el.btnFitHeight.addEventListener('click', () => switchFitMode('height'));
el.btnFitWidth.addEventListener('click', () => switchFitMode('width'));
el.btnFitOriginal.addEventListener('click', () => switchFitMode('original'));

/* ==========================================
   9. Touch Swipe & Click UI Toggling
   ========================================== */

function toggleUI() {
  state.uiVisible = !state.uiVisible;
  if (state.uiVisible) {
    showUI();
  } else {
    hideUI();
  }
}

function showUI() {
  state.uiVisible = true;
  el.appContainer.classList.remove('ui-hidden');
  resetLivenessTimer();
}

function hideUI() {
  state.uiVisible = false;
  el.appContainer.classList.add('ui-hidden');
}

// Toggling UI via tapping center zone
el.toggleUiZone.addEventListener('click', toggleUI);

// Paging zones
el.prevZone.addEventListener('click', (e) => {
  e.stopPropagation();
  pauseAutoplay();
  navigatePrev();
});

el.nextZone.addEventListener('click', (e) => {
  e.stopPropagation();
  pauseAutoplay();
  navigateNext();
});

// Sidebar Collapsing
el.btnToggleSidebar.addEventListener('click', () => {
  state.sidebarVisible = !state.sidebarVisible;
  if (state.sidebarVisible) {
    el.appContainer.classList.remove('sidebar-hidden');
  } else {
    el.appContainer.classList.add('sidebar-hidden');
  }
});

// Auto-hide UI timer after 3 seconds of inactivity during autoplay
let uiLivenessTimeout = null;
function resetLivenessTimer() {
  if (uiLivenessTimeout) clearTimeout(uiLivenessTimeout);
  if (state.isPlaying && state.uiVisible) {
    uiLivenessTimeout = setTimeout(() => {
      hideUI();
    }, 3000);
  }
}

// Hook up listener to reset UI auto-hide timer on mouse movements / clicks
document.addEventListener('mousemove', resetLivenessTimer);
document.addEventListener('click', resetLivenessTimer);

/* ==========================================
   10. Touch Gestures & Keyboard Shortcuts
   ========================================== */

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

el.viewerContainer.addEventListener('touchstart', e => {
  const touch = e.changedTouches[0];
  touchStartX = touch.pageX;
  touchStartY = touch.pageY;
  touchStartTime = Date.now();
}, { passive: true });

el.viewerContainer.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const deltaX = touch.pageX - touchStartX;
  const deltaY = touch.pageY - touchStartY;
  const duration = Date.now() - touchStartTime;

  // Detect Swipes
  // Horizontal swipe requirements: dist > 50px, duration < 300ms, vertical drift < 60px
  if (Math.abs(deltaX) > 50 && duration < 300 && Math.abs(deltaY) < 60) {
    pauseAutoplay();
    if (deltaX > 0) {
      // Swipe Right -> Go Prev
      navigatePrev();
    } else {
      // Swipe Left -> Go Next
      navigateNext();
    }
  }
}, { passive: true });

// Keyboard controls
document.addEventListener('keydown', e => {
  if (state.files.length === 0) return;
  // Skip key listeners if user typing in search bar
  if (document.activeElement === el.txtSearch) return;

  switch (e.key) {
    case ' ':
    case 'Spacebar':
      e.preventDefault();
      if (state.isPlaying) {
        pauseAutoplay();
      } else {
        startAutoplay();
      }
      break;
    case 'ArrowLeft':
      pauseAutoplay();
      navigatePrev();
      break;
    case 'ArrowRight':
      pauseAutoplay();
      navigateNext();
      break;
    case 'f':
    case 'F':
      // Toggle fullscreen
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error enabling fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
      break;
  }
});
