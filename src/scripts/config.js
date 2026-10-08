(function (P) {
  'use strict';
  // All play-feel values are provisional; tune here after playtesting.
  P.CONFIG = {
    width: 1024, height: 1536, step: 1 / 240,
    hardEffects: {
      tintOpacity: 0.24, tintHue: 271, heartCount: 33, heartSize: 40, heartOpacity: 0.8, heartPeriod: 3.8, heartEdge: 0.7, heartScatterX: 2.5, heartScatterY: 4, heartTilt: 9,
      musicCutoff: 700, echoMix: 0.26, echoDelay: 0.48, echoFeedback: 0.16, voiceNear: 1, voicePan: 0,
      glitch: { enabled: false, duration: 0.32, opacity: 0.3, offset: 20, bands: 7, speed: 24 },
      hit: { duration: 0.85,
        heartWave: { enabled: false, opacity: 0.6, size: 180 },
        shadow: { enabled: true, opacity: 0.5, offset: 20, delay: 0.02 },
        desaturate: { enabled: false, strength: 0.85, duration: 0.38 },
        afterimage: { enabled: true, opacity: 0.56, spread: 0.39 }
      }
    },
    sound: { musicVolume: 0.25, effectsVolume: 0.5, voiceVolume: 0.45, clearVoiceVolume: 0.62, clearVoiceFile: "assets/audio/voices/mao/mao_clear.wav", hardClearVoiceVolume: 0.52, hardClearVoiceFile: "assets/audio/voices/mao/mao_hard_clear.wav", voiceEnabled: { "assets/audio/voices/mao/mao_hit_a.wav": false, "assets/audio/voices/mao/mao_hit_n.wav": true, "assets/audio/voices/mao/mao_hit_short.wav": true, "assets/audio/voices/mao/mao_hit_surprise.wav": true, "assets/audio/voices/mao/mao_hit_fu.wav": true }, muted: false, tempo: 88, pattern: 'moonlit' },
    ballEffects: { trailSeconds: 0.45, trailOpacity: 0.7, trailSparkles: 48, trailSize: 2.8, trailInterval: 0.04, trailSpacing: 10, sparkleOpacity: 1, sparkleSize: 0.9, sparkleSpeed: 8 },
    contactEffects: { duration: 0.48, sparkles: 8, spread: 20, opacity: 0.3 },
    hitReaction: { duration: 0.75, size: 48, enabledMarks: [true, true, true, true, true, true], stageScales: [1, 1.1, 1.2, 1.3, 1.4, 1.7], anchors: [[0.8, 0.2], [0.8, 0.3], [0.8, 0.23], [0.8, 0.33], [0.8, 0.53], [0.71, 0.65]] },
    // Calm, weighty motion: cap fast returns and soften passive rebounds.
    // Drop a resting ball above the left flipper; the player returns it upward.
    launch: { x: 272, y: 1116, horizontalSpread: 0, vy: 0 },
    flipperSpeed: 7.8,
    initialBalls: 3, gravity: 500, restitution: 0.3,
    // Moving-surface velocity transfer: 1 = actual contact-point speed.
    ballRadius: 19, maxSpeed: 900, flipperTransfer: 1,
    respawnDelay: 0.85, hitCooldown: 0.32, transitionDelay: 0.38,
    stallSeconds: 2, maxUpperSeconds: 7,
    recovery: { sampleInterval: 0.1, windowSeconds: 2, confinedSpan: 110, releaseSpeed: 460, iterations: 4, hold: { graceSeconds: 8, contactSeconds: 0.75, rootRange: 150, maxSpeed: 600 } },
    flippers: [
      // Even when both rotate through horizontal, the gap must exceed the ball diameter.
      { x: 270, y: 1265, length: 190, radius: 25, rest: 0.39, active: -0.43, sourcePivot: [270, 265], sourceTip: [1410, 782], image: 'left' },
      { x: 754, y: 1265, length: 190, radius: 25, rest: Math.PI - 0.39, active: Math.PI + 0.43, sourcePivot: [827, 179], sourceTip: [137, 471], image: 'right' }
    ],
    // Follow the dominant inner guide edges, smoothing tiny decorative pockets.
    // Each segment's right normal points INTO the table. End the guides at the
    // upper edge of the pivot housing: a guide through the pivot center makes
    // a V-shaped pocket against its circular collision cap.
    // Preserve the original terminal guide tangent at both flipper roots.
    walls: [
      [300, 485, 282, 557], [282, 557, 272, 580], [272, 580, 302, 620],
      [302, 620, 240, 702], [240, 702, 216, 798], [216, 798, 226, 865],
      [226, 865, 260, 951], [260, 951, 306, 994], [306, 994, 242, 1045],
      [242, 1045, 207, 1122], [207, 1122, 177, 1150], [177, 1150, 210, 1184.6026490066226],
      [210, 1184.6026490066226, 286, 1245],
      [738, 1245, 814, 1184.6026490066226], [814, 1184.6026490066226, 847, 1150],
      [847, 1150, 817, 1122], [817, 1122, 782, 1045],
      [782, 1045, 718, 994], [718, 994, 764, 951], [764, 951, 798, 865],
      [798, 865, 808, 798], [808, 798, 784, 702], [784, 702, 722, 620],
      [722, 620, 752, 580], [752, 580, 742, 557], [742, 557, 724, 485],
      [724, 485, 300, 485]
    ],
    stages: [
      { hits: 2, rect: [335, 90, 354, 531], circles: [[517, 420, 88], [561, 524, 70], [486, 573, 34]] },
      { hits: 4, rect: [340, 86, 390, 585], scale: 0.87, circles: [[430, 558, 47], [532, 493, 39], [619, 543, 47]] },
      { hits: 7, rect: [310, 110, 426, 639], scale: 0.95, circles: [[451, 526, 127], [606, 526, 127]] },
      { hits: 10, rect: [350, 261, 466, 559], scale: 0.93, circles: [[475, 576, 60], [568, 576, 60], [454, 653, 39], [606, 645, 39], [484, 744, 39], [670, 744, 39]] },
      { hits: 14, rect: [339, 423, 514, 771], scale: 0.93, circles: [[478, 633, 70], [573, 622, 67], [550, 754, 75], [546, 878, 88], [517, 1023, 31], [579, 1090, 47], [734, 1064, 41]] },
      { hits: 24, rect: [232, 415, 560, 840], scale: 0.99, circles: [[442, 738, 91], [586, 767, 92], [484, 842, 75], [434, 920, 36], [508, 989, 69], [558, 852, 76], [584, 631, 21], [504, 1196, 36], [694, 1022, 21]] }
    ],
    clearArt: { rect: [-65, 388, 640, 960], scale: 2 },
    hardClearArt: { rect: [-492, 395, 896, 1344], scale: 2.33 },
    stageCelebration: {
      slowIn: 0.18, slowScale: 0.2, hold: 0.12, fadeOut: 0.22, fadeIn: 0.24, poseHold: 0.4,
      slowOut: 0.18, resumeScale: 0.3,
      duration: 1.5, screenDuration: 1.5, flash: 0.65, screenParticles: 46,
      cutIn: { start: 0.1, end: 1.42, fadeIn: 0.08, fadeOut: 0.12,
        // Draw the whole source image; the band alone determines what is visible.
        // x/y are cut-in canvas coordinates; scale multiplies a 490px-wide image.
        portraits: [null,
          { x: 15, y: 391, scale: 1 },
          { x: 15, y: 307, scale: 1 },
          { x: 15, y: 462, scale: 1 },
          { x: 15, y: 388, scale: 1 },
          { x: 15, y: 565, scale: 1 }] },
      burst: { hearts: 44, sparkles: 64, spread: 330, glow: 1, rings: 5 }
    },
    // Four visual-only tiers, progressing from the first HIT to the stage goal.
    hitEffects: {
      duration: 1.05,
      tiers: [
        { hearts: 8, sparkles: 12, spread: 110, glow: 0.42, rings: 1 },
        { hearts: 12, sparkles: 18, spread: 145, glow: 0.54, rings: 2 },
        { hearts: 16, sparkles: 24, spread: 175, glow: 0.66, rings: 2 },
        { hearts: 22, sparkles: 32, spread: 205, glow: 0.78, rings: 3 }
      ]
    },
    // Shared visual-only tuning for Stage 1–6. Zero strength/count disables it.
    characterEffects: {
      glow: { strength: 1, blur: 32, speed: 1, pulseDepth: 0, lowerFade: 0.82 },
      darkGlow: { strength: 1, blur: 32, speed: 1.8, pulseDepth: 1, lowerFade: 0.92 },
      shadow: { strength: 0.35, blur: 16, offsetY: 18 },
      sparkles: { count: 8, opacity: 0.65, size: 12, speed: 1.6 },
      hearts: { count: 3, opacity: 0.9, size: 1.9, period: 4.8, rise: 32 },
      devils: { count: 0, opacity: 0.85, size: 1, period: 9, duration: 3 }
    },
    voices: Array.from({ length: 6 }, () => ['mao_hit_a.wav', 'mao_hit_n.wav', 'mao_hit_short.wav', 'mao_hit_surprise.wav', 'mao_hit_fu.wav'].map(name => 'assets/audio/voices/mao/' + name)),
    assets: {
      board: 'assets/images/board/盤面と背景.png',
      ball: 'assets/images/parts/ボール.png',
      left: 'assets/images/parts/左フリッパー.png',
      right: 'assets/images/parts/右フリッパー.png',
      clear: 'assets/images/characters/results/ステージクリア後.png',
      hardClear: 'assets/images/characters/results/ハードクリア後.png',
      ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['stage' + (i + 1), 'assets/images/characters/stages/ステージ' + (i + 1) + '.png']))
    }
  };
})(globalThis.Pinball = globalThis.Pinball || {});
