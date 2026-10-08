(function (P) {
  'use strict';
  P.setupBonus = function (app, ui) {
    const g = app.game, storageKey = 'heartbound-pinball-bonus-unlocked-v1', hardStorageKey = 'heartbound-pinball-hard-cleared-v1';
    let unlocked = false, hardCleared = false;
    try { unlocked = localStorage.getItem(storageKey) === '1'; hardCleared = localStorage.getItem(hardStorageKey) === '1'; unlocked ||= hardCleared; } catch (_) { /* Session-only when storage is unavailable. */ }
    const commands = document.createElement('span'); commands.id = 'bonus-commands'; commands.hidden = true;
    commands.setAttribute('role', 'group'); commands.setAttribute('aria-label', 'クリア特典モード');
    const buttons = {};
    for (const [key, label] of [['i','無限BALL'],['f','ステージ固定'],['s','ステージ選択'],['h','ハードモード（再押下で通常モードを開始）']]) {
      const b = document.createElement('button'); b.id = 'bonus-' + key; b.type = 'button'; b.textContent = key.toUpperCase();
      b.title = label; b.setAttribute('aria-label', label); commands.append(b); buttons[key] = b;
    }
    document.querySelector('.hud-right').append(commands);
    const atmosphere = document.createElement('div'); atmosphere.className = 'hard-atmosphere'; atmosphere.setAttribute('aria-hidden', 'true');
    document.getElementById('table').append(atmosphere);
    let atmosphereSignature;
    function applyAtmosphere() {
      const s = P.CONFIG.hardEffects, signature = JSON.stringify(s);
      if (signature === atmosphereSignature) return;
      atmosphereSignature = signature;
      atmosphere.style.background = `linear-gradient(135deg,hsla(${s.tintHue - 25},75%,65%,${s.tintOpacity}),hsla(${s.tintHue + 15},80%,65%,${s.tintOpacity}))`;
      atmosphere.style.setProperty('--heart-opacity', s.heartOpacity);
      atmosphere.style.setProperty('--heart-period', s.heartPeriod + 's');
      atmosphere.style.setProperty('--heart-edge', s.heartEdge + '%');
      atmosphere.replaceChildren();
      // Hearts stay beside the rails; they never cross the playable center.
      for (let i = 0; i < s.heartCount; i++) {
      const heart = document.createElement('span'); heart.textContent = '♥';
      const jitterX = Math.sin(i * 4.17 + 0.8) * s.heartScatterX;
      const jitterY = Math.sin(i * 2.73 + 1.2) * s.heartScatterY;
      heart.style.setProperty('--heart-y', (12 + Math.floor(i / 2) * 72 / Math.max(1, Math.ceil(s.heartCount / 2) - 1) + jitterY) + '%');
      heart.style.setProperty('--heart-edge', (s.heartEdge + jitterX) + '%');
      heart.style.setProperty('--heart-tilt', (Math.sin(i * 3.91 + 0.6) * s.heartTilt) + 'deg');
      heart.style.setProperty('--heart-delay', (-i * 0.43) + 's');
      heart.style.setProperty('--heart-size', (s.heartSize * (i % 3 === 0 ? 1 : 0.75)) + 'px');
      heart.className = i % 2 ? 'rim-right' : 'rim-left'; atmosphere.append(heart);
      }
    }
    const futureMode = document.createElement('button'); futureMode.id = 'bonus-m'; futureMode.type = 'button'; futureMode.textContent = 'M';
    futureMode.title = 'Mモード：自由にチューニング'; futureMode.setAttribute('aria-label', futureMode.title); commands.append(futureMode);
    const mMode = P.setupMMode(app, ui, refresh);
    futureMode.addEventListener('click', () => run('m'));
    function revealIcons(icons) {
      icons.forEach((button, index) => {
        button.style.setProperty('--unlock-delay', (1.4 + index * 0.12).toFixed(2) + 's');
        button.classList.add('unlock-reveal');
      });
    }
    for (const button of [...Object.values(buttons), futureMode]) {
      button.addEventListener('animationend', e => { if (e.animationName === 'bonus-unlock') button.classList.remove('unlock-reveal'); });
    }
    const dialog = document.createElement('dialog'); dialog.id = 'stage-select-dialog'; dialog.className = 'credits-dialog stage-select-dialog';
    dialog.setAttribute('aria-labelledby', 'stage-select-title');
    dialog.innerHTML = '<h2 id="stage-select-title">STAGE SELECT</h2><div class="stage-select-buttons"></div><button id="stage-select-close" type="button">CLOSE</button><p class="hint">S / ESC で閉じる</p>';
    document.body.append(dialog);
    function refresh() {
      if (g.state !== 'clear') for (const button of [...Object.values(buttons), futureMode]) button.classList.remove('unlock-reveal');
      commands.hidden = !unlocked;
      document.getElementById('table').classList.toggle('is-hard', g.modes.hard);
      app.sound.setHard(g.modes.hard);
      applyAtmosphere();
      futureMode.hidden = !hardCleared;
      futureMode.disabled = !hardCleared;
      futureMode.classList.toggle('mode-active', mMode.isOpen);
      futureMode.setAttribute('aria-pressed', String(mMode.isOpen));
      for (const [key, active] of [['i',g.modes.infinite],['f',g.modes.freeze],['s',dialog.open],['h',g.modes.hard]]) {
        buttons[key].classList.toggle('mode-active', active);
        buttons[key].setAttribute('aria-pressed', String(active));
        buttons[key].disabled = g.modes.hard && !['f', 'h'].includes(key);
      }
    }
    function close() { if (dialog.open) dialog.close(); refresh(); ui.resetClock(); }
    function selectStage(stage) {
      close(); ui.releaseInput();
      g.state = 'ready'; g.start(); g.stage = stage; g.hits = 0; g.effects = []; g.stopProgression(); g.lastHit = -100;
      g.spawn(); g.onEvent('stage'); ui.syncHud();
    }
    P.CONFIG.stages.forEach((_, stage) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'STAGE ' + (stage + 1);
      b.addEventListener('click', () => selectStage(stage)); dialog.querySelector('.stage-select-buttons').append(b);
    });
    dialog.querySelector('#stage-select-close').addEventListener('click', close);
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    function run(key) {
      if (key === 'm') { if (hardCleared) { close(); mMode.toggle(); } return; }
      if (!unlocked || (g.modes.hard && !['f', 'h'].includes(key))) return;
      if (key === 's') {
        if (dialog.open) close();
        else { ui.releaseInput(); dialog.showModal(); ui.resetClock(); refresh(); }
      } else if (key === 'i') g.modes.infinite = !g.modes.infinite;
      else if (key === 'f') { g.modes.freeze = !g.modes.freeze; if (g.modes.freeze) g.stopProgression(); }
      else if (key === 'h') {
        close(); ui.releaseInput();
        g.modes.hard = !g.modes.hard; g.modes.infinite = g.modes.freeze = false;
        // Debug overrides must not defeat the hard-mode rules.
        if (app.debug) for (const key of ['freeze','immortal','paused','slow']) {
          app.debug.mode[key] = false;
          const input = document.getElementById('debug-' + key); if (input) input.checked = false;
        }
        g.state = 'ready'; g.start(); ui.syncHud();
      }
      refresh();
    }
    for (const key of Object.keys(buttons)) buttons[key].addEventListener('click', () => run(key));
    refresh();
    return {
      refresh, close, get isOpen() { return dialog.open; }, get unlocked() { return unlocked; }, get hardCleared() { return hardCleared; },
      unlock() {
        const firstClear = !unlocked, firstHardClear = g.modes.hard && !hardCleared;
        unlocked = true; if (g.modes.hard) hardCleared = true;
        try { localStorage.setItem(storageKey, '1'); if (hardCleared) localStorage.setItem(hardStorageKey, '1'); } catch (_) {}
        revealIcons([...(firstClear ? Object.values(buttons) : []), ...(firstHardClear ? [futureMode] : [])]);
        refresh();
      },
      key(e) {
        if (mMode.isOpen) {
          if (['m','M','Escape'].includes(e.key)) { e.preventDefault(); if (!e.repeat) mMode.close(); return true; }
        }
        if (dialog.open) {
          if (['s','S','Escape'].includes(e.key)) { e.preventDefault(); if (!e.repeat) close(); }
          return true;
        }
        const key = e.key.toLowerCase();
        if (!unlocked || (!Object.hasOwn(buttons, key) && key !== 'm')) return false;
        e.preventDefault(); if (!e.repeat) run(key); return true;
      }
    };
  };
})(globalThis.Pinball);
