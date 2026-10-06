(async function (P) {
  'use strict';
  const C = P.CONFIG, $ = id => document.getElementById(id);
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
  let announcementUntil = 0, previous = performance.now(), accumulator = 0;
  function announce(text) { $('announcement').textContent = text; announcementUntil = game.time + 1.1; }
  function setPaused(paused) {
    if (game.state !== 'playing') return;
    game.paused = paused; game.input.fill(false); pauseOverlay.hidden = !paused;
    sound.update(game.state, paused);
    accumulator = 0; previous = performance.now();
    if (paused) resumeButton.focus(); else document.activeElement?.blur();
  }
  function syncHud() {
    $('hit').textContent = game.hits; $('target').textContent = C.stages[game.stage].hits;
    $('stage').textContent = game.stage + 1;
    const ballIcons = $('ball-icons'), remaining = Math.max(0, game.balls);
    ballIcons.setAttribute('aria-label', '残りボール ' + remaining + '個');
    ballIcons.replaceChildren(...Array.from({ length: remaining }, () => {
      const image = document.createElement('img');
      image.src = C.assets.ball; image.alt = ''; image.draggable = false;
      return image;
    }));
    const filled = Math.floor(6 * game.hits / C.stages[game.stage].hits);
    $('progress').textContent = Array.from({ length: 6 }, (_, i) => i < filled ? '♥' : '♡').join(' ');
  }
  const game = new P.Game((event, stage, contact) => {
    if (event === 'wall' || event === 'flipper-contact') {
      sound.play(event === 'wall' ? 'wall' : 'flipper', 0, stage);
      if (contact) renderer.addContactEffect(game, event, stage, contact);
      return;
    }
    if (event === 'start' || event === 'ready') renderer.contactEffects.length = 0;
    sound.update(game.state, game.paused);
    if (event === 'start') sound.play('start');
    if (event === 'lost') sound.play('lost');
    if (event === 'over' || event === 'clear') sound.play(event);
    if (event === 'hit') {
      const goal = C.stages[stage].hits;
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
      sound.playClearVoice();
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
    credits.close(); game.input.fill(false); accumulator = 0; previous = performance.now();
    sound.update(game.state, game.paused || !!PinballApp.debug?.mode.paused);
  }
  function openCredits() {
    if (credits.open) return;
    game.input.fill(false); accumulator = 0; previous = performance.now();
    credits.showModal(); sound.update(game.state, true);
  }
  $('credits-command').addEventListener('click', openCredits);
  $('credits-close').addEventListener('click', closeCredits);
  credits.addEventListener('cancel', e => { e.preventDefault(); closeCredits(); });
  const left = ['ArrowLeft', 'a', 'A'], right = ['ArrowRight', 'd', 'D'];
  window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, #debug-panel, #sound-controls')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (['c', 'C'].includes(e.key)) {
      e.preventDefault(); if (!e.repeat) { if (credits.open) closeCredits(); else openCredits(); } return;
    }
    if (credits.open) {
      if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat) closeCredits(); }
      return;
    }
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
    if (left.includes(e.key)) { if (!game.input[0]) sound.play('flipper'); game.input[0] = true; }
    if (right.includes(e.key)) { if (!game.input[1]) sound.play('flipper'); game.input[1] = true; }
  });
  window.addEventListener('keyup', e => { if (left.includes(e.key)) game.input[0] = false; if (right.includes(e.key)) game.input[1] = false; });
  window.addEventListener('blur', () => game.input.fill(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.input.fill(false); });
  startButton.addEventListener('click', () => { sound.unlock(); game.start(); startButton.blur(); });
  resumeButton.addEventListener('click', () => setPaused(false));
  restartButton.addEventListener('click', () => {
    game.state = 'ready'; game.start(); game.ball = null; game.time = 0; game.ready();
    startCopy.forEach(([id, html]) => { $(id).innerHTML = html; });
    overlay.hidden = false; startButton.focus(); accumulator = 0; previous = performance.now();
  });
  try { await renderer.load(); game.ready(); }
  catch (error) { $('modal-title').textContent = '読み込みに失敗しました'; $('modal-body').textContent = error.message; $('modal-hint').textContent = 'ページを再読み込みしてください'; return; }
  // The tuning module and stylesheet are only fetched for explicit local debug mode.
  if (new URLSearchParams(location.search).get('debug') === '1') {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'src/styles/debug.css'; document.head.append(css);
    const script = document.createElement('script'); script.src = 'src/scripts/debug.js?v=freeze-cinematic-1';
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
    P.setupDebug(PinballApp, { syncHud, overlay, hideClearScene: () => clearScene.hide() });
  }
  function frame(now) {
    sound.update(game.state, credits.open || game.paused || !!PinballApp.debug?.mode.paused);
    if (!document.hidden && !game.paused && !credits.open) {
      accumulator += Math.min((now - previous) / 1000, 0.05);
      while (accumulator >= C.step) { game.tick(C.step); accumulator -= C.step; }
      renderer.draw(game);
      if (announcementUntil && game.time >= announcementUntil) { $('announcement').textContent = ''; announcementUntil = 0; }
    } else accumulator = 0;
    previous = now; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})(globalThis.Pinball);
