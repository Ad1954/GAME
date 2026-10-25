// DailyLoopView.js: Presentation Controller for Daily Sign-in, Daily Quests & Free Shop Gift
import {
  DAILY_SIGNIN_REWARDS,
  DAILY_FREE_SHOP_REWARD,
  DAILY_QUEST_CONFIGS,
  DAILY_ACTIVITY_CHEST_CONFIG,
  Events
} from '../core/Constants.js';

export class DailyLoopView {
  constructor(dailyLoopManager, audioEffects, stageManager, showFloatingTextFn) {
    this.dailyLoopManager = dailyLoopManager;
    this.audio = audioEffects;
    this.stageManager = stageManager;
    this.showFloatingText = showFloatingTextFn || (() => {});

    // Modals
    this.modalSignIn = document.getElementById('modal-daily-signin');
    this.modalQuests = document.getElementById('modal-daily-quests');

    // Buttons
    this.btnOpenSignIn = document.getElementById('btn-open-signin');
    this.btnOpenQuests = document.getElementById('btn-open-quests');
    this.btnCloseSignIn = document.getElementById('btn-close-signin');
    this.btnCloseQuests = document.getElementById('btn-close-quests');

    // Sign-in UI
    this.signInGrid = document.getElementById('signin-cards-grid');
    this.btnClaimSignIn = document.getElementById('btn-claim-signin');
    this.signInHint = document.getElementById('signin-status-hint');

    // Quests UI
    this.questsListEl = document.getElementById('daily-quests-list');
    this.activityProgressFill = document.getElementById('activity-progress-fill');
    this.activityPointsVal = document.getElementById('activity-points-val');
    this.btnClaimChest = document.getElementById('btn-claim-activity-chest');
    this.chestStatusLabel = document.getElementById('activity-chest-status-label');

    // Shop Gift UI
    this.cardShopFreeGift = document.getElementById('card-daily-free-gift');
    this.btnClaimShopGift = document.getElementById('btn-claim-shop-free-gift');
    this.shopGiftStatusText = document.getElementById('shop-free-gift-status');

    // Badges
    this.badgeSignIn = document.getElementById('badge-signin');
    this.badgeQuests = document.getElementById('badge-quests');
    this.badgeShop = document.getElementById('badge-shop');

    this.bindEvents();
    this.renderAll();

    // Auto open signin on first visit today if unclaimed
    if (this.dailyLoopManager && this.dailyLoopManager.hasSignInPending()) {
      setTimeout(() => {
        this.openSignInModal();
      }, 600);
    }
  }

  bindEvents() {
    // Open/Close Sign-in
    if (this.btnOpenSignIn) {
      this.btnOpenSignIn.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.openSignInModal();
      });
    }
    if (this.btnCloseSignIn) {
      this.btnCloseSignIn.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.closeSignInModal();
      });
    }

    // Open/Close Quests
    if (this.btnOpenQuests) {
      this.btnOpenQuests.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.openQuestsModal();
      });
    }
    if (this.btnCloseQuests) {
      this.btnCloseQuests.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.closeQuestsModal();
      });
    }

    // Claim Sign-in
    if (this.btnClaimSignIn) {
      this.btnClaimSignIn.addEventListener('click', () => {
        const res = this.dailyLoopManager.claimSignInReward();
        if (res.success) {
          if (this.audio && this.audio.playVictory) this.audio.playVictory();
          this.showFloatingText(`🎉 簽到成功！獲得 ${res.reward.desc}`, '#facc15');
          this.renderAll();
        } else {
          this.showFloatingText('⚠️ 今日已完成簽到，明天再來吧！', '#94a3b8');
        }
      });
    }

    // Claim Shop Free Gift
    if (this.btnClaimShopGift) {
      this.btnClaimShopGift.addEventListener('click', () => {
        const res = this.dailyLoopManager.claimShopGift();
        if (res.success) {
          if (this.audio && this.audio.playMerge) this.audio.playMerge();
          this.showFloatingText(`📦 成功領取每日免費軍資：+${res.reward.gold} 🪙！`, '#38bdf8');
          this.renderAll();
        } else {
          this.showFloatingText('⚠️ 今日免費軍資已領取完畢！', '#94a3b8');
        }
      });
    }

    // Claim 100 Activity Chest
    if (this.btnClaimChest) {
      this.btnClaimChest.addEventListener('click', () => {
        const res = this.dailyLoopManager.claimActivityChest();
        if (res.success) {
          if (this.audio && this.audio.playVictory) this.audio.playVictory();
          this.showFloatingText(`🏆 領取活躍全勤大寶箱！獲得 +${res.reward.rewardGold} 🪙、精準重弩 x2 與 破壞戰槌 x1！`, '#facc15');
          this.renderAll();
        } else {
          if (res.reason === 'INSUFFICIENT_ACTIVITY_POINTS') {
            this.showFloatingText('⚠️ 活躍度尚未達到 100 點！', '#f87171');
          } else if (res.reason === 'ALREADY_CLAIMED') {
            this.showFloatingText('⚠️ 今日活躍大寶箱已領取！', '#94a3b8');
          }
        }
      });
    }

    // Listen to daily state and quest progress changes
    if (this.dailyLoopManager.eventBus) {
      this.dailyLoopManager.eventBus.on(Events.DAILY_STATE_CHANGED, () => {
        this.renderAll();
      });
      this.dailyLoopManager.eventBus.on(Events.QUEST_PROGRESS_CHANGED, () => {
        this.renderAll();
      });
    }
  }

  openSignInModal() {
    this.renderSignInModal();
    if (this.modalSignIn) {
      this.modalSignIn.style.display = 'flex';
    }
  }

  closeSignInModal() {
    if (this.modalSignIn) {
      this.modalSignIn.style.display = 'none';
    }
  }

  openQuestsModal() {
    this.renderDailyQuestsModal();
    if (this.modalQuests) {
      this.modalQuests.style.display = 'flex';
    }
  }

  closeQuestsModal() {
    if (this.modalQuests) {
      this.modalQuests.style.display = 'none';
    }
  }

  renderAll() {
    this.renderSignInModal();
    this.renderDailyQuestsModal();
    this.renderShopFreeGift();
    this.updateBadges();
  }

  updateBadges() {
    const summary = this.dailyLoopManager.getSummaryStatus();

    if (this.badgeSignIn) {
      this.badgeSignIn.style.display = summary.signInPending ? 'block' : 'none';
    }
    if (this.badgeQuests) {
      this.badgeQuests.style.display = summary.questPending ? 'block' : 'none';
    }
    if (this.badgeShop) {
      this.badgeShop.style.display = summary.shopGiftPending ? 'block' : 'none';
    }
  }

  renderSignInModal() {
    if (!this.signInGrid) return;
    const state = this.dailyLoopManager.state;
    const currentDay = state.signInDay;
    const claimedToday = state.signInClaimedToday;

    this.signInGrid.innerHTML = '';
    DAILY_SIGNIN_REWARDS.forEach(item => {
      const card = document.createElement('div');
      card.className = 'signin-card';
      
      const isPastClaimed = (item.day < currentDay) || (item.day === currentDay && claimedToday);
      const isCurrentActive = (item.day === currentDay && !claimedToday);
      const isDay7 = (item.day === 7);

      if (isPastClaimed) card.classList.add('claimed');
      if (isCurrentActive) card.classList.add('current');
      if (isDay7) card.classList.add('day7-grand');

      card.innerHTML = `
        <div class="signin-card-day">第 ${item.day} 天</div>
        <div class="signin-card-icon">${isDay7 ? '🎁' : '🪙'}</div>
        <div class="signin-card-reward">${item.desc}</div>
        <div class="signin-card-status">${isPastClaimed ? '✓ 已領取' : (isCurrentActive ? '可領取' : '未解鎖')}</div>
      `;
      this.signInGrid.appendChild(card);
    });

    if (this.btnClaimSignIn) {
      if (claimedToday) {
        this.btnClaimSignIn.disabled = true;
        this.btnClaimSignIn.classList.add('disabled');
        this.btnClaimSignIn.textContent = '今日已簽到 · 明日再來';
      } else {
        this.btnClaimSignIn.disabled = false;
        this.btnClaimSignIn.classList.remove('disabled');
        const currentReward = DAILY_SIGNIN_REWARDS.find(r => r.day === currentDay);
        this.btnClaimSignIn.textContent = `立即簽到 · 領取第 ${currentDay} 天獎勵`;
      }
    }

    if (this.signInHint) {
      this.signInHint.textContent = claimedToday 
        ? '今日獎勵已全數入帳，每日 00:00 自動刷新！' 
        : `點擊簽到領取今天的專屬獎勵！`;
    }
  }

  renderDailyQuestsModal() {
    if (!this.questsListEl) return;
    const state = this.dailyLoopManager.state;

    // 1. Render Activity Bar
    const points = state.activityPoints || 0;
    if (this.activityPointsVal) {
      this.activityPointsVal.textContent = `${points} / 100`;
    }
    if (this.activityProgressFill) {
      this.activityProgressFill.style.width = `${Math.min(100, points)}%`;
    }

    if (this.btnClaimChest) {
      if (state.activityChestClaimed) {
        this.btnClaimChest.disabled = true;
        this.btnClaimChest.className = 'btn-claim-chest claimed';
        this.btnClaimChest.textContent = '今日已領取';
      } else if (points >= DAILY_ACTIVITY_CHEST_CONFIG.requiredPoints) {
        this.btnClaimChest.disabled = false;
        this.btnClaimChest.className = 'btn-claim-chest glow-active';
        this.btnClaimChest.textContent = '開啟全勤寶箱';
      } else {
        this.btnClaimChest.disabled = true;
        this.btnClaimChest.className = 'btn-claim-chest disabled';
        this.btnClaimChest.textContent = '未達成 100';
      }
    }

    // 2. Render Quest Items
    this.questsListEl.innerHTML = '';
    DAILY_QUEST_CONFIGS.forEach(q => {
      const qData = state.quests[q.id] || { progress: 0, claimed: false };
      const isCompleted = qData.progress >= q.target;
      const isClaimed = qData.claimed;

      const itemEl = document.createElement('div');
      itemEl.className = `quest-item-card ${isClaimed ? 'claimed' : (isCompleted ? 'completed' : '')}`;

      const pct = Math.min(100, Math.round((qData.progress / q.target) * 100));

      itemEl.innerHTML = `
        <div class="quest-icon">${q.icon}</div>
        <div class="quest-details">
          <div class="quest-header">
            <span class="quest-title">${q.name}</span>
            <span class="quest-points">+${q.activityPoints} ⭐</span>
          </div>
          <div class="quest-desc">${q.desc}</div>
          <div class="quest-progress-bar-wrap">
            <div class="quest-progress-bar" style="width: ${pct}%;"></div>
            <span class="quest-progress-text">${qData.progress} / ${q.target}</span>
          </div>
        </div>
        <div class="quest-action">
          <div class="quest-reward-pill">🪙 +${q.rewardGold}</div>
          <button class="btn-quest-claim ${isClaimed ? 'claimed' : (isCompleted ? 'active' : 'disabled')}" 
                  data-quest-id="${q.id}" ${isClaimed || !isCompleted ? 'disabled' : ''}>
            ${isClaimed ? '已領取' : (isCompleted ? '領取' : '進行中')}
          </button>
        </div>
      `;

      // Bind claim button
      const claimBtn = itemEl.querySelector('.btn-quest-claim');
      if (claimBtn && isCompleted && !isClaimed) {
        claimBtn.addEventListener('click', () => {
          const res = this.dailyLoopManager.claimQuestReward(q.id);
          if (res.success) {
            if (this.audio && this.audio.playMerge) this.audio.playMerge();
            this.showFloatingText(`🎉 達成【${q.name}】！獲得 +${res.rewardGold} 🪙 與 +${q.activityPoints} 活躍度！`, '#facc15');
            this.renderAll();
          }
        });
      }

      this.questsListEl.appendChild(itemEl);
    });
  }

  renderShopFreeGift() {
    if (!this.cardShopFreeGift) return;
    const isClaimed = this.dailyLoopManager.state.shopGiftClaimedToday;

    if (this.btnClaimShopGift) {
      if (isClaimed) {
        this.btnClaimShopGift.disabled = true;
        this.btnClaimShopGift.classList.add('claimed-btn');
        this.btnClaimShopGift.innerHTML = `<span class="privilege-price">已領取</span><span class="privilege-action">明日重置</span>`;
      } else {
        this.btnClaimShopGift.disabled = false;
        this.btnClaimShopGift.classList.remove('claimed-btn');
        this.btnClaimShopGift.innerHTML = `<span class="privilege-price">免費</span><span class="privilege-action">立即領取</span>`;
      }
    }

    if (this.shopGiftStatusText) {
      this.shopGiftStatusText.textContent = isClaimed ? '今日免費軍資已領取完畢 (00:00 刷新)' : '王國軍資每日免費補給 (+200🪙)';
    }
  }
}
