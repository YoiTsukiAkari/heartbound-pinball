(function (P) {
  'use strict';
  P.setupMMode = function (app, ui, refreshIcons) {
    const dialog = document.createElement('dialog');
    dialog.id = 'm-mode-dialog'; dialog.setAttribute('aria-labelledby', 'm-mode-title');
    dialog.innerHTML = '<header class="m-header"><h2 id="m-mode-title">Maintenance ❤</h2><button type="button" id="m-close">CLOSE</button></header><p class="m-hint">開いたまま調整結果を確認できます。止めたい時はPAUSEを使用。調整は再読み込みで初期設定へ戻ります。M / ESC で閉じる</p><label class="m-category">調整項目 <select id="m-category"></select></label><div id="m-content"></div><p id="m-error" role="status"></p>';
    document.body.append(dialog);
    const content = dialog.querySelector('#m-content'), select = dialog.querySelector('#m-category');
    const categories = ['プレイ / テスト','キャラクター / 判定','エフェクト','物理 / 盤面','音声 / BGM','設定 / Export・Import'];
    categories.forEach((title, i) => { const option = document.createElement('option'); option.value = i; option.textContent = title; select.append(option); });
    let loading = false, panel, home, homeNext, wasHidden, sections = [], sectionStates = [];
    const group = title => /音声|BGM/.test(title) ? 4 : /設定一覧/.test(title) ? 5 : /物理|位置 \/ 速度|フリッパー|壁・レール/.test(title) ? 3 : /ステージ \/ テスト/.test(title) ? 0 : /現在STAGE|イラスト|当たり判定/.test(title) ? 1 : 2;
    function category() {
      sections.forEach(section => { section.hidden = group(section.querySelector('summary').textContent) !== Number(select.value); });
      content.scrollTop = 0;
    }
    select.addEventListener('change', category);
    function close() {
      if (!dialog.open) return;
      dialog.close(); document.body.classList.remove('maintenance-open');
      if (panel) {
        sections.forEach((section,i) => { section.hidden = false; section.open = sectionStates[i]; });
        panel.classList.remove('m-tuning-panel'); panel.hidden = wasHidden;
        home.insertBefore(panel, homeNext?.parentNode === home ? homeNext : null);
      }
      app.sound.preview(false); if (app.sound.voicePreview) app.sound.stopVoice(); ui.releaseInput(); ui.resetClock(); refreshIcons();
    }
    async function open() {
      if (dialog.open || loading) return;
      loading = true; ui.releaseInput(); dialog.show(); document.body.classList.add('maintenance-open'); ui.resetClock(); refreshIcons();
      dialog.querySelector('#m-error').textContent = '調整項目を読み込み中…';
      try {
        const tuning = await app.ensureTuning();
        if (!dialog.open) return;
        panel = tuning.panel; home = panel.parentNode; homeNext = panel.nextSibling; wasHidden = panel.hidden;
        sections = [...panel.querySelectorAll(':scope > details')]; sectionStates = sections.map(section => section.open);
        sections.forEach(section => { section.open = true; });
        panel.hidden = false; panel.classList.add('m-tuning-panel'); content.append(panel); tuning.refresh(); category();
        panel.querySelector('#debug-export-json').click();
        dialog.querySelector('#m-error').textContent = ''; select.focus();
      } catch (_) { dialog.querySelector('#m-error').textContent = '読み込みに失敗しました。閉じてもう一度Mを開いてください。'; }
      finally { loading = false; }
    }
    dialog.querySelector('#m-close').addEventListener('click', close);
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'Escape' || (['m','M'].includes(e.key) && !e.target.closest('input,textarea'))) {
        e.preventDefault(); e.stopPropagation(); if (!e.repeat) close();
      }
    });
    const controller = { close, toggle() { if (dialog.open) close(); else open(); }, get isOpen() { return dialog.open; } };
    app.mMode = controller; return controller;
  };
})(globalThis.Pinball);
