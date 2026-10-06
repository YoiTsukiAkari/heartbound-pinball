(function (P) {
  'use strict';
  // Clear-only presentation. Effects run in CSS time, independently of physics.
  P.ClearScene = class {
    constructor(parent, restart, { particleCount = 64, ambientCount = 18 } = {}) {
      this.particleCount = particleCount; this.ambientCount = ambientCount;
      this.root = document.createElement('div'); this.root.id = 'clear-scene';
      this.root.hidden = true; this.root.tabIndex = -1; this.root.setAttribute('aria-label', 'ゲームクリア');
      this.root.innerHTML = '<div class="clear-effects" aria-hidden="true"></div><div class="clear-copy"><p>ALL SIX HEARTS ARE YOURS</p><h2 id="clear-title">GAME CLEAR</h2></div><p class="clear-hint">キーまたはタップで再プレイボタンを表示</p><button id="clear-again" type="button">PLAY AGAIN ♥</button>';
      this.effects = this.root.querySelector('.clear-effects');
      this.hint = this.root.querySelector('.clear-hint'); this.button = this.root.querySelector('button');
      this.button.addEventListener('click', event => { event.stopPropagation(); if (this.revealed) restart(); });
      this.root.addEventListener('click', () => this.reveal()); parent.append(this.root);
    }
    show() {
      this.revealed = false; this.button.disabled = true;
      this.root.classList.remove('show-replay'); this.hint.hidden = false;
      // Rebuild each time so every clear (including debug previews) restarts its sequence.
      // Separate opening, burst and ambient layers make later additions independent.
      const opening = document.createElement('div'); opening.className = 'clear-opening';
      opening.innerHTML = '<i class="clear-bloom"></i><i class="clear-rays"></i><i class="clear-aura"></i>';
      for (let i = 0; i < 3; i++) {
        const wave = document.createElement('i'); wave.className = 'clear-wave'; wave.style.setProperty('--delay', (0.18 + i * 0.32) + 's'); opening.append(wave);
      }
      const crown = document.createElement('div'); crown.className = 'clear-crown';
      for (let i = 0; i < 6; i++) { const heart = document.createElement('b'); heart.textContent = '♥'; heart.style.setProperty('--delay', (0.5 + i * 0.12) + 's'); crown.append(heart); }
      const burst = document.createElement('div'); burst.className = 'clear-burst';
      const width = this.root.parentElement.clientWidth, height = this.root.parentElement.clientHeight;
      for (let i = 0; i < this.particleCount; i++) {
        const particle = document.createElement('span'); particle.className = 'clear-burst-particle'; particle.textContent = i % 3 ? '✦' : '♥';
        const angle = i * 2.399963, distance = 0.3 + (i % 7) * 0.055;
        particle.style.setProperty('--dx', Math.cos(angle) * width * distance + 'px');
        particle.style.setProperty('--dy', Math.sin(angle) * height * distance + 'px');
        particle.style.setProperty('--delay', (0.16 + (i % 8) * 0.075) + 's');
        particle.style.setProperty('--size', (12 + i % 5 * 4) + 'px');
        particle.style.setProperty('--tone', i % 3 === 0 ? '#ff79bd' : i % 5 === 0 ? '#cc9bff' : '#fff0c9'); burst.append(particle);
      }
      const ambient = document.createElement('div'); ambient.className = 'clear-ambient';
      for (let i = 0; i < this.ambientCount; i++) {
        const particle = document.createElement('span'); particle.className = 'clear-ambient-particle'; particle.textContent = i % 3 ? '✧' : '♥';
        // Keep lingering effects beside the portrait, leaving its face and body clear.
        particle.style.left = (i % 2 ? 84 + i * 7 % 13 : 3 + i * 7 % 13) + '%';
        particle.style.top = (18 + i * 31 % 78) + '%';
        particle.style.setProperty('--delay', (1.4 + i * 0.19) + 's');
        particle.style.setProperty('--duration', (4.8 + i % 4 * 0.7) + 's');
        particle.style.setProperty('--drift', (i % 2 ? -12 : 12) + 'px'); ambient.append(particle);
      }
      this.effects.replaceChildren(opening, crown, burst, ambient);
      this.root.hidden = false; this.root.focus({ preventScroll: true });
    }
    reveal() {
      if (this.root.hidden || this.revealed) return;
      this.revealed = true; this.button.disabled = false; this.hint.hidden = true;
      this.root.classList.add('show-replay'); this.button.focus({ preventScroll: true });
    }
    hide() { this.root.hidden = true; this.effects.replaceChildren(); }
  };
})(globalThis.Pinball);
