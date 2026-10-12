// StageListView.js: Presentation Controller for Adventure Stage Selection List (C-STORY-040)

import { CHAPTER_CONFIGS, STAGE_CONFIGS, STAGE_0_CONFIG } from '../core/Constants.js';

export class StageListView {
  constructor(options = {}) {
    this.stageManager = options.stageManager;
    this.audio = options.audio;
    this.onSelectStage = options.onSelectStage || (() => {});
    this.onChapterChanged = options.onChapterChanged || (() => {});

    this.selectedChapter = 1;
    this.tabsContainer = options.tabsContainer || document.getElementById('chapter-tabs');
    this.bannerTitle = options.bannerTitle || document.getElementById('chapter-title');
    this.bannerDesc = options.bannerDesc || document.getElementById('chapter-desc');
    this.stagesListEl = options.stagesListEl || document.getElementById('stages-list');
  }

  setChapter(chapterId) {
    this.selectedChapter = chapterId;
    this.render();
    this.onChapterChanged(chapterId);
  }

  renderChapterTabs() {
    if (!this.tabsContainer) return;
    this.tabsContainer.innerHTML = '';

    CHAPTER_CONFIGS.forEach(ch => {
      const isUnlocked = this.stageManager.isChapterUnlocked(ch.id);
      const icon = ch.icon || '⚔️';
      let titleText = '';
      if (ch.id === 0) {
        titleText = `${icon} 序章訓練所`;
      } else {
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][ch.id - 1] || ch.id;
        titleText = `${icon} 第 ${roman} 章`;
      }

      const btn = document.createElement('button');
      btn.className = `chapter-tab-btn ${this.selectedChapter === ch.id ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`;
      btn.dataset.chapter = ch.id;
      btn.id = `tab-chapter-${ch.id}`;
      btn.textContent = isUnlocked ? titleText : `${titleText} 🔒`;

      btn.addEventListener('click', () => {
        if (!this.stageManager.isChapterUnlocked(ch.id)) {
          const prevCh = CHAPTER_CONFIGS.find(c => c.id === ch.id - 1);
          const reqStage = prevCh ? prevCh.range[1] : (ch.id - 1) * 5;
          alert(`🔒 請先通關第 ${ch.id - 1} 章最後一關（第 ${reqStage} 關）以解鎖本章節！`);
          return;
        }
        if (this.audio) this.audio.playClick();
        this.setChapter(ch.id);
      });

      this.tabsContainer.appendChild(btn);
    });
  }

  render() {
    if (!this.stagesListEl) return;
    this.stagesListEl.innerHTML = '';

    // 1. Update chapter tabs state
    this.renderChapterTabs();

    // 2. Update banner info
    const chConfig = CHAPTER_CONFIGS.find(c => c.id === this.selectedChapter) || CHAPTER_CONFIGS[0];
    if (this.bannerTitle) this.bannerTitle.textContent = chConfig.name;
    if (this.bannerDesc) this.bannerDesc.textContent = chConfig.desc;

    // 3. Render stage cards
    const unlockedId = this.stageManager.unlockedStageId;
    const currentStages = (this.selectedChapter === 0)
      ? [STAGE_0_CONFIG]
      : STAGE_CONFIGS.filter(s => s.chapter === this.selectedChapter);

    currentStages.forEach(stage => {
      const isTutorialStage = (stage.id === 0);
      const isCleared = isTutorialStage 
        ? (this.stageManager.tutorialManager && this.stageManager.tutorialManager.isCompleted)
        : !!this.stageManager.clearedStages[stage.id];
      const isUnlocked = isTutorialStage ? true : (stage.id <= unlockedId);

      const card = document.createElement('div');
      card.className = `stage-card ${isUnlocked ? '' : 'locked'}`;
      card.dataset.stageId = stage.id;

      let statusHtml = '';
      if (isCleared) {
        statusHtml = '<span class="stage-status-pill status-cleared">★ 已通關</span>';
      } else if (isUnlocked) {
        statusHtml = '<span class="stage-status-pill status-ready">⚔️ 可出擊</span>';
      } else {
        statusHtml = '<span class="stage-status-pill status-locked">🔒 未解鎖</span>';
      }

      let rewardBadgeHtml = '';
      if (isCleared) {
        rewardBadgeHtml = '<div class="stage-reward-badge cleared">✔ 已領取</div>';
      } else {
        rewardBadgeHtml = `<div class="stage-reward-badge">初次 +${stage.rewardGold} 🪙</div>`;
      }

      card.innerHTML = `
        <div class="stage-card-left">
          <div class="stage-icon-box">${stage.icon || '⚔️'}</div>
          <div class="stage-meta">
            <h4>${stage.name}</h4>
            <div class="stage-sub">${stage.subtitle}</div>
          </div>
        </div>
        <div class="stage-card-right">
          ${rewardBadgeHtml}
          ${statusHtml}
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          if (this.audio) this.audio.playClick();
          this.stageManager.lastChallengedStageId = stage.id;
          this.stageManager.saveData();
          this.onSelectStage(stage);
        });
      }

      this.stagesListEl.appendChild(card);
    });

    // 4. Smart Auto Positioning (Instant on cleared chapters, Center on in-progress)
    this.scrollToAppropriateStage(currentStages, unlockedId);
  }

  scrollToAppropriateStage(currentStages, unlockedId) {
    if (!this.stagesListEl) return;

    const allCleared = currentStages.length > 0 && currentStages.every(s => {
      if (s.id === 0) {
        return this.stageManager.tutorialManager && this.stageManager.tutorialManager.isCompleted;
      }
      return !!this.stageManager.clearedStages[s.id];
    });

    const scrollContainer = document.getElementById('main-content');

    if (allCleared) {
      // C-STORY-040: All stages cleared in this chapter -> Instant positioning to bottom without top-to-bottom sliding!
      const lastCard = this.stagesListEl.lastElementChild;
      if (lastCard && typeof lastCard.scrollIntoView === 'function') {
        lastCard.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      } else if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    } else {
      // Chapter not yet all cleared -> find latest challenged or latest unlocked stage
      const lastId = this.stageManager.lastChallengedStageId;
      let targetStage = currentStages.find(s => s.id === lastId);
      if (!targetStage) {
        targetStage = currentStages.find(s => {
          const isCleared = (s.id === 0) 
            ? (this.stageManager.tutorialManager && this.stageManager.tutorialManager.isCompleted)
            : !!this.stageManager.clearedStages[s.id];
          const isUnlocked = (s.id === 0) ? true : (s.id <= unlockedId);
          return isUnlocked && !isCleared;
        }) || currentStages[0];
      }

      if (targetStage) {
        const targetCard = this.stagesListEl.querySelector(`[data-stage-id="${targetStage.id}"]`);
        if (targetCard && typeof targetCard.scrollIntoView === 'function') {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  destroy() {
    if (this.tabsContainer) this.tabsContainer.innerHTML = '';
    if (this.stagesListEl) this.stagesListEl.innerHTML = '';
  }
}
