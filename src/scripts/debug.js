(function (P) {
  'use strict';
  P.setupDebug = function (app, ui) {
    const C = P.CONFIG, g = app.game, renderer = app.renderer;
    const defaults = JSON.parse(JSON.stringify(C)); // Reset snapshot, never a second live config.
    const mode = { paused: false, slow: false, freeze: false, immortal: false, walls: true, character: true, flippers: true, ball: true, pivots: true, trail: false };
    const panel = document.createElement('aside'); panel.id = 'debug-panel'; panel.setAttribute('aria-label', 'Pinball tuning');
    panel.innerHTML = '<h2>PINBALL TUNING</h2><p>変更はこのページ内だけ。保存にはExportを使用。座標は1024×1536、角度はrad。入力中はゲームキーを無効化。</p>';
    document.body.classList.add('debug-mode'); document.body.append(panel);
    const status = document.createElement('output'); status.id = 'debug-status'; panel.append(status);
    function section(title, open = false) { const el = document.createElement('details'); el.open = open; const summary = document.createElement('summary'); summary.textContent = title; el.append(summary); panel.append(el); return el; }
    function action(parent, id, title, run) { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = title; b.addEventListener('click', run); parent.append(b); return b; }
    const refreshers = [];
    function number(parent, id, title, get, set, min = -3000, max = 3000, step = 1) {
      const label = document.createElement('label'); label.textContent = title;
      const input = document.createElement('input'); input.id = id; input.type = 'number'; input.min = min; input.max = max; input.step = step;
      const refresh = () => { input.value = get(); }; refresh(); refreshers.push(refresh);
      input.addEventListener('input', () => { const v = input.valueAsNumber; if (!Number.isFinite(v) || v < min || v > max || !input.validity.valid) return; set(v); applyConfig(); });
      label.append(input); parent.append(label); return input;
    }
    function toggle(parent, key, title) { const label = document.createElement('label'); label.textContent = title; const input = document.createElement('input'); input.type = 'checkbox'; input.id = 'debug-' + key; input.checked = mode[key]; input.addEventListener('change', () => { mode[key] = input.checked; if (key === 'freeze') { g.transition = 0; g.stageShift = null; g.cinematicTail = 0; if (mode.freeze) g.effects.forEach(effect => { if (effect.kind === 'stage-clear') { effect.kind = 'hit'; effect.celebration = null; } }); } }); label.append(input); parent.append(label); }
    function refresh() { refreshers.forEach(fn => fn()); }
    function applyConfig() {
      g.flippers.forEach((f, i) => { Object.assign(f, C.flippers[i]); f.angle = P.Physics.clamp(f.angle, Math.min(f.rest, f.active), Math.max(f.rest, f.active)); });
      if (g.ball) g.ball.r = C.ballRadius;
      ui.syncHud(); app.sound.volumes();
    }
    function playState() { ui.hideClearScene(); g.state = 'playing'; ui.overlay.hidden = true; ui.overlay.classList.remove('is-clear'); g.transition = 0; g.stageShift = null; g.cinematicTail = 0; g.entryOverlap = false; g.input.fill(false); }
    let circleIndex = 0;
    function selectStage(index) { playState(); g.stage = index; circleIndex = 0; g.hits = 0; g.lastHit = -100; g.effects = []; g.spawn(); ui.syncHud(); refresh(); }
    const operations = section('ステージ / テスト操作', true);
    const label = document.createElement('label'); label.textContent = 'STAGE';
    const select = document.createElement('select'); select.id = 'debug-stage';
    C.stages.forEach((_, i) => { const o = document.createElement('option'); o.value = i; o.textContent = 'STAGE ' + (i + 1); select.append(o); });
    select.addEventListener('change', () => selectStage(Number(select.value))); label.append(select); operations.append(label); refreshers.push(() => { select.value = g.stage; });
    number(operations, 'debug-hits', '現在HIT', () => g.hits, v => { g.hits = v; g.transition = 0; g.stageShift = null; g.cinematicTail = 0; }, 0, 9999);
    number(operations, 'debug-balls', '現在BALL', () => g.balls, v => { g.balls = v; }, 0, 9999);
    toggle(operations, 'freeze', 'ステージ進行を停止'); toggle(operations, 'immortal', 'ゲームオーバー無効'); toggle(operations, 'slow', 'スロー確認（時間速度20%）');
    const pause = action(operations, 'debug-pause', 'PAUSE', () => { mode.paused = !mode.paused; g.input.fill(false); pause.textContent = mode.paused ? 'RESUME' : 'PAUSE'; });
    action(operations, 'debug-launch', '再発射', () => { playState(); g.spawn(); ui.syncHud(); refresh(); });
    action(operations, 'debug-place', 'ボールだけ初期位置へ（静止）', () => { playState(); g.spawn(); g.ball.vx = g.ball.vy = 0; });
    action(operations, 'debug-reset-stage', '現在STAGEをリセット', () => selectStage(g.stage));
    action(operations, 'debug-reset-game', '全ゲームをリセット', () => { g.state = 'ready'; g.start(); refresh(); });
    const musicSection = section('BGM / 試聴');
    const musicHint = document.createElement('p');
    musicHint.textContent = '初期設定は添付曲 moonlit.free61（BGM音量25%）。「花あかり」は24秒、二重奏は20秒、ほかは30秒。選曲はExport / Copy / Reset対象です。BGMのみ試聴は開始前やPAUSE中でも使用でき、ゲーム状態を変更しません。停止すると通常の音声へ戻ります。音量は画面右下の♫で調整。';
    musicSection.append(musicHint);
    const musicLabel = document.createElement('label'); musicLabel.textContent = 'BGMパターン';
    const musicSelect = document.createElement('select'); musicSelect.id = 'debug-music-pattern';
    P.Sound.musicChoices.forEach(({ id, name }) => { const option = document.createElement('option'); option.value = id; option.textContent = name; musicSelect.append(option); });
    musicSelect.value = C.sound.pattern;
    musicSelect.addEventListener('change', () => { C.sound.pattern = musicSelect.value; app.sound.restartMusic(); });
    musicLabel.append(musicSelect); musicSection.append(musicLabel);
    refreshers.push(() => { musicSelect.value = C.sound.pattern; });
    action(musicSection, 'debug-music-preview', 'BGMのみ試聴（先頭から）', () => app.sound.preview(true));
    action(musicSection, 'debug-music-stop', '試聴を停止', () => app.sound.preview(false));
    const musicStatus = document.createElement('output'); musicStatus.id = 'debug-music-status'; musicSection.append(musicStatus);
    refreshers.push(() => { musicStatus.textContent = (app.sound.musicPreview ? 'BGMのみ試聴中：' : '選択中：') + app.sound.piece.name + '（' + (app.sound.musicLoopSeconds ? app.sound.musicLoopSeconds.toFixed(1) + '秒' : '読込前') + '）' + (app.sound.musicError ? ' / ' + app.sound.musicError : ''); });
    const hitVoice = section('HIT音声');
    const voiceHint = document.createElement('p');
    voiceHint.textContent = '声だけの音量。初期設定20%。100%が導入時の最大音量、0%で無音。SE音量にも連動します。変更は即時反映、Export / Copy / Reset対象。';
    hitVoice.append(voiceHint);
    number(hitVoice, 'debug-voice-volume', 'HIT音声 音量（%）', () => Math.round((C.sound.voiceVolume ?? 1) * 100), v => { C.sound.voiceVolume = v / 100; }, 0, 100, 1);
    const voiceChoices = [...new Set(C.voices.flat())];
    voiceChoices.forEach((file, i) => {
      const label = document.createElement('label'); label.textContent = '再生：' + file.split('/').at(-1);
      const input = document.createElement('input'); input.type = 'checkbox'; input.id = 'debug-voice-enabled-' + i;
      const sync = () => { input.checked = C.sound.voiceEnabled[file] !== false; }; sync(); refreshers.push(sync);
      input.addEventListener('change', () => { C.sound.voiceEnabled[file] = input.checked;
        if (!input.checked && app.sound.lastVoice === file) app.sound.stopVoice();
      });
      label.append(input); hitVoice.append(label);
    });
    const voiceSelectionHint = document.createElement('p');
    voiceSelectionHint.textContent = '選択した声だけHIT時にランダム再生。全OFFで音声なし。試聴は開始前・PAUSE中にも使え、ゲーム状態を変更しません。';
    hitVoice.append(voiceSelectionHint);
    action(hitVoice, 'debug-voice-random', '選択したボイスをランダム再生', () => app.sound.playVoice(g.stage, true));
    const voiceStatus = document.createElement('output'); hitVoice.append(voiceStatus);
    const refreshVoiceStatus = () => { voiceStatus.textContent = app.sound.voiceError || (app.sound.lastVoice ? '最後に再生：' + app.sound.lastVoice.split('/').at(-1) : 'ボイスを選択して試聴できます'); };
    refreshers.push(refreshVoiceStatus);
    const clearVoiceSection = section('GAME CLEAR音声');
    const clearVoiceHint = document.createElement('p');
    clearVoiceHint.textContent = 'yattajan_01.wavを最終クリア時に再生。HIT音声とは独立した音量で、初期設定44%。0%で無音。SE音量にも連動し、Export / Copy / Reset対象。試聴はゲーム状態を変更しません。';
    clearVoiceSection.append(clearVoiceHint);
    number(clearVoiceSection, 'debug-clear-voice-volume', 'クリア音声 音量（%）', () => Math.round((C.sound.clearVoiceVolume ?? 0.44) * 100), v => { C.sound.clearVoiceVolume = v / 100; }, 0, 100, 1);
    action(clearVoiceSection, 'debug-clear-voice-preview', 'クリア音声を試聴', () => app.sound.playClearVoice(true));
    const character = section('現在STAGEのキャラクター', true);
    const stage = () => C.stages[g.stage];
    number(character, 'character-x', '画像 左上X', () => stage().rect[0], v => { stage().rect[0] = v; });
    number(character, 'character-y', '画像 左上Y', () => stage().rect[1], v => { stage().rect[1] = v; });
    number(character, 'character-scale', '画像 表示倍率', () => stage().scale ?? 1, v => { stage().scale = v; }, 0.1, 4, 0.01);
    number(character, 'character-rotation', '画像 回転rad（判定は独立）', () => stage().rotation ?? 0, v => { stage().rotation = v; }, -6.28, 6.28, 0.01);
    const circleLabel = document.createElement('label'); circleLabel.textContent = '編集する当たり判定円';
    const circleSelect = document.createElement('select'); circleSelect.id = 'debug-circle'; circleLabel.append(circleSelect); character.append(circleLabel);
    refreshers.push(() => {
      circleIndex = Math.min(circleIndex, stage().circles.length - 1);
      if (circleSelect.options.length !== stage().circles.length) circleSelect.replaceChildren(...stage().circles.map((_, i) => { const option = document.createElement('option'); option.value = i; option.textContent = '円 ' + (i + 1); return option; }));
      circleSelect.value = circleIndex;
    });
    circleSelect.addEventListener('change', () => { circleIndex = Number(circleSelect.value); refresh(); });
    ['中心X', '中心Y', '半径r'].forEach((name, i) => number(character, 'collider-' + i, '円判定 ' + name, () => stage().circles[circleIndex][i], v => { stage().circles[circleIndex][i] = v; }, i === 2 ? 1 : -3000, 3000));
    number(character, 'stage-target', '必要HIT', () => stage().hits, v => { stage().hits = v; }, 1, 9999);
    const hitReaction = section('HITリアクションマーク');
    const reactionHint = document.createElement('p');
    reactionHint.textContent = 'チェックした種類だけHIT時にランダム表示。全てOFFならマークなし。共通サイズ×STAGE倍率で表示。変更は即時反映、Export / Copy / Reset対象。位置は画像内の比率です。';
    hitReaction.append(reactionHint);
    ['！', '❤', '波線', '三本線', '汗', '照れ（///）'].forEach((name, i) => {
      const label = document.createElement('label'); label.textContent = '出現：' + name;
      const input = document.createElement('input'); input.type = 'checkbox'; input.id = 'reaction-enabled-' + i;
      const sync = () => { input.checked = C.hitReaction.enabledMarks[i]; }; sync(); refreshers.push(sync);
      input.addEventListener('change', () => { C.hitReaction.enabledMarks[i] = input.checked; });
      label.append(input); hitReaction.append(label);
    });
    number(hitReaction, 'reaction-size', '共通サイズ', () => C.hitReaction.size, v => { C.hitReaction.size = v; }, 0, 160, 1);
    number(hitReaction, 'reaction-duration', '表示時間（秒）', () => C.hitReaction.duration, v => { C.hitReaction.duration = v; }, 0.1, 1, 0.01);
    C.stages.forEach((_, i) => number(hitReaction, 'reaction-scale-' + i, 'STAGE ' + (i + 1) + ' サイズ倍率', () => C.hitReaction.stageScales[i], v => { C.hitReaction.stageScales[i] = v; }, 0, 3, 0.05));
    ['X', 'Y'].forEach((name, i) => number(hitReaction, 'reaction-anchor-' + i, '現在STAGE 表示位置 ' + name, () => C.hitReaction.anchors[g.stage][i], v => { C.hitReaction.anchors[g.stage][i] = v; }, 0, 1, 0.01));
    let previewMark = 0;
    function previewReaction(mark) {
      if (g.state !== 'playing') return;
      g.effects.push({ x: g.ball?.x ?? 512, y: g.ball?.y ?? 850, age: mode.paused || g.paused ? 0.15 : 0,
        kind: 'hit', stage: g.stage, hits: g.hits, tier: 0, reactionMark: mark });
    }
    action(hitReaction, 'debug-preview-reaction', 'マークを試す（選択した種類を順に表示）', () => {
      const marks = C.hitReaction.enabledMarks.flatMap((enabled, i) => enabled ? [i] : []);
      previewReaction(marks.length ? marks[previewMark++ % marks.length] : null);
    });
    const clearArt = section('ゲームクリア時のイラスト');
    number(clearArt, 'clear-art-x', 'クリア画像 左上X', () => C.clearArt.rect[0], v => { C.clearArt.rect[0] = v; });
    number(clearArt, 'clear-art-y', 'クリア画像 左上Y', () => C.clearArt.rect[1], v => { C.clearArt.rect[1] = v; });
    number(clearArt, 'clear-art-scale', 'クリア画像 表示倍率', () => C.clearArt.scale, v => { C.clearArt.scale = v; }, 0.1, 4, 0.01);
    action(clearArt, 'debug-preview-clear', 'クリア画面を表示', () => {
      g.stage = C.stages.length - 1; g.hits = C.stages[g.stage].hits;
      g.state = 'clear'; g.ball = null; g.transition = 0; g.stageShift = null; g.cinematicTail = 0; g.entryOverlap = false; g.input.fill(false); g.effects = []; g.lastHit = -100;
      g.onEvent('clear'); refresh();
    });
    const visualEffects = section('キャラクター演出（全STAGE共通）');
    const effectsHint = document.createElement('p');
    effectsHint.textContent = '強さ・個数を0にするとOFF。変更は即時反映され、Export / Copy / Resetに含まれます。サイズは画像基準、周期は秒。';
    visualEffects.append(effectsHint);
    const effectFields = {
      glow: [['strength', 'ピンクグロー 強さ', 0, 1, 0.05], ['blur', 'ピンクグロー 広がり', 0, 32, 1], ['speed', 'ピンクグロー 明滅速度', 0, 8, 0.1], ['pulseDepth', 'ピンクグロー 明滅の幅', 0, 1, 0.05], ['lowerFade', 'ピンクグロー 下側の消失位置（画像高さ比）', 0.1, 1, 0.01]],
      darkGlow: [['strength', '黒グロー 強さ', 0, 1, 0.05], ['blur', '黒グロー 広がり', 0, 32, 1], ['speed', '黒グロー 明滅速度', 0, 8, 0.1], ['pulseDepth', '黒グロー 明滅の幅', 0, 1, 0.05], ['lowerFade', '黒グロー 下側の消失位置（画像高さ比）', 0.1, 1, 0.01]],
      shadow: [['strength', '接地影 濃さ', 0, 1, 0.05], ['blur', '接地影 ぼかし', 0, 32, 1], ['offsetY', '接地影 下方向の距離', 0, 30, 1]],
      sparkles: [['count', 'キラキラ 個数', 0, 32, 1], ['opacity', 'キラキラ 濃さ', 0, 1, 0.05], ['size', 'キラキラ 最大サイズ', 1, 30, 1], ['speed', 'キラキラ 明滅速度', 0, 8, 0.1]],
      hearts: [['count', 'ハート 個数', 0, 12, 1], ['opacity', 'ハート 濃さ', 0, 1, 0.05], ['size', 'ハート サイズ倍率', 0.2, 3, 0.1], ['period', 'ハート 周期（秒）', 0.5, 20, 0.1], ['rise', 'ハート 上昇距離', 0, 200, 1]],
      devils: [['count', 'デビル 個数', 0, 4, 1], ['opacity', 'デビル 濃さ', 0, 1, 0.05], ['size', 'デビル サイズ倍率', 0.2, 3, 0.1], ['period', 'デビル 出現周期（秒）', 1, 30, 0.1], ['duration', 'デビル 表示時間（秒）', 0.1, 10, 0.1]]
    };
    for (const [group, fields] of Object.entries(effectFields)) {
      for (const [key, title, min, max, step] of fields) {
        number(visualEffects, 'effect-' + group + '-' + key, title,
          () => C.characterEffects[group][key], v => { C.characterEffects[group][key] = v; }, min, max, step);
      }
    }
    const ballEffects = section('ボールの演出（中心の光 / 縁のキラキラ）');
    const ballHint = document.createElement('p');
    ballHint.textContent = '変更は即時反映。濃さまたは個数0でOFF。縁の粒子は移動中のみ発生し、その場に残ります。PAUSE中は明滅・発生・寿命も停止。Export / Copy / Reset対象です。';
    ballEffects.append(ballHint);
    for (const [key, title, min, max, step] of [
      ['sparkleOpacity', '中心の白い光 濃さ', 0, 1, 0.05],
      ['sparkleSize', '中心の白い光 サイズ（ボール半径比）', 0, 2, 0.05],
      ['sparkleSpeed', '中心の白い光 明滅速度', 0, 20, 0.1],
      ['trailOpacity', '縁のキラキラ 濃さ', 0, 1, 0.05],
      ['trailSparkles', '縁のキラキラ 最大個数', 0, 48, 1],
      ['trailSize', '縁のキラキラ サイズ倍率', 0, 4, 0.05],
      ['trailSeconds', '縁のキラキラ 残る時間（秒）', 0.05, 2, 0.01],
      ['trailInterval', '縁のキラキラ 発生間隔（秒）', 0.01, 0.5, 0.01],
      ['trailSpacing', '縁のキラキラ 次の発生までの移動距離', 1, 100, 1]
    ]) number(ballEffects, 'ball-effect-' + key, title, () => C.ballEffects[key], v => { C.ballEffects[key] = v; }, min, max, step);
    const contactEffects = section('壁 / フリッパーの反射エフェクト');
    const contactHint = document.createElement('p');
    contactHint.textContent = '壁・左右フリッパー共通。変更は表示中の演出にも即時反映。濃さ0で全体OFF、粒子数0では光だけ残ります。試すボタンはプレイ中に使用し、ボールやHITを変更しません。';
    contactEffects.append(contactHint);
    for (const [key, title, min, max, step] of [
      ['opacity', '反射エフェクト 濃さ', 0, 1, 0.01],
      ['duration', '反射エフェクト 表示時間（秒）', 0.05, 2, 0.01],
      ['spread', '反射エフェクト 広がり', 0, 200, 1],
      ['sparkles', '反射エフェクト 粒子数（先頭2粒はハート）', 0, 32, 1]
    ]) number(contactEffects, 'contact-effect-' + key, title, () => C.contactEffects[key], v => { C.contactEffects[key] = v; }, min, max, step);
    action(contactEffects, 'debug-preview-contacts', '壁・左右フリッパーの演出を試す', () => {
      if (g.state !== 'playing') { contactHint.textContent = 'PLAYまたはSTAGE選択でプレイ状態にしてから試してください。'; return; }
      renderer.contactEffects.length = 0;
      const wall = C.walls[4], dx = wall[2] - wall[0], dy = wall[3] - wall[1], length = Math.hypot(dx, dy);
      renderer.addContactEffect(g, 'wall', C.maxSpeed * 0.7, { x: (wall[0] + wall[2]) / 2, y: (wall[1] + wall[3]) / 2, nx: dy / length, ny: -dx / length });
      for (const [i, f] of g.flippers.entries()) {
        const side = i ? -1 : 1, nx = Math.sin(f.angle) * side, ny = -Math.cos(f.angle) * side;
        renderer.addContactEffect(g, 'flipper-contact', C.maxSpeed * 0.7, { x: f.x + Math.cos(f.angle) * f.length * 0.55 + nx * f.radius,
          y: f.y + Math.sin(f.angle) * f.length * 0.55 + ny * f.radius, nx, ny });
      }
    });
    const celebration = section('ステージ切り替え演出');
    const celebrationHint = document.createElement('p');
    celebrationHint.textContent = '変更は次の達成演出から適用。通常HITと最終GAME CLEARは対象外。切り替えを試すにはPAUSE・ステージ進行停止をOFFにしてください。';
    celebration.append(celebrationHint);
    const totalTime = document.createElement('output'); celebration.append(totalTime);
    refreshers.push(() => {
      const s = C.stageCelebration;
      totalTime.textContent = '通常速度へ復帰：約' + (s.slowIn + s.hold + s.fadeOut + s.fadeIn + s.poseHold + s.slowOut).toFixed(2) + '秒';
    });
    function normalizeCelebration() {
      const s = C.stageCelebration;
      s.screenDuration = Math.max(s.screenDuration, s.cutIn.end);
      s.duration = Math.max(s.duration, s.screenDuration);
      refresh();
    }
    const celebrationFields = [
      ['slowIn', '開始スロー時間（秒）', 0, 2, 0.01], ['slowScale', '開始スロー速度倍率', 0.05, 1, 0.05],
      ['hold', '達成後の停止（秒）', 0, 2, 0.01], ['fadeOut', '旧キャラ フェードアウト（秒）', 0.01, 2, 0.01],
      ['fadeIn', '次キャラ フェードイン（秒）', 0.01, 2, 0.01], ['poseHold', '次キャラを見せる停止（秒）', 0, 3, 0.01],
      ['slowOut', '通常速度への復帰時間（秒）', 0, 2, 0.01], ['resumeScale', '復帰開始の速度倍率', 0.05, 1, 0.05],
      ['duration', '達成バーストの寿命（秒）', 0.2, 5, 0.01], ['screenDuration', '画面演出の寿命（秒）', 0.2, 5, 0.01],
      ['flash', '画面の明転 強さ', 0, 1, 0.05], ['screenParticles', '画面のハート／光 個数', 0, 100, 1]
    ];
    for (const [key, title, min, max, step] of celebrationFields) {
      number(celebration, 'celebration-' + key, title, () => C.stageCelebration[key], v => { C.stageCelebration[key] = v; normalizeCelebration(); }, min, max, step);
    }
    number(celebration, 'celebration-cut-start', 'カットイン 開始（秒）', () => C.stageCelebration.cutIn.start, v => {
      const cut = C.stageCelebration.cutIn; const duration = cut.end - cut.start;
      cut.start = v; cut.end = v + duration; normalizeCelebration();
    }, 0, 2, 0.01);
    number(celebration, 'celebration-cut-duration', 'カットイン 表示時間（秒）', () => Number((C.stageCelebration.cutIn.end - C.stageCelebration.cutIn.start).toFixed(2)), v => {
      C.stageCelebration.cutIn.end = C.stageCelebration.cutIn.start + v; normalizeCelebration();
    }, 0.2, 3, 0.01);
    for (const key of ['fadeIn', 'fadeOut']) number(celebration, 'celebration-cut-' + key, 'カットイン ' + (key === 'fadeIn' ? '登場' : '退場') + 'フェード（秒）', () => C.stageCelebration.cutIn[key], v => { C.stageCelebration.cutIn[key] = v; }, 0.01, 1, 0.01);
    for (const [key, title, max, step] of [['hearts','達成ハート 個数',96,1],['sparkles','達成キラキラ 個数',128,1],['spread','達成粒子 拡散範囲',1000,1],['glow','達成グロー 強さ',1,0.05],['rings','達成波紋 本数',8,1]]) {
      number(celebration, 'celebration-burst-' + key, title, () => C.stageCelebration.burst[key], v => { C.stageCelebration.burst[key] = v; }, 0, max, step);
    }
    const lifetimeHint = document.createElement('p'); lifetimeHint.textContent = 'カットインを延ばすと、必要な画面演出・バーストの寿命も自動で延長します。保存はExport / Copyを使用。'; celebration.append(lifetimeHint);
    action(celebration, 'debug-preview-stage-shift', '現在STAGEの切り替えを試す', () => {
      if (mode.paused || mode.freeze || g.stage >= C.stages.length - 1) {
        celebrationHint.textContent = 'STAGE 1～5を選択し、PAUSE・ステージ進行停止をOFFにしてから試してください。'; return;
      }
      playState(); g.spawn();
      const [x, y, radius] = C.stages[g.stage].circles.reduce((a, b) => a[1] + a[2] > b[1] + b[2] ? a : b);
      Object.assign(g.ball, { x, y: y + radius + C.ballRadius + 1, vx: 0, vy: 140 });
      g.hits = C.stages[g.stage].hits - 1; g.lastHit = -100; g.effects = []; g.hit(); ui.syncHud(); refresh();
    });
    const portraits = section('カットインのイラスト（次のSTAGE別）');
    const portraitHint = document.createElement('p'); portraitHint.textContent = '盤面上の配置とは独立。X/Yは左上座標、倍率1は横幅490。元画像全体を表示し、帯からはみ出す部分だけ非表示。目のフレームアウトは位置と倍率で調整。プレビューはゲームを進めず表示。Export / Copy / Reset対象です。'; portraits.append(portraitHint);
    let portraitStage = 1;
    const portraitLabel = document.createElement('label'); portraitLabel.textContent = '表示する次のSTAGE';
    const portraitSelect = document.createElement('select'); portraitSelect.id = 'cutin-stage';
    for (let i = 1; i < C.stages.length; i++) { const option = document.createElement('option'); option.value = i; option.textContent = 'STAGE ' + (i + 1); portraitSelect.append(option); }
    portraitSelect.addEventListener('change', () => { portraitStage = Number(portraitSelect.value); refresh(); });
    portraitLabel.append(portraitSelect); portraits.append(portraitLabel);
    const portrait = () => C.stageCelebration.cutIn.portraits[portraitStage];
    number(portraits, 'cutin-x', 'カットイン画像 左上X', () => portrait().x, v => { portrait().x = v; });
    number(portraits, 'cutin-y', 'カットイン画像 左上Y', () => portrait().y, v => { portrait().y = v; });
    number(portraits, 'cutin-scale', 'カットイン画像 表示倍率', () => portrait().scale, v => { portrait().scale = v; }, 0.1, 3, 0.01);
    const portraitCanvas = document.createElement('canvas'); portraitCanvas.id = 'cutin-preview'; portraitCanvas.width = C.width; portraitCanvas.height = 470; portraitCanvas.style.width = '100%'; portraitCanvas.setAttribute('aria-label', 'カットイン構図プレビュー'); portraits.append(portraitCanvas);
    const portraitBuffer = document.createElement('canvas'); portraitBuffer.width = C.width; portraitBuffer.height = C.height;
    const portraitRenderer = new P.Renderer(portraitBuffer); portraitRenderer.images = renderer.images;
    let portraitSignature;
    function previewPortrait() {
      if (!portraits.open || !renderer.images.stage2) return;
      const signature = JSON.stringify([portraitStage, C.stageCelebration]);
      if (signature === portraitSignature) return;
      portraitSignature = signature;
      portraitRenderer.ctx.clearRect(0, 0, C.width, C.height);
      const s = C.stageCelebration, cut = s.cutIn;
      portraitRenderer.drawStageCinematic({ stage: portraitStage - 1, age: (cut.start + cut.end) / 2, celebration: s, x: 512, y: 500 });
      const ctx = portraitCanvas.getContext('2d'); ctx.clearRect(0, 0, C.width, 470); ctx.drawImage(portraitBuffer, 0, 545, C.width, 470, 0, 0, C.width, 470);
    }
    const physics = section('物理 / 発射');
    [['gravity', '重力', 0, 5000], ['maxSpeed', '最大速度', 1, 5000], ['restitution', '壁・フリッパー反発', 0, 1.5, 0.01], ['ballRadius', 'ボール半径', 1, 100], ['flipperTransfer', '打ち返す強さ', 0, 3, 0.05], ['flipperSpeed', '回転速度rad/s', 0.1, 50, 0.1], ['initialBalls', '初期BALL', 1, 999], ['stallSeconds', '停止復帰秒', 0.1, 60, 0.1], ['maxUpperSeconds', '上部復帰秒', 0.1, 60, 0.1]].forEach(([key, title, min, max, step]) => number(physics, 'physics-' + key, title, () => C[key], v => { C[key] = v; }, min, max, step ?? 1));
    [['x', '発射位置X', 0, 1024], ['y', '発射位置Y', 0, 1536], ['vy', '初速Y（負で上向き）', -5000, 5000], ['horizontalSpread', '初速Xのランダム幅', 0, 2000]].forEach(([key, title, min, max]) => number(physics, 'launch-' + key, title, () => C.launch[key], v => { C.launch[key] = v; }, min, max));
    const velocity = section('現在ボールの位置 / 速度');
    [['x', 'X', -100, 1124], ['y', 'Y', 0, 1600], ['vx', '速度X', -5000, 5000], ['vy', '速度Y', -5000, 5000]].forEach(([key, title, min, max]) => number(velocity, 'ball-' + key, title, () => g.ball?.[key] ?? 0, v => { if (g.ball) { g.ball[key] = v; g.motionSamples = []; g.slowTime = g.upperTime = 0; } }, min, max, 0.1));
    for (let i = 0; i < 2; i++) {
      const group = section((i ? '右' : '左') + 'フリッパー');
      [['x', 'pivot X', 0, 1024], ['y', 'pivot Y', 0, 1536], ['length', '長さ', 1, 500], ['radius', '判定半径', 1, 100], ['rest', '待機角rad', -6.28, 6.28, 0.01], ['active', '操作角rad', -6.28, 6.28, 0.01]].forEach(([key, title, min, max, step]) => number(group, 'flipper-' + i + '-' + key, title, () => C.flippers[i][key], v => { C.flippers[i][key] = v; if (key === 'rest') g.flippers[i].angle = v; }, min, max, step ?? 1));
    }
    const walls = section('壁・レール端点（向きは内向き法線を維持）');
    C.walls.forEach((_, i) => ['始点X', '始点Y', '終点X', '終点Y'].forEach((title, j) => number(walls, 'wall-' + i + '-' + j, (i + 1) + ': ' + title, () => C.walls[i][j], v => { const next = [...C.walls[i]]; next[j] = v; if (Math.hypot(next[2] - next[0], next[3] - next[1]) >= 1) C.walls[i][j] = v; }, -3000, 3000)));
    const visible = section('当たり判定表示');
    [['walls', '壁・レール（緑 / 内向き法線）'], ['character', 'キャラクター複合円（水色）'], ['flippers', 'フリッパー（ピンク）'], ['ball', 'ボール（黄）'], ['pivots', 'pivot（白）'], ['trail', '短いボール軌跡']].forEach(([key, title]) => toggle(visible, key, title));
    const settings = section('設定一覧 / Export', true);
    const output = document.createElement('textarea'); output.id = 'debug-export'; output.readOnly = true; output.setAttribute('aria-label', '設定出力');
    const message = document.createElement('p'); message.id = 'debug-message'; message.textContent = 'Export JSはconfig.js全体の置換用。ファイルへ自動書き込みはしません。';
    function exportConfig(js) { const json = JSON.stringify(C, null, 2); output.value = js ? '(function (P) {\n  P.CONFIG = ' + json + ';\n})(globalThis.Pinball = globalThis.Pinball || {});\n' : json; message.textContent = js ? 'config.js用テキストを出力しました。' : '現在の全設定をJSONで出力しました。'; }
    action(settings, 'debug-reset-config', '初期設定へReset', () => { Object.keys(C).forEach(key => delete C[key]); Object.assign(C, JSON.parse(JSON.stringify(defaults))); applyConfig(); refresh(); exportConfig(false); });
    action(settings, 'debug-export-json', '一覧 / Export JSON', () => exportConfig(false));
    action(settings, 'debug-export-js', 'Export config.js', () => exportConfig(true));
    action(settings, 'debug-copy', 'Copy', async () => { if (!output.value) exportConfig(false); try { await navigator.clipboard.writeText(output.value); message.textContent = 'コピーしました。'; } catch { output.focus(); output.select(); message.textContent = '自動コピー不可：選択済みのテキストをCtrl+Cでコピーしてください。'; } });
    settings.append(output, message); exportConfig(false);
    // Hooks exist only after this debug-only module has loaded.
    const originalHit = g.hit.bind(g), originalTick = g.tick.bind(g), originalEvent = g.onEvent;
    g.hit = function () { originalHit(!mode.freeze); if (mode.freeze) { this.transition = 0; this.stageShift = null; this.cinematicTail = 0; } };
    g.onEvent = function (event, value, contact) { if (event === 'lost' && mode.immortal && this.balls <= 0) this.balls = 1; originalEvent(event, value, contact); if (['stage', 'start', 'hit', 'lost'].includes(event)) refresh(); };
    g.tick = function (dt) { if (mode.paused) return; if (mode.freeze) { this.transition = 0; this.stageShift = null; this.cinematicTail = 0; } originalTick(dt * (mode.slow ? 0.2 : 1)); };
    const originalDraw = renderer.draw.bind(renderer); let lastStatus = 0;
    renderer.draw = function (game) {
      originalDraw(game); previewPortrait(); const ctx = this.ctx; ctx.save(); ctx.lineWidth = 3;
      if (mode.walls) { ctx.strokeStyle = '#66ff90'; for (const [ax, ay, bx, by] of C.walls) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); const dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy); ctx.beginPath(); ctx.moveTo((ax + bx) / 2, (ay + by) / 2); ctx.lineTo((ax + bx) / 2 + dy / n * 28, (ay + by) / 2 - dx / n * 28); ctx.stroke(); } }
      if (mode.character && game.state !== 'clear') { ctx.strokeStyle = '#6de8ff'; for (const [x, y, r] of C.stages[game.stage].circles) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); } }
      for (const f of game.flippers) {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle);
        if (mode.flippers) { ctx.strokeStyle = '#ff88cf'; ctx.beginPath(); ctx.moveTo(0, -f.radius); ctx.lineTo(f.length, -f.radius); ctx.arc(f.length, 0, f.radius, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, f.radius); ctx.arc(0, 0, f.radius, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); }
        if (mode.pivots) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke(); } ctx.restore();
      }
      if (game.ball) { const b = game.ball; ctx.strokeStyle = '#ffed70'; if (mode.ball) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); } if (mode.trail && b.trail.length) { ctx.beginPath(); b.trail.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); } }
      ctx.restore();
      if (performance.now() - lastStatus > 150) { lastStatus = performance.now(); const b = game.ball; status.textContent = 'STAGE ' + (game.stage + 1) + ' | ' + game.state + (mode.paused ? ' | PAUSED' : '') + '\n速度 ' + (b ? Math.hypot(b.vx, b.vy).toFixed(1) : '—') + ' px/s' + (b ? '\nvx ' + b.vx.toFixed(1) + ' / vy ' + b.vy.toFixed(1) + '\nx ' + b.x.toFixed(1) + ' / y ' + b.y.toFixed(1) : '') + (mode.slow ? '\nスロー20%（表示速度は物理時間基準）' : ''); refreshVoiceStatus(); if (document.activeElement?.closest('#debug-panel') == null) refresh(); }
    };
    app.debug = { mode }; refresh();
  };
})(globalThis.Pinball);
