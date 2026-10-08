(async function (P) {
  'use strict';
  const C = P.CONFIG, $ = id => document.getElementById(id);
  // The release packager disables this only in its temporary copy.
  const developerModeEnabled = false;
  const developerMode = developerModeEnabled && new URLSearchParams(location.search).get('debug') === '1';
  const sound = new P.Sound();
  // Unlock only after a user gesture; browsers intentionally block autoplay.
  window.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  window.addEventListener('keydown', () => sound.unlock(), { capture: true });
  for (const [id, key] of [['music-volume', 'musicVolume'], ['effects-volume', 'effectsVolume']]) {
    $(id).value = C.sound[key];
    $(id).addEventListener('input', e => { C.sound[key] = Number(e.target.value); sound.volumes(); });
  }
  $('sound-muted').checked = C.sound.muted;
  $('sound-muted').addEventListener('change', e => { C.sound.muted = e.target.checked; sound.volumes(); });
  const overlay = $('overlay'), startButton = $('start-button');
  const clearScene = new P.ClearScene($('table'), () => { game.start(); clearScene.button.blur(); });
  const pauseOverlay = $('pause-overlay'), resumeButton = $('resume-button'), restartButton = $('restart-button');
  const startCopy = ['modal-kicker', 'modal-title', 'modal-body', 'modal-hint'].map(id => [id, $(id).innerHTML]);
  let announcementUntil = 0, previous = performance.now(), accumulator = 0, bonus;
  const heldKeys = new Set(), heldPointers = new Map();
  function syncInput() {
    game.input[0] = [...heldKeys].some(key => left.includes(key)) || [...heldPointers.values()].includes(0);
    game.input[1] = [...heldKeys].some(key => right.includes(key)) || [...heldPointers.values()].includes(1);
  }
  function releaseInput() { heldKeys.clear(); heldPointers.clear(); game.input.fill(false); }
  function announce(text) { $('announcement').textContent = text; announcementUntil = game.time + 1.1; }
  function setPaused(paused) {
    if (game.state !== 'playing') return;
    game.paused = paused; releaseInput(); pauseOverlay.hidden = !paused;
    sound.update(game.state, paused);
    accumulator = 0; previous = performance.now();
    if (paused) resumeButton.focus(); else document.activeElement?.blur();
  }
  function syncHud() {
    $('hit').textContent = game.hits; $('target').textContent = game.goal();
    $('stage').textContent = game.stage + 1;
    const ballIcons = $('ball-icons'), remaining = Math.max(0, game.balls);
    ballIcons.setAttribute('aria-label', '残りボール ' + remaining + '個');
    ballIcons.replaceChildren(...Array.from({ length: remaining }, () => {
      const image = document.createElement('img');
      image.src = C.assets.ball; image.alt = ''; image.draggable = false;
      return image;
    }));
    const filled = Math.min(6, Math.floor(6 * game.hits / game.goal()));
    $('progress').textContent = Array.from({ length: 6 }, (_, i) => i < filled ? '♥' : '♡').join(' ');
    bonus?.refresh();
  }
  const game = new P.Game((event, stage, contact) => {
    if (event === 'wall' || event === 'flipper-contact') {
      sound.play(event === 'wall' ? 'wall' : 'flipper', 0, stage);
      if (contact) renderer.addContactEffect(game, event, stage, contact);
      return;
    }
    if (event === 'start' || event === 'ready') renderer.contactEffects.length = 0;
    sound.setHard(game.modes.hard);
    sound.update(game.state, game.paused);
    if (event === 'start') sound.play('start');
    if (event === 'lost') sound.play('lost');
    if (event === 'over' || event === 'clear') sound.play(event);
    if (event === 'hit') {
      const goal = game.goal(stage);
      const tier = Math.min(3, Math.floor((game.hits - 1) / Math.max(1, goal - 1) * 4));
      sound.play(game.effects.at(-1)?.kind === 'stage-clear' ? 'stage' : 'hit', tier);
    }
    syncHud();
    if (event === 'ready') { startButton.disabled = false; startButton.textContent = 'PLAY  ♥'; }
    if (event === 'start') { clearScene.hide(); overlay.hidden = true; overlay.classList.remove('is-clear'); pauseOverlay.hidden = true; }
    if (event === 'start' || event === 'stage') { $('announcement').textContent = ''; announcementUntil = 0; }
    if (event === 'lost' && game.balls > 0) announce('BALL ' + game.balls);
    if (event === 'hit') sound.playVoice(stage);
    if (['start', 'ready', 'over'].includes(event)) sound.stopVoice();
    if (event === 'clear') {
      releaseInput(); if (game.completedRun) bonus?.unlock();
      sound.playClearVoice(false, (game.clearPreview ?? (game.modes.hard ? 'hard' : 'normal')) === 'hard');
      renderer.clearTransition = { started: game.time - (matchMedia('(prefers-reduced-motion: reduce)').matches ? 1.05 : 0), duration: 1.05, switchAt: 0.36 };
      $('announcement').textContent = ''; announcementUntil = 0;
      overlay.hidden = true; clearScene.show();
    }
    if (event === 'over') {
      clearScene.hide();
      $('announcement').textContent = ''; announcementUntil = 0;
      overlay.hidden = false;
      overlay.classList.remove('is-clear');
      $('modal-kicker').textContent = 'ONE MORE LITTLE ADVENTURE';
      $('modal-title').textContent = 'GAME OVER';
      $('modal-body').textContent = 'もう一度、心を弾ませて。';
      startButton.textContent = 'PLAY AGAIN  ♥'; $('modal-hint').textContent = '任意のキーで最初から';
    }
  });
  const renderer = new P.Renderer($('game-canvas'));
  // Expose the local model for reproducible browser checks, without adding cheats to the UI.
  globalThis.PinballApp = { game, renderer, sound, errors: [] };
  window.addEventListener('error', e => PinballApp.errors.push(e.message));
  window.addEventListener('unhandledrejection', e => PinballApp.errors.push(String(e.reason)));
  const credits = $('credits-dialog');
  function closeCredits() {
    credits.close(); releaseInput(); accumulator = 0; previous = performance.now();
    sound.update(game.state, game.paused || !!PinballApp.debug?.mode.paused);
  }
  function openCredits() {
    if (credits.open) return;
    releaseInput(); accumulator = 0; previous = performance.now();
    credits.showModal(); sound.update(game.state, true);
  }
  $('credits-command').addEventListener('click', openCredits);
  $('credits-close').addEventListener('click', closeCredits);
  credits.addEventListener('cancel', e => { e.preventDefault(); closeCredits(); });
  bonus = P.setupBonus(PinballApp, {
    releaseInput, syncHud,
    resetClock() { accumulator = 0; previous = performance.now(); sound.update(game.state, credits.open || game.paused || bonus?.isOpen || !!PinballApp.debug?.mode.paused); }
  });
  PinballApp.bonus = bonus;
  let tuningLoad;
  PinballApp.ensureTuning = function () {
    if (PinballApp.debug) return Promise.resolve(PinballApp.debug);
    return tuningLoad ??= (async () => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'src/styles/debug.css?v=maintenance-sidebar-1'; document.head.append(css);
      if (!P.setupDebug) {
        const script = document.createElement('script'); script.src = 'src/scripts/debug.js?v=voices-mao-1';
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
      }
      return P.setupDebug(PinballApp, { syncHud, overlay, hideClearScene: () => clearScene.hide() }, !developerMode);
    })().catch(error => { tuningLoad = null; throw error; });
  };
  const left = ['ArrowLeft', 'a', 'A'], right = ['ArrowRight', 'd', 'D'];
  window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, #debug-panel, #sound-controls')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (bonus.isOpen) { bonus.key(e); return; }
    if (['c', 'C'].includes(e.key)) {
      e.preventDefault(); if (!e.repeat) { if (credits.open) closeCredits(); else openCredits(); } return;
    }
    if (credits.open) {
      if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat) closeCredits(); }
      return;
    }
    if (bonus.key(e)) return;
    if (game.paused && e.key === 'Tab') {
      e.preventDefault(); (document.activeElement === resumeButton ? restartButton : resumeButton).focus(); return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || ['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    if (game.state === 'playing' && [' ', 'Escape', 'p', 'P'].includes(e.key)
      && !(e.key === ' ' && e.target instanceof HTMLButtonElement)) {
      e.preventDefault(); if (!e.repeat) setPaused(!game.paused); return;
    }
    if (game.paused) {
      if (!(e.target instanceof HTMLButtonElement && ['Enter', ' '].includes(e.key))) e.preventDefault();
      return;
    }
    if (game.state === 'clear') {
      if (clearScene.revealed && e.target === clearScene.button && ['Enter', ' '].includes(e.key) && !e.repeat) return;
      e.preventDefault(); if (!e.repeat) clearScene.reveal(); return;
    }
    if (e.target instanceof HTMLButtonElement && ['Enter', ' '].includes(e.key)) return;
    if (left.includes(e.key) || right.includes(e.key) || e.key === ' ') e.preventDefault();
    if (!e.repeat && ['ready', 'over', 'clear'].includes(game.state)) game.start();
    if (left.includes(e.key) || right.includes(e.key)) { heldKeys.add(e.key); syncInput(); }
  });
  window.addEventListener('keyup', e => { heldKeys.delete(e.key); syncInput(); });
  window.addEventListener('blur', releaseInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInput(); });
  // A pointer holds one flipper until release, even if it leaves the hit area.
  function pointerFlipper(e, side) {
    if (e.button !== 0 || credits.open || bonus.isOpen || game.paused || game.state !== 'playing') return;
    e.preventDefault(); heldPointers.set(e.pointerId, side); syncInput();
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function releasePointer(e) { heldPointers.delete(e.pointerId); syncInput(); }
  for (const id of ['table', 'left-command', 'right-command']) {
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $(id).addEventListener(event, releasePointer);
  }
  const table = $('table');
  const flipperClicks = new Set();
  function flipperAt(e) {
    const rect = table.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * C.width;
    const y = (e.clientY - rect.top) / rect.height * 1344 + 48;
    // Broad lower-board zones, with a central gap reserved for SPACE actions.
    return y >= 1080 && y <= 1392 ? (x >= 100 && x <= 490 ? 0 : x >= 534 && x <= 924 ? 1 : null) : null;
  }
  const interactive = e => e.target.closest('button, input, select, textarea, a, summary, #sound-controls, .modal, #clear-scene');
  table.addEventListener('pointerdown', e => {
    if (interactive(e)) return;
    const side = flipperAt(e);
    if (side !== null && game.state === 'playing' && !game.paused && !credits.open && e.button === 0) {
      flipperClicks.add(e.pointerId); pointerFlipper(e, side);
    }
  });
  table.addEventListener('pointercancel', e => flipperClicks.delete(e.pointerId));
  function spaceAction() {
    if (credits.open || bonus.isOpen || startButton.disabled) return;
    sound.unlock();
    if (game.state === 'playing') setPaused(!game.paused);
    else if (game.state === 'clear') clearScene.reveal();
    else if (['ready', 'over'].includes(game.state)) { releaseInput(); game.start(); }
  }
  table.addEventListener('click', e => {
    // Dragging away from a flipper before releasing must not trigger PAUSE.
    if (flipperClicks.delete(e.pointerId)) return;
    if (interactive(e)) return;
    if (game.state === 'playing' && !game.paused && flipperAt(e) !== null) return;
    spaceAction();
  });
  document.addEventListener('click', e => {
    if (e.target === document.body || e.target === document.querySelector('.shell') || e.target.closest('.masthead')) spaceAction();
  });
  ['left-command', 'right-command'].forEach((id, side) => {
    $(id).addEventListener('pointerdown', e => pointerFlipper(e, side));
  });
  $('pause-command').addEventListener('click', spaceAction);
  startButton.addEventListener('click', () => { sound.unlock(); game.start(); startButton.blur(); });
  resumeButton.addEventListener('click', () => setPaused(false));
  restartButton.addEventListener('click', () => {
    game.state = 'ready'; game.start(); game.ball = null; game.time = 0; game.ready();
    startCopy.forEach(([id, html]) => { $(id).innerHTML = html; });
    overlay.hidden = false; startButton.focus(); accumulator = 0; previous = performance.now();
  });
  try { await renderer.load(); game.ready(); }
  catch (error) { $('modal-title').textContent = '読み込みに失敗しました'; $('modal-body').textContent = error.message; $('modal-hint').textContent = 'ページを再読み込みしてください'; return; }
  // Load tuning only for developer mode or an unlocked M-mode request.
  if (developerMode) {
    await PinballApp.ensureTuning();
  }
  function frame(now) {
    sound.update(game.state, credits.open || bonus.isOpen || game.paused || !!PinballApp.debug?.mode.paused);
    if (!document.hidden && !game.paused && !credits.open && !bonus.isOpen) {
      accumulator += Math.min((now - previous) / 1000, 0.05);
      while (accumulator >= C.step) { game.tick(C.step); accumulator -= C.step; }
      renderer.draw(game);
      if (announcementUntil && game.time >= announcementUntil) { $('announcement').textContent = ''; announcementUntil = 0; }
    } else { accumulator = 0; if (bonus.isOpen || PinballApp.mMode?.isOpen) renderer.draw(game); }
    previous = now; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})(globalThis.Pinball);
