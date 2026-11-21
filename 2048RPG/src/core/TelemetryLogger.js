// TelemetryLogger.js: Full Playtest Telemetry & Deterministic Battle Replay Recorder
// Captures every move, spawned tile (type/value/r/c), board snapshot, think time,
// battle outcome (VICTORY/DEFEAT/RETREAT), and all town/economy actions with timestamps.
// Persists safely to IndexedDB (with graceful in-memory fallback for Node/test environments).

const DB_NAME = (typeof window !== 'undefined' && window.__RPG_EDITION_PROFILE__ && window.__RPG_EDITION_PROFILE__.telemetryDbName)
  ? window.__RPG_EDITION_PROFILE__.telemetryDbName
  : 'RPG2048_TelemetryDB_v1';
const DB_VERSION = 1;
const STORE_BATTLES = 'battles';
const STORE_TOWN = 'town_logs';
const MAX_BATTLES_KEEP = 500;
const MAX_TOWN_KEEP = 3000;

export class TelemetryLogger {
  constructor() {
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.battles = [];
    this.townLogs = [];
    this.activeBattle = null;
    this.lastActionTs = null;
    this.db = null;
    this.isReady = false;
    this.onChangeCallbacks = [];

    this._initDB();

    if (typeof window !== 'undefined') {
      window.telemetryLogger = this;
    }
  }

  onChange(cb) {
    if (typeof cb === 'function') this.onChangeCallbacks.push(cb);
  }

  _notifyChange() {
    for (const cb of this.onChangeCallbacks) {
      try { cb(); } catch (e) { /* ignore UI listener errors */ }
    }
  }

  _initDB() {
    if (typeof indexedDB === 'undefined') {
      this.isReady = true;
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_BATTLES)) {
          db.createObjectStore(STORE_BATTLES, { keyPath: 'battleId' });
        }
        if (!db.objectStoreNames.contains(STORE_TOWN)) {
          db.createObjectStore(STORE_TOWN, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        this._loadFromDB();
      };
      req.onerror = () => {
        this.isReady = true;
      };
    } catch (e) {
      this.isReady = true;
    }
  }

  _loadFromDB() {
    if (!this.db) {
      this.isReady = true;
      return;
    }
    try {
      const tx = this.db.transaction([STORE_BATTLES, STORE_TOWN], 'readonly');
      const bReq = tx.objectStore(STORE_BATTLES).getAll();
      const tReq = tx.objectStore(STORE_TOWN).getAll();

      tx.oncomplete = () => {
        const loadedBattles = Array.isArray(bReq.result) ? bReq.result : [];
        const loadedTown = Array.isArray(tReq.result) ? tReq.result : [];

        // Merge with any in-memory logs created before DB finished loading
        const bMap = new Map();
        for (const b of loadedBattles) bMap.set(b.battleId, b);
        for (const b of this.battles) bMap.set(b.battleId, b);
        this.battles = Array.from(bMap.values()).sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

        const tMap = new Map();
        for (const t of loadedTown) tMap.set(t.id, t);
        for (const t of this.townLogs) tMap.set(t.id, t);
        this.townLogs = Array.from(tMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));

        this.isReady = true;
        this._notifyChange();
      };
    } catch (e) {
      this.isReady = true;
    }
  }

  _putBattleDB(battle) {
    if (!this.db || !battle) return;
    try {
      const tx = this.db.transaction(STORE_BATTLES, 'readwrite');
      tx.objectStore(STORE_BATTLES).put(battle);
    } catch (e) { /* ignore storage quota errors */ }
  }

  _putTownDB(entry) {
    if (!this.db || !entry) return;
    try {
      const tx = this.db.transaction(STORE_TOWN, 'readwrite');
      tx.objectStore(STORE_TOWN).put(entry);
    } catch (e) { /* ignore */ }
  }

  snapshotBoard(board) {
    if (!board || typeof board.getAllTiles !== 'function') return [];
    return board.getAllTiles().map(t => ({
      r: t.r,
      c: t.c,
      type: t.type,
      value: t.value,
      split: !!t.splitOnDeath
    }));
  }

  // ==========================================
  // BATTLE TELEMETRY
  // ==========================================
  startBattle({ stageId, stageName, board, techTier, equippedPower, heroStartPower, goldBefore, characterClass }) {
    const now = Date.now();
    // If a previous battle wasn't formally closed, mark it as INTERRUPTED
    if (this.activeBattle && this.activeBattle.outcome === 'IN_PROGRESS') {
      this.activeBattle.outcome = 'INTERRUPTED';
      this.activeBattle.endTime = now;
      this.activeBattle.durationMs = now - this.activeBattle.startTime;
      this._putBattleDB(this.activeBattle);
    }

    const battleId = `b_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const initialSnap = this.snapshotBoard(board);
    const battle = {
      battleId,
      sessionId: this.sessionId,
      stageId,
      stageName: stageName || `Stage ${stageId}`,
      characterClass: characterClass || 'warrior',
      techTier: techTier || 1,
      equippedPower: equippedPower || 2,
      heroStartPower: heroStartPower || 2,
      goldBefore: goldBefore || 0,
      goldAfter: goldBefore || 0,
      firstClearGold: 0,
      inBattleGold: 0,
      sweepGold: 0,
      totalGoldEarned: 0,
      boardSize: board ? board.size : 5,
      startTime: now,
      startIso: new Date(now).toISOString(),
      endTime: null,
      durationMs: 0,
      outcome: 'IN_PROGRESS',
      totalTurns: 0,
      initialBoard: initialSnap,
      frames: [
        {
          seq: 0,
          action: 'BATTLE_START',
          turn: 0,
          ts: now,
          thinkMs: 0,
          dir: null,
          target: null,
          spawned: null,
          kills: 0,
          merges: 0,
          goldEarned: 0,
          board: initialSnap
        }
      ]
    };

    this.activeBattle = battle;
    this.lastActionTs = now;
    this.battles.push(battle);
    if (this.battles.length > MAX_BATTLES_KEEP) {
      this.battles.shift();
    }
    this._putBattleDB(battle);
    this._notifyChange();
    return battleId;
  }

  recordMove({ turn, direction, spawnedTile, kills = 0, merges = 0, goldEarned = 0, board, extra = null }) {
    if (!this.activeBattle) return;
    const now = Date.now();
    const thinkMs = this.lastActionTs ? (now - this.lastActionTs) : 0;
    this.lastActionTs = now;

    const spawned = spawnedTile ? {
      type: spawnedTile.type,
      value: spawnedTile.value,
      r: spawnedTile.r,
      c: spawnedTile.c
    } : null;

    const frame = {
      seq: this.activeBattle.frames.length,
      action: 'MOVE',
      turn,
      ts: now,
      thinkMs,
      dir: direction,
      target: null,
      spawned,
      kills,
      merges,
      goldEarned,
      extra,
      board: this.snapshotBoard(board)
    };

    this.activeBattle.frames.push(frame);
    this.activeBattle.totalTurns = turn;
    this.activeBattle.durationMs = now - this.activeBattle.startTime;
    this._putBattleDB(this.activeBattle);
  }

  recordBattleAction({ action, turn, target = null, goldEarned = 0, board, detail = null }) {
    if (!this.activeBattle) return;
    const now = Date.now();
    const thinkMs = this.lastActionTs ? (now - this.lastActionTs) : 0;
    this.lastActionTs = now;

    const frame = {
      seq: this.activeBattle.frames.length,
      action,
      turn,
      ts: now,
      thinkMs,
      dir: null,
      target,
      spawned: null,
      kills: 0,
      merges: 0,
      goldEarned,
      extra: detail,
      board: this.snapshotBoard(board)
    };

    this.activeBattle.frames.push(frame);
    this.activeBattle.totalTurns = turn;
    this.activeBattle.durationMs = now - this.activeBattle.startTime;
    this._putBattleDB(this.activeBattle);
  }

  endBattle({ outcome, turns, firstClearGold = 0, inBattleGold = 0, sweepGold = 0, totalGoldEarned = 0, goldAfter = 0, board = null }) {
    if (!this.activeBattle) return;
    const now = Date.now();
    const b = this.activeBattle;
    b.outcome = outcome; // 'VICTORY' | 'DEFEAT' | 'RETREAT'
    b.endTime = now;
    b.durationMs = now - b.startTime;
    b.totalTurns = turns !== undefined ? turns : b.totalTurns;
    b.firstClearGold = firstClearGold;
    b.inBattleGold = inBattleGold;
    b.sweepGold = sweepGold;
    b.totalGoldEarned = totalGoldEarned;
    b.goldAfter = goldAfter;

    if (board) {
      b.frames.push({
        seq: b.frames.length,
        action: `BATTLE_${outcome}`,
        turn: b.totalTurns,
        ts: now,
        thinkMs: this.lastActionTs ? (now - this.lastActionTs) : 0,
        dir: null,
        target: null,
        spawned: null,
        kills: 0,
        merges: 0,
        goldEarned: firstClearGold + sweepGold,
        board: this.snapshotBoard(board)
      });
    }

    this._putBattleDB(b);
    this.activeBattle = null;
    this.lastActionTs = null;
    this._notifyChange();
  }

  // ==========================================
  // TOWN / ECONOMY TELEMETRY
  // ==========================================
  recordTownAction({ action, goldBefore = 0, goldAfter = 0, techTier = 1, equippedPower = 2, detail = {} }) {
    const now = Date.now();
    const entry = {
      id: `t_${now}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId: this.sessionId,
      ts: now,
      isoTime: new Date(now).toISOString(),
      action,
      goldBefore,
      goldAfter,
      goldDelta: goldAfter - goldBefore,
      techTier,
      equippedPower,
      detail
    };

    this.townLogs.push(entry);
    if (this.townLogs.length > MAX_TOWN_KEEP) {
      this.townLogs.shift();
    }
    this._putTownDB(entry);
    this._notifyChange();
    return entry;
  }

  // ==========================================
  // STATS & ANALYTICS
  // ==========================================
  getSummaryStats() {
    const total = this.battles.length;
    const wins = this.battles.filter(b => b.outcome === 'VICTORY').length;
    const defeats = this.battles.filter(b => b.outcome === 'DEFEAT').length;
    const retreats = this.battles.filter(b => b.outcome === 'RETREAT').length;

    let thinkSum = 0;
    let moveCount = 0;
    for (const b of this.battles) {
      for (const f of (b.frames || [])) {
        if (f.action === 'MOVE' && f.thinkMs > 0 && f.thinkMs < 60000) {
          thinkSum += f.thinkMs;
          moveCount++;
        }
      }
    }

    return {
      totalBattles: total,
      wins,
      defeats,
      retreats,
      townActions: this.townLogs.length,
      totalMoves: moveCount,
      avgThinkSec: moveCount > 0 ? +(thinkSum / moveCount / 1000).toFixed(2) : 0
    };
  }

  getBattlesNewestFirst() {
    return [...this.battles].reverse();
  }

  getBattleById(battleId) {
    return this.battles.find(b => b.battleId === battleId) || null;
  }

  // ==========================================
  // EXPORT (JSON / CSV) & CLEAR
  // ==========================================
  _triggerDownload(filename, content, mimeType) {
    if (typeof document === 'undefined' || typeof Blob === 'undefined') return false;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  _timestampStr() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  exportFullJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      stats: this.getSummaryStats(),
      battles: this.battles,
      townLogs: this.townLogs
    };
    const filename = `playtest_full_log_${this._timestampStr()}.json`;
    return this._triggerDownload(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  exportSummaryCSV() {
    const header = [
      '戰鬥ID', '開始時間', '關卡ID', '關卡名稱', '職業', '科技階級',
      '裝備戰力', '結局', '總步數', '耗時(秒)', '平均思考(秒/步)',
      '首通賞金(G)', '盤面即時金幣(G)', '結算掃盤金幣(G)', '總獲得金幣(G)', '戰後金幣餘額(G)'
    ];
    const rows = [header.join(',')];
    for (const b of this.battles) {
      const moveFrames = (b.frames || []).filter(f => f.action === 'MOVE' && f.thinkMs > 0 && f.thinkMs < 60000);
      const avgThink = moveFrames.length > 0
        ? (moveFrames.reduce((acc, f) => acc + f.thinkMs, 0) / moveFrames.length / 1000).toFixed(2)
        : '0.00';
      const durSec = ((b.durationMs || 0) / 1000).toFixed(1);
      const safeName = `"${String(b.stageName || '').replace(/"/g, '""')}"`;
      rows.push([
        b.battleId,
        b.startIso || '',
        b.stageId,
        safeName,
        b.characterClass || '',
        b.techTier,
        b.equippedPower,
        b.outcome,
        b.totalTurns,
        durSec,
        avgThink,
        b.firstClearGold || 0,
        b.inBattleGold || 0,
        b.sweepGold || 0,
        b.totalGoldEarned || 0,
        b.goldAfter || 0
      ].join(','));
    }
    const filename = `playtest_battles_${this._timestampStr()}.csv`;
    return this._triggerDownload(filename, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
  }

  exportTownCSV() {
    const header = ['紀錄ID', '時間', '操作類型', '操作前金幣', '操作後金幣', '金幣變動', '科技階級', '裝備戰力', '明細(JSON)'];
    const rows = [header.join(',')];
    for (const t of this.townLogs) {
      const detailStr = `"${JSON.stringify(t.detail || {}).replace(/"/g, '""')}"`;
      rows.push([
        t.id,
        t.isoTime || '',
        t.action,
        t.goldBefore,
        t.goldAfter,
        t.goldDelta,
        t.techTier,
        t.equippedPower,
        detailStr
      ].join(','));
    }
    const filename = `playtest_town_${this._timestampStr()}.csv`;
    return this._triggerDownload(filename, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
  }

  clearAllLogs() {
    this.battles = [];
    this.townLogs = [];
    this.activeBattle = null;
    this.lastActionTs = null;
    if (this.db) {
      try {
        const tx = this.db.transaction([STORE_BATTLES, STORE_TOWN], 'readwrite');
        tx.objectStore(STORE_BATTLES).clear();
        tx.objectStore(STORE_TOWN).clear();
      } catch (e) { /* ignore */ }
    }
    this._notifyChange();
  }
}
