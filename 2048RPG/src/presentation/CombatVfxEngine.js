/**
 * CombatVfxEngine.js
 * C-STORY-096 & C-STORY-097: Commercial Grade Arcade Physics Combat VFX Engine
 * Features:
 *  - Warrior: 120px Laser Cross Cleave + Boundary Clipping + Earth Rock Shards (C-STORY-097)
 *  - Archer: Precision Core Launch + Apex Hang Time (450ms) + Zero-Latency Collision Impact (C-STORY-097)
 *  - Merchant: 3D Cel-Shaded Tumbling Coins (360° Cosine Tilt) + Top Wallet Attractor Swarm (C-STORY-097)
 */

export class CombatVfxEngine {
  constructor(canvasEl, boardEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.boardEl = boardEl;
    this.particles = [];
    this.arcs = [];
    this.shockwaves = [];
    this.projectiles = [];
    this.crossBeams = [];
    this.impactStars = [];
    this.coins = [];
    this.animId = null;
    this.isRunning = false;
    this.lastTime = 0;

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas || !this.boardEl) return;
    const bRect = this.boardEl.getBoundingClientRect();
    const parentRect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : bRect;
    const dpr = window.devicePixelRatio || 1;
    this.width = bRect.width;
    this.height = bRect.height;
    this.canvas.width = bRect.width * dpr;
    this.canvas.height = bRect.height * dpr;
    this.canvas.style.width = `${bRect.width}px`;
    this.canvas.style.height = `${bRect.height}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${bRect.left - parentRect.left}px`;
    this.canvas.style.top = `${bRect.top - parentRect.top}px`;
    if (this.ctx) {
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }
  }

  getCellCenter(r, c) {
    if (!this.boardEl) return { x: 0, y: 0 };
    const cellEl = this.boardEl.querySelector(`[data-r="${r}"][data-c="${c}"], [data-row="${r}"][data-col="${c}"]`);
    if (!cellEl) {
      const cw = this.width / 5;
      const ch = this.height / 5;
      return { x: (c + 0.5) * cw, y: (r + 0.5) * ch };
    }
    const bRect = this.boardEl.getBoundingClientRect();
    const cRect = cellEl.getBoundingClientRect();
    return {
      x: cRect.left - bRect.left + cRect.width / 2,
      y: cRect.top - bRect.top + cRect.height / 2
    };
  }

  startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(2.0, (now - this.lastTime) / 16.667) || 1.0;
      this.lastTime = now;
      this.updateAndRender(dt);

      if (
        this.particles.length > 0 ||
        this.arcs.length > 0 ||
        this.shockwaves.length > 0 ||
        this.projectiles.length > 0 ||
        this.crossBeams.length > 0 ||
        this.impactStars.length > 0 ||
        this.coins.length > 0
      ) {
        this.animId = requestAnimationFrame(loop);
      } else {
        this.clear();
        this.isRunning = false;
        this.animId = null;
      }
    };
    this.animId = requestAnimationFrame(loop);
  }

  clear() {
    this.particles = [];
    this.arcs = [];
    this.shockwaves = [];
    this.projectiles = [];
    this.crossBeams = [];
    this.impactStars = [];
    this.coins = [];
    if (this.ctx && this.width && this.height) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  updateAndRender(dt = 1.0) {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.alpha -= sw.decay * dt;
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      this.ctx.save();
      if (sw.additive) this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);

      if (sw.fill) {
        this.ctx.fillStyle = sw.color;
        this.ctx.globalAlpha = Math.max(0, sw.alpha * 0.35);
        this.ctx.fill();
      }

      this.ctx.strokeStyle = sw.color;
      this.ctx.globalAlpha = Math.max(0, sw.alpha);
      this.ctx.lineWidth = sw.lineWidth;
      this.ctx.shadowBlur = sw.glow;
      this.ctx.shadowColor = sw.color;
      this.ctx.stroke();

      if (sw.additive && sw.radius > 6) {
        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, sw.radius * 0.88, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = sw.lineWidth * 0.5;
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // 2. Cross Beams (Warrior Laser Cleave)
    for (let i = this.crossBeams.length - 1; i >= 0; i--) {
      const cb = this.crossBeams[i];
      cb.progress += cb.speed * dt;
      cb.alpha -= cb.decay * dt;

      if (cb.alpha <= 0 || cb.progress >= 1.2) {
        this.crossBeams.splice(i, 1);
        continue;
      }

      const currentWidth = cb.width * Math.sin(Math.min(1.0, cb.progress) * Math.PI);
      const p = Math.min(1.0, cb.progress * 2.2);

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.globalAlpha = Math.max(0, cb.alpha);

      const arms = [
        { dx: 0, dy: -cb.lenUp * p },
        { dx: 0, dy: cb.lenDown * p },
        { dx: -cb.lenLeft * p, dy: 0 },
        { dx: cb.lenRight * p, dy: 0 }
      ];

      arms.forEach(arm => {
        if (arm.dx === 0 && arm.dy === 0) return;
        this.ctx.beginPath();
        this.ctx.moveTo(cb.cx, cb.cy);
        this.ctx.lineTo(cb.cx + arm.dx, cb.cy + arm.dy);
        this.ctx.strokeStyle = cb.color;
        this.ctx.lineWidth = currentWidth;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = cb.color;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(cb.cx, cb.cy);
        this.ctx.lineTo(cb.cx + arm.dx, cb.cy + arm.dy);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = currentWidth * 0.45;
        this.ctx.stroke();
      });

      this.ctx.restore();
    }

    // 3. Projectiles (Archer Armor-Piercing Arrow)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.age = (p.age || 0) + dt;

      let hit = false;
      if (p.targetY !== undefined) {
        if ((p.vy > 0 && p.y >= p.targetY) || (p.vy < 0 && p.y <= p.targetY)) {
          p.y = p.targetY;
          hit = true;
        }
      }

      if (hit || p.life <= 0) {
        if (p.onEnd) {
          p.onEnd(p.x, p.y);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Trail needles
      if (p.trail && Math.random() < 0.9) {
        this.particles.push({
          x: p.x + (Math.random() * 8 - 4),
          y: p.y + (Math.random() * 8 - 4),
          vx: -p.vx * 0.12 + (Math.random() * 2 - 1),
          vy: -p.vy * 0.12 + (Math.random() * 2 - 1),
          length: Math.random() * 14 + 8,
          width: 3.5,
          angle: Math.atan2(p.vy, p.vx) + Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.2,
          color: p.trailColor,
          alpha: 1,
          decay: 0.05,
          isNeedle: true,
          additive: p.additive
        });
      }

      this.ctx.save();
      if (p.additive) this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = p.glowColor;
      this.ctx.fillStyle = p.headColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Precision tail beam: starts small, expands progressively
      const maxTailFactor = 3.8;
      const tailFactor = Math.min(maxTailFactor, (p.age || 1) * 1.3);

      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x - p.vx * tailFactor, p.y - p.vy * tailFactor);
      this.ctx.strokeStyle = p.trailColor;
      this.ctx.lineWidth = p.radius * 2.0;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x - p.vx * (tailFactor * 0.85), p.y - p.vy * (tailFactor * 0.85));
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = p.radius * 0.9;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 4. Impact Stars (Warrior & Archer hit flashes)
    for (let i = this.impactStars.length - 1; i >= 0; i--) {
      const star = this.impactStars[i];
      star.radius += star.speed * dt;
      star.alpha -= star.decay * dt;
      if (star.alpha <= 0) {
        this.impactStars.splice(i, 1);
        continue;
      }
      this.ctx.save();
      if (star.additive) this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.globalAlpha = Math.max(0, star.alpha);
      this.ctx.translate(star.x, star.y);
      this.ctx.rotate(star.rot || 0);

      this.ctx.beginPath();
      const spikes = star.spikes || 8;
      const outerRadius = star.radius;
      const innerRadius = star.radius * 0.22;
      for (let s = 0; s < spikes * 2; s++) {
        const r = (s % 2 === 0) ? outerRadius : innerRadius;
        const angle = (s * Math.PI) / spikes;
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r;
        if (s === 0) this.ctx.moveTo(sx, sy);
        else this.ctx.lineTo(sx, sy);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = star.color;
      this.ctx.shadowBlur = 24;
      this.ctx.shadowColor = star.color;
      this.ctx.fill();

      this.ctx.scale(0.55, 0.55);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
      this.ctx.restore();
    }

    // 5. 3D Cel-Shaded Tumbling Coins (Merchant Royal Gold Rush)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += c.gravity * dt;
      c.rotX += c.spinSpeed * dt;
      c.rotZ += (c.spinSpeed * 0.5) * dt;

      if (c.attract) {
        c.vx += (c.targetX - c.x) * (0.007 * dt);
        c.vy += (c.targetY - c.y) * (0.009 * dt);
        c.vx *= Math.pow(0.97, dt);
        c.vy *= Math.pow(0.97, dt);
      }

      c.alpha -= c.decay * dt;

      if (c.alpha <= 0 || c.y < -45) {
        this.coins.splice(i, 1);
        continue;
      }

      // Gold dust trail
      if (Math.random() < 0.35) {
        this.particles.push({
          x: c.x,
          y: c.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 2.5 + 1.5,
          color: '#fef08a',
          alpha: 0.9,
          decay: 0.06,
          additive: true
        });
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, c.alpha);
      this.ctx.translate(c.x, c.y);
      this.ctx.rotate(c.rotZ);

      // 3D Tilt calculation via cosine width
      const tiltX = Math.cos(c.rotX);
      const r = c.radius;
      const tiltWidth = Math.max(0.08, Math.abs(tiltX));

      this.ctx.scale(tiltWidth, 1.0);

      // 1. Darker Gold Rim / Edge
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      this.ctx.fillStyle = '#b45309';
      this.ctx.fill();

      // 2. Shiny Gold Face
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      this.ctx.fillStyle = '#facc15';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.fill();

      // 3. Inner Royal Emblem Stamp
      this.ctx.beginPath();
      const slot = r * 0.32;
      this.ctx.rect(-slot / 2, -slot / 2, slot, slot);
      this.ctx.strokeStyle = '#92400e';
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();

      // 4. White Rim Highlight (Flash when face turns)
      if (Math.abs(tiltX) > 0.6) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.82, -Math.PI * 0.7, -Math.PI * 0.2);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // 6. Blade Arcs (Fallback / Legacy Slashes)
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const arc = this.arcs[i];
      arc.progress += arc.speed * dt;
      if (arc.progress >= 1) {
        this.arcs.splice(i, 1);
        continue;
      }
      this.ctx.save();
      const currentLen = arc.length * Math.sin(arc.progress * Math.PI);
      const alpha = Math.sin(arc.progress * Math.PI);
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowBlur = 16;
      this.ctx.shadowColor = arc.glowColor;

      this.ctx.beginPath();
      const startX = arc.cx + Math.cos(arc.angle) * (arc.distance * arc.progress);
      const startY = arc.cy + Math.sin(arc.angle) * (arc.distance * arc.progress);
      const endX = startX + Math.cos(arc.angle) * currentLen;
      const endY = startY + Math.sin(arc.angle) * currentLen;

      const midX = (startX + endX) / 2 + Math.cos(arc.angle + Math.PI / 2) * (currentLen * 0.35);
      const midY = (startY + endY) / 2 + Math.sin(arc.angle + Math.PI / 2) * (currentLen * 0.35);

      this.ctx.moveTo(startX, startY);
      this.ctx.quadraticCurveTo(midX, midY, endX, endY);
      this.ctx.strokeStyle = arc.coreColor;
      this.ctx.lineWidth = arc.thickness;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = arc.thickness * 0.45;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 7. Particles (Rock Shards, Needles, Sparks, Embers)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.gravity) pt.vy += pt.gravity * dt;
      pt.vx *= Math.pow(0.93, dt);
      pt.vy *= Math.pow(0.93, dt);
      pt.alpha -= pt.decay * dt;
      if (pt.angle !== undefined && pt.rotSpeed !== undefined) {
        pt.angle += pt.rotSpeed * dt;
      }

      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      if (pt.additive) this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.globalAlpha = Math.max(0, pt.alpha);
      this.ctx.translate(pt.x, pt.y);
      if (pt.angle) this.ctx.rotate(pt.angle);

      if (pt.isRockShard) {
        const sz = pt.size || 10;
        this.ctx.beginPath();
        this.ctx.moveTo(pt.p1x * sz, pt.p1y * sz);
        this.ctx.lineTo(pt.p2x * sz, pt.p2y * sz);
        this.ctx.lineTo(pt.p3x * sz, pt.p3y * sz);
        this.ctx.closePath();
        this.ctx.fillStyle = pt.color;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = pt.color;
        this.ctx.fill();

        this.ctx.strokeStyle = pt.edgeColor || '#fef08a';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();

      } else if (pt.isNeedle) {
        const len = pt.length || 20;
        const w = pt.width || 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-len / 2, 0);
        this.ctx.lineTo(0, -w / 2);
        this.ctx.lineTo(len / 2, 0);
        this.ctx.lineTo(0, w / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = pt.color;
        this.ctx.shadowBlur = 14;
        this.ctx.shadowColor = pt.color;
        this.ctx.fill();

      } else {
        this.ctx.fillStyle = pt.color;
        if (pt.glow) {
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = pt.color;
        }
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pt.size || 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  // =========================================================================
  // WARRIOR: Cross Breaker (120px Laser Cleave + Earth Rock Shards)
  // =========================================================================
  async playCrossBreaker(heroR, heroC, targetCoords = [], onImpact = null, params = {}) {
    this.resize();
    const heroCenter = this.getCellCenter(heroR, heroC);
    const beamLen = params.beamLen || 120; // Default tuned to 120px
    const beamWidth = params.beamWidth || 14;
    const starSize = params.starSize || 5;
    const shardsCount = params.shardsCount || 18;
    const force = params.force || 9;
    const slashHold = 16;

    // Boundary safety clipping
    const pad = 8;
    const maxDistUp = heroCenter.y - pad;
    const maxDistDown = (this.height - heroCenter.y) - pad;
    const maxDistLeft = heroCenter.x - pad;
    const maxDistRight = (this.width - heroCenter.x) - pad;

    const lenUp = heroR > 0 ? Math.min(beamLen, maxDistUp) : Math.min(20, maxDistUp);
    const lenDown = heroR < 4 ? Math.min(beamLen, maxDistDown) : Math.min(20, maxDistDown);
    const lenLeft = heroC > 0 ? Math.min(beamLen, maxDistLeft) : Math.min(20, maxDistLeft);
    const lenRight = heroC < 4 ? Math.min(beamLen, maxDistRight) : Math.min(20, maxDistRight);

    // 1. Cross Laser Beam
    this.crossBeams.push({
      cx: heroCenter.x,
      cy: heroCenter.y,
      lenUp,
      lenDown,
      lenLeft,
      lenRight,
      width: beamWidth,
      progress: 0,
      speed: 0.15,
      alpha: 1.0,
      decay: 1.0 / slashHold,
      color: '#f59e0b'
    });

    // 2. Central Hero Shockwave
    this.shockwaves.push({
      x: heroCenter.x,
      y: heroCenter.y,
      radius: 12,
      speed: 7.0,
      lineWidth: 5.5,
      color: '#facc15',
      fill: true,
      glow: 22,
      alpha: 1,
      decay: 0.07,
      additive: true
    });

    this.startLoop();
    await new Promise(r => setTimeout(r, 110));

    // 3. Earth Rock Shards on Valid In-Bounds Target Cells
    const earthPalette = ['#8b4513', '#78350f', '#b45309', '#d97706', '#f59e0b', '#fef08a'];
    const validTargets = targetCoords.filter(pos => pos.r >= 0 && pos.r < 5 && pos.c >= 0 && pos.c < 5);

    validTargets.forEach(pos => {
      const cCenter = this.getCellCenter(pos.r, pos.c);

      this.impactStars.push({
        x: cCenter.x,
        y: cCenter.y,
        radius: starSize,
        speed: 3.2,
        alpha: 1,
        decay: 0.07,
        rot: 0,
        spikes: 4,
        color: '#fef08a',
        additive: true
      });

      for (let k = 0; k < shardsCount; k++) {
        const theta = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.7 + 0.3) * force;
        const p1x = Math.cos(0) * (Math.random() * 0.4 + 0.8);
        const p1y = Math.sin(0) * (Math.random() * 0.4 + 0.8);
        const p2x = Math.cos(2.1) * (Math.random() * 0.4 + 0.8);
        const p2y = Math.sin(2.1) * (Math.random() * 0.4 + 0.8);
        const p3x = Math.cos(4.2) * (Math.random() * 0.4 + 0.8);
        const p3y = Math.sin(4.2) * (Math.random() * 0.4 + 0.8);
        const rockColor = earthPalette[k % (earthPalette.length - 1)];

        this.particles.push({
          x: cCenter.x,
          y: cCenter.y,
          vx: Math.cos(theta) * spd,
          vy: Math.sin(theta) * spd,
          gravity: 0.22,
          size: Math.random() * 8 + 5,
          angle: theta,
          rotSpeed: (Math.random() - 0.5) * 0.5,
          p1x, p1y, p2x, p2y, p3x, p3y,
          color: rockColor,
          edgeColor: '#fef08a',
          alpha: 1,
          decay: 0.038,
          isRockShard: true,
          additive: false
        });
      }
    });

    this.startLoop();
    if (onImpact) onImpact();
    await new Promise(r => setTimeout(r, 260));
  }

  // =========================================================================
  // ARCHER: Armor Piercing Arrow (Precision Launch + Apex Hang Time + Impact)
  // =========================================================================
  async playArmorPiercingArrow(heroR, heroC, targetMonsterR, targetMonsterC, onImpact = null, params = {}) {
    this.resize();
    const heroCenter = this.getCellCenter(heroR, heroC);
    const monsterCenter = this.getCellCenter(targetMonsterR, targetMonsterC);

    const launchOffsetY = params.launchOffsetY !== undefined ? params.launchOffsetY : -12;
    const hangTime = params.hangTime || 450;
    const diveSpeed = params.diveSpeed || 45;
    const coreSize = params.core || 16;
    const flashRadius = params.radius || 55;

    const startX = heroCenter.x;
    const startY = heroCenter.y + launchOffsetY;

    // 1. Precision Skyward Shot from Inside Hero Tile
    this.projectiles.push({
      x: startX,
      y: startY,
      vx: 0,
      vy: -26,
      radius: coreSize,
      headColor: '#ffffff',
      trailColor: '#10b981',
      glowColor: '#34d399',
      trail: true,
      life: 14,
      age: 0,
      additive: true
    });

    this.shockwaves.push({
      x: startX,
      y: startY,
      radius: 10,
      speed: 6.0,
      lineWidth: 4.5,
      color: '#34d399',
      glow: 18,
      alpha: 1,
      decay: 0.08,
      additive: true
    });

    this.startLoop();
    await new Promise(r => setTimeout(r, 200));

    // 2. Apex Hang Time (Holding high in sky)
    await new Promise(r => setTimeout(r, hangTime));

    // 3. Falling Meteor with Zero-Latency Collision Trigger
    const hitPromise = new Promise(resolveHit => {
      this.projectiles.push({
        x: monsterCenter.x,
        y: -20,
        vx: 0,
        vy: diveSpeed,
        radius: coreSize * 1.2,
        headColor: '#ffffff',
        trailColor: '#10b981',
        glowColor: '#34d399',
        trail: true,
        life: 35,
        age: 0,
        targetY: monsterCenter.y,
        additive: true,
        onEnd: () => {
          this.impactStars.push({
            x: monsterCenter.x,
            y: monsterCenter.y,
            radius: 14,
            speed: flashRadius / 15,
            alpha: 1,
            decay: 1.0 / 15,
            rot: 0,
            spikes: 8,
            color: '#10b981',
            additive: true
          });

          this.shockwaves.push({
            x: monsterCenter.x,
            y: monsterCenter.y,
            radius: 8,
            speed: 6,
            lineWidth: 9,
            color: '#ffffff',
            fill: true,
            glow: 14,
            alpha: 1,
            decay: 0.05,
            additive: true
          });

          // C-STORY-100: Streamlined to exactly 18 lightweight shards for zero-lag impact explosion
          for (let k = 0; k < 18; k++) {
            const theta = Math.random() * Math.PI * 2;
            const spd = Math.random() * 12 + 3;
            this.particles.push({
              x: monsterCenter.x,
              y: monsterCenter.y,
              vx: Math.cos(theta) * spd,
              vy: Math.sin(theta) * spd,
              gravity: 0.16,
              size: Math.random() * 8 + 4,
              length: Math.random() * 20 + 8,
              width: 3.5,
              angle: theta,
              rotSpeed: (Math.random() - 0.5) * 0.5,
              color: k % 3 === 0 ? '#ffffff' : (k % 3 === 1 ? '#34d399' : '#059669'),
              alpha: 1,
              decay: 0.03,
              isRockShard: true,
              p1x: 1, p1y: 0, p2x: -0.5, p2y: 0.86, p3x: -0.5, p3y: -0.86,
              additive: true
            });
          }

          if (onImpact) onImpact();
          resolveHit();
        }
      });
      this.startLoop();
    });

    await hitPromise;
    await new Promise(r => setTimeout(r, 260));
  }

  // =========================================================================
  // MERCHANT: Golden Emergency (3D Cel-Shaded Tumbling Coins Swarm)
  // =========================================================================
  async playGoldenEmergency(goldCoords = [], onImpact = null, params = {}) {
    this.resize();
    const walletX = this.width / 2;
    const walletY = -35;

    const coinRadius = params.coinRadius || 14;
    const coinsPerTile = params.coinsPerTile || 6;
    const spinSpeed = params.spinSpeed || 0.25;
    const bounceForce = params.bounceForce || 7;

    goldCoords.forEach(pos => {
      const cCenter = this.getCellCenter(pos.r, pos.c);

      this.shockwaves.push({
        x: cCenter.x,
        y: cCenter.y,
        radius: 6,
        speed: 5.0,
        lineWidth: 4.0,
        color: '#facc15',
        glow: 18,
        alpha: 1,
        decay: 0.065,
        fill: true,
        additive: true
      });

      // Spawn 3D Tumbling Cel-Shaded Coins
      for (let k = 0; k < coinsPerTile; k++) {
        const spreadAng = Math.random() * Math.PI * 2;
        const spd = Math.random() * bounceForce + 2;

        this.coins.push({
          x: cCenter.x + (Math.random() * 12 - 6),
          y: cCenter.y + (Math.random() * 12 - 6),
          vx: Math.cos(spreadAng) * spd * 0.6,
          vy: -Math.abs(Math.sin(spreadAng) * spd) - (Math.random() * 3 + 4), // Initial upward pop
          gravity: 0.28,
          radius: coinRadius * (Math.random() * 0.3 + 0.85),
          rotX: Math.random() * Math.PI,
          rotZ: (Math.random() - 0.5) * 0.8,
          spinSpeed: (Math.random() * 0.2 + spinSpeed) * (Math.random() > 0.5 ? 1 : -1),
          alpha: 1.0,
          decay: 0.015,
          targetX: walletX,
          targetY: walletY,
          attract: true
        });
      }
    });

    this.startLoop();

    // After coins gather upwards, trigger model cash-out and wallet impact wave
    await new Promise(r => setTimeout(r, 320));

    // Wallet absorption shockwave
    this.shockwaves.push({
      x: walletX,
      y: 10,
      radius: 12,
      speed: 6.0,
      lineWidth: 5.0,
      color: '#fde047',
      glow: 24,
      alpha: 1,
      decay: 0.07,
      additive: true
    });
    this.startLoop();

    if (onImpact) onImpact();
    await new Promise(r => setTimeout(r, 220));
  }

  // =========================================================================
  // Generic VFX Utility Helpers
  // =========================================================================
  createShockwave(x, y, color = '#f59e0b', maxRadius = 30) {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      speed: 4,
      lineWidth: 3,
      color,
      glow: 12,
      alpha: 1,
      decay: 0.05
    });
    this.startLoop();
  }

  createSparks(x, y, count = 10, color = '#f59e0b') {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        gravity: 0.1,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1,
        decay: 0.04,
        glow: true
      });
    }
    this.startLoop();
  }
}
