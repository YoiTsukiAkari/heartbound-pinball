(function (P) {
  'use strict';
  // User-selected local BGM plus homemade music-box alternatives and effects.
  // A familiar opening, a brighter middle, then a short return and E-major
  // cadence back to A minor. 88 eighth notes at 88 BPM make a 30-second loop.
  const melody = [
    81, 84, 88, 84, 79, 83, 86, 83,
    77, 81, 84, 81, 76, 79, 83, 79,
    81, 88, 91, 88, 79, 86, 88, 83,
    77, 84, 88, 84, 76, 83, 86, 79,
    84, 88, 89, 88, 83, 86, 88, 86,
    81, 84, 88, 91, 83, 88, 86, 83,
    89, 88, 84, 81, 88, 86, 83, 79,
    84, 81, 77, 81, 83, 80, 76, 80,
    81, 84, 88, 84, 79, 83, 86, 83,
    77, 81, 84, 88, 83, 81, 79, 76,
    76, 80, 83, 88, 83, 80, 76, null
  ];
  const chords = [
    [45, 52, 60], [43, 50, 59], [41, 48, 57], [40, 47, 55],
    [45, 52, 60], [43, 50, 59], [41, 48, 57], [40, 47, 55],
    [41, 48, 57], [43, 50, 59], [45, 52, 60], [40, 47, 59],
    [41, 48, 57], [43, 50, 59], [38, 45, 53], [40, 47, 56],
    [45, 52, 60], [43, 50, 59], [41, 48, 57], [43, 50, 59],
    [40, 47, 56], [40, 47, 56]
  ];
  const pieces = {
    moonlit: { name: 'moonlit.free61（初期設定）', file: 'assets/audio/music/moonlit.free61.wav' },
    original: { name: '最初の曲：オルゴール（約10.9秒）', melody: melody.slice(0, 32), chords: chords.slice(0, 8), pad: false },
    classic: { name: 'オルゴール（30秒版）', melody, chords, pad: false },
    pleasant: {
      name: '新曲：花あかり（オルゴール・24秒）', pad: false, tempo: 80,
      melodyVolume: 0.08, melodyDuration: 0.8, chordVolume: 0.018,
      // A small rising motif returns gently; space lets each music-box note ring.
      melody: [
        81, null, 84, 86, 84, 81, 79, null,
        79, 81, 84, null, 88, 86, 84, null,
        81, null, 86, 88, 86, 84, 81, null,
        79, 81, 84, null, 83, 81, 79, null,
        82, null, 86, 89, 88, 86, 84, null,
        81, 84, 86, null, 84, 81, 77, null,
        79, null, 82, 86, 84, 82, 79, null,
        79, 81, 84, null, 86, 84, 79, null
      ],
      chords: [
        [41, 48, 57], [41, 48, 57], [40, 48, 55], [40, 48, 55],
        [38, 45, 53], [38, 45, 53], [45, 52, 60], [45, 52, 60],
        [46, 53, 62], [46, 53, 62], [45, 53, 60], [45, 53, 60],
        [43, 50, 58], [43, 50, 58], [48, 55, 64], [48, 55, 64]
      ]
    },
    dream: {
      name: '新曲：月明かりのハート（オルゴール＋シンセ）', pad: true,
      melody: [
        81, null, 88, 86, 84, 81, 79, null,
        77, 81, 84, null, 88, 84, 81, null,
        79, null, 86, 84, 83, 79, 76, null,
        81, 84, 88, 91, 88, null, 84, 81,
        89, null, 88, 84, 81, 84, 88, null,
        88, 86, 83, null, 79, 83, 86, null,
        84, 88, 91, null, 93, 91, 88, 84,
        89, 88, 84, 81, 83, null, 80, 76,
        81, null, 84, 88, 86, 84, 81, null,
        77, 81, 84, 88, 86, 83, 79, null,
        80, null, 83, 88, 86, 83, 80, null
      ],
      chords: [
        [45, 52, 60], [45, 52, 60], [41, 48, 57], [41, 48, 57],
        [43, 50, 59], [40, 47, 55], [45, 52, 60], [48, 55, 64],
        [41, 48, 57], [41, 48, 60], [43, 50, 59], [43, 50, 62],
        [45, 52, 60], [48, 55, 64], [38, 45, 53], [40, 47, 56],
        [45, 52, 60], [45, 52, 60], [41, 48, 57], [43, 50, 59],
        [40, 47, 56], [40, 47, 56]
      ]
    },
    duet: {
      name: '新曲：ハート・ポップ（オルゴール二重奏）', pad: false, tempo: 96,
      melodyVolume: 0.065, chordVolume: 0.018,
      // C-major hooks with offbeat answers: two music boxes, no drums or synth.
      melody: [
        84, 88, 91, null, 88, 91, 93, 91,
        88, null, 84, 88, 91, 88, 86, null,
        89, 88, 84, null, 81, 84, 89, 88,
        86, null, 91, 89, 88, 86, 83, null,
        91, 93, 96, null, 93, 91, 88, 91,
        93, null, 91, 88, 84, 88, 91, null,
        89, 93, 91, null, 88, 86, 84, 88,
        86, 89, 91, null, 89, 86, 83, null
      ],
      harmony: [
        null, 76, 79, 84, null, 79, 81, 79,
        72, 76, null, 79, null, 76, 74, 76,
        null, 77, 81, 84, null, 81, 84, 81,
        74, 79, null, 83, null, 79, 77, 79,
        null, 84, 88, 91, null, 88, 84, 79,
        81, 84, null, 88, null, 84, 79, 76,
        null, 81, 84, 89, null, 79, 76, 79,
        79, null, 83, 86, null, 83, 79, 83
      ],
      chords: [
        [48, 55, 64], [48, 55, 64], [45, 52, 60], [45, 52, 60],
        [41, 48, 57], [41, 48, 57], [43, 50, 59], [43, 50, 59],
        [48, 55, 64], [48, 55, 64], [45, 52, 60], [45, 52, 60],
        [41, 48, 57], [43, 50, 59], [43, 50, 59], [43, 50, 59]
      ]
    }
  };
  class Sound {
    constructor() {
      this.context = null; this.scene = 'ready'; this.paused = false;
      this.step = 0; this.next = 0; this.last = {}; this.nodes = new Set();
      this.musicPreview = false; this.gamePaused = false;
      this.hard = false;
      this.buffers = new Map(); this.loading = new Map(); this.fileSource = null;
      this.musicError = '';
      this.voiceSource = null; this.voicePreview = false; this.lastVoice = ''; this.voiceRequest = 0; this.voiceGains = new Map(); this.voiceError = '';
      this.timer = setInterval(() => this.schedule(), 50);
    }
    get settings() { return P.CONFIG.sound; }
    static get musicChoices() { return Object.entries(pieces).map(([id, piece]) => ({ id, name: piece.name })); }
    get piece() { return pieces[this.settings.pattern] || pieces.original; }
    get musicTempo() { return this.settings.tempo * (this.piece.tempo ?? 88) / 88; }
    get musicLoopSeconds() { return this.piece.file ? (this.buffers.get(this.piece.file)?.duration ?? 0) : this.piece.melody.length * 30 / this.musicTempo; }
    restartMusic() { this.stopNotes(); this.step = 0; this.next = (this.context?.currentTime ?? 0) + 0.03; }
    preview(enabled) {
      this.musicPreview = enabled; this.restartMusic(); this.unlock();
      this.update(this.scene, this.gamePaused);
    }
    unlock() {
      try {
        if (!this.context) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          this.context = new Audio();
          this.music = this.context.createGain(); this.effects = this.context.createGain();
          this.voice = this.context.createGain();
          this.clearVoice = this.context.createGain();
          this.hardClearVoice = this.context.createGain();
          this.master = this.context.createGain();
          // Keep a dry bypass for normal play; only hard mode uses the filter.
          this.musicDry = this.context.createGain(); this.musicFiltered = this.context.createGain();
          this.musicFilter = this.context.createBiquadFilter();
          this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 1400; this.musicFilter.Q.value = 0.5;
          this.music.connect(this.musicDry); this.musicDry.connect(this.master);
          this.music.connect(this.musicFilter); this.musicFilter.connect(this.musicFiltered); this.musicFiltered.connect(this.master);
          this.echoInput = this.context.createGain(); this.echoDelay = this.context.createDelay(1);
          this.echoDelay.delayTime.value = 0.22;
          this.echoFeedback = this.context.createGain(); this.echoFeedback.gain.value = 0.24;
          this.echoFilter = this.context.createBiquadFilter(); this.echoFilter.type = 'lowpass'; this.echoFilter.frequency.value = 2800;
          this.echoWet = this.context.createGain();
          this.echoInput.connect(this.echoDelay); this.echoDelay.connect(this.echoFilter);
          this.echoFilter.connect(this.echoFeedback); this.echoFeedback.connect(this.echoDelay);
          this.echoFilter.connect(this.echoWet); this.echoWet.connect(this.effects);
          this.hitEffects = this.context.createGain(); this.hitEffects.connect(this.effects);
          this.voiceInput = this.context.createGain();
          for (const bus of [this.voice, this.clearVoice]) bus.connect(this.voiceInput);
          const voiceRoute = this.createVoiceRoute(this.voiceInput, true);
          this.voiceDry = voiceRoute.dry; this.voiceNear = voiceRoute.near;
          this.voiceCompressor = voiceRoute.compressor; this.voicePanner = voiceRoute.panner;
          // Hard-clear voice keeps proximity processing but has no echo send.
          this.hardClearRoute = this.createVoiceRoute(this.hardClearVoice, false);
          this.echoSources = [this.voiceDry, this.voiceNear];
          this.effects.connect(this.master);
          this.applyAtmosphere(true);
          this.master.connect(this.context.destination); this.next = this.context.currentTime;
        }
        if (!this.paused && !document.hidden) this.context.resume().catch(() => {});
        this.volumes();
        for (const file of new Set([...P.CONFIG.voices.flat(), this.settings.clearVoiceFile, this.settings.hardClearVoiceFile].filter(Boolean))) this.loadVoice(file);
      } catch (_) { /* Audio is optional: gameplay remains available. */ }
    }
    createVoiceRoute(input, echo) {
      const dry = this.context.createGain(), near = this.context.createGain();
      input.connect(dry); dry.connect(this.effects);
      // A warm, softly compressed close-mic branch; the original WAV stays intact.
      const highpass = this.context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 90;
      const warmth = this.context.createBiquadFilter(); warmth.type = 'lowshelf'; warmth.frequency.value = 220; warmth.gain.value = 2;
      const lowpass = this.context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 6500;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -24; compressor.knee.value = 18; compressor.ratio.value = 2.2;
      compressor.attack.value = 0.008; compressor.release.value = 0.12;
      const panner = this.context.createStereoPanner();
      input.connect(highpass); highpass.connect(warmth); warmth.connect(lowpass); lowpass.connect(compressor);
      compressor.connect(panner); panner.connect(near); near.connect(this.effects);
      if (echo) { dry.connect(this.echoInput); near.connect(this.echoInput); }
      return { dry, near, compressor, panner };
    }
    volumes() {
      if (!this.context) return;
      const s = this.settings, t = this.context.currentTime;
      this.music.gain.setTargetAtTime(s.musicVolume, t, 0.03);
      this.effects.gain.setTargetAtTime(s.effectsVolume, t, 0.03);
      this.voice.gain.value = s.voiceVolume ?? 0.45;
      this.clearVoice.gain.value = s.clearVoiceVolume ?? 0.62;
      this.hardClearVoice.gain.value = s.hardClearVoiceVolume ?? 0.52;
      this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.02);
      this.applyAtmosphere();
    }
    setHard(enabled) {
      if (this.hard === enabled) return;
      this.hard = enabled; this.applyAtmosphere();
    }
    applyAtmosphere(immediate = false) {
      if (!this.context) return;
      const t = this.context.currentTime;
      const s = P.CONFIG.hardEffects;
      const proximity = this.hard ? s.voiceNear : 0;
      for (const [param, value] of [[this.musicDry.gain, this.hard ? 0 : 1], [this.musicFiltered.gain, this.hard ? 1 : 0], [this.echoInput.gain, this.hard ? 1 : 0], [this.echoWet.gain, this.hard ? s.echoMix : 0], [this.musicFilter.frequency, s.musicCutoff], [this.echoDelay.delayTime, s.echoDelay], [this.echoFeedback.gain, s.echoFeedback], [this.voiceDry.gain, 1 - proximity], [this.voiceNear.gain, proximity], [this.voicePanner.pan, this.hard ? s.voicePan : 0], [this.hardClearRoute.dry.gain, 1 - proximity], [this.hardClearRoute.near.gain, proximity], [this.hardClearRoute.panner.pan, this.hard ? s.voicePan : 0]]) {
        param.cancelScheduledValues(t);
        if (immediate) param.value = value;
        else param.setTargetAtTime(value, t, 0.05);
      }
    }
    stopNotes() {
      if (this.fileSource) {
        try { this.fileSource.stop(); } catch (_) {}
        this.fileSource.disconnect(); this.fileSource = null;
      }
      for (const node of this.nodes) { try { node.stop(); } catch (_) {} }
      this.nodes.clear();
    }
    update(scene, paused) {
      this.gamePaused = paused;
      if (scene !== this.scene) {
        if (!this.musicPreview) this.restartMusic();
        this.scene = scene;
      }
      const suspend = (!this.musicPreview && !this.voicePreview && paused) || document.hidden;
      if (suspend !== this.paused) {
        this.paused = suspend;
        if (this.context) {
          if (suspend) this.context.suspend().catch(() => {});
          else this.context.resume().catch(() => {});
        }
      }
    }
    tone(note, at, duration, volume, bus, mellow = false) {
      if (!this.context) return;
      const frequency = 440 * 2 ** ((note - 69) / 12);
      // Gentle bell overtones and soft attacks avoid sharp mechanical clicks.
      for (const [ratio, gain] of (mellow ? [[1, 1]] : [[1, 1], [2, 0.23], [3, 0.07]])) {
        const osc = this.context.createOscillator(), envelope = this.context.createGain();
        osc.type = 'sine'; osc.frequency.value = frequency * ratio;
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(volume * gain, at + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        osc.connect(envelope); envelope.connect(bus);
        this.nodes.add(osc);
        osc.onended = () => { this.nodes.delete(osc); osc.disconnect(); envelope.disconnect(); };
        osc.start(at); osc.stop(at + duration + 0.02);
      }
    }
    schedule() {
      if (!this.context || this.context.state !== 'running' || this.paused || (this.voicePreview && this.gamePaused) || (this.scene !== 'playing' && !this.musicPreview)) return;
      if (this.piece.file) { this.playFile(); return; }
      const now = this.context.currentTime, beat = 30 / this.musicTempo;
      const { melody, chords, pad, harmony, melodyVolume = 0.085, melodyDuration = 0.65, chordVolume = 0.025 } = this.piece;
      if (this.next < now) this.next = now + 0.02;
      while (this.next < now + 0.15) {
        const note = melody[this.step % melody.length];
        if (note !== null) this.tone(note, this.next, harmony ? 0.48 : melodyDuration, melodyVolume, this.music);
        if (harmony) {
          const answer = harmony[this.step % harmony.length];
          if (answer !== null) this.tone(answer, this.next + beat * 0.06, 0.42, 0.042, this.music);
        }
        if (this.step % 4 === 0) {
          const chord = chords[Math.floor(this.step / 4) % chords.length];
          chord.forEach(n => this.tone(n, this.next, beat * 3.8, chordVolume, this.music, true));
          if (pad && this.step % 8 === 0) chord.forEach(n => this.padTone(n + 12, this.next, beat * 7.8));
        }
        this.step++; this.next += beat;
      }
    }
    playFile() {
      const file = this.piece.file;
      if (this.fileSource) return;
      const buffer = this.buffers.get(file);
      if (buffer) {
        const source = this.context.createBufferSource();
        source.buffer = buffer; source.loop = true; source.connect(this.music);
        this.fileSource = source; source.start();
      } else if (!this.loading.has(file)) {
        this.musicError = '';
        const pending = fetch(file).then(response => {
          if (!response.ok) throw new Error('BGMを読み込めませんでした');
          return response.arrayBuffer();
        }).then(data => this.context.decodeAudioData(data)).then(decoded => {
          this.buffers.set(file, decoded);
        }).catch(error => { this.musicError = error.message; });
        // Cache failures as well: avoid repeated requests while gameplay continues.
        this.loading.set(file, pending);
      }
    }
    loadVoice(file) {
      if (this.buffers.has(file)) return Promise.resolve(this.buffers.get(file));
      if (this.loading.has(file)) return this.loading.get(file);
      const pending = fetch(file).then(response => {
        if (!response.ok) throw new Error('HIT音声を読み込めませんでした: ' + file);
        return response.arrayBuffer();
      }).then(data => this.context.decodeAudioData(data)).then(buffer => {
        // Normalize playback gain only; preserve original WAV samples on disk.
        let peak = 0, sum = 0, samples = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          for (const value of buffer.getChannelData(channel)) {
            peak = Math.max(peak, Math.abs(value)); sum += value * value; samples++;
          }
        }
        const rms = Math.sqrt(sum / Math.max(1, samples));
        const targetRms = file.startsWith('assets/audio/voices/mao/') ? 0.1 : 0.18;
        this.voiceGains.set(file, Math.min(4, targetRms / Math.max(rms, 0.001), 0.9 / Math.max(peak, 0.001)));
        this.buffers.set(file, buffer); return buffer;
      }).catch(error => { this.voiceError = error.message; return null; });
      this.loading.set(file, pending); return pending;
    }
    stopVoice() {
      this.voiceRequest++;
      if (this.voicePreview) { this.voicePreview = false; this.update(this.scene, this.gamePaused); }
      if (this.voiceSource) {
        try { this.voiceSource.stop(); } catch (_) {}
        this.voiceSource = null;
      }
    }
    playClearVoice(preview = false, hard = false) { return this.playVoice(null, preview, hard ? 'hard' : true); }
    async playVoice(stage, preview = false, clear = false) {
      const files = clear ? [clear === 'hard' ? this.settings.hardClearVoiceFile : this.settings.clearVoiceFile].filter(Boolean) : (P.CONFIG.voices[stage] ?? []).filter(file => this.settings.voiceEnabled?.[file] !== false);
      if (!files.length) { this.stopVoice(); this.lastVoice = ''; return; }
      if (document.hidden || this.musicPreview || this.settings.muted || (!preview && (!this.context || this.paused))) return;
      this.stopVoice();
      if (preview) { this.voicePreview = true; this.update(this.scene, this.gamePaused); this.unlock(); }
      if (!this.context) { this.stopVoice(); return; }
      const request = this.voiceRequest;
      const file = files[Math.floor(Math.random() * files.length)];
      const buffer = await this.loadVoice(file);
      if (request !== this.voiceRequest) return;
      if (!buffer || this.paused || document.hidden || this.musicPreview || this.settings.muted || (!clear && this.settings.voiceEnabled?.[file] === false)) { this.stopVoice(); return; }
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = this.voiceGains.get(file);
      source.connect(gain); gain.connect(clear === 'hard' ? this.hardClearVoice : clear ? this.clearVoice : this.voice);
      this.voiceSource = source; this.lastVoice = file;
      source.onended = () => {
        source.disconnect(); gain.disconnect();
        if (this.voiceSource === source) { this.voiceSource = null;
          if (this.voicePreview) { this.voicePreview = false; this.update(this.scene, this.gamePaused); }
        }
      };
      source.start();
    }
    padTone(note, at, duration) {
      const ctx = this.context, envelope = ctx.createGain(), filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 1100; filter.Q.value = 0.4;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.012, at + 0.35);
      envelope.gain.setValueAtTime(0.012, at + duration * 0.65);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      filter.connect(envelope); envelope.connect(this.music);
      const voices = [-4, 4].map(detune => {
        const osc = ctx.createOscillator(); osc.type = 'triangle';
        osc.frequency.value = 440 * 2 ** ((note - 69) / 12); osc.detune.value = detune;
        osc.connect(filter); this.nodes.add(osc);
        osc.onended = () => {
          this.nodes.delete(osc); osc.disconnect();
          if (voices.every(v => !this.nodes.has(v))) { filter.disconnect(); envelope.disconnect(); }
        };
        osc.start(at); osc.stop(at + duration + 0.02); return osc;
      });
    }
    play(kind, tier = 0, strength = 300) {
      if (!this.context || this.context.state === 'closed' || this.paused || document.hidden || this.musicPreview) return;
      const now = this.context.currentTime;
      if (['wall', 'flipper'].includes(kind)) return;
      const recipes = {
        start: [72, 76, 81],
        hit: [81, 88, 93, 96].slice(0, 2 + Math.min(2, tier)),
        stage: [81, 84, 88, 93, 96, 100], clear: [81, 84, 88, 93, 96, 100, 105, 108],
        lost: [81, 76, 72], over: [76, 72, 69, 64]
      };
      const notes = recipes[kind]; if (!notes) return;
      const spacing = kind === 'clear' ? 0.14 : kind === 'stage' ? 0.085 : 0.065;
      notes.forEach((n, i) => this.tone(n + (kind === 'hit' ? tier : 0), now + i * spacing, 0.55, 0.12, ['hit', 'stage'].includes(kind) ? this.hitEffects : this.effects));
      if (kind === 'clear') [69, 76, 81, 84, 88].forEach(n => this.tone(n, now + 0.95, 2.2, 0.08, this.effects));
    }
  }
  P.Sound = Sound;
})(globalThis.Pinball = globalThis.Pinball || {});
