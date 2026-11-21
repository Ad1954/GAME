// ReplayView.js: Playtest Telemetry Dashboard & Interactive Deterministic Battle Replay Player

const DIR_ICONS = {
  UP: '⬆️ 上',
  DOWN: '⬇️ 下',
  LEFT: '⬅️ 左',
  RIGHT: '➡️ 右',
  up: '⬆️ 上',
  down: '⬇️ 下',
  left: '⬅️ 左',
  right: '➡️ 右'
};

const TYPE_META = {
  hero: { icon: '⚔️', label: '勇者', bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: '#60a5fa', color: '#ffffff' },
  monster: { icon: '👹', label: '魔物', bg: 'linear-gradient(135deg, #b91c1c, #7f1d1d)', border: '#f87171', color: '#ffffff' },
  equipment: { icon: '🗡️', label: '裝備', bg: 'linear-gradient(135deg, #047857, #065f46)', border: '#34d399', color: '#ecfdf5' },
  gold: { icon: '🪙', label: '金幣', bg: 'linear-gradient(135deg, #d97706, #92400e)', border: '#fbbf24', color: '#fef3c7' }
};

export class ReplayView {
  constructor(telemetryLogger) {
    this.logger = telemetryLogger;
    this.currentBattle = null;
    this.currentFrameIdx = 0;
    this.isPlaying = false;
    this.speedMult = 1;
    this.playTimer = null;

    this._bindGlobalHooks();
    if (this.logger && typeof this.logger.onChange === 'function') {
      this.logger.onChange(() => this.renderDashboard());
    }
  }

  _bindGlobalHooks() {
    if (typeof window === 'undefined') return;
    window.renderTelemetryDashboard = () => this.renderDashboard();
    window.exportTelemetryJSON = () => {
      if (this.logger) this.logger.exportFullJSON();
    };
    window.exportTelemetryBattlesCSV = () => {
      if (this.logger) this.logger.exportSummaryCSV();
    };
    window.exportTelemetryTownCSV = () => {
      if (this.logger) this.logger.exportTownCSV();
    };
    window.clearTelemetryLogs = () => {
      if (!this.logger) return;
      if (window.confirm('確定要清空所有實測戰鬥與城鎮紀錄嗎？（此操作不會影響遊戲存檔）')) {
        this.logger.clearAllLogs();
        this.renderDashboard();
      }
    };
    window.openBattleReplay = (battleId) => this.openReplay(battleId);
    window.closeBattleReplay = () => this.closeReplay();
    window.replayTogglePlay = () => this.togglePlay();
    window.replayStepPrev = () => this.step(-1);
    window.replayStepNext = () => this.step(1);
    window.replaySeekFirst = () => this.seekTo(0);
    window.replayCycleSpeed = () => this.cycleSpeed();
    window.replayOnScrub = (val) => this.seekTo(parseInt(val, 10) || 0);
  }

  renderDashboard() {
    if (typeof document === 'undefined' || !this.logger) return;
    const statsEl = document.getElementById('telemetry-stats-summary');
    const listEl = document.getElementById('telemetry-battles-list');
    if (!statsEl || !listEl) return;

    const st = this.logger.getSummaryStats();
    statsEl.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px; text-align:center;">
        <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:6px;">
          <div style="font-size:0.68rem; color:#94a3b8;">已記錄戰鬥</div>
          <div style="font-size:0.95rem; font-weight:800; color:#38bdf8;">${st.totalBattles} 場</div>
          <div style="font-size:0.65rem; color:#cbd5e1;">🏆${st.wins} 💀${st.defeats} 🏳️${st.retreats}</div>
        </div>
        <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(251,191,36,0.25); border-radius:8px; padding:6px;">
          <div style="font-size:0.68rem; color:#94a3b8;">均步思考耗時</div>
          <div style="font-size:0.95rem; font-weight:800; color:#fbbf24;">${st.avgThinkSec} 秒</div>
          <div style="font-size:0.65rem; color:#cbd5e1;">共 ${st.totalMoves} 步</div>
        </div>
        <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(52,211,153,0.25); border-radius:8px; padding:6px;">
          <div style="font-size:0.68rem; color:#94a3b8;">城鎮養成紀錄</div>
          <div style="font-size:0.95rem; font-weight:800; color:#34d399;">${st.townActions} 筆</div>
          <div style="font-size:0.65rem; color:#cbd5e1;">抽裝/強化/合成</div>
        </div>
      </div>
    `;

    const battles = this.logger.getBattlesNewestFirst();
    if (battles.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:18px; color:#64748b; font-size:0.8rem;">尚無戰鬥紀錄，進入關卡操作幾步後即會自動收錄！</div>`;
      return;
    }

    listEl.innerHTML = battles.slice(0, 50).map(b => {
      const badge = b.outcome === 'VICTORY'
        ? '<span style="color:#4ade80; font-weight:800;">🏆 勝</span>'
        : b.outcome === 'DEFEAT'
          ? '<span style="color:#f87171; font-weight:800;">💀 敗</span>'
          : b.outcome === 'RETREAT'
            ? '<span style="color:#fbbf24; font-weight:800;">🏳️ 退</span>'
            : '<span style="color:#38bdf8; font-weight:800;">⚔️ 進行中</span>';
      const dur = ((b.durationMs || 0) / 1000).toFixed(1);
      const timeLabel = b.startTime ? new Date(b.startTime).toLocaleTimeString('zh-TW', { hour12: false }) : '';
      const goldSum = b.totalGoldEarned || b.inBattleGold || 0;
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.2); border-radius:8px; padding:8px 10px; margin-bottom:6px;">
          <div style="min-width:0; flex:1;">
            <div style="font-size:0.82rem; font-weight:700; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${badge} 第 ${b.stageId} 關 <span style="font-size:0.7rem; color:#94a3b8; font-weight:400;">(${timeLabel})</span>
            </div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">
              步數: <b style="color:#e2e8f0;">${b.totalTurns}</b> · 耗時: <b style="color:#e2e8f0;">${dur}s</b> · 科技: T${b.techTier} · 金幣: <b style="color:#fbbf24;">+${goldSum}</b>
            </div>
          </div>
          <button type="button" class="cr-btn cr-btn-blue" style="padding:5px 10px; font-size:0.74rem; flex-shrink:0;" onclick="openBattleReplay('${b.battleId}')">▶️ 重播</button>
        </div>
      `;
    }).join('');
  }

  openReplay(battleId) {
    if (!this.logger) return;
    const battle = this.logger.getBattleById(battleId);
    if (!battle || !battle.frames || battle.frames.length === 0) return;

    this.stopPlay();
    this.currentBattle = battle;
    this.currentFrameIdx = 0;

    const modal = document.getElementById('modal-battle-replay');
    if (modal) modal.style.display = 'flex';

    const titleEl = document.getElementById('replay-modal-title');
    if (titleEl) {
      titleEl.textContent = `🎞️ 重播：第 ${battle.stageId} 關 (${battle.outcome})`;
    }

    const scrubber = document.getElementById('replay-scrubber');
    if (scrubber) {
      scrubber.min = 0;
      scrubber.max = Math.max(0, battle.frames.length - 1);
      scrubber.value = 0;
    }

    this.renderFrame();
  }

  closeReplay() {
    this.stopPlay();
    const modal = document.getElementById('modal-battle-replay');
    if (modal) modal.style.display = 'none';
  }

  stopPlay() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    const btn = document.getElementById('replay-btn-play');
    if (btn) btn.textContent = '▶️ 播放';
  }

  togglePlay() {
    if (!this.currentBattle) return;
    if (this.isPlaying) {
      this.stopPlay();
      return;
    }
    if (this.currentFrameIdx >= this.currentBattle.frames.length - 1) {
      this.currentFrameIdx = 0;
    }
    this.isPlaying = true;
    const btn = document.getElementById('replay-btn-play');
    if (btn) btn.textContent = '⏸️ 暫停';

    const intervalMs = Math.max(120, Math.floor(650 / this.speedMult));
    this.playTimer = setInterval(() => {
      if (!this.currentBattle) {
        this.stopPlay();
        return;
      }
      if (this.currentFrameIdx < this.currentBattle.frames.length - 1) {
        this.currentFrameIdx++;
        this.renderFrame();
      } else {
        this.stopPlay();
      }
    }, intervalMs);
  }

  cycleSpeed() {
    const speeds = [1, 2, 4];
    const nextIdx = (speeds.indexOf(this.speedMult) + 1) % speeds.length;
    this.speedMult = speeds[nextIdx];
    const btn = document.getElementById('replay-btn-speed');
    if (btn) btn.textContent = `${this.speedMult}x`;
    if (this.isPlaying) {
      this.stopPlay();
      this.togglePlay();
    }
  }

  step(delta) {
    if (!this.currentBattle) return;
    this.stopPlay();
    const maxIdx = this.currentBattle.frames.length - 1;
    this.currentFrameIdx = Math.max(0, Math.min(maxIdx, this.currentFrameIdx + delta));
    this.renderFrame();
  }

  seekTo(idx) {
    if (!this.currentBattle) return;
    this.stopPlay();
    const maxIdx = this.currentBattle.frames.length - 1;
    this.currentFrameIdx = Math.max(0, Math.min(maxIdx, idx));
    this.renderFrame();
  }

  renderFrame() {
    if (!this.currentBattle) return;
    const frame = this.currentBattle.frames[this.currentFrameIdx];
    if (!frame) return;

    const size = this.currentBattle.boardSize || 5;
    const scrubber = document.getElementById('replay-scrubber');
    if (scrubber) scrubber.value = this.currentFrameIdx;

    const infoEl = document.getElementById('replay-step-info');
    if (infoEl) {
      const dirText = frame.dir ? (DIR_ICONS[frame.dir] || frame.dir) : frame.action;
      const thinkSec = ((frame.thinkMs || 0) / 1000).toFixed(2);
      const spawnText = frame.spawned
        ? `新方塊: <b style="color:#38bdf8;">${(TYPE_META[frame.spawned.type] || {}).label || frame.spawned.type} ${frame.spawned.value}</b> @(${frame.spawned.r},${frame.spawned.c})`
        : '無新方塊';
      const goldText = frame.goldEarned > 0 ? ` · <b style="color:#fbbf24;">+${frame.goldEarned}🪙</b>` : '';
      infoEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#e2e8f0; margin-bottom:3px;">
          <span>幀 <b>${this.currentFrameIdx}/${this.currentBattle.frames.length - 1}</b> (回合 ${frame.turn})</span>
          <span>動作: <b style="color:#fbbf24;">${dirText}</b></span>
          <span>思考: <b>${thinkSec}s</b></span>
        </div>
        <div style="font-size:0.74rem; color:#cbd5e1;">${spawnText}${goldText}</div>
      `;
    }

    const gridEl = document.getElementById('replay-board-grid');
    if (!gridEl) return;

    const tileMap = new Map();
    for (const t of (frame.board || [])) {
      tileMap.set(`${t.r},${t.c}`, t);
    }

    gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    let html = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const t = tileMap.get(`${r},${c}`);
        const isSpawned = frame.spawned && frame.spawned.r === r && frame.spawned.c === c;
        const isTarget = frame.target && frame.target.r === r && frame.target.c === c;

        if (!t) {
          const ring = isTarget ? 'border:2px solid #f97316;' : 'border:1px solid rgba(148,163,184,0.16);';
          html += `<div style="aspect-ratio:1/1; background:rgba(15,23,42,0.6); ${ring} border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#334155;">${r},${c}</div>`;
        } else {
          const meta = TYPE_META[t.type] || TYPE_META.equipment;
          const borderStyle = isSpawned
            ? 'border:2.5px solid #38bdf8; box-shadow:0 0 10px rgba(56,189,248,0.85);'
            : isTarget
              ? 'border:2.5px solid #f97316; box-shadow:0 0 10px rgba(249,115,22,0.85);'
              : `border:1.5px solid ${meta.border};`;
          const newBadge = isSpawned
            ? `<span style="position:absolute; top:-4px; right:-4px; background:#0ea5e9; color:#fff; font-size:0.52rem; font-weight:900; padding:1px 3px; border-radius:4px;">NEW</span>`
            : '';
          const splitMark = t.split ? '🧬' : '';
          html += `
            <div style="position:relative; aspect-ratio:1/1; background:${meta.bg}; ${borderStyle} border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:${meta.color}; line-height:1.1;">
              ${newBadge}
              <div style="font-size:0.85rem;">${meta.icon}${splitMark}</div>
              <div style="font-size:0.75rem; font-weight:900;">${t.value}</div>
            </div>
          `;
        }
      }
    }
    gridEl.innerHTML = html;
  }
}
