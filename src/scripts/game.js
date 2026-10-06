(function (P) {
  'use strict';
  const C = P.CONFIG, F = P.Physics;
  class Game {
    constructor(onEvent = () => {}, random = Math.random) {
      this.onEvent = onEvent; this.random = random; this.state = 'loading';
      this.input = [false, false]; this.paused = false; this.time = 0; this.stage = 0; this.hits = 0; this.balls = C.initialBalls;
      this.flippers = C.flippers.map(f => ({ ...f, angle: f.rest, velocity: 0 }));
      this.effects = []; this.ball = null; this.transition = 0; this.lastHit = -100;
      this.stageShift = null; this.entryOverlap = false; this.cinematicTail = 0;
      this.spawnTimer = 0; this.slowTime = 0; this.upperTime = 0;
      this.motionSamples = []; this.sampleTimer = 0; this.recoveries = 0; this.holdSettling = [null, null];
    }
    ready() { this.state = 'ready'; this.onEvent('ready'); }
    start() {
      if (!['ready', 'clear', 'over'].includes(this.state)) return;
      this.stage = 0; this.hits = 0; this.balls = C.initialBalls; this.state = 'playing'; this.paused = false;
      this.input.fill(false); this.effects = []; this.transition = 0; this.spawnTimer = 0; this.lastHit = -100;
      this.stageShift = null; this.entryOverlap = false; this.cinematicTail = 0;
      this.recoveries = 0;
      this.flippers.forEach(f => { f.angle = f.rest; f.velocity = 0; });
      this.spawn(); this.onEvent('start');
    }
    spawn() {
      this.entryOverlap = false;
      this.ball = { x: C.launch.x, y: C.launch.y, vx: (this.random() - 0.5) * C.launch.horizontalSpread, vy: C.launch.vy, r: C.ballRadius, trail: [] };
      this.slowTime = 0; this.upperTime = 0;
      this.motionSamples = []; this.sampleTimer = 0; this.holdSettling = [null, null];
    }
    hasDeepPenetration() {
      const b = this.ball;
      return C.walls.some(wall => (F.wallContact(b, ...wall)?.depth ?? 0) > 1)
        || (!this.entryOverlap && (F.characterContact(b, C.stages[this.stage])?.depth ?? 0) > 1)
        || this.flippers.some(f => (F.segmentContact(b, f.x, f.y,
          f.x + Math.cos(f.angle) * f.length, f.y + Math.sin(f.angle) * f.length, f.radius)?.depth ?? 0) > 1);
    }
    isHoldSettling() {
      const b = this.ball;
      // Older exported configs may predate the settling-grace settings.
      const settings = C.recovery.hold ??= { graceSeconds: 8, contactSeconds: 0.75, rootRange: 150, maxSpeed: 600 };
      let exempt = false;
      const embedded = this.hasDeepPenetration();
      this.flippers.forEach((f, i) => {
        const eligible = this.input[i] && Math.abs(f.angle - f.active) < 0.01
          && Math.abs(f.velocity) < 0.1 && !embedded
          && Math.hypot(b.vx, b.vy) <= settings.maxSpeed
          && Math.hypot(b.x - f.x, b.y - f.y) <= settings.rootRange
          && b.y < f.y + b.r;
        if (!eligible) { this.holdSettling[i] = null; return; }
        const contact = F.segmentContact({ ...b, r: b.r + 2 }, f.x, f.y,
          f.x + Math.cos(f.angle) * f.length, f.y + Math.sin(f.angle) * f.length, f.radius);
        if (contact && contact.ny < -0.15) {
          if (!this.holdSettling[i]) this.holdSettling[i] = { started: this.time, lastContact: this.time };
          this.holdSettling[i].lastContact = this.time;
        }
        const history = this.holdSettling[i];
        if (history && this.time - history.started < settings.graceSeconds
          && this.time - history.lastContact < settings.contactSeconds) exempt = true;
      });
      return exempt;
    }
    isIntentionalHold() {
      const b = this.ball;
      if (!b || Math.hypot(b.vx, b.vy) > 40) return false;
      // Do not hide unresolved penetration behind the hold exemption.
      if (this.hasDeepPenetration()) return false;
      const contacts = this.flippers.map(f => F.segmentContact({ ...b, r: b.r + 2 },
        f.x, f.y, f.x + Math.cos(f.angle) * f.length, f.y + Math.sin(f.angle) * f.length, f.radius));
      return this.flippers.some((f, i) => this.input[i]
        && Math.abs(f.angle - f.active) < 0.01 && Math.abs(f.velocity) < 0.1
        && contacts[i] && contacts[i].ny < -0.15);
    }
    recoverBall() {
      const b = this.ball;
      // Do not award HIT or an extra BALL. Release on the legal playing side
      // above the root, where neither rotating flipper nor side rail overlaps.
      if (b.y > 1100 && (b.x < 350 || b.x > 674)) {
        // The central drain corridor prevents repeatedly restoring onto a
        // held, uphill-facing flipper. This is exceptional stuck recovery only.
        b.x = (this.flippers[0].x + this.flippers[1].x) / 2; b.y = Math.min(...this.flippers.map(f => f.y)) - 115;
      } else {
        for (let pass = 0; pass < C.recovery.iterations; pass++) {
          for (const wall of C.walls) { const contact = F.wallContact(b, ...wall); if (contact) F.reflect(b, contact, 0); }
          const contact = F.characterContact(b, C.stages[this.stage]);
          if (contact) F.reflect(b, contact, 0);
        }
      }
      b.vx = (512 - b.x) * 0.7; b.vy = C.recovery.releaseSpeed;
      b.trail = []; this.slowTime = 0; this.upperTime = 0;
      this.motionSamples = []; this.sampleTimer = 0; this.holdSettling = [null, null]; this.recoveries++;
    }
    hit(allowProgression = true) {
      if (this.transition > 0 || this.time - this.lastHit < C.hitCooldown) return;
      this.lastHit = this.time; this.hits++;
      // Snapshot this HIT's stage progress so older bursts retain their tier.
      const goal = C.stages[this.stage].hits, tiers = C.hitEffects.tiers.length;
      const progress = goal <= 1 ? 1 : Math.min(1, (this.hits - 1) / (goal - 1));
      const achieved = allowProgression && this.hits >= goal, intermediate = this.stage < C.stages.length - 1;
      // One event snapshot keeps in-flight timing consistent during debug edits.
      const celebration = achieved && intermediate ? JSON.parse(JSON.stringify(C.stageCelebration)) : null;
      const marks = C.hitReaction.enabledMarks.flatMap((enabled, i) => enabled ? [i] : []);
      this.effects.push({ x: this.ball.x, y: this.ball.y, age: 0,
        kind: achieved && intermediate ? 'stage-clear' : 'hit',
        celebration,
        // Cosmetic randomness uses a separate source from the physics RNG.
        reactionMark: marks.length ? marks[Math.floor(Math.random() * marks.length)] : null,
        stage: this.stage, hits: this.hits, tier: Math.min(tiers - 1, Math.floor(progress * tiers)) });
      this.onEvent('hit', this.stage);
      if (achieved) {
        if (intermediate) {
          const s = celebration;
          this.stageShift = { from: this.stage, to: this.stage + 1, age: 0, switched: false, settings: s };
          this.transition = s.slowIn + s.hold + s.fadeOut + s.fadeIn + s.poseHold;
        } else this.transition = C.transitionDelay;
      }
    }
    tick(dt) {
      if (this.paused) return;
      this.time += dt;
      this.effects.forEach(e => e.age += dt);
      this.effects = this.effects.filter(e => e.age < (e.kind === 'stage-clear' ? e.celebration.duration : C.hitEffects.duration));
      if (this.state !== 'playing') return;
      if (this.transition > 0) {
        this.transition = Math.max(0, this.transition - dt);
        if (this.stageShift) {
          const shift = this.stageShift, s = shift.settings;
          shift.age += dt;
          if (!shift.switched && shift.age >= s.slowIn + s.hold + s.fadeOut) {
            shift.switched = true; this.stage = shift.to; this.hits = 0; this.lastHit = -100;
            // Preserve the ball's exact position/velocity during the visual handoff.
            // If the new pose covers it, enable that collider after natural exit
            // instead of teleporting it out or awarding an entry HIT.
            this.entryOverlap = !!this.ball && !!F.characterContact(this.ball, C.stages[this.stage]);
            this.onEvent('stage');
          }
          if (this.transition === 0) {
            this.stageShift = null; this.slowTime = this.upperTime = this.sampleTimer = 0;
            this.cinematicTail = s.slowOut;
            this.cinematicSettings = s;
            this.motionSamples = []; this.holdSettling = [null, null];
          }
          if (shift.age < s.slowIn) dt *= s.slowScale;
          else return;
        } else if (this.transition === 0) {
          this.state = 'clear'; this.ball = null; this.input.fill(false); this.onEvent('clear');
        }
        if (!this.stageShift) return;
      } else if (this.cinematicTail > 0) {
        const s = this.cinematicSettings, remaining = this.cinematicTail;
        this.cinematicTail = Math.max(0, remaining - dt);
        dt *= s.resumeScale + (1 - s.resumeScale) * (1 - remaining / s.slowOut);
      }
      this.flippers.forEach((f, i) => {
        const old = f.angle, target = this.input[i] ? f.active : f.rest;
        f.angle += F.clamp(target - f.angle, -C.flipperSpeed * dt, C.flipperSpeed * dt); f.velocity = (f.angle - old) / dt;
      });
      if (!this.ball) { this.spawnTimer -= dt; if (this.spawnTimer <= 0) this.spawn(); return; }
      const b = this.ball;
      b.vy += C.gravity * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      // Several positional passes resolve rail/flipper contacts together rather
      // than letting the last collision push the ball inside the first collider.
      const resolved = new Set();
      for (let pass = 0; pass < C.recovery.iterations; pass++) {
        for (const wall of C.walls) {
          const contact = F.wallContact(b, ...wall);
          const impact = contact ? -(b.vx * contact.nx + b.vy * contact.ny) : 0;
          if (contact && F.reflect(b, contact, resolved.has(wall) ? 0 : C.restitution)) {
            if (!resolved.has(wall) && impact > 80) this.onEvent('wall', impact,
              { x: b.x - contact.nx * b.r, y: b.y - contact.ny * b.r, nx: contact.nx, ny: contact.ny });
            resolved.add(wall);
          }
        }
        for (const f of this.flippers) {
          const contact = F.segmentContact(b, f.x, f.y, f.x + Math.cos(f.angle) * f.length, f.y + Math.sin(f.angle) * f.length, f.radius);
          if (!contact) continue;
          const surface = F.flipperSurfaceVelocity(f, contact, C.flipperTransfer);
          const impact = -((b.vx - surface.vx) * contact.nx + (b.vy - surface.vy) * contact.ny);
          if (F.reflect(b, contact, resolved.has(f) ? 0 : C.restitution, surface.vx, surface.vy)) {
            if (!resolved.has(f) && impact > 80) this.onEvent('flipper-contact', impact,
              { x: contact.x, y: contact.y, nx: contact.nx, ny: contact.ny });
            resolved.add(f);
          }
        }
      }
      const character = F.characterContact(b, C.stages[this.stage]);
      if (this.entryOverlap && !character) this.entryOverlap = false;
      if (character && !this.entryOverlap) { const bounced = F.reflect(b, character, 0.9); if (bounced) this.hit(); }
      // A normal drain always costs a BALL; recovery must never rescue it.
      if (b.y > C.height + b.r || b.x < -100 || b.x > C.width + 100) {
        this.ball = null; this.balls--; this.onEvent('lost');
        if (this.balls <= 0) { this.state = 'over'; this.input.fill(false); this.transition = 0; this.onEvent('over'); }
        else this.spawnTimer = C.respawnDelay;
        return;
      }
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > C.maxSpeed) { b.vx *= C.maxSpeed / speed; b.vy *= C.maxSpeed / speed; }
      // A supported, settled ball on an intentionally raised flipper is a
      // normal cradle. Clear ALL history so releasing cannot inherit a timeout.
      const holding = this.isIntentionalHold();
      if (holding) this.holdSettling = [null, null];
      if (holding || this.isHoldSettling()) {
        this.slowTime = 0; this.upperTime = 0;
        this.motionSamples = []; this.sampleTimer = 0;
        return;
      }
      this.slowTime = speed < 130 ? this.slowTime + dt : 0;
      this.upperTime = b.y < 820 ? this.upperTime + dt : 0;
      this.sampleTimer += dt;
      if (this.sampleTimer >= C.recovery.sampleInterval) {
        this.sampleTimer = 0; this.motionSamples.push({ x: b.x, y: b.y, time: this.time });
        this.motionSamples = this.motionSamples.filter(s => this.time - s.time <= Math.max(C.recovery.windowSeconds, C.maxUpperSeconds));
      }
      const windowSeconds = b.y < 820 ? Math.max(C.recovery.windowSeconds, C.maxUpperSeconds) : C.recovery.windowSeconds;
      const samples = this.motionSamples.filter(s => this.time - s.time <= windowSeconds);
      const enoughHistory = samples.length >= Math.floor(windowSeconds / C.recovery.sampleInterval) - 1;
      const confined = enoughHistory && Math.max(...samples.map(s => s.x)) - Math.min(...samples.map(s => s.x)) < C.recovery.confinedSpan
        && Math.max(...samples.map(s => s.y)) - Math.min(...samples.map(s => s.y)) < C.recovery.confinedSpan;
      if (this.slowTime > C.stallSeconds || confined) this.recoverBall();
    }
  }
  P.Game = Game;
})(globalThis.Pinball = globalThis.Pinball || {});
