(function (P) {
  'use strict';
  const C = P.CONFIG;
  class Renderer {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.images = {}; this.characterLayers = new Map(); this.glitchLayers = new Map(); this.contactEffects = []; this.ballParticles = new WeakMap(); }
    hardHitAge(game, hit) {
      if (!game.modes.hard || game.state === 'clear') return Infinity;
      const preview = this.hardHitPreview?.stage === game.stage ? game.time - this.hardHitPreview.at : Infinity;
      return Math.min(hit?.age ?? game.time - game.lastHit, preview);
    }
    hardShadowMotion(game, hit) {
      this.hardShadowMotions ??= new WeakMap();
      const preview = this.hardHitPreview?.stage === game.stage ? this.hardHitPreview : null;
      const usePreview = preview && game.time - preview.at < (hit?.age ?? game.time - game.lastHit);
      if (this.hardShadowFallback?.at !== game.lastHit || this.hardShadowFallback?.stage !== game.stage) {
        this.hardShadowFallback = { at: game.lastHit, stage: game.stage };
      }
      const token = usePreview ? preview : (hit ?? this.hardShadowFallback);
      let motion = this.hardShadowMotions.get(token);
      if (!motion) {
        // Keep visual randomness separate from gameplay and fixed during each HIT.
        this.hardShadowSeed ??= globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] || 0x91e10da5;
        const random = () => {
          let seed = this.hardShadowSeed; seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
          this.hardShadowSeed = seed >>> 0; return this.hardShadowSeed / 4294967296;
        };
        motion = { angle: random() * Math.PI * 2, amplitude: 0.65 + random() * 0.35,
          cycles: 0.7 + random() * 0.7, bend: (random() < 0.5 ? -1 : 1) * (0.3 + random() * 0.4) };
        this.hardShadowMotions.set(token, motion);
      }
      if (hit && !usePreview) this.hardShadowMotions.set(this.hardShadowFallback, motion);
      return motion;
    }
    hardHitLayer(game, rect) {
      this.hardHitLayers ??= new Map();
      const image = this.images['stage' + (game.stage + 1)], width = rect[2], height = rect[3];
      let layer = this.hardHitLayers.get(image);
      if (layer?.width === width && layer?.height === height) return layer;
      const make = (color, gray = false) => {
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
        const ctx = canvas.getContext('2d'); if (gray) ctx.filter = 'grayscale(1)';
        ctx.drawImage(image, 0, 0, width, height); ctx.filter = 'none';
        if (color) { ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        return canvas;
      };
      layer = { width, height, shadow: make('#160921'), afterimage: make('#d9a0ee'), gray: make(null, true) };
      this.hardHitLayers.set(image, layer); return layer;
    }
    drawHardHit(game, rect, hit, front = false) {
      const s = C.hardEffects.hit, age = this.hardHitAge(game, hit);
      if (age < 0 || age >= s.duration || !Object.values(s).some(value => value?.enabled)) return;
      const ctx = this.ctx, layer = this.hardHitLayer(game, rect), width = rect[2], height = rect[3], t = age / s.duration;
      ctx.save();
      if (!front) {
        if (s.afterimage.enabled) {
          // Slowly expanding alpha silhouettes sit behind the original face.
          for (let i = 0; i < 3; i++) {
            const p = Math.max(0, t - i * 0.1), expansion = 1 + Math.sin(p * Math.PI / 2) * s.afterimage.spread;
            ctx.save(); ctx.globalAlpha *= s.afterimage.opacity / 3 * Math.sin(Math.PI * t) * (1 - t);
            ctx.scale(expansion, expansion); ctx.drawImage(layer.afterimage, -width / 2, -height / 2, width, height); ctx.restore();
          }
        }
        if (s.shadow.enabled && age > s.shadow.delay) {
          const p = Math.min(1, (age - s.shadow.delay) / Math.max(0.01, s.duration - s.shadow.delay));
          const motion = this.hardShadowMotion(game, hit), envelope = Math.sin(Math.PI * p);
          const along = Math.sin(p * Math.PI * 2 * motion.cycles) * envelope;
          const across = Math.sin(p * Math.PI) * envelope * motion.bend;
          const distance = s.shadow.offset * motion.amplitude;
          ctx.save(); ctx.globalAlpha *= s.shadow.opacity * Math.sin(Math.PI * p);
          ctx.translate((Math.cos(motion.angle) * along - Math.sin(motion.angle) * across) * distance,
            (Math.sin(motion.angle) * along + Math.cos(motion.angle) * across) * distance);
          ctx.drawImage(layer.shadow, -width / 2, -height / 2, width, height); ctx.restore();
        }
      } else {
        if (s.desaturate.enabled && age < s.desaturate.duration) {
          ctx.save(); ctx.globalAlpha *= s.desaturate.strength * Math.sin(Math.PI * age / s.desaturate.duration);
          ctx.drawImage(layer.gray, -width / 2, -height / 2, width, height); ctx.restore();
        }
        if (s.heartWave.enabled) {
          for (let i = 0; i < 2; i++) {
            const p = (t - i * 0.18) / (1 - i * 0.18); if (p < 0 || p > 1) continue;
            const size = s.heartWave.size * (0.2 + Math.sin(p * Math.PI / 2) * 0.8);
            ctx.save(); ctx.translate(0, height * 0.15); ctx.globalAlpha *= s.heartWave.opacity * Math.sin(Math.PI * p) * (1 - p);
            ctx.strokeStyle = '#21102d'; ctx.shadowColor = '#ed81cc'; ctx.shadowBlur = 9; ctx.lineWidth = 4 * (1 - p) + 1;
            ctx.beginPath(); ctx.moveTo(0, size * 0.65);
            ctx.bezierCurveTo(-size * 1.2, -size * 0.1, -size * 0.7, -size, 0, -size * 0.35);
            ctx.bezierCurveTo(size * 0.7, -size, size * 1.2, -size * 0.1, 0, size * 0.65); ctx.stroke(); ctx.restore();
          }
        }
      }
      ctx.restore();
    }
    drawHardGlitch(game, rect, hit) {
      const s = C.hardEffects.glitch;
      const preview = this.glitchPreview?.stage === game.stage ? game.time - this.glitchPreview.at : Infinity;
      const age = Math.min(hit?.age ?? (game.time - game.lastHit), preview);
      if (!game.modes.hard || !s.enabled || age < 0 || age >= s.duration || s.opacity <= 0 || s.offset <= 0) return;
      const image = this.images['stage' + (game.stage + 1)], width = rect[2], height = rect[3];
      let layers = this.glitchLayers.get(image);
      if (!layers || layers.width !== width || layers.height !== height) {
        layers = { width, height, canvases: [0, 1, 2].map(channel => {
          const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, width, height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // Preserve source shading and alpha in cyan, magenta and yellow copies.
          for (let i = 0; i < pixels.data.length; i += 4) {
            const brightness = Math.round(pixels.data[i] * 0.3 + pixels.data[i + 1] * 0.59 + pixels.data[i + 2] * 0.11);
            for (let c = 0; c < 3; c++) pixels.data[i + c] = c === channel ? 0 : brightness;
          }
          ctx.putImageData(pixels, 0, 0);
          return canvas;
        }) };
        this.glitchLayers.set(image, layers);
      }
      // Private visual RNG: HIT directions vary without consuming gameplay RNG.
      this.glitchDirections ??= new WeakMap();
      const hitAge = hit?.age ?? (game.time - game.lastHit);
      if (!hit && this.glitchFallback?.at !== game.lastHit) this.glitchFallback = { at: game.lastHit };
      const token = preview < hitAge ? this.glitchPreview : (hit ?? this.glitchFallback);
      let directions = this.glitchDirections.get(token);
      if (!directions) {
        this.glitchRandomState ??= globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] || 0x6d2b79f5;
        const random = () => {
          let seed = this.glitchRandomState; seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
          this.glitchRandomState = seed >>> 0; return this.glitchRandomState / 4294967296;
        };
        directions = [0, 1, 2].map(() => {
          const angle = (25 + random() * 40) * Math.PI / 180;
          return { angle, sx: random() < 0.5 ? -1 : 1, sy: random() < 0.5 ? -1 : 1 };
        });
        this.glitchDirections.set(token, directions);
      }
      const ctx = this.ctx, frame = Math.floor(age * s.speed), fade = (1 - age / s.duration) ** 1.2;
      ctx.save(); ctx.globalAlpha *= s.opacity * fade;
      for (let color = 0; color < layers.canvases.length; color++) {
        const image = layers.canvases[color], bandHeight = image.height / s.bands;
        for (let band = 0; band < s.bands; band++) {
          const wave = Math.sin(frame * 2.1 + band * 1.7 + color * 2.4);
          const direction = directions[color], distance = s.offset * (0.55 + Math.abs(wave) * 0.45) * fade;
          const dx = Math.cos(direction.angle) * direction.sx * distance;
          const dy = Math.sin(direction.angle) * direction.sy * distance;
          ctx.drawImage(image, 0, band * bandHeight, image.width, bandHeight,
            -width / 2 + dx, -height / 2 + band * height / s.bands + dy, width, height / s.bands);
        }
      }
      ctx.restore();
    }
    addContactEffect(game, kind, speed, contact) {
      // Decorations observe the resolved collision; they never alter the ball.
      if (this.contactEffects.some(e => e.kind === kind && game.time - e.started < 0.06 && Math.hypot(e.x - contact.x, e.y - contact.y) < 45)) return;
      this.contactEffects.push({ ...contact, kind, started: game.time, strength: Math.min(1, speed / C.maxSpeed) });
      if (this.contactEffects.length > 16) this.contactEffects.shift();
    }
    drawBallTrail(ball, time) {
      const ctx = this.ctx, s = C.ballEffects, trail = ball.trail;
      const last = trail[trail.length - 1];
      // Keep the debug path; rim sparkles linger at their fixed birth positions.
      const teleported = last && (Math.hypot(ball.x - last[0], ball.y - last[1]) > 150 || time < last[2]);
      if (teleported) trail.length = 0;
      let state = this.ballParticles.get(ball);
      if (!state || !trail.length) {
        state = { x: ball.x, y: ball.y, at: time, serial: 0, particles: [] };
        this.ballParticles.set(ball, state);
      }
      if (!trail.length || time - trail[trail.length - 1][2] >= 1 / 90) trail.push([ball.x, ball.y, time]);
      while (trail.length && (time - trail[0][2] > s.trailSeconds || trail.length > 32)) trail.shift();
      const dx = ball.x - state.x, dy = ball.y - state.y, distance = Math.hypot(dx, dy);
      const moving = last && Math.hypot(ball.x - last[0], ball.y - last[1]) > 0.25;
      if (moving && time - state.at >= s.trailInterval && distance >= s.trailSpacing) {
        const i = state.serial++, angle = i * 2.399963;
        // Emit along the ball's rim. Decoration never consumes gameplay RNG.
        state.particles.push({ x: ball.x + Math.cos(angle) * ball.r,
          y: ball.y + Math.sin(angle) * ball.r, at: time, angle, size: 3 + i % 3, pink: i % 2 });
        state.x = ball.x; state.y = ball.y; state.at = time;
      }
      state.particles = s.trailSparkles > 0 ? state.particles.filter(p => time - p.at < s.trailSeconds).slice(-s.trailSparkles) : [];
      ctx.save(); ctx.shadowColor = '#ff70b8'; ctx.shadowBlur = 5;
      for (const p of state.particles) {
        const age = time - p.at, life = Math.max(0, 1 - age / s.trailSeconds);
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.rotate(p.angle + age * 0.4);
        const twinkle = 0.75 + Math.sin(age * 28 + p.angle) * 0.25;
        ctx.globalAlpha = life ** 1.3 * s.trailOpacity * twinkle;
        const size = p.size * s.trailSize * (0.6 + life * 0.4); ctx.fillStyle = p.pink ? '#ffd4ea' : '#fff5fc';
        ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.2, -size * 0.2);
        ctx.lineTo(size, 0); ctx.lineTo(size * 0.2, size * 0.2);
        ctx.lineTo(0, size); ctx.lineTo(-size * 0.2, size * 0.2);
        ctx.lineTo(-size, 0); ctx.lineTo(-size * 0.2, -size * 0.2); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
    drawBallSparkle(ball, time) {
      const ctx = this.ctx, s = C.ballEffects;
      const pulse = (Math.sin(time * s.sparkleSpeed) + 1) / 2;
      const size = ball.r * s.sparkleSize * (0.5 + pulse * 0.5);
      // A white twinkling star marks the center above artwork; no circular rim.
      ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(Math.sin(time * 1.8) * 0.2);
      ctx.globalAlpha = s.sparkleOpacity * (0.55 + pulse * 0.45);
      ctx.fillStyle = '#fffaff'; ctx.shadowColor = '#fff0fa'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.17, -size * 0.17);
      ctx.lineTo(size * 0.75, 0); ctx.lineTo(size * 0.17, size * 0.17);
      ctx.lineTo(0, size); ctx.lineTo(-size * 0.17, size * 0.17);
      ctx.lineTo(-size * 0.75, 0); ctx.lineTo(-size * 0.17, -size * 0.17); ctx.closePath(); ctx.fill();
      ctx.globalAlpha *= 0.45;
      ctx.beginPath(); ctx.arc(size * 0.65, -size * 0.65, 1.2 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    drawContactEffects(time) {
      const ctx = this.ctx, s = C.contactEffects;
      this.contactEffects = this.contactEffects.filter(e => time >= e.started && time - e.started < s.duration);
      for (const e of this.contactEffects) {
        const t = (time - e.started) / s.duration, fade = (1 - t) ** 1.2, expansion = 1 - (1 - t) ** 3;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.atan2(e.ny, e.nx));
        ctx.globalAlpha = fade * s.opacity * (0.6 + e.strength * 0.4);
        const radius = 16 + expansion * s.spread * 0.65;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, '#fff5faaa'); glow.addColorStop(0.3, '#ff95cd66'); glow.addColorStop(1, '#ff70b800');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = '#ff77ba'; ctx.shadowBlur = 12;
        ctx.strokeStyle = '#ffe5f4'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 6 + expansion * s.spread * 0.65, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        for (let i = 0; i < s.sparkles; i++) {
          const angle = -1.05 + i * 2.1 / Math.max(1, s.sparkles - 1);
          const distance = 8 + expansion * s.spread * (0.65 + i % 2 * 0.3), size = (1 - t * 0.5) * (5 + i % 3);
          ctx.save(); ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
          ctx.fillStyle = i % 2 ? '#ff99ce' : '#fff2fa';
          ctx.beginPath();
          if (i < 2) {
            ctx.fillStyle = '#ff8cc8'; ctx.rotate(-Math.atan2(e.ny, e.nx)); ctx.moveTo(0, size);
            ctx.bezierCurveTo(-size * 2, -size * 0.3, -size, -size * 1.8, 0, -size * 0.7);
            ctx.bezierCurveTo(size, -size * 1.8, size * 2, -size * 0.3, 0, size);
          } else {
            ctx.moveTo(0, -size); ctx.lineTo(size * 0.25, -size * 0.25); ctx.lineTo(size, 0);
            ctx.lineTo(size * 0.25, size * 0.25); ctx.lineTo(0, size); ctx.lineTo(-size * 0.25, size * 0.25);
            ctx.lineTo(-size, 0); ctx.lineTo(-size * 0.25, -size * 0.25); ctx.closePath();
          }
          ctx.fill(); ctx.restore();
        }
        ctx.restore();
      }
    }
    async load() {
      await Promise.all(Object.entries(C.assets).map(async ([key, path]) => {
        const image = new Image(); image.src = path;
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('素材を読み込めません: ' + path)); });
        this.images[key] = image;
      }));
    }
    characterLayer(image, width, height) {
      const { glow: glowConfig, darkGlow, shadow } = C.characterEffects;
      const signature = JSON.stringify([glowConfig.blur, glowConfig.lowerFade, darkGlow.blur, darkGlow.lowerFade, shadow]);
      const cached = this.characterLayers.get(image);
      if (cached?.width === width && cached?.height === height && cached.signature === signature) return cached;
      // Follow the PNG's alpha silhouette, without changing the source asset.
      // Bake the lower shadow and masked upper/side rim once, rather than filter
      // a large sprite every frame. Keep only the latest size for each image.
      const padding = Math.max(48, Math.ceil(Math.max(glowConfig.blur, darkGlow.blur, shadow.blur) * 3 + shadow.offsetY + 12)), canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width) + padding * 2;
      canvas.height = Math.ceil(height) + padding * 2;
      const ctx = canvas.getContext('2d');
      const source = document.createElement('canvas');
      source.width = canvas.width; source.height = canvas.height;
      const sourceCtx = source.getContext('2d');
      sourceCtx.drawImage(image, padding, padding, width, height);
      ctx.shadowColor = `rgba(24,3,17,${shadow.strength})`;
      ctx.shadowBlur = shadow.blur; ctx.shadowOffsetY = shadow.offsetY;
      ctx.drawImage(image, padding, padding, width, height);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      function bakeGlow(settings, color, rimColor) {
        const glow = document.createElement('canvas');
        glow.width = canvas.width; glow.height = canvas.height;
        const glowCtx = glow.getContext('2d');
        glowCtx.filter = `drop-shadow(0px -4px ${settings.blur}px ${color}) drop-shadow(0px -2px ${settings.blur / 4}px ${rimColor})`;
        glowCtx.drawImage(source, 0, 0); glowCtx.filter = 'none';
        // Keep just the halo, then fade it out toward the board-facing lower
        // silhouette. Never fade the character itself or its grounding shadow.
        glowCtx.globalCompositeOperation = 'destination-out';
        glowCtx.drawImage(source, 0, 0);
        const mask = glowCtx.createLinearGradient(0, padding, 0, padding + height);
        mask.addColorStop(0, '#fff'); mask.addColorStop(settings.lowerFade * 0.4 / 0.82, '#fff');
        mask.addColorStop(settings.lowerFade * 0.65 / 0.82, 'rgba(255,255,255,0.25)');
        mask.addColorStop(settings.lowerFade, 'rgba(255,255,255,0)');
        mask.addColorStop(1, 'rgba(255,255,255,0)');
        glowCtx.globalCompositeOperation = 'destination-in';
        glowCtx.fillStyle = mask; glowCtx.fillRect(0, 0, glow.width, glow.height);
        return glow;
      }
      const glow = bakeGlow(glowConfig, 'rgba(255,64,164,0.65)', 'rgba(255,207,237,0.8)');
      const blackGlow = bakeGlow(darkGlow, 'rgba(5,0,12,0.9)', 'rgba(0,0,0,0.9)');
      // Anchor sparkles to the actual silhouette, rather than the rectangular
      // sprite bounds. Sample once when baking the image, never every frame.
      const pixels = sourceCtx.getImageData(0, 0, canvas.width, canvas.height).data;
      const sparkles = [];
      // Keep the initial sixteen anchors in their original order so existing
      // heart placements stay unchanged when more sparkles are enabled.
      for (const fraction of [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.13, 0.23, 0.33, 0.43, 0.53, 0.63, 0.73, 0.83]) {
        const row = padding + Math.floor(height * fraction);
        let left = padding, right = padding + Math.ceil(width) - 1;
        const opaque = x => pixels[(row * canvas.width + x) * 4 + 3] > 160;
        while (left <= right && !opaque(left)) left++;
        while (right >= left && !opaque(right)) right--;
        if (left <= right) {
          sparkles.push([left - padding - width / 2 - 9, height * fraction - height / 2]);
          sparkles.push([right - padding - width / 2 + 9, height * fraction - height / 2]);
        }
      }
      const layer = { canvas, glow, blackGlow, width, height, padding, sparkles, signature };
      this.characterLayers.set(image, layer);
      return layer;
    }
    drawCharacterSparkles(layer, time) {
      const ctx = this.ctx, settings = C.characterEffects.sparkles;
      ctx.save(); ctx.fillStyle = '#fff2fc'; ctx.shadowColor = '#ff65bc';
      const opacity = ctx.globalAlpha;
      ctx.shadowBlur = 12;
      layer.sparkles.slice(0, settings.count).forEach(([x, y], i) => {
        const pulse = (Math.sin(time * settings.speed + i * 2.1) + 1) / 2;
        const size = settings.size * (0.3 + pulse * 0.7);
        ctx.globalAlpha = opacity * settings.opacity * (0.25 + pulse * 0.65) / 0.9;
        ctx.save(); ctx.translate(x, y + Math.sin(time * 1.5 + i) * 3);
        ctx.rotate(Math.sin(time + i) * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.22, -size * 0.22);
        ctx.lineTo(size * 0.7, 0); ctx.lineTo(size * 0.22, size * 0.22);
        ctx.lineTo(0, size); ctx.lineTo(-size * 0.22, size * 0.22);
        ctx.lineTo(-size * 0.7, 0); ctx.lineTo(-size * 0.22, -size * 0.22);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha *= 0.55;
        ctx.beginPath(); ctx.arc(size + 5, -size - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }
    drawCharacterCharms(layer, time) {
      const ctx = this.ctx, { hearts, devils } = C.characterEffects;
      // A few drifting hearts outside the silhouette; no particle state or
      // randomness is shared with gameplay. Shapes avoid platform emoji fonts.
      for (let i = 0; i < hearts.count; i++) {
        const index = (2 + i * 5) % layer.sparkles.length;
        const anchor = layer.sparkles[index]; if (!anchor) continue;
        const phase = (time / hearts.period + i / hearts.count) % 1;
        const side = index % 2 ? 1 : -1;
        ctx.save();
        ctx.translate(anchor[0] + side * (18 + Math.sin(time + i) * 5), anchor[1] - phase * hearts.rise);
        ctx.rotate(Math.sin(time * 0.8 + i) * 0.2);
        ctx.scale(hearts.size, hearts.size);
        ctx.globalAlpha *= Math.sin(phase * Math.PI) * hearts.opacity;
        ctx.fillStyle = '#ff68b6'; ctx.shadowColor = '#ff3294'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(0, 10);
        ctx.bezierCurveTo(-22, -3, -11, -18, 0, -7);
        ctx.bezierCurveTo(11, -18, 22, -3, 0, 10);
        ctx.fill(); ctx.restore();
      }
      const duration = Math.min(devils.duration, devils.period);
      for (let i = 0; i < devils.count; i++) {
        const phase = (time + layer.width * 0.01 + i * devils.period / devils.count) % devils.period;
        const index = (1 + i * 6) % layer.sparkles.length;
        const anchor = layer.sparkles[index];
        if (!anchor || phase >= duration) continue;
        ctx.save(); ctx.translate(anchor[0] + 27, anchor[1] - phase / duration * 27);
        ctx.rotate(Math.sin(time) * 0.12);
        ctx.scale(devils.size, devils.size);
        ctx.globalAlpha *= Math.sin(phase / duration * Math.PI) * devils.opacity;
        ctx.fillStyle = '#b879ee'; ctx.shadowColor = '#9940dc'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-12, -18); ctx.lineTo(-2, -11);
        ctx.moveTo(10, -5); ctx.lineTo(12, -18); ctx.lineTo(2, -11); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#502169'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-3, -1);
        ctx.moveTo(7, -3); ctx.lineTo(3, -1); ctx.moveTo(-5, 4);
        ctx.quadraticCurveTo(0, 9, 5, 4); ctx.stroke(); ctx.restore();
      }
    }
    drawHitReaction(game, rect, scale) {
      const settings = C.hitReaction;
      const hit = [...game.effects].reverse().find(e => e.stage === game.stage);
      if (!hit || hit.reactionMark == null || hit.age >= settings.duration) return;
      const ctx = this.ctx, t = hit.age / settings.duration;
      const anchor = settings.anchors[game.stage], size = settings.size / scale;
      ctx.save();
      ctx.translate((anchor[0] - 0.5) * rect[2], (anchor[1] - 0.5) * rect[3] - t * 18 / scale);
      const pop = Math.min(1, t / 0.13) * (1 + 0.16 * Math.sin(Math.min(1, t / 0.3) * Math.PI));
      const stageSize = settings.stageScales?.[game.stage] ?? 1;
      ctx.scale(pop * stageSize, pop * stageSize); ctx.rotate(-0.13 + Math.sin(t * 12) * 0.05);
      ctx.globalAlpha *= Math.min(1, (1 - t) / 0.3);
      ctx.shadowColor = '#ff96ce'; ctx.shadowBlur = 10 / scale;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (hit.reactionMark === 2) {
        // Mirrored scallops form a single comic mark, opening toward the face
        // on the left of the per-stage anchor.
        ctx.beginPath();
        ctx.moveTo(-size * 0.08, -size * 0.48);
        ctx.quadraticCurveTo(-size * 0.12, -size * 0.2, size * 0.26, -size * 0.3);
        ctx.quadraticCurveTo(size * 0.08, 0, size * 0.4, 0);
        ctx.quadraticCurveTo(size * 0.08, 0, size * 0.26, size * 0.3);
        ctx.quadraticCurveTo(-size * 0.12, size * 0.2, -size * 0.08, size * 0.48);
        ctx.strokeStyle = '#fff5e5'; ctx.lineWidth = 8 / scale; ctx.stroke();
        ctx.strokeStyle = '#f5c65e'; ctx.lineWidth = 4 / scale; ctx.stroke();
      } else if (hit.reactionMark === 3) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = -0.65 + i * 0.65;
          ctx.moveTo(Math.cos(angle) * size * 0.18, Math.sin(angle) * size * 0.18);
          ctx.lineTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
        }
        ctx.strokeStyle = '#fff4fb'; ctx.lineWidth = 8 / scale; ctx.stroke();
        ctx.strokeStyle = '#ff9ccc'; ctx.lineWidth = 4 / scale; ctx.stroke();
      } else if (hit.reactionMark === 4) {
        ctx.translate(0, t * 20 / scale); ctx.rotate(0.25);
        ctx.shadowColor = '#94dfff';
        ctx.beginPath(); ctx.moveTo(0, -size * 0.48);
        ctx.bezierCurveTo(-size * 0.12, -size * 0.2, -size * 0.38, size * 0.02, -size * 0.3, size * 0.23);
        ctx.bezierCurveTo(-size * 0.16, size * 0.57, size * 0.27, size * 0.49, size * 0.3, size * 0.19);
        ctx.bezierCurveTo(size * 0.32, -size * 0.04, size * 0.1, -size * 0.26, 0, -size * 0.48);
        const water = ctx.createLinearGradient(-size * 0.3, 0, size * 0.3, size * 0.4);
        water.addColorStop(0, '#dff8ff'); water.addColorStop(1, '#6ac5f0');
        ctx.fillStyle = water; ctx.strokeStyle = '#f3fcff'; ctx.lineWidth = 3 / scale;
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-size * 0.11, size * 0.11, size * 0.04, size * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
      } else if (hit.reactionMark === 5) {
        // Three parallel blush strokes: font-independent and gently pink.
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * size * 0.25;
          ctx.moveTo(x - size * 0.12, size * 0.32);
          ctx.lineTo(x + size * 0.12, -size * 0.32);
        }
        ctx.strokeStyle = '#fff1f8'; ctx.lineWidth = 7 / scale; ctx.stroke();
        ctx.strokeStyle = '#ff82ba'; ctx.lineWidth = 3.5 / scale; ctx.stroke();
      } else {
        ctx.font = `bold ${size}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#fff4fb'; ctx.lineWidth = 4 / scale;
        ctx.fillStyle = hit.reactionMark === 1 ? '#ff72b7' : '#ffe4aa';
        const text = hit.reactionMark === 1 ? '❤' : '！';
        ctx.strokeText(text, 0, 0); ctx.fillText(text, 0, 0);
      }
      ctx.restore();
    }
    drawHitBurst(effect) {
      const ctx = this.ctx, settings = C.hitEffects;
      const celebration = effect.kind === 'stage-clear';
      const tier = celebration ? effect.celebration.burst : settings.tiers[effect.tier];
      const t = effect.age / (celebration ? effect.celebration.duration : settings.duration);
      const fade = Math.pow(1 - t, 1.5), expansion = 1 - Math.pow(1 - t, 3);
      ctx.save(); ctx.translate(effect.x, effect.y);
      // Local, translucent light: no full-screen flash or opaque character mask.
      const radius = 28 + expansion * tier.spread * 0.65;
      const light = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      light.addColorStop(0, `rgba(255,226,245,${fade * tier.glow * 0.5})`);
      light.addColorStop(0.35, `rgba(255,92,173,${fade * tier.glow * 0.3})`);
      light.addColorStop(1, 'rgba(255,92,173,0)');
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd5ed'; ctx.lineWidth = 2;
      for (let i = 0; i < tier.rings; i++) {
        const phase = Math.max(0, t - i * 0.09);
        if (!phase) continue;
        ctx.globalAlpha = fade * 0.55;
        ctx.beginPath(); ctx.arc(0, 0, 12 + (1 - Math.pow(1 - phase, 3)) * tier.spread * (0.7 + i * 0.12), 0, Math.PI * 2); ctx.stroke();
      }
      // Deterministic decorative variation; never consume the physics RNG.
      const particles = tier.hearts + tier.sparkles;
      for (let i = 0; i < particles; i++) {
        const heart = i < tier.hearts;
        const angle = i * 2.399963 + effect.hits * 0.7;
        const distance = (18 + expansion * tier.spread) * (0.48 + (i * 17 % 23) / 44);
        const size = (heart ? 10 + effect.tier * 2 : 5 + effect.tier) * (0.75 + (i % 4) * 0.15) * (1 - t * 0.45);
        ctx.save(); ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.75 - t * t * 28);
        ctx.rotate(angle * 0.3 + t * (i % 2 ? 0.6 : -0.6));
        ctx.globalAlpha = fade * (heart ? 0.85 : 0.95);
        ctx.fillStyle = heart ? (i % 3 ? '#ff72bb' : '#ffb4d9') : '#fff5fd';
        ctx.shadowColor = '#ff56b0'; ctx.shadowBlur = heart ? 8 : 12;
        ctx.beginPath();
        if (heart) {
          ctx.moveTo(0, size);
          ctx.bezierCurveTo(-size * 2, -size * 0.3, -size, -size * 1.8, 0, -size * 0.7);
          ctx.bezierCurveTo(size, -size * 1.8, size * 2, -size * 0.3, 0, size);
        } else {
          ctx.moveTo(0, -size); ctx.lineTo(size * 0.22, -size * 0.22);
          ctx.lineTo(size, 0); ctx.lineTo(size * 0.22, size * 0.22);
          ctx.lineTo(0, size); ctx.lineTo(-size * 0.22, size * 0.22);
          ctx.lineTo(-size, 0); ctx.lineTo(-size * 0.22, -size * 0.22); ctx.closePath();
        }
        ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
    drawStageCinematic(effect) {
      const ctx = this.ctx, s = effect.celebration, age = effect.age;
      if (age >= s.screenDuration) return;
      const p = age / s.screenDuration, fade = Math.sin(Math.PI * p);
      const flash = Math.exp(-Math.pow((age - 0.1) / 0.07, 2)) * s.flash;
      ctx.save();
      // A single broad pink-white explosion, followed by light rays and confetti.
      const light = ctx.createRadialGradient(effect.x, effect.y, 10, effect.x, effect.y, 1550);
      light.addColorStop(0, `rgba(255,244,253,${flash})`);
      light.addColorStop(0.35, `rgba(255,106,190,${flash * 0.8})`);
      light.addColorStop(1, `rgba(137,34,130,${flash * 0.5})`);
      ctx.fillStyle = light; ctx.fillRect(0, 0, C.width, C.height);
      ctx.save(); ctx.translate(effect.x, effect.y); ctx.rotate(age * 0.25);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6, length = 150 + p * 1700;
        ctx.fillStyle = i % 2 ? '#ffc9ec' : '#fff6fd'; ctx.globalAlpha = fade * 0.16 * (1 - p);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.035) * length, Math.sin(a - 0.035) * length);
        ctx.lineTo(Math.cos(a + 0.035) * length, Math.sin(a + 0.035) * length); ctx.closePath(); ctx.fill();
      } ctx.restore();
      for (let i = 0; i < s.screenParticles; i++) {
        const x = (i * 233 + effect.stage * 71) % C.width;
        const y = 270 + (i * 149) % 1080 - p * (80 + i % 5 * 30);
        const size = 8 + i % 4 * 4;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(i + age * 2) * 0.3);
        ctx.globalAlpha = fade * 0.85; ctx.fillStyle = i % 3 ? '#ff81c6' : '#fff2fc';
        ctx.shadowColor = '#ff299d'; ctx.shadowBlur = 12; ctx.beginPath();
        if (i % 3) {
          ctx.moveTo(0, size); ctx.bezierCurveTo(-size * 2, -size * 0.3, -size, -size * 1.8, 0, -size * 0.7);
          ctx.bezierCurveTo(size, -size * 1.8, size * 2, -size * 0.3, 0, size);
        } else {
          ctx.moveTo(0, -size); ctx.lineTo(size * 0.2, -size * 0.2); ctx.lineTo(size, 0); ctx.lineTo(size * 0.2, size * 0.2);
          ctx.lineTo(0, size); ctx.lineTo(-size * 0.2, size * 0.2); ctx.lineTo(-size, 0); ctx.lineTo(-size * 0.2, -size * 0.2); ctx.closePath();
        } ctx.fill(); ctx.restore();
      }
      // Diagonal cut-in is a transient layer; original artwork and layout stay intact.
      const cutIn = s.cutIn;
      const cut = Math.max(0, Math.min(1, (age - cutIn.start) / cutIn.fadeIn, (cutIn.end - age) / cutIn.fadeOut));
      if (cut > 0) {
        ctx.save(); ctx.globalAlpha = cut; ctx.translate((1 - cut) * -C.width, 0);
        const y = 655, height = 260;
        ctx.beginPath(); ctx.moveTo(0, y + 75); ctx.lineTo(C.width, y - 75);
        ctx.lineTo(C.width, y + height - 75); ctx.lineTo(0, y + height + 75); ctx.closePath(); ctx.clip();
        const band = ctx.createLinearGradient(0, y, C.width, y + height);
        band.addColorStop(0, '#7a174d'); band.addColorStop(0.5, '#ef60ab'); band.addColorStop(1, '#351134');
        ctx.fillStyle = band; ctx.fillRect(0, y - 100, C.width, height + 200);
        const nextStage = effect.stage + 1;
        const image = this.images['stage' + (nextStage + 1)];
        // Read live framing so the debug preview responds immediately; event timing stays snapshotted.
        const portrait = C.stageCelebration.cutIn.portraits[nextStage];
        const width = 490 * portrait.scale, h = width * image.height / image.width;
        ctx.shadowColor = '#ffd2ef'; ctx.shadowBlur = 24;
        ctx.drawImage(image, 0, 0, image.width, image.height,
          portrait.x, portrait.y, width, h);
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff5fd'; ctx.shadowColor = '#ff37a3'; ctx.shadowBlur = 20;
        ctx.font = 'bold 25px Georgia'; ctx.fillText('NEXT STAGE', 665, y + 42);
        ctx.font = 'bold 61px Georgia'; ctx.fillText('STAGE ' + (effect.stage + 2), 665, y + 118);
        ctx.font = '27px Georgia'; ctx.fillText('♥  NEXT HEART  ♥', 665, y + 169);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = cut * 0.9; ctx.strokeStyle = '#ffe0f3'; ctx.shadowColor = '#ff49a8'; ctx.shadowBlur = 18; ctx.lineWidth = 5;
        for (const offset of [0, height]) { ctx.beginPath(); ctx.moveTo(0, y + 75 + offset); ctx.lineTo(C.width, y - 75 + offset); ctx.stroke(); } ctx.restore();
      }
      // A luminous diagonal wipe masks the exact pose handover.
      const switchTime = s.slowIn + s.hold + s.fadeOut;
      const wipe = (age - switchTime + 0.12) / 0.24;
      if (wipe >= 0 && wipe <= 1) {
        const x = -400 + wipe * (C.width + 800);
        ctx.save(); ctx.globalAlpha = Math.sin(wipe * Math.PI) * 0.7;
        const beam = ctx.createLinearGradient(x - 180, 0, x + 180, 0);
        beam.addColorStop(0, 'rgba(255,80,172,0)'); beam.addColorStop(0.5, '#fff2fc'); beam.addColorStop(1, 'rgba(255,80,172,0)');
        ctx.fillStyle = beam; ctx.transform(1, 0, -0.2, 1, 150, 0); ctx.fillRect(x - 180, 0, 360, C.height); ctx.restore();
      }
      ctx.restore();
    }
    draw(game) {
      const ctx = this.ctx, images = this.images;
      ctx.clearRect(0, 0, C.width, C.height); if (!images.board) return;
      ctx.drawImage(images.board, 0, 0, C.width, C.height);
      for (const f of game.flippers) {
        const [px, py] = f.sourcePivot, [tx, ty] = f.sourceTip;
        const sourceAngle = Math.atan2(ty - py, tx - px), scale = f.length / Math.hypot(tx - px, ty - py);
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle - sourceAngle); ctx.scale(scale, scale);
        ctx.drawImage(images[f.image], -px, -py); ctx.restore();
      }
      if (game.ball) {
        const b = game.ball;
        ctx.save(); ctx.shadowColor = '#ffb9e0'; ctx.shadowBlur = 16;
        ctx.drawImage(images.ball, 70, 37, 1129, 1115, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); ctx.restore();
      }
      const stage = C.stages[game.stage];
      if (game.state !== 'clear') this.clearTransition = null;
      const clearAge = this.clearTransition ? Math.max(0, game.time - this.clearTransition.started) : Infinity;
      const smooth = value => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };
      const showClearArt = game.state === 'clear' && clearAge >= (this.clearTransition?.switchAt ?? 0);
      if (game.state === 'clear' && !showClearArt) {
        const [x, y, width, height] = stage.rect, scale = stage.scale ?? 1;
        ctx.save();
        ctx.translate(x + width * scale / 2, y + height * scale / 2);
        ctx.rotate(stage.rotation ?? 0); ctx.scale(scale, scale);
        ctx.drawImage(images['stage' + (game.stage + 1)], -width / 2, -height / 2, width, height); ctx.restore();
      }
      const hardClear = (game.clearPreview ?? (game.modes.hard ? 'hard' : 'normal')) === 'hard';
      const clearArt = hardClear ? C.hardClearArt : C.clearArt;
      const rect = game.state === 'clear' ? clearArt.rect : stage.rect;
      const scale = game.state === 'clear' ? clearArt.scale : (stage.scale ?? 1);
      const reaction = Math.max(0, 1 - (game.time - game.lastHit) / 0.28);
      ctx.save(); ctx.translate(rect[0] + rect[2] * scale / 2, rect[1] + rect[3] * scale / 2);
      if (game.stageShift) {
        const shift = game.stageShift, s = shift.settings;
        const alpha = shift.switched ? (shift.age - s.slowIn - s.hold - s.fadeOut) / s.fadeIn
          : 1 - Math.max(0, shift.age - s.slowIn - s.hold) / s.fadeOut;
        const a = Math.max(0, Math.min(1, alpha));
        ctx.globalAlpha = a * a * (3 - 2 * a);
      }
      ctx.rotate((game.state === 'clear' ? 0 : (stage.rotation ?? 0)) + Math.sin(reaction * 18) * reaction * 0.018); ctx.scale(scale * (1 - reaction * 0.018), scale * (1 - reaction * 0.018));
      if (game.state === 'clear') {
        if (showClearArt) ctx.drawImage(hardClear ? images.hardClear : images.clear, -rect[2] / 2, -rect[3] / 2, rect[2], rect[3]);
      } else {
        const layer = this.characterLayer(images['stage' + (game.stage + 1)], rect[2], rect[3]);
        ctx.save();
        const darkGlow = C.characterEffects.darkGlow;
        ctx.globalAlpha *= darkGlow.strength * (1 - darkGlow.pulseDepth + darkGlow.pulseDepth * (Math.sin(game.time * darkGlow.speed) + 1) / 2);
        ctx.drawImage(layer.blackGlow, -rect[2] / 2 - layer.padding, -rect[3] / 2 - layer.padding);
        ctx.restore();
        ctx.save();
        const glow = C.characterEffects.glow;
        ctx.globalAlpha *= glow.strength * (1 - glow.pulseDepth + glow.pulseDepth * (Math.sin(game.time * glow.speed) + 1) / 2);
        ctx.drawImage(layer.glow, -rect[2] / 2 - layer.padding, -rect[3] / 2 - layer.padding);
        ctx.restore();
        const hit = [...game.effects].reverse().find(e => e.stage === game.stage);
        this.drawHardHit(game, rect, hit);
        this.drawHardGlitch(game, rect, hit);
        // The original face stays crisp over the displaced CMY copies.
        ctx.drawImage(layer.canvas, -rect[2] / 2 - layer.padding, -rect[3] / 2 - layer.padding);
        this.drawHardHit(game, rect, hit, true);
        if (hit) {
          ctx.save();
          ctx.globalAlpha *= Math.max(0, 1 - hit.age / 0.38) * (hit.kind === 'stage-clear' ? hit.celebration.burst.glow : C.hitEffects.tiers[hit.tier].glow);
          ctx.drawImage(layer.glow, -rect[2] / 2 - layer.padding, -rect[3] / 2 - layer.padding);
          ctx.restore();
        }
        this.drawCharacterSparkles(layer, game.time);
        this.drawCharacterCharms(layer, game.time);
        this.drawHitReaction(game, rect, scale);
      }
      ctx.restore();
      this.drawContactEffects(game.time);
      game.effects.forEach(e => this.drawHitBurst(e));
      game.effects.filter(e => e.kind === 'stage-clear').forEach(e => this.drawStageCinematic(e));
      // Keep the frozen/overlapped ball visible while poses hand over around it.
      if (game.ball && (game.stageShift || game.entryOverlap)) {
        const b = game.ball;
        ctx.drawImage(images.ball, 70, 37, 1129, 1115, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      // Keep both position markers above character artwork, including cut-ins
      // and the ball image drawn again during a stage handover.
      if (game.ball) {
        this.drawBallTrail(game.ball, game.time);
        this.drawBallSparkle(game.ball, game.time);
      }
      // Cover the entire board before swapping poses. A single game-clock flash
      // keeps the opaque peak aligned with the swap, even after a hidden tab.
      this.clearFlash = game.state === 'clear' && clearAge < (this.clearTransition?.duration ?? 0)
        ? (clearAge < 0.28 ? smooth(clearAge / 0.28) : clearAge <= 0.46 ? 1 : 1 - smooth((clearAge - 0.46) / 0.59)) : 0;
      if (this.clearFlash > 0) {
        ctx.save(); ctx.globalAlpha = this.clearFlash;
        const light = ctx.createLinearGradient(0, 0, C.width, C.height);
        light.addColorStop(0, '#ffe4f3'); light.addColorStop(0.5, '#fffaff'); light.addColorStop(1, '#fff0fa');
        ctx.fillStyle = light; ctx.fillRect(0, 0, C.width, C.height); ctx.restore();
      }
    }
  }
  P.Renderer = Renderer;
})(globalThis.Pinball = globalThis.Pinball || {});
