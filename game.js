'use strict';
/**
 * 星墜答問：神話機神 (StarFall Quiz: Mythic Mecha)
 * 核心遊戲引擎 — 具備完整 1-10 關神話 Boss、自適應題庫、靈丸蓄力、稜鏡光束、融合武器、
 * 擦彈同步、IndexedDB 存檔、純 Web Audio 合成 BGM 音樂與戰鬥內 LAB 面板。
 */

// ============================================================
// 一、程序化 Web Audio BGM 音樂合成器 (Arcade Synthwave Engine)
// ============================================================
class BgmEngine {
  constructor(audioCtx, masterGain) {
    this.ctx = audioCtx;
    this.masterGain = masterGain;
    this.isPlaying = false;
    this.isMuted = false;
    this.tempo = 120; // 120 BPM: 1 beat = 0.5s, 16th note = 0.125s, 320 steps = 40.0s exact loop
    this.step = 0;
    this.timerId = null;
    this.volume = 0.45;
    this.stage = 1;

    // 關卡專屬 MP3 音軌管理 (支援無縫循環與跨關卡淡入淡出)
    this.currentAudio = null;
    this.audioElements = {};

    // 音量控制
    if (this.ctx) {
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.gainNode.connect(this.masterGain);
    }
  }

  setStage(stage = 1) {
    const prevStage = this.stage;
    this.stage = Math.max(1, Math.min(10, stage));
    this.step = 0;
    if (this.isPlaying && (prevStage !== this.stage || !this.currentAudio)) {
      this.playStageAudio(this.stage);
    }
  }

  playStageAudio(stage) {
    if (this.currentAudio) {
      const oldAudio = this.currentAudio;
      let vol = oldAudio.volume;
      const fadeInterval = setInterval(() => {
        vol = Math.max(0, vol - 0.1);
        try { oldAudio.volume = vol; } catch(e) {}
        if (vol <= 0) {
          clearInterval(fadeInterval);
          oldAudio.pause();
        }
      }, 40);
    }

    try {
      const src = `assets/audio/bgm/bgm_stage_${stage}.mp3`;
      let audio = this.audioElements[stage];
      if (!audio) {
        audio = new Audio(src);
        audio.loop = true;
        this.audioElements[stage] = audio;
      }
      audio.currentTime = 0;
      audio.volume = this.isMuted ? 0 : this.volume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('MP3 Autoplay prevented or not yet permitted:', err);
        });
      }
      this.currentAudio = audio;
    } catch(e) {
      console.warn('Error playing stage MP3 BGM:', e);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playStageAudio(this.stage);
    if (this.ctx) {
      this.step = 0;
      const intervalMs = (60 / this.tempo / 4) * 1000; // 16分音符 125ms
      this.timerId = setInterval(() => this.tick(), intervalMs);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.volume;
    }
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  tick() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const s = this.step % 320; // 20 小節 = 80 拍 = 320 步 (剛好 40 秒循環)
    const m = Math.floor(s / 16); // 當前小節 0~19
    const b = Math.floor((s % 16) / 4); // 當前拍 0~3
    const sub = s % 4; // 拍內細分 0~3

    // 根據當前關卡風格執行專屬神話音樂編排
    switch (this.stage) {
      case 1:
        this.tickStage1Garuda(t, s, m, b, sub);
        break;
      case 2:
        this.tickStage2Leigong(t, s, m, b, sub);
        break;
      case 3:
        this.tickStage3Medusa(t, s, m, b, sub);
        break;
      case 4:
        this.tickStage4Taotie(t, s, m, b, sub);
        break;
      case 5:
        this.tickStage5Atlas(t, s, m, b, sub);
        break;
      case 6:
        this.tickStage6Athena(t, s, m, b, sub);
        break;
      case 7:
        this.tickStage7Hydra(t, s, m, b, sub);
        break;
      case 8:
        this.tickStage8Cyclops(t, s, m, b, sub);
        break;
      case 9:
        this.tickStage9Tamamo(t, s, m, b, sub);
        break;
      case 10:
        this.tickStage10Tiamat(t, s, m, b, sub);
        break;
      default:
        this.tickStage1Garuda(t, s, m, b, sub);
    }

    this.step++;
  }

  // ----------------------------------------------------
  // Stage 1: 迦樓羅・裂空王 (印度風格天空之神・印度Bhairav調式・竹笛Bansuri・梵音和聲)
  // ----------------------------------------------------
  tickStage1Garuda(t, s, m, b, sub) {
    // 1. 印度塔布拉手鼓 (Tabla / Dholak)
    if (s % 16 === 0 || s % 16 === 6 || s % 16 === 10) {
      this.playKick(t, 'deep');
    }
    if (s % 16 === 4 || s % 16 === 12) {
      this.playSnare(t, 'snap');
    }
    if (s % 2 === 0) {
      this.playHihat(t, sub === 2 ? 0.06 : 0.03);
    }

    // 2. 印度西塔琴 (Sitar) 連續切分琶音 (D4, F#4, A4, C#5)
    const sitarNotes = [293.66, 369.99, 440.00, 554.37, 440.00, 369.99, 311.13, 293.66];
    if (sub === 2) {
      this.playPluck(t, sitarNotes[(m * 2 + b) % sitarNotes.length], 'sitar');
    }

    // 3. 印度空靈竹笛 (Bansuri Flute) - 神鳥翱翔長旋律
    const bansuriMelody = [
      587.33, 554.37, 466.16, 440.00, 369.99, 392.00, 440.00, 554.37,
      587.33, 622.25, 587.33, 554.37, 466.16, 440.00, 369.99, 293.66,
      369.99, 440.00, 466.16, 554.37
    ];
    if (sub === 0 && (b === 0 || b === 2)) {
      const note = bansuriMelody[m % bansuriMelody.length];
      this.playFlute(t, note, 0.42, true, 'bamboo');
    }

    // 4. 人聲共振峰和音 (Formant Vowel Choir 'Aah' / 'Ooh' 梵音和聲)
    if (m % 4 === 0 && b === 0 && sub === 0) {
      const choirChords = [
        [293.66, 369.99, 440.00], // D Major
        [233.08, 293.66, 349.23], // Bb Major
        [329.63, 392.00, 493.88], // E Minor
        [220.00, 277.18, 329.63]  // A Major
      ];
      this.playChoirFormant(t, choirChords[Math.floor(m / 4) % choirChords.length], 'Aah', 1.8);
    }
  }

  // ----------------------------------------------------
  // Stage 2: 雷公・震霄 (東方雷部神將・宮商角徵羽五聲音階・震天太鼓・古箏雷刃)
  // ----------------------------------------------------
  tickStage2Leigong(t, s, m, b, sub) {
    // 1. 東方太鼓與連環鼓點 (Taiko War Drums)
    if (sub === 0) {
      this.playKick(t, 'taiko');
    }
    if (s % 8 === 4 || (m % 2 === 1 && s % 4 === 2)) {
      this.playSnare(t, 'taiko_rim');
    }

    // 2. 五音古箏 (Guzheng) 激奏 [G4, A4, C5, D5, E5, G5]
    const guzhengNotes = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    if (sub === 1 || sub === 3) {
      this.playPluck(t, guzhengNotes[(s * 3) % guzhengNotes.length], 'guzheng');
    }

    // 3. 雷霆戰笛 (War Flute) 雄渾旋律
    const leigongFlute = [
      587.33, 659.25, 523.25, 440.00, 587.33, 783.99, 659.25, 587.33,
      523.25, 440.00, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99,
      880.00, 783.99, 659.25, 587.33
    ];
    if (sub === 0 && (b === 0 || b === 2)) {
      this.playFlute(t, leigongFlute[m % leigongFlute.length], 0.38, true, 'metal');
    }

    // 4. 東方武將破陣戰吼和音 (Formant Choir 'Ooh')
    if (b === 0 && sub === 0 && (m % 2 === 0)) {
      this.playChoirFormant(t, [196.00, 293.66, 392.00], 'Ooh', 1.4);
    }
  }

  // ----------------------------------------------------
  // Stage 3: 美杜莎・返照 (希臘神話・愛琴海弗里吉亞調式・雙簧管Aulos・海妖女聲)
  // ----------------------------------------------------
  tickStage3Medusa(t, s, m, b, sub) {
    if (b === 0 && sub === 0) this.playKick(t, 'marching');
    if (b === 2 && sub === 0) this.playSnare(t, 'snap');
    if (s % 2 === 0) this.playHihat(t, 0.04);

    // 希臘雙簧管 (Aulos / Snake Charmer Reed)
    const aulosNotes = [
      329.63, 349.23, 415.30, 440.00, 493.88, 523.25, 493.88, 415.30,
      349.23, 329.63, 415.30, 440.00, 523.25, 587.33, 523.25, 415.30,
      349.23, 415.30, 440.00, 329.63
    ];
    if (sub === 0) {
      this.playFlute(t, aulosNotes[(m * 2 + Math.floor(b / 2)) % aulosNotes.length], 0.35, true, 'reed');
    }

    // 塞壬女妖和聲 (Siren Choir 'Aah')
    if (m % 3 === 0 && b === 0 && sub === 0) {
      this.playChoirFormant(t, [220.00, 277.18, 329.63, 415.30], 'Aah', 2.0);
    }
  }

  // ----------------------------------------------------
  // Stage 4: 饕餮・萬喰 (山海經・荒古原始骨鼓・低音喉音僧侶頌唱)
  // ----------------------------------------------------
  tickStage4Taotie(t, s, m, b, sub) {
    if (b === 0 && sub === 0) this.playKick(t, 'taiko');
    if (s % 8 === 4) this.playKick(t, 'deep');

    // 暴食巨獸深喉低音 (Guttural Sub Bass)
    const taotieBass = [38.89, 41.20, 36.71, 38.89];
    if (sub === 0) {
      this.playBass(t, taotieBass[b % taotieBass.length], 'dark');
    }

    // 荒古咒文喉音合唱 (Throat Chant 'Ooh' / 'Umm')
    if (b === 0 && sub === 0) {
      this.playChoirFormant(t, [77.78, 116.54, 155.56], 'Ooh', 1.8);
    }
  }

  // ----------------------------------------------------
  // Stage 5: 阿特拉斯・墜星 (泰坦多利安進行曲・重型銅管號角・天穹交響)
  // ----------------------------------------------------
  tickStage5Atlas(t, s, m, b, sub) {
    if (b === 0 || b === 2) this.playKick(t, 'marching');
    if (b === 1 || b === 3) this.playSnare(t, 'anvil');

    // 泰坦號角 (Titan Horn / Brass Stabs)
    const atlasNotes = [146.83, 174.61, 220.00, 261.63, 293.66, 220.00, 174.61, 146.83];
    if (sub === 0 && (b === 0 || b === 2)) {
      this.playFlute(t, atlasNotes[m % atlasNotes.length], 0.45, false, 'brass');
    }

    // 天堂聖歌大合唱 (Colossal Choir 'Aah')
    if (m % 2 === 0 && b === 0 && sub === 0) {
      this.playChoirFormant(t, [146.83, 220.00, 293.66, 369.99], 'Aah', 1.9);
    }
  }

  // ----------------------------------------------------
  // Stage 6: 雅典娜・神盾 (奧林匹斯神殿新古典聖詠・水晶豎琴琶音)
  // ----------------------------------------------------
  tickStage6Athena(t, s, m, b, sub) {
    if (b === 0 && sub === 0) this.playKick(t, 'deep');
    if (b === 2 && sub === 0) this.playSnare(t, 'snap');

    // 水晶豎琴 (Crystal Lyre)
    const lyreNotes = [440.00, 523.25, 659.25, 783.99, 880.00, 659.25];
    if (sub === 1 || sub === 3) {
      this.playPluck(t, lyreNotes[(s * 2) % lyreNotes.length], 'harp');
    }

    // 天使大合唱 (Angelic Polyphony)
    if (b === 0 && sub === 0 && m % 2 === 0) {
      this.playChoirFormant(t, [261.63, 329.63, 392.00, 523.25], 'Aah', 1.6);
    }
  }

  // ----------------------------------------------------
  // Stage 7: 許德拉・再生 (沼澤半音階・劇毒冒泡合成管樂・詭譎低語)
  // ----------------------------------------------------
  tickStage7Hydra(t, s, m, b, sub) {
    if (b === 0 && sub === 0) this.playKick(t, 'deep');
    if (s % 4 === 2) this.playHihat(t, 0.05);

    // 劇毒水澤笛音 (Venomous Flute)
    const hydraNotes = [311.13, 329.63, 349.23, 329.63, 311.13, 293.66, 311.13, 349.23];
    if (sub === 0 && (b === 1 || b === 3)) {
      this.playFlute(t, hydraNotes[(m * 2 + b) % hydraNotes.length], 0.32, true, 'reed');
    }

    // 詭異低語和音 (Eerie Whispering Choir)
    if (m % 3 === 0 && b === 0 && sub === 0) {
      this.playChoirFormant(t, [155.56, 196.00, 233.08], 'Ooh', 1.5);
    }
  }

  // ----------------------------------------------------
  // Stage 8: 獨眼巨人・天爐 (火神打鐵砧金屬節奏・沉重熔爐鋼鐵號子)
  // ----------------------------------------------------
  tickStage8Cyclops(t, s, m, b, sub) {
    if (b === 0 || b === 2) this.playKick(t, 'deep');
    if (b === 1 || b === 3) this.playSnare(t, 'anvil'); // 打鐵金屬砧擊！

    // 鍛造號子合聲 (Forge Worker Choir 'Heave!')
    if (b === 0 && sub === 0 && m % 2 === 0) {
      this.playChoirFormant(t, [110.00, 164.81, 220.00], 'Ooh', 1.2);
    }
  }

  // ----------------------------------------------------
  // Stage 9: 玉藻前・幻械 (日本平安京・陰旋法・尺八Shakuhachi・箏・天狐和音)
  // ----------------------------------------------------
  tickStage9Tamamo(t, s, m, b, sub) {
    if (b === 0 && sub === 0) this.playKick(t, 'taiko');
    if (b === 2 && sub === 0) this.playSnare(t, 'taiko_rim');

    // 日本尺八 (Shakuhachi Flute - 帶氣聲與平滑滑音)
    const shakuhachiNotes = [
      440.00, 466.16, 587.33, 659.25, 783.99, 659.25, 587.33, 466.16,
      440.00, 392.00, 440.00, 587.33, 659.25, 783.99, 880.00, 783.99,
      659.25, 587.33, 466.16, 440.00
    ];
    if (sub === 0 && (b === 0 || b === 2)) {
      this.playFlute(t, shakuhachiNotes[m % shakuhachiNotes.length], 0.44, true, 'bamboo');
    }

    // 日本箏 (Koto) 輪指
    const kotoNotes = [440.00, 466.16, 587.33, 659.25, 783.99];
    if (sub === 2) {
      this.playPluck(t, kotoNotes[(s * 3) % kotoNotes.length], 'guzheng');
    }

    // 妖狐靈魅和聲 (Kitsune Spirit Choir 'Aah')
    if (m % 3 === 0 && b === 0 && sub === 0) {
      this.playChoirFormant(t, [220.00, 329.63, 440.00, 587.33], 'Aah', 2.1);
    }
  }

  // ----------------------------------------------------
  // Stage 10: 提亞瑪特・混沌母艦 (巴比倫創世・原初黑潮次低音・宇宙安魂曲)
  // ----------------------------------------------------
  tickStage10Tiamat(t, s, m, b, sub) {
    // 宇宙多重拍擊 (Kick & Sub)
    if (b === 0 || (m % 2 === 1 && b === 3)) this.playKick(t, 'deep');
    if (b === 2) this.playSnare(t, 'anvil');
    if (s % 2 === 0) this.playHihat(t, 0.07);

    // 創世母艦深海重低音 (Primordial Roar 32Hz)
    if (sub === 0) {
      this.playBass(t, 32.70, 'dark');
    }

    // 宇宙終焉大合唱 (Cosmic Requiem Choir 'Aah' & 'Ooh')
    if (b === 0 && sub === 0) {
      const v = m % 2 === 0 ? 'Aah' : 'Ooh';
      this.playChoirFormant(t, [130.81, 164.81, 196.00, 246.94], v, 1.7);
    }
  }

  // ----------------------------------------------------
  // 程序化樂器合成元件
  // ----------------------------------------------------
  playKick(t, type = 'standard') {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = type === 'taiko' ? 160 : (type === 'deep' ? 95 : 130);
    const endFreq = type === 'taiko' ? 38 : (type === 'deep' ? 24 : 32);
    const dur = type === 'taiko' ? 0.22 : 0.14;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + dur);
  }

  playSnare(t, type = 'standard') {
    const dur = type === 'anvil' ? 0.35 : 0.12;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'anvil' ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(type === 'anvil' ? 2400 : 900, t);
    if (type === 'anvil') filter.Q.setValueAtTime(8, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.gainNode);
    noise.start(t);
    noise.stop(t + dur);

    // 打鐵砧金屬高音泛音
    if (type === 'anvil') {
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(1860, t);
      bellGain.gain.setValueAtTime(0.2, t);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      bellOsc.connect(bellGain);
      bellGain.connect(this.gainNode);
      bellOsc.start(t);
      bellOsc.stop(t + 0.28);
    }
  }

  playHihat(t, vol = 0.05) {
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6800, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.gainNode);
    noise.start(t);
    noise.stop(t + 0.04);
  }

  playBass(t, freq, type = 'saw') {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = type === 'dark' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'dark' ? 180 : 450, t);

    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // 笛子與管樂器合成器 (竹笛/尺八/排簫/雙簧管)
  playFlute(t, freq, dur = 0.35, vibrato = true, type = 'bamboo') {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type === 'reed' ? 'sawtooth' : (type === 'brass' ? 'sawtooth' : 'triangle');
    osc.frequency.setValueAtTime(freq * 0.98, t); // 微幅滑音導入
    osc.frequency.linearRampToValueAtTime(freq, t + 0.05);

    // 顫音 Vibrato LFO
    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5.8, t); // 5.8 Hz 顫音
      lfoGain.gain.setValueAtTime(freq * 0.015, t);
      lfo.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'brass' ? 1800 : (type === 'reed' ? 1400 : 950), t);

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + dur);
  }

  // 人聲共振峰合唱合成器 (Formant Vowel Choir 'Aah' / 'Ooh')
  playChoirFormant(t, chordFreqs = [440], vowel = 'Aah', dur = 1.5) {
    chordFreqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // 雙峰共振模擬人聲聲道 (Formant Filters)
      // 'Aah': F1=800Hz, F2=1200Hz; 'Ooh': F1=350Hz, F2=800Hz
      const f1Freq = vowel === 'Ooh' ? 350 : 800;
      const f2Freq = vowel === 'Ooh' ? 800 : 1250;

      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(f1Freq, t);
      f1.Q.setValueAtTime(7, t);

      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(f2Freq, t);
      f2.Q.setValueAtTime(7, t);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.25); // 柔和起音
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(g);
      f2.connect(g);
      g.connect(this.gainNode);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  // 民族彈撥弦樂合成器 (西塔琴 Sitar / 古箏 Guzheng / 豎琴 Harp)
  playPluck(t, freq, type = 'sitar') {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(type === 'sitar' ? freq * 1.8 : freq * 1.4, t);
    filter.Q.setValueAtTime(6, t);

    const dur = type === 'harp' ? 0.45 : 0.28;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + dur);
  }
}

// ============================================================
// 二、音效與語音合成系統 (Sound & Speech Synthesis)
// ============================================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.voiceEnabled = true;
    this.masterGain = null;
    this.bgm = null;
    this.initAudio();
  }

  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.bgm = new BgmEngine(this.ctx, this.masterGain);
      }
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaser(pitch = 880) {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // 1. 多管神機砲：高速連續機械金屬擊發清脆爆鳴
  playVulcanFire() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100 + (Math.random() - 0.5) * 160, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.05);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // 2. 金陽聚焦光束：高頻聚焦電漿嗡鳴與熱融共振
  playBeamLaser() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(680, t);
    osc2.frequency.setValueAtTime(1020, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.09);
    osc2.stop(t + 0.09);
  }

  // 3. 靈能聚變核心：空靈靈能共鳴波
  playSpiritOrbFire() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.15);
    gain.gain.setValueAtTime(0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // 4. 超空泡穿甲鏢：電磁軌道砲極速裂空超音速爆裂響
  playRailgunFire() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);

    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    subG.gain.setValueAtTime(0.35, t);
    subG.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    sub.connect(subG);
    subG.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.12);
  }

  // 5. 烈陽核融導彈：固態燃料火箭點火呼嘯噴氣聲
  playMissileLaunch() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 6. 青玉風雷飛輪：高速旋轉氣動切風破空呼嘯聲
  playChakramWhir() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.linearRampToValueAtTime(1280, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.22);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // 7. 熾陽熔岩噴射核：重裝氣壓迫擊發射沉悶巨響
  playGrenadeLaunch() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.24);
    gain.gain.setValueAtTime(0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  // 8. 永凍冰錐尖塔：晶瑩剔透冰稜穿刺與凍裂鈴音
  playIceSpireChime() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    [1760, 2637].forEach((freq, idx) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t + idx * 0.02);
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + idx * 0.02 + 0.12);
      g.gain.setValueAtTime(0.18, t + idx * 0.02);
      g.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.02 + 0.12);
      o.connect(g);
      g.connect(this.masterGain);
      o.start(t + idx * 0.02);
      o.stop(t + idx * 0.02 + 0.12);
    });
  }

  // 9. 裂變音浪重砲：次聲波空氣炸裂震撼重低音
  playSonicCannonBoom() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(22, t + 0.32);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.32);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  // 10. 五行太極陣盤：陰陽雙頻和弦仙音
  playTaijiPulse() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    [528, 792].forEach(freq => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.95, t + 0.2);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.005, t + 0.2);
      o.connect(g);
      g.connect(this.masterGain);
      o.start(t);
      o.stop(t + 0.2);
    });
  }

  // 11. 地脈翡翠仙泉：甘霖水波療癒清澈泛音
  playEmeraldPulse() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 17. 雷公天劫鏈弧：高壓電弧劈啪爆裂
  playChainLightning() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400 + (Math.random() - 0.5) * 400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 18. 熾陽破曉耀斑：熾熱日冕重核熱融音
  playSolarFlare() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 19. 裂變等離子刃：鋒利月牙破空斬裂
  playPlasmaBlade() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(860, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.10);
    gain.gain.setValueAtTime(0.17, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.10);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.10);
  }

  // 20. 奈米蝕甲蟲群：極高頻機械蟲群蜂鳴
  playNanoSwarm() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.09);
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // 21. 天啟破城光錐：深沉次聲凝聚爆發至高頻破空光錐
  playPhotonLance() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(1850, t + 0.15);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // 25. 時序輪迴神鐮：時空維度撕裂迴盪泛音
  playChronosScythe() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playExplosion(heavy = false) {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const dur = heavy ? 0.6 : 0.25;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(heavy ? 90 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + dur);
    gain.gain.setValueAtTime(heavy ? 0.45 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  playHit() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.04);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playCrit() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    // 雙音高頻清脆暴擊鐘音 (Crystal Ping)
    [1760, 2640].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.14);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.14);
    });
    // 次低音重錘 (Sub-bass Thud)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.18);
    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.18);
  }

  playBossEntranceSiren() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    // 震撼降臨戰吼警報 (Warble Foghorn)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.6);
    osc.frequency.exponentialRampToValueAtTime(65, t + 1.8);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.8);
  }

  playBossDeathSupernova() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    // 深度次低音核爆 (Deep Sub Supernova)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(18, t + 2.4);
    subGain.gain.setValueAtTime(0.75, t);
    subGain.gain.exponentialRampToValueAtTime(0.005, t + 2.4);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 2.4);

    // 高頻金屬撕裂爆破和弦 (Multi-stage Detonations)
    [420, 680, 920].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(80, t + 1.0 + i * 0.05);
      gain.gain.setValueAtTime(0.35, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0 + i * 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + 1.0 + i * 0.05);
    });
  }

  // 幽遊白書風格靈丸蓄力音效：指尖高頻電漿充能諧振音 (1100Hz -> 2800Hz)
  playSpiritCharge(chargeRatio = 0.5) {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const baseFreq = 950 + chargeRatio * 1850;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq + 70, t + 0.08);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.2, t);
    filter.Q.setValueAtTime(14, t);

    gain.gain.setValueAtTime(0.08 + chargeRatio * 0.14, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 幽遊白書風格靈丸發射音效 (經典極高頻電漿尖嘯 + 次低音重錘 + 爆風瞬態)
  // 嚴格規則：若未蓄滿 (tier < 5 且非彗星靈丸)，直接靜音 return，不發出發射音效！
  playSpiritFire(maxCharge = false, isComet = false) {
    if (!maxCharge && !isComet) {
      return; // 未集滿的靈丸嚴格不發出發射音效
    }
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // 1. 極高頻電漿放電尖嘯 (Piercing Chirp: 2800Hz -> 220Hz 瞬間跌落)
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sine';
    zapOsc.frequency.setValueAtTime(isComet ? 3200 : 2700, t);
    zapOsc.frequency.exponentialRampToValueAtTime(180, t + 0.14);
    zapGain.gain.setValueAtTime(isComet ? 0.65 : 0.5, t);
    zapGain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);
    zapOsc.connect(zapGain);
    zapGain.connect(this.masterGain);
    zapOsc.start(t);
    zapOsc.stop(t + 0.14);

    // 2. 次低音重錘空氣爆壓 (Sub-bass Concussive Wave: 140Hz -> 24Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(isComet ? 160 : 130, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + 0.48);
    subGain.gain.setValueAtTime(isComet ? 0.8 : 0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.48);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.48);

    // 3. 諧振白噪音爆破衝擊 (Filtered Noise Transient)
    try {
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(1800, t);
      nFilter.frequency.exponentialRampToValueAtTime(280, t + 0.12);
      nFilter.Q.setValueAtTime(8, t);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.4, t);
      nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(t);
    } catch (e) {
      // 容錯保護
    }
  }

  // 靈丸擊中目標爆裂音效 (Reigan Impact Airburst)
  playReiganImpact(isComet = false) {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isComet ? 480 : 380, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    gain.gain.setValueAtTime(isComet ? 0.7 : 0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Boss 大招高能蓄力預警警報音效 (Siren Whine)
  playBossUltimateWarning(stage = 1) {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + i * 0.35;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260 + i * 140, st);
      osc.frequency.exponentialRampToValueAtTime(880 + i * 180, st + 0.28);
      gain.gain.setValueAtTime(0.35, st);
      gain.gain.exponentialRampToValueAtTime(0.01, st + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.28);
    }
  }

  // Boss 大招釋放震撼毀滅音效 (Cataclysmic Blast)
  playBossUltimateCast(stage = 1, ultId = '') {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // 1. 次低音全屏震顫
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(18, t + 1.2);
    subGain.gain.setValueAtTime(0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.005, t + 1.2);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 1.2);

    // 2. Boss 特色屬性音效 (例如雷公雷鳴霹靂、迦樓羅狂風咆哮等)
    if (stage === 2) {
      // 雷公：十連雷與霹靂炸裂電弧
      [1200, 850, 480].forEach((freq, idx) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const st = t + idx * 0.08;
        o.type = 'square';
        o.frequency.setValueAtTime(freq, st);
        o.frequency.exponentialRampToValueAtTime(50, st + 0.4);
        g.gain.setValueAtTime(0.4, st);
        g.gain.exponentialRampToValueAtTime(0.01, st + 0.4);
        o.connect(g);
        g.connect(this.masterGain);
        o.start(st);
        o.stop(st + 0.4);
      });
    } else {
      // 泛用金屬與能量狂嘯
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(650, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.8);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      o.connect(g);
      g.connect(this.masterGain);
      o.start(t);
      o.stop(t + 0.8);
    }
  }

  playWarningAlert() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + i * 0.15;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, st);
      gain.gain.setValueAtTime(0.3, st);
      gain.gain.linearRampToValueAtTime(0.01, st + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.1);
    }
  }

  playGraze() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.linearRampToValueAtTime(1800, t + 0.06);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // 神話 Boss 專屬敗北神格破滅遺言音效
  playBossDefeatQuote(stage = 1, bossId = '') {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // 1. 神格解體低音震顫
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(20, t + 2.0);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.005, t + 2.0);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 2.0);

    // 2. 依據 Boss 神話屬性激發消散音效
    if (stage === 1) {
      // 迦樓羅：狂風呼嘯與羽毛散落金鈴
      [1480, 1175, 880].forEach((freq, idx) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t + idx * 0.12);
        o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + idx * 0.12 + 0.6);
        g.gain.setValueAtTime(0.25, t + idx * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.6);
        o.connect(g);
        g.connect(this.masterGain);
        o.start(t + idx * 0.12);
        o.stop(t + idx * 0.12 + 0.6);
      });
    } else if (stage === 2) {
      // 雷公：雷電熄滅失能滋滋聲
      try {
        const noise = this.ctx.createBufferSource();
        const bSize = this.ctx.sampleRate * 0.8;
        const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.4));
        noise.buffer = buf;
        const nf = this.ctx.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.setValueAtTime(2400, t);
        nf.frequency.exponentialRampToValueAtTime(180, t + 0.8);
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.35, t);
        ng.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(this.masterGain);
        noise.start(t);
      } catch (e) {}
    } else {
      // 泛用神話消散和弦鐘鳴
      [880, 659, 523, 392].forEach((freq, idx) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, t + idx * 0.1);
        o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + idx * 0.1 + 0.7);
        g.gain.setValueAtTime(0.2, t + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.7);
        o.connect(g);
        g.connect(this.masterGain);
        o.start(t + idx * 0.1);
        o.stop(t + idx * 0.1 + 0.7);
      });
    }
  }

  // 神話隱藏剋制彩蛋觸發音效 (Secret Counter Resonance)
  playSecretCounterTrigger() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    // 璀璨神聖和弦上行琶音 [C6, E6, G6, C7] + 重低音共振
    const freqs = [1046.50, 1318.51, 1567.98, 2093.00];
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.08);
      o.frequency.exponentialRampToValueAtTime(f * 1.1, t + i * 0.08 + 0.25);
      g.gain.setValueAtTime(0.35, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
      o.connect(g);
      g.connect(this.masterGain);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.25);
    });

    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.5);
    subG.gain.setValueAtTime(0.5, t);
    subG.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    sub.connect(subG);
    subG.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.5);
  }

  speak(text) {
    // 徹底靜音瀏覽器機械 TTS 語音，改由純 Web Audio 帶來沉浸感
    return;
  }

  vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}

// ============================================================
// 三、資料層與 IndexedDB 持久化 (DataStore & Adaptive Learning)
// ============================================================
class DataStore {
  constructor() {
    this.db = null;
    this.dbName = 'StarfallQuizDB_v2';
    this.questionBank = [];
    this.bossData = null;
    this.weaponData = null;
    try {
      const q = localStorage.getItem('starfall_offline_attempt_queue_v1');
      this.offlineQueue = q ? JSON.parse(q) : [];
    } catch (e) {
      this.offlineQueue = [];
    }
    // 嚴格依學生 ID 分區記錄錯題進度: { [student_id]: { [question_id]: progressItem } }
    this.allStudentProgress = {};
    this.sheetStudents = [];
    this.currentStudentId = localStorage.getItem('starfall_student_id') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.learning && window.STARFALL_CONFIG.learning.defaultStudentId) || 'S0001';
    this.studentName = localStorage.getItem('starfall_student_name') || '測試學員';
    this.studentGrade = localStorage.getItem('starfall_student_grade') || '三年級';
    this.isCloudSynced = false;
    // 整局已抽取的題目 ID 與題幹指紋集合，保證同一局內完全零重複
    this.sessionUsedQuestionIds = new Set();
    this.sessionUsedFingerprints = new Set();

    // 跨局持久化：題幹指紋級已掌握熟練題 (Mastered) 與未雪恥錯題集 (Mistakes)
    this.masteredFingerprints = new Set();
    this.mistakeMap = {}; // fingerprint -> question object
    this.loadFingerprintsFromStorage();

    this.initIndexedDB();
  }

  // 取得題目內容指紋（忽略標點與空格，徹底解決同一題幹掛不同 ID 的重複問題）
  getQuestionFingerprint(text) {
    if (!text) return '';
    return String(text)
      .trim()
      .replace(/[\s\r\n\t]/g, '')
      .replace(/[「」『』""''，。、？！：；,.?!:;]/g, '')
      .toLowerCase();
  }

  // 載入跨局題幹指紋作答記錄
  loadFingerprintsFromStorage() {
    try {
      const savedMastered = localStorage.getItem('starfall_mastered_fingerprints_v2');
      if (savedMastered) {
        const arr = JSON.parse(savedMastered);
        if (Array.isArray(arr)) {
          arr.forEach(fp => this.masteredFingerprints.add(fp));
        }
      }
      const savedMistakes = localStorage.getItem('starfall_mistake_fingerprints_v2');
      if (savedMistakes) {
        this.mistakeMap = JSON.parse(savedMistakes) || {};
      }
    } catch (e) {
      console.warn('Failed loading fingerprint storage:', e);
    }
  }

  // 儲存跨局題幹指紋作答記錄至本機
  saveFingerprintsToStorage() {
    try {
      localStorage.setItem('starfall_mastered_fingerprints_v2', JSON.stringify([...this.masteredFingerprints]));
      localStorage.setItem('starfall_mistake_fingerprints_v2', JSON.stringify(this.mistakeMap));
    } catch (e) {
      console.warn('Failed saving fingerprint storage:', e);
    }
  }

  // 重置當前遊戲局的題目抽取紀錄 (新遊戲開始時呼叫)
  resetSessionQuestions() {
    if (this.sessionUsedQuestionIds) this.sessionUsedQuestionIds.clear();
    if (this.sessionUsedFingerprints) this.sessionUsedFingerprints.clear();
  }

  // 取得指定學員的專屬作答進度映射表 (100% 獨立隔離)
  getStudentProgressMap(studentId) {
    const sid = studentId || this.currentStudentId || 'S0001';
    if (!this.allStudentProgress[sid]) {
      this.allStudentProgress[sid] = {};
      try {
        const saved = localStorage.getItem(`starfall_progress_${sid}`);
        if (saved) this.allStudentProgress[sid] = JSON.parse(saved);
      } catch (e) {}
    }
    return this.allStudentProgress[sid];
  }

  // 計算指定學員尚未雪恥復仇的錯題總數
  getMistakeCount(studentId) {
    const map = this.getStudentProgressMap(studentId);
    let count = 0;
    Object.values(map).forEach(p => {
      if (p.wrong > 0 && !p.avenged) count++;
    });
    return count;
  }

  // 切換當前學員，並即時切換專屬錯題歷程與 UI
  async switchStudent(studentId, name = '', grade = '') {
    if (!studentId) return;
    this.currentStudentId = studentId;
    localStorage.setItem('starfall_student_id', studentId);

    if (name) {
      this.studentName = name;
      localStorage.setItem('starfall_student_name', name);
    }
    if (grade) {
      this.studentGrade = grade;
      localStorage.setItem('starfall_student_grade', grade);
    }

    const badgeEl = document.getElementById('studentIdBadge');
    const nameInput = document.getElementById('studentNameInput');
    const gradeSelect = document.getElementById('studentGradeSelect');
    const mistakeBadge = document.getElementById('studentMistakeBadge');
    const statusEl = document.getElementById('studentSyncStatus');

    if (badgeEl) badgeEl.textContent = `序號：${studentId}`;
    if (nameInput && name) nameInput.value = name;
    if (gradeSelect && grade) gradeSelect.value = grade;

    // 從 Google Sheet 或本機同步該學員的歷史作答進度
    await this.fetchStudentProgressFromCloud(studentId);

    const mistakes = this.getMistakeCount(studentId);
    if (mistakeBadge) {
      mistakeBadge.textContent = mistakes > 0 ? `待雪恥錯題：${mistakes} 題` : '待雪恥錯題：0 題 (無未解決弱點)';
    }
    if (statusEl) {
      statusEl.textContent = `✅ 當前駕駛員：${this.studentName} (${studentId})，獨立學習歷程已就緒`;
    }
    if (window.__starfallGame && typeof window.__starfallGame.updatePermissionUI === 'function') {
      window.__starfallGame.updatePermissionUI();
    }
  }

  async fetchStudentProgressFromCloud(studentId) {
    const apiUrl = localStorage.getItem('starfall_gs_url') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.apiBaseUrl);
    if (!apiUrl || !apiUrl.startsWith('http') || apiUrl.includes('PASTE_YOUR') || !studentId) return;
    try {
      const res = await fetch(`${apiUrl}?action=student_progress&student_id=${encodeURIComponent(studentId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.progress) {
          const map = this.getStudentProgressMap(studentId);
          Object.assign(map, data.progress);
          try {
            localStorage.setItem(`starfall_progress_${studentId}`, JSON.stringify(map));
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  addOrUpdateLocalStudent(studentId, name, grade) {
    let localStudents = [];
    try {
      localStudents = JSON.parse(localStorage.getItem('starfall_local_students') || '[]');
    } catch (e) { localStudents = []; }
    const idx = localStudents.findIndex(s => s.student_id === studentId);
    const item = { student_id: studentId, name: name, display_name: name, grade: grade, updated_at: new Date().toISOString() };
    if (idx >= 0) {
      localStudents[idx] = Object.assign(localStudents[idx], item);
    } else {
      localStudents.push(item);
    }
    localStorage.setItem('starfall_local_students', JSON.stringify(localStudents));
  }

  updateStudentListUI() {
    const sel = document.getElementById('studentSelect');
    if (!sel) return;

    const map = new Map();
    if (Array.isArray(this.sheetStudents)) {
      this.sheetStudents.forEach(s => {
        if (s && s.student_id) map.set(s.student_id, {
          student_id: s.student_id,
          name: s.display_name || s.name || s.student_id,
          grade: s.grade || '三年級'
        });
      });
    }
    try {
      const locals = JSON.parse(localStorage.getItem('starfall_local_students') || '[]');
      locals.forEach(s => {
        if (s && s.student_id && !map.has(s.student_id)) {
          map.set(s.student_id, {
            student_id: s.student_id,
            name: s.display_name || s.name || s.student_id,
            grade: s.grade || '三年級'
          });
        }
      });
    } catch(e) {}

    const cur = this.currentStudentId;
    sel.innerHTML = '<option value="__new__">➕ 註冊新駕駛員學員...</option>';
    map.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.student_id;
      opt.dataset.name = s.name;
      opt.dataset.grade = s.grade;
      opt.textContent = `${s.student_id} - ${s.name} (${s.grade})`;
      if (s.student_id === cur) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async syncStudentProfile(name, grade, forceNew = false) {
    name = String(name || '').trim();
    if (!name) name = '學員';
    grade = String(grade || '三年級').trim();

    this.studentName = name;
    this.studentGrade = grade;
    localStorage.setItem('starfall_student_name', name);
    localStorage.setItem('starfall_student_grade', grade);

    const statusEl = document.getElementById('studentSyncStatus');
    const badgeEl = document.getElementById('studentIdBadge');
    const mistakeBadge = document.getElementById('studentMistakeBadge');

    const apiUrl = localStorage.getItem('starfall_gs_url') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.apiBaseUrl);

    // 1. 若有設定 Google Sheet API URL，向 Google Apps Script 註冊或檢索學號 (雙軌道 POST + GET 容錯)
    if (apiUrl && apiUrl.startsWith('http') && !apiUrl.includes('PASTE_YOUR')) {
      if (statusEl) statusEl.textContent = '⏳ 正在與 Google Sheet 同步學員資料...';
      try {
        let data = null;
        // 軌道 1：標準 POST 傳輸
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'register_student', name: name, grade: grade, forceNew: forceNew })
          });
          if (res.ok) {
            data = await res.json().catch(() => null);
          }
        } catch (postErr) {
          console.warn('[Google Sheet] POST 註冊遇阻，切換 GET 備援管道：', postErr);
        }

        // 軌道 2：GET 備援傳輸 (繞過部分行動網路或防火牆對非標準 POST 的阻斷)
        if (!data || !data.ok) {
          try {
            const getUrl = `${apiUrl}?action=register_student&name=${encodeURIComponent(name)}&grade=${encodeURIComponent(grade)}&forceNew=${forceNew ? 'true' : 'false'}`;
            const resGet = await fetch(getUrl);
            if (resGet.ok) {
              data = await resGet.json().catch(() => null);
            }
          } catch (getErr) {
            console.warn('[Google Sheet] GET 備援註冊亦失敗：', getErr);
          }
        }

        if (data && data.ok && data.student_id) {
          this.currentStudentId = data.student_id;
          localStorage.setItem('starfall_student_id', data.student_id);
          if (badgeEl) badgeEl.textContent = `序號：${data.student_id}`;
          if (statusEl) {
            statusEl.textContent = data.isNew 
              ? `✅ 已建立新序號 ${data.student_id} 並如實記錄至 Google Sheet Students 表！` 
              : `✅ 已綁定既有學號 ${data.student_id}！`;
          }
          this.addOrUpdateLocalStudent(data.student_id, name, grade);
          this.updateStudentListUI();
          const mistakes = this.getMistakeCount(data.student_id);
          if (mistakeBadge) {
            mistakeBadge.textContent = mistakes > 0 ? `待雪恥錯題：${mistakes} 題` : '待雪恥錯題：0 題 (新學員)';
          }
          if (window.__starfallGame && typeof window.__starfallGame.updatePermissionUI === 'function') {
            window.__starfallGame.updatePermissionUI();
          }
          return data.student_id;
        }
      } catch (err) {
        console.warn('[Google Sheet] 學員同步失敗，啟用本機序列號：', err);
      }
    }

    // 2. 離線或本機模式：以 S0000 格式分配序號
    let localStudents = [];
    try {
      localStudents = JSON.parse(localStorage.getItem('starfall_local_students') || '[]');
    } catch(e) { localStudents = []; }

    let existing = !forceNew ? localStudents.find(s => (s.name === name || s.display_name === name) && (!grade || s.grade === grade)) : null;
    if (!existing) {
      let maxNum = 0;
      localStudents.forEach(s => {
        const m = String(s.student_id || '').match(/^S(\d+)$/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const curSaved = localStorage.getItem('starfall_student_id');
      if (curSaved) {
        const m = String(curSaved).match(/^S(\d+)$/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const newNum = maxNum + 1;
      const newId = 'S' + String(newNum).padStart(4, '0');
      existing = { student_id: newId, name: name, display_name: name, grade: grade, created_at: new Date().toISOString() };
      localStudents.push(existing);
      localStorage.setItem('starfall_local_students', JSON.stringify(localStudents));
    }

    this.currentStudentId = existing.student_id;
    localStorage.setItem('starfall_student_id', existing.student_id);
    if (badgeEl) badgeEl.textContent = `序號：${existing.student_id}`;
    if (statusEl) statusEl.textContent = `本機學員序號：${existing.student_id} (待連線 Google Sheet 自動記錄)`;
    this.addOrUpdateLocalStudent(existing.student_id, name, grade);
    this.updateStudentListUI();
    const mistakes = this.getMistakeCount(existing.student_id);
    if (mistakeBadge) {
      mistakeBadge.textContent = mistakes > 0 ? `待雪恥錯題：${mistakes} 題` : '待雪恥錯題：0 題 (新學員)';
    }
    if (window.__starfallGame && typeof window.__starfallGame.updatePermissionUI === 'function') {
      window.__starfallGame.updatePermissionUI();
    }
    return existing.student_id;
  }

  async initIndexedDB() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(this.dbName, 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('attempts')) {
          db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'question_id' });
        }
        if (!db.objectStoreNames.contains('student_progress')) {
          const store = db.createObjectStore('student_progress', { keyPath: 'id' });
          store.createIndex('student_id', 'student_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        this.loadProgressFromDB();
        resolve(this.db);
      };
      req.onerror = () => resolve(null);
    });
  }

  async loadProgressFromDB() {
    if (!this.db) return;
    try {
      if (this.db.objectStoreNames.contains('student_progress')) {
        const tx = this.db.transaction('student_progress', 'readonly');
        const store = tx.objectStore('student_progress');
        const req = store.getAll();
        req.onsuccess = () => {
          if (req.result) {
            req.result.forEach(item => {
              const sid = item.student_id || 'S0001';
              if (!this.allStudentProgress[sid]) this.allStudentProgress[sid] = {};
              this.allStudentProgress[sid][item.question_id] = item;
            });
          }
        };
      }
    } catch (err) {
      console.warn('IndexedDB load error:', err);
    }
  }

  async recordAttempt(attempt) {
    const qid = attempt.question_id;
    const sid = attempt.student_id || this.currentStudentId || 'S0001';
    attempt.student_id = sid;
    attempt.student_name = attempt.student_name || this.studentName || '學員';
    attempt.student_grade = attempt.student_grade || this.studentGrade || '三年級';

    const sidMap = this.getStudentProgressMap(sid);
    if (!sidMap[qid]) {
      sidMap[qid] = {
        student_id: sid,
        question_id: qid,
        attempts: 0,
        wrong: 0,
        lastAttempt: Date.now(),
        streak: 0,
        avenged: false
      };
    }
    const p = sidMap[qid];
    p.attempts++;
    p.lastAttempt = Date.now();
    if (attempt.correct) {
      p.streak++;
      if (attempt.is_review) p.avenged = true;
    } else {
      p.wrong++;
      p.streak = 0;
      p.avenged = false;
    }

    // 跨局題幹指紋更新 (Mastered vs Mistake，杜絕不同 ID 但同題幹之重複題)
    const qText = attempt.question || (this.questionBank && (this.questionBank.find(q => q.question_id === qid) || {}).question) || '';
    const fp = this.getQuestionFingerprint(qText);
    if (fp) {
      if (attempt.correct) {
        this.masteredFingerprints.add(fp);
        delete this.mistakeMap[fp];
        this.saveFingerprintsToStorage();
      } else {
        if (!this.masteredFingerprints.has(fp)) {
          const qObj = this.questionBank && this.questionBank.find(q => q.question_id === qid);
          this.mistakeMap[fp] = qObj ? { ...qObj } : { question_id: qid, question: qText, grade: attempt.student_grade };
          this.saveFingerprintsToStorage();
        }
      }
    }

    try {
      localStorage.setItem(`starfall_progress_${sid}`, JSON.stringify(sidMap));
    } catch (e) {}

    if (this.db) {
      try {
        const tx = this.db.transaction(['attempts', 'student_progress'], 'readwrite');
        tx.objectStore('attempts').add(attempt);
        tx.objectStore('student_progress').put({
          id: `${sid}::${qid}`,
          student_id: sid,
          question_id: qid,
          attempts: p.attempts,
          wrong: p.wrong,
          lastAttempt: p.lastAttempt,
          streak: p.streak,
          avenged: p.avenged
        });
      } catch (err) {
        console.warn('IndexedDB write error:', err);
      }
    }

    // 立即發送單題直連 GET 請求 (免受 302 POST 重定向遺失 body 影響)
    const apiUrl = localStorage.getItem('starfall_gs_url') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.apiBaseUrl);
    let syncedImmediately = false;
    if (apiUrl && apiUrl.startsWith('http') && !apiUrl.includes('PASTE_YOUR')) {
      try {
        const params = new URLSearchParams({
          action: 'attempt',
          student_id: sid,
          student_name: attempt.student_name,
          student_grade: attempt.student_grade,
          question_id: qid,
          selected_option: attempt.selected_option || '',
          correct: attempt.correct ? 'true' : 'false',
          stage: String(attempt.stage || 1),
          boss_name: attempt.boss_name || '',
          is_review: attempt.is_review ? 'true' : 'false',
          timestamp: attempt.timestamp || new Date().toISOString()
        });
        const res = await fetch(`${apiUrl}?${params.toString()}`);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.ok && (data.attempt || data.count !== undefined)) {
            syncedImmediately = true;
            console.log(`[Google Sheet] ✅ 單題即時直連記錄成功！學號：${sid}，題目：${qid}`);
          }
        }
      } catch (e) {
        console.warn('[Google Sheet] 單題即時上報失敗，加入離線隊列：', e);
      }
    }

    if (!syncedImmediately) {
      this.offlineQueue.push(attempt);
      try {
        localStorage.setItem('starfall_offline_attempt_queue_v1', JSON.stringify(this.offlineQueue));
      } catch (e) {}
      this.syncOfflineQueue();
    }
  }

  async syncOfflineQueue() {
    const apiUrl = localStorage.getItem('starfall_gs_url') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.apiBaseUrl);
    if (!apiUrl || apiUrl.includes('PASTE_YOUR')) return;
    if (this.offlineQueue.length === 0 || this._isSyncing) return;
    this._isSyncing = true;
    try {
      const batch = this.offlineQueue.slice(0, 10);
      let synced = false;

      // 軌道 1：GET 優先批次上報 (雙重容錯，URL 傳參免受 302 重定向影響)
      try {
        const encoded = encodeURIComponent(JSON.stringify(batch));
        const getUrl = `${apiUrl}?action=attempt_batch&attempts=${encoded}&data=${encoded}`;
        const resGet = await fetch(getUrl);
        if (resGet.ok) {
          const data = await resGet.json().catch(() => null);
          if (data && data.ok && (data.count !== undefined || data.attempt !== undefined)) {
            synced = true;
          }
        }
      } catch (getErr) {
        console.warn('[Google Sheet] GET 批次同步失敗，嘗試 POST 備援：', getErr);
      }

      // 軌道 2：POST 批次備援上報
      if (!synced) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'attempt_batch', attempts: batch })
          });
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data && data.ok && (data.count !== undefined || data.attempt !== undefined)) {
              synced = true;
            }
          }
        } catch (postErr) {
          console.warn('[Google Sheet] POST 備援同步作答亦失敗：', postErr);
        }
      }

      if (synced) {
        this.offlineQueue.splice(0, batch.length);
        try {
          localStorage.setItem('starfall_offline_attempt_queue_v1', JSON.stringify(this.offlineQueue));
        } catch (e) {}
        console.log(`[Google Sheet] ✅ 成功同步 ${batch.length} 筆作答紀錄至試算表！`);
      }
    } catch (e) {
      console.warn('[Google Sheet] 雲端同步暫時離線，紀錄保留於本機隊列：', e);
    } finally {
      this._isSyncing = false;
    }
  }

  async loadFromGoogleSheet(apiUrl) {
    if (!apiUrl || !apiUrl.startsWith('http')) return false;
    try {
      console.log('[Google Sheet] 正在從 Apps Script 下載題庫...', apiUrl);
      const res = await fetch(`${apiUrl}?action=questions`);
      if (!res.ok) throw new Error(`HTTP 錯誤碼: ${res.status}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.questions) && data.questions.length > 0) {
        const bank = data.questions.map((q, idx) => {
          let opts = [];
          if (Array.isArray(q.options)) {
            opts = q.options.filter(Boolean);
          } else {
            opts = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
          }
          if (opts.length < 2) opts = ['選項A', '選項B', '選項C', '選項D'];

          const ansLetter = String(q.answer || 'A').trim().toUpperCase();
          const ansIdx = 'ABCD'.indexOf(ansLetter);

          return {
            question_id: q.question_id || `Q-GS-${idx + 1}`,
            grade: q.grade || '',
            question: q.question,
            opts: opts,
            ans: ansIdx >= 0 ? ansIdx : 0,
            subject: q.subject || '國語文',
            skill: q.skill || '語文素養',
            difficulty: parseInt(q.difficulty) || 1,
            explanation_short: q.explanation_short || '',
            explanation_detail: q.explanation_detail || '',
            memory_tip: q.memory_tip || '',
            target_words: q.target_words || [],
            concept_tags: q.concept_tags || []
          };
        });

        this.questionBank = bank;
        this.isCloudSynced = true;
        this.updateBankStatusUI();
        console.log(`[Google Sheet] ✅ 成功載入試算表題庫共 ${bank.length} 題！`);

        // 同時獲取學生檔案並更新選單 (不強制覆蓋使用者當前選擇之學生)
        try {
          const stRes = await fetch(`${apiUrl}?action=students`);
          if (stRes.ok) {
            const stData = await stRes.json();
            if (stData.ok && Array.isArray(stData.students) && stData.students.length > 0) {
              this.sheetStudents = stData.students;
              this.updateStudentListUI();
              console.log(`[Google Sheet] 成功獲取 ${stData.students.length} 位學生名冊！`);
              // 若當前學生已在試算表中，同步最新雲端進度
              const matched = stData.students.find(s => s.student_id === this.currentStudentId);
              if (matched) {
                this.studentName = matched.display_name || this.studentName;
                this.studentGrade = matched.grade || this.studentGrade;
                await this.fetchStudentProgressFromCloud(this.currentStudentId);
              }
            }
          }
        } catch (stErr) {
          // ignore student fetch failure
        }
        return true;
      }
    } catch (err) {
      console.warn('[Google Sheet] 無法載入雲端題庫，切換本機預設：', err);
    }
    return false;
  }

  updateBankStatusUI() {
    const count = this.questionBank ? this.questionBank.length : 0;
    const isCloud = this.isCloudSynced;
    const statusEl = document.getElementById('studentSyncStatus');
    const sourceLabel = isCloud ? '☁️ Google Sheet 雲端直連' : '💾 本機題庫就緒';
    if (statusEl) {
      statusEl.innerHTML = `📚 題庫規模：<b style="color:var(--cyan-bright); font-size:12px;">${count.toLocaleString()}</b> 題（${sourceLabel}）`;
    }
    const gsStatusBox = document.getElementById('gsStatusBox');
    if (gsStatusBox) {
      gsStatusBox.innerHTML = `
        <span style="color:${isCloud ? 'var(--green)' : 'var(--cyan)'}; font-weight:800;">${isCloud ? '✅ Google Sheet 題庫已就緒！' : 'ℹ️ 當前為本機題庫狀態'}</span><br>
        已對接題庫總數：<b>${count.toLocaleString()}</b> 題（${isCloud ? '雲端試算表直連' : '本機離線備援'}）。<br>
        綁定學生：<b>${this.studentName || 'S0001'}</b> (${this.currentStudentId || 'S0001'})<br>
        作答歷程將即時寫入試算表 <code>Attempts</code> 分頁！
      `;
    }
  }

  async loadInitialData() {
    try {
      const [bossRes, wpnRes, fusRes] = await Promise.all([
        fetch('data/boss-data.json').then(r => r.json()),
        fetch('data/weapon-data.json').then(r => r.json()),
        fetch('data/fusion-data.json').then(r => r.json())
      ]);
      this.bossData = bossRes;
      this.weaponData = wpnRes.weapons;
      this.fusionData = fusRes.fusions;
    } catch (e) {
      console.warn('Failed loading data json:', e);
    }

    // 1. 先讀取本機 CSV 題庫作為基礎備援
    try {
      const csvText = await fetch('data/default-question-bank.csv').then(r => r.text());
      this.questionBank = this.parseCSV(csvText);
      this.updateBankStatusUI();
    } catch (e) {
      console.warn('Failed loading CSV bank:', e);
    }

    // 2. 檢測 Google Sheet 設定並主動連線載入 3000 題雲端題庫
    const apiUrl = localStorage.getItem('starfall_gs_url') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.apiBaseUrl);
    if (apiUrl && apiUrl.startsWith('http') && !apiUrl.includes('PASTE_YOUR')) {
      await this.loadFromGoogleSheet(apiUrl);
      this.updateBankStatusUI();
    }
  }

  parseCSV(text) {
    if (!text) return [];
    const lines = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else { cell += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(cell.trim()); cell = ''; }
        else if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          row.push(cell.trim()); cell = '';
          if (row.some(x => x.length > 0)) lines.push(row);
          row = [];
        } else { cell += c; }
      }
    }
    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(x => x.length > 0)) lines.push(row);
    }
    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.toLowerCase());
    const idx = (name) => headers.indexOf(name);
    const qidIdx = idx('question_id');
    const gradeIdx = idx('grade');
    const qIdx = idx('question');
    const aIdx = idx('option_a');
    const bIdx = idx('option_b');
    const cIdx = idx('option_c');
    const dIdx = idx('option_d');
    const ansIdx = idx('answer');
    const expSIdx = idx('explanation_short');
    const expDIdx = idx('explanation_detail');
    const tipIdx = idx('memory_tip');
    const skillIdx = idx('skill');
    const subIdx = idx('subject');
    const diffIdx = idx('difficulty');

    const bank = [];
    for (let i = 1; i < lines.length; i++) {
      const r = lines[i];
      if (!r[qIdx]) continue;
      const opts = [r[aIdx], r[bIdx], r[cIdx], r[dIdx]].filter(Boolean);
      if (opts.length < 2) continue;
      let ansLetter = (r[ansIdx] || 'A').toUpperCase();
      let ansNum = 'ABCD'.indexOf(ansLetter);
      if (ansNum < 0) ansNum = 0;

      bank.push({
        question_id: r[qidIdx] || `Q-${i}`,
        grade: r[gradeIdx] || '',
        question: r[qIdx],
        opts: opts,
        ans: ansNum,
        subject: r[subIdx] || '國語文',
        skill: r[skillIdx] || '語文素養',
        difficulty: parseInt(r[diffIdx]) || 1,
        explanation_short: r[expSIdx] || '',
        explanation_detail: r[expDIdx] || '',
        memory_tip: r[tipIdx] || ''
      });
    }
    return bank;
  }

  isGradeMatch(qGrade, sGrade) {
    if (!sGrade || !qGrade) return true;
    const qg = String(qGrade).trim();
    const sg = String(sGrade).trim();
    if (qg === sg) return true;
    if (qg.includes(sg) || sg.includes(qg)) return true;
    if (sg === '國中' && qg.startsWith('國中')) return true;
    return false;
  }

  // 取得其他學員曾答錯但當前學員從未嘗試過的錯題（同儕易錯攻堅題）
  getPeerMistakes(currentSid, pool) {
    const peerMistakeQids = new Set();
    const currentProgress = this.getStudentProgressMap(currentSid);

    // 1. 從記憶體中的 allStudentProgress 收集其他學員的錯題
    if (this.allStudentProgress) {
      Object.entries(this.allStudentProgress).forEach(([sid, pMap]) => {
        if (sid !== currentSid && pMap) {
          Object.entries(pMap).forEach(([qid, p]) => {
            if (p && p.wrong > 0) {
              peerMistakeQids.add(qid);
            }
          });
        }
      });
    }

    // 2. 從 localStorage (starfall_progress_*) 收集其他學員的錯題
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('starfall_progress_')) {
            const sid = key.replace('starfall_progress_', '');
            if (sid !== currentSid) {
              const val = localStorage.getItem(key);
              if (val) {
                const parsed = JSON.parse(val);
                if (parsed && typeof parsed === 'object') {
                  Object.entries(parsed).forEach(([qid, p]) => {
                    if (p && p.wrong > 0) {
                      peerMistakeQids.add(qid);
                    }
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed scanning localStorage for peer mistakes:', e);
    }

    // 3. 在可用池中篩選出：當前玩家從未嘗試過 (attempts === 0 或無記錄) 且非掌握題
    const candidates = [];
    pool.forEach(q => {
      if (!peerMistakeQids.has(q.question_id)) return;
      const fp = this.getQuestionFingerprint(q.question);
      if (this.masteredFingerprints && this.masteredFingerprints.has(fp)) return;
      if (this.sessionUsedQuestionIds && this.sessionUsedQuestionIds.has(q.question_id)) return;
      if (this.sessionUsedFingerprints && this.sessionUsedFingerprints.has(fp)) return;
      const cp = currentProgress[q.question_id];
      if (cp && cp.attempts > 0) return; // 該玩家若已做過則不符合「未在該玩家答題紀錄出現過」條件
      candidates.push(q);
    });

    return candidates;
  }

  // 依照關卡難度權重配題
  getDifficultyWeightMap(stage = 1) {
    // 題目權重先全部歸零，依照關卡梯度配題
    // stage 1-2: 難度 1 (100), 難度 2 (30)
    // stage 3-4: 難度 2 (100), 難度 1 (35), 難度 3 (35)
    // stage 5-6: 難度 3 (100), 難度 2 (40), 難度 4 (40)
    // stage 7-8: 難度 4 (100), 難度 3 (40), 難度 5 (40)
    // stage 9-10: 難度 5 (100), 難度 4 (50), 難度 3 (20)
    if (stage <= 2) {
      return { 1: 100, 2: 30, 3: 5, 4: 0, 5: 0 };
    } else if (stage <= 4) {
      return { 1: 30, 2: 100, 3: 40, 4: 5, 5: 0 };
    } else if (stage <= 6) {
      return { 1: 5, 2: 35, 3: 100, 4: 45, 5: 10 };
    } else if (stage <= 8) {
      return { 1: 0, 2: 10, 3: 35, 4: 100, 5: 50 };
    } else {
      return { 1: 0, 2: 0, 3: 20, 4: 60, 5: 100 };
    }
  }

  // 加權隨機抽題輔助函式
  drawWeightedQuestions(candidates, count, stage = 1) {
    if (candidates.length <= count) return [...candidates];
    const weightMap = this.getDifficultyWeightMap(stage);
    const pool = candidates.map(q => {
      const diff = q.difficulty || 1;
      const w = weightMap[diff] !== undefined ? weightMap[diff] : 10;
      return { item: q, weight: w };
    });

    // 檢查若所有候選題目權重總和為 0 (極端情況)，則重設基礎權重
    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) {
      pool.forEach(c => c.weight = 10);
    }

    const drawn = [];
    while (drawn.length < count && pool.length > 0) {
      const curTotal = pool.reduce((sum, c) => sum + c.weight, 0);
      let r = Math.random() * curTotal;
      let chosenIdx = 0;
      for (let i = 0; i < pool.length; i++) {
        if (r < pool[i].weight) {
          chosenIdx = i;
          break;
        }
        r -= pool[i].weight;
      }
      drawn.push(pool[chosenIdx].item);
      pool.splice(chosenIdx, 1);
    }
    return drawn;
  }

  pickAdaptiveQuestions(count = 5, stage = 1) {
    if (!this.questionBank || this.questionBank.length === 0) return [];
    const sid = this.currentStudentId || 'S0001';
    const sidProgress = this.getStudentProgressMap(sid);

    // 若設定了特定學員年級，優先篩選符合該年級之題目池（若符合年級之題數充足時）
    let pool = [...this.questionBank];
    if (this.studentGrade) {
      const gradeMatched = this.questionBank.filter(q => this.isGradeMatch(q.grade, this.studentGrade));
      if (gradeMatched.length >= count) {
        pool = gradeMatched;
      }
    }

    if (!this.sessionUsedQuestionIds) {
      this.sessionUsedQuestionIds = new Set();
    }
    if (!this.sessionUsedFingerprints) {
      this.sessionUsedFingerprints = new Set();
    }

    // 1. 本局未作答題目池（嚴格排除本局同一 run 已抽過的題目 ID 與題幹指紋，徹底零重複）
    let availablePool = pool.filter(q => {
      if (this.sessionUsedQuestionIds.has(q.question_id)) return false;
      const fp = this.getQuestionFingerprint(q.question);
      if (this.sessionUsedFingerprints.has(fp)) return false;
      return true;
    });

    // 若本局題庫全部被刷完（極端情況），清空 session 快取重啟新循環（但仍排除跨局已掌握熟練題）
    if (availablePool.length < count) {
      this.sessionUsedQuestionIds.clear();
      this.sessionUsedFingerprints.clear();
      availablePool = pool.filter(q => {
        const fp = this.getQuestionFingerprint(q.question);
        return !this.masteredFingerprints.has(fp);
      });
      if (availablePool.length < count) {
        availablePool = [...pool];
      }
    }

    const selected = [];
    const selectedFps = new Set();

    // 2.【同儕易錯攻堅題】：若其他人有錯題且未在該玩家答題紀錄出現過，優先出題 1~2 題
    const peerMistakes = this.getPeerMistakes(sid, availablePool);
    if (peerMistakes.length > 0) {
      peerMistakes.sort(() => Math.random() - 0.5);
      const peerTargetCount = Math.min(2, Math.min(count - 1, peerMistakes.length));
      for (let i = 0; i < peerTargetCount; i++) {
        const pq = peerMistakes[i];
        const fp = this.getQuestionFingerprint(pq.question);
        if (!selectedFps.has(fp)) {
          selected.push({
            ...pq,
            isPeerMistake: true,
            isReview: false,
            isRevenge: false
          });
          selectedFps.add(fp);
          this.sessionUsedQuestionIds.add(pq.question_id);
          this.sessionUsedFingerprints.add(fp);
        }
      }
    }

    // 3.【自身錯題復仇機制】：優先摻入 1~2 題當前玩家尚未雪恥復仇的錯題 (p.wrong > 0 && !p.avenged)
    const neededForMistakes = count - selected.length;
    if (neededForMistakes > 0) {
      const unavengedMistakes = [];
      // (A) 從 mistakeMap 優先提取 (包含跨局儲存之錯題)
      if (this.mistakeMap) {
        Object.entries(this.mistakeMap).forEach(([fp, mq]) => {
          if (!this.masteredFingerprints.has(fp) && !this.sessionUsedFingerprints.has(fp) && !selectedFps.has(fp)) {
            unavengedMistakes.push(mq);
          }
        });
      }
      // (B) 比對 sidProgress 中尚未雪恥的題目
      availablePool.forEach(q => {
        const fp = this.getQuestionFingerprint(q.question);
        const p = sidProgress[q.question_id];
        if (p && p.wrong > 0 && !p.avenged && !this.masteredFingerprints.has(fp)) {
          if (!unavengedMistakes.some(m => this.getQuestionFingerprint(m.question) === fp)) {
            unavengedMistakes.push(q);
          }
        }
      });

      if (unavengedMistakes.length > 0) {
        unavengedMistakes.sort(() => Math.random() - 0.5);
        const mistakeTargetCount = Math.min(2, Math.min(neededForMistakes, unavengedMistakes.length));
        for (let i = 0; i < mistakeTargetCount; i++) {
          const mq = unavengedMistakes[i];
          const fp = this.getQuestionFingerprint(mq.question);
          if (!selectedFps.has(fp)) {
            selected.push({
              ...mq,
              isPeerMistake: false,
              isReview: true,
              isRevenge: true
            });
            selectedFps.add(fp);
            this.sessionUsedQuestionIds.add(mq.question_id);
            this.sessionUsedFingerprints.add(fp);
          }
        }
      }
    }

    // 4.【全新未作答題目 + 依照難度配題權重抽取】：權重先全部歸零，依照難度配題
    const remainingNeeded = count - selected.length;
    if (remainingNeeded > 0) {
      const freshQuestions = [];
      const seenFreshFp = new Set();

      for (const q of availablePool) {
        if (this.sessionUsedQuestionIds.has(q.question_id)) continue;
        const fp = this.getQuestionFingerprint(q.question);
        if (!fp || this.sessionUsedFingerprints.has(fp) || selectedFps.has(fp)) continue;
        if (this.masteredFingerprints.has(fp)) continue; // 100% 排除已掌握指紋
        if (seenFreshFp.has(fp)) continue;
        const p = sidProgress[q.question_id];
        if (p && p.attempts > 0 && p.wrong === 0) continue; // 排除已答對題

        freshQuestions.push(q);
        seenFreshFp.add(fp);
      }

      if (freshQuestions.length >= remainingNeeded) {
        // 依照關卡難度加權抽取
        const drawn = this.drawWeightedQuestions(freshQuestions, remainingNeeded, stage);
        for (const fq of drawn) {
          const fp = this.getQuestionFingerprint(fq.question);
          selected.push({
            ...fq,
            isPeerMistake: false,
            isReview: false,
            isRevenge: false
          });
          selectedFps.add(fp);
          this.sessionUsedQuestionIds.add(fq.question_id);
          this.sessionUsedFingerprints.add(fp);
        }
      } else {
        // 全新題目不足時取完所有新題，其餘自未熟練可用池補足
        freshQuestions.forEach(fq => {
          const fp = this.getQuestionFingerprint(fq.question);
          selected.push({ ...fq, isPeerMistake: false, isReview: false, isRevenge: false });
          selectedFps.add(fp);
          this.sessionUsedQuestionIds.add(fq.question_id);
          this.sessionUsedFingerprints.add(fp);
        });

        const stillNeeded = count - selected.length;
        if (stillNeeded > 0) {
          const remainingOthers = [];
          const seenOtherFp = new Set();
          for (const oq of availablePool) {
            if (this.sessionUsedQuestionIds.has(oq.question_id)) continue;
            const fp = this.getQuestionFingerprint(oq.question);
            if (!fp || this.sessionUsedFingerprints.has(fp) || selectedFps.has(fp) || seenOtherFp.has(fp)) continue;
            remainingOthers.push(oq);
            seenOtherFp.add(fp);
          }
          const drawnOthers = this.drawWeightedQuestions(remainingOthers, stillNeeded, stage);
          for (const oq of drawnOthers) {
            const fp = this.getQuestionFingerprint(oq.question);
            const p = sidProgress[oq.question_id];
            selected.push({
              ...oq,
              isPeerMistake: false,
              isReview: !!(p && p.attempts > 0),
              isRevenge: !!(p && p.wrong > 0 && !p.avenged)
            });
            selectedFps.add(fp);
            this.sessionUsedQuestionIds.add(oq.question_id);
            this.sessionUsedFingerprints.add(fp);
          }
        }
      }
    }

    return selected;
  }
}

// ============================================================
// 3.5 十六款神話武器完整規格型錄 (Static Catalog)
// ============================================================
const STARFALL_WEAPONS_CATALOG = [
  { id: 'multishot', name: '多管神機砲', isPassive: false, tier: 'C', tierName: 'C 級・基礎主砲', icon: 'assets/icons/weapons/weapon_1.png', tag: '主動・主砲', baseDmg: 36, desc: '經典高機動速射多管機砲，連續命中目標累積裂甲破防印記（最高 +50% 傷害）。' },
  { id: 'beam_cannon', name: '金陽聚焦光束', isPassive: false, tier: 'A', tierName: 'A 級・強襲主力', icon: 'assets/icons/weapons/weapon_2.png', tag: '主動・穿透', baseDmg: 240, desc: '筆直貫穿全螢幕之金色光柱，「熱能融解」穿透護盾造成敵方最大生命持續灼燒。' },
  { id: 'spirit_bullet', name: '靈能聚變核心', isPassive: true, tier: 'C', tierName: 'C 級・守護輔助', icon: 'assets/icons/weapons/weapon_3.png', tag: '被動・聚變', baseDmg: 110, desc: '慢速向前浮游之幽藍靈核，向周遭放射電漿弧，自機靈丸蓄力速度加快 30%。' },
  { id: 'kinetic_dart', name: '超空泡穿甲鏢', isPassive: false, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_4.png', tag: '主動・穿刺', baseDmg: 85, desc: '極高速藍色超空泡標槍，100% 貫穿所有敵人，每穿透一名目標傷害遞增 20%。' },
  { id: 'homing_missile', name: '烈陽核融導彈', isPassive: false, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_5.png', tag: '主動・索敵', baseDmg: 42, desc: '巡弋微型核融飛彈，自動尋標最危險敵機，命中引發大範圍熱核爆轟與火環。' },
  { id: 'jade_chakram', name: '青玉風雷飛輪', isPassive: false, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_6.png', tag: '主動・削彈', baseDmg: 140, desc: '向前拋射的旋轉碧玉刃輪，在空中超高速旋轉，直接削碎切斷接觸的敵方子彈！' },
  { id: 'combat_wingman', name: '神鳥隨行僚機', isPassive: true, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_7.png', tag: '被動・僚機', baseDmg: 40, desc: '雙聯神鳥僚機伴隨兩翼，形成極致扇形綠色雷射交叉火網，持續壓制前線。' },
  { id: 'prism_wingman', name: '虹光折射星核', isPassive: true, tier: 'A', tierName: 'A 級・強襲主力', icon: 'assets/icons/weapons/weapon_8.png', tag: '被動・折射', baseDmg: 60, desc: '高科技浮游稜鏡，折射主砲光束，形成多角度偏折射線鎖定多重目標。' },
  { id: 'grenade_launcher', name: '熾陽熔岩噴射核', isPassive: false, tier: 'S', tierName: 'S 級・毀滅神話', icon: 'assets/icons/weapons/weapon_9.png', tag: '主動・地熱', baseDmg: 420, desc: '拋物線熔岩榴彈，引爆留下 5 秒半徑 75px 熔岩領域，焚毀進入敵機並蒸發敵彈。' },
  { id: 'singularity_core', name: '虛空重力奇點', isPassive: true, tier: 'C', tierName: 'C 級・守護輔助', icon: 'assets/icons/weapons/weapon_10.png', tag: '被動・黑洞', baseDmg: 80, desc: '重力黑洞漩渦，停留在戰場中產生強大引力，吸引雜兵並吞噬途經敵彈。' },
  { id: 'quantum_shield', name: '量子偏折護盾', isPassive: true, tier: 'C', tierName: 'C 級・守護輔助', icon: 'assets/icons/weapons/weapon_11.png', tag: '被動・神盾', baseDmg: 75, desc: '微型能量護盾環繞自機，每 8 秒自動刷新一次致命衝擊抵禦並反彈光刃。' },
  { id: 'taiji_array', name: '陰陽太極法陣', isPassive: false, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_12.png', tag: '主動・法陣', baseDmg: 75, desc: '旋轉的陰陽八卦符印，對目標附加五行震懾，使其攻擊力與移速降低 30%。' },
  { id: 'cryo_spire', name: '玄天冰魄凌柱', isPassive: true, tier: 'S', tierName: 'S 級・毀滅神話', icon: 'assets/icons/weapons/weapon_13.png', tag: '被動・天降', baseDmg: 480, desc: '天頂隨機垂降巨大永凍冰魄尖塔，下墜轟擊目標造成大範圍霜寒凍結與高額穿透，無須手動裝備。' },
  { id: 'emerald_spring', name: '翡翠靈泉護陣', isPassive: true, tier: 'C', tierName: 'C 級・守護輔助', icon: 'assets/icons/weapons/weapon_14.png', tag: '被動・光環', baseDmg: 65, desc: '週期性向外擴散綠色靈能修復波，清除近身彈幕，並有 15% 機率修復戰機裝甲。' },
  { id: 'time_dilation', name: '躍遷時空擴張', isPassive: true, tier: 'C', tierName: 'C 級・守護輔助', icon: 'assets/icons/weapons/weapon_15.png', tag: '被動・超頻', baseDmg: 0, desc: '戰鬥空間超頻擴展，全武器冷卻縮短 12%，移速與擦彈同步半徑大幅提升。' },
  { id: 'sonic_cannon', name: '超聲震盪重砲', isPassive: false, tier: 'S', tierName: 'S 級・毀滅神話', icon: 'assets/icons/weapons/weapon_16.png', tag: '主動・音波', baseDmg: 320, desc: '放射半圓弧音波震盪圈，擊退敵人並抵銷路徑上的所有敵方常規子彈。' },
  { id: 'chain_lightning', name: '雷公天劫鏈弧', isPassive: false, tier: 'A', tierName: 'A 級・強襲主力', icon: 'assets/icons/weapons/weapon_17.png', tag: '主動・連鎖', baseDmg: 180, desc: '發射高壓天劫電弧，在敵機群間連鎖彈跳最多 4 次，附加電漿麻痺與高額破盾。' },
  { id: 'solar_flare', name: '熾陽破曉耀斑', isPassive: false, tier: 'A', tierName: 'A 級・強襲主力', icon: 'assets/icons/weapons/weapon_18.png', tag: '主動・灼熱', baseDmg: 260, desc: '射出高溫破曉日冕日珥，貫穿路徑上所有敵機與反彈魔鏡，引發連續太陽耀斑焚燒。' },
  { id: 'plasma_blade', name: '裂變等離子刃', isPassive: false, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_19.png', tag: '主動・弧刃', baseDmg: 130, desc: '向前橫掃雙聯高能等離子月牙光刃，強力斬裂切碎前方敵陣並劈消敵方子彈。' },
  { id: 'nano_swarm', name: '奈米蝕甲蟲群', isPassive: true, tier: 'A', tierName: 'A 級・強襲主力', icon: 'assets/icons/weapons/weapon_20.png', tag: '被動・蝕甲', baseDmg: 45, desc: '釋放自律奈米機械蟲群，主動附著敵機持續腐蝕裝甲，使目標承受傷害增加 30%。' },
  { id: 'photon_lance', name: '天啟破城光錐', isPassive: false, tier: 'S', tierName: 'S 級・毀滅神話', icon: 'assets/icons/weapons/weapon_21.png', tag: '主動・貫穿', baseDmg: 580, desc: '凝聚超相對論光子尖錐，無視護盾防禦全屏直線貫穿，並粉碎所有沿途魔鏡障壁！' },
  { id: 'laser_array', name: '星陣軌道壁壘', isPassive: true, tier: 'B', tierName: 'B 級・戰術壓制', icon: 'assets/icons/weapons/weapon_22.png', tag: '被動・環衛', baseDmg: 52, desc: '雙聯浮游衛星雷射環繞機體，對接近的外環目標自動鎖定發射交織聚焦光束。' },
  { id: 'hyper_thruster', name: '疾風超導噴流', isPassive: true, tier: 'C', tierName: 'C 級・守護輔助', icon: 'assets/icons/weapons/weapon_23.png', tag: '被動・機動', baseDmg: 0, desc: '超導向量推進引擎，機體移動速度大幅提升 25%，擦彈判定半徑擴大 15px。' },
  { id: 'aegis_reflector', name: '神聖防衛折光稜鏡', isPassive: true, tier: 'A', tierName: 'A 級・強襲主力', icon: 'assets/icons/weapons/weapon_24.png', tag: '被動・偏折', baseDmg: 60, desc: '懸浮於兩翼之防禦折射晶體，週期性將靠近戰機的敵方子彈轉化為同步能量或偏折反彈。' },
  { id: 'chronos_scythe', name: '時序輪迴神鐮', isPassive: false, tier: 'S', tierName: 'S 級・毀滅神話', icon: 'assets/icons/weapons/weapon_25.png', tag: '主動・時空', baseDmg: 620, desc: '時空裂隙凝聚之命運死神巨鐮，橫跨戰場劃過造成極大範圍斬擊，並使周遭敵速減緩 50%。' }
];

// 六大真融合武器常數定義 (雙素材 Lv.3+ 解鎖)
const STARFALL_FUSIONS = [
  {
    id: 'comet_spirit',
    name: '彗星靈丸',
    ingredients: ['spirit_bullet', 'grenade_launcher'],
    minRank: 3,
    description: '靈丸凝聚重型榴彈爆燃彈頭，命中引發連續巨型核爆與大範圍空間烈焰！',
    resonance: { name: '靈爆共鳴', effect: '靈丸命中附帶連續核爆與熔岩火海' }
  },
  {
    id: 'prism_rainbow_sky',
    name: '虹晶天幕',
    ingredients: ['beam_cannon', 'prism_wingman'],
    minRank: 3,
    description: '光束砲穿透稜鏡僚機，向全場四面八方折射出交織滅世雷射光網！',
    resonance: { name: '折光共鳴', effect: '光束折射 6 道虹彩雷射穿透護盾' }
  },
  {
    id: 'swarm_hunter',
    name: '蜂群獵手',
    ingredients: ['homing_missile', 'combat_wingman'],
    minRank: 3,
    description: '隨行僚機改裝微型蜂巢飛彈發射架，與主機同時傾瀉漫天巡弋導彈！',
    resonance: { name: '導引共鳴', effect: '僚機自主齊射 8 發追蹤巡弋飛彈' }
  },
  {
    id: 'orbital_aegis',
    name: '軌道壁壘',
    ingredients: ['jade_chakram', 'quantum_shield'],
    minRank: 3,
    description: '青玉飛輪與埃癸斯神盾合為一體，環繞生成無死角偏折光幕，攔截敵彈充電！',
    resonance: { name: '偏折共鳴', effect: '飛輪反彈敵彈並為護盾極速充能' }
  },
  {
    id: 'meltdown_impact',
    name: '熔核轟擊',
    ingredients: ['grenade_launcher', 'singularity_core'],
    minRank: 3,
    description: '重裝熔岩榴彈灌注虛空重力奇點，著彈形成坍縮引力熔爐，吸扯並引爆周遭全部敵彈！',
    resonance: { name: '燃爆共鳴', effect: '引力黑洞伴隨熔岩焚燒並消解敵彈' }
  },
  {
    id: 'chrono_judgement',
    name: '凝時裁決',
    ingredients: ['beam_cannon', 'time_dilation'],
    minRank: 3,
    description: '高能光束撕裂時空連續體，光束釋放時全場敵機與彈幕進入極致慢速！',
    resonance: { name: '時滯共鳴', effect: '發射光束時全屏敵彈減速 60%' }
  }
];

// ============================================================
// 四、實體與粒子系統 (Entities, Bullets, Particles & Hazards)
// ============================================================
class Entity {
  constructor(x, y, r = 12) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = 0;
    this.vy = 0;
    this.hp = 1;
    this.maxHp = 1;
    this.dead = false;
  }
}

class Bullet extends Entity {
  constructor(x, y, vx, vy, isPlayer = false, damage = 10, type = 'normal', rank = 1) {
    super(x, y, isPlayer ? (3.5 + rank * 0.65) : 5);
    this.vx = vx;
    this.vy = vy;
    this.isPlayer = isPlayer;
    this.damage = damage;
    this.type = type; // normal, beam, homing, grenade, spirit, orbital, ebullet_needle, ebullet_ring
    this.rank = rank;
    this.life = 6.0;
    this.pierce = 1;
    this.target = null;
    this.isCrit = false;
    this.hitEnemies = new Set(); // 防止穿透彈每幀重複命中相同敵人造成卡頓
    this.hitMinions = new Set(); // 防止穿透彈每幀重複命中相同 Boss 召喚物造成卡頓
    this.lastHitBossTime = 0;   // Boss 傷害頻率節流計時 (避免每秒 60 次撞擊卡頓)
    const rankColors = {
      1: '#38bdf8', // 階級 1: 靈能天藍
      2: '#4ade80', // 階級 2: 翡翠耀綠
      3: '#a855f7', // 階級 3: 虛空幽紫
      4: '#fb923c', // 階級 4: 熾烈熔橙
      5: '#facc15'  // 階級 5: 弒神金曜
    };
    this.color = isPlayer ? (rankColors[rank] || '#38bdf8') : '#e0409a';
  }
}

class Particle {
  constructor(x, y, vx, vy, color = '#33e0e0', size = 3, life = 0.5) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const a = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class DamageNumber {
  constructor(x, y, text, isCrit = false, isHeal = false) {
    this.x = x + (Math.random() - 0.5) * 16;
    this.y = y;
    this.text = text;
    this.isCrit = isCrit;
    this.isHeal = isHeal;
    this.life = 0.8;
  }
  update(dt) {
    this.y -= 32 * dt;
    this.life -= dt;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life / 0.4);
    ctx.font = this.isCrit ? '900 18px var(--font-display)' : 'bold 12px var(--font-display)';
    ctx.fillStyle = this.isHeal ? '#48e583' : (this.isCrit ? '#f5bc38' : '#e0f4ff');
    ctx.shadowColor = this.isCrit ? 'rgba(245, 188, 56, 0.8)' : 'transparent';
    ctx.shadowBlur = this.isCrit ? 8 : 0;
    ctx.textAlign = 'center';
    ctx.fillText(this.isCrit ? `CRIT! ${this.text}` : this.text, this.x, this.y);
    ctx.restore();
  }
}

// ============================================================
// 五、核心遊戲主引擎 (Game Engine)
// ============================================================
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.sound = new SoundManager();
    this.dataStore = new DataStore();

    this.W = 440;
    this.H = 780;

    this.state = 'start';
    this.stage = 1;
    this.maxStage = 10;
    this.wave = 1;
    this.score = 0;
    this.knowledgePressure = 0;
    this.sessionTotalAnswered = 0;
    this.sessionTotalCorrect = 0;
    this.time = 0;

    // Hit-stop 凍結幀
    this.hitStopTimer = 0;

    // 玩家狀態
    this.player = {
      x: 220,
      y: 680,
      targetX: 220,
      targetY: 680,
      speed: 400,
      hitboxRadius: 7, // 核心判定 7px
      visualWidth: 64,
      grazeRadius: 36, // 擦彈半徑 36px
      hp: 3,
      maxHp: 3,
      shield: false,
      invulnTime: 0,
      grazeSync: 0,
      autoShootTimer: 0,
      baseShootTimer: 0, // 玩家基礎直射火控計時器
      subWeaponTimer: 0,
      supportTimer: 0,
      bulletSlowFactor: 1.0, // 0題答對生存特化：減慢敵方子彈速度
      moveSpeedMultiplier: 1.0 // 0題答對生存特化：提升戰機移速
    };

    // 靈丸蓄力狀態
    this.spiritCharge = {
      isCharging: false,
      chargeTime: 0,
      maxChargeTime: 2.6,
      currentTier: 0,
      tierVoicePlayed: false
    };

    // 十六款神話機神即時武裝庫 (Arsenal Map: 支援即時 1~5 階升級與獨立彈道機制)
    this.arsenal = {
      multishot: { id: 'multishot', rank: 1, quality: 'common', timer: 0 },
      beam_cannon: { id: 'beam_cannon', rank: 0, quality: 'common', timer: 0 },
      spirit_bullet: { id: 'spirit_bullet', rank: 0, quality: 'common', timer: 0 },
      kinetic_dart: { id: 'kinetic_dart', rank: 0, quality: 'common', timer: 0 },
      homing_missile: { id: 'homing_missile', rank: 0, quality: 'common', timer: 0 },
      jade_chakram: { id: 'jade_chakram', rank: 0, quality: 'common', timer: 0 },
      combat_wingman: { id: 'combat_wingman', rank: 0, quality: 'common', timer: 0 },
      prism_wingman: { id: 'prism_wingman', rank: 0, quality: 'common', timer: 0 },
      grenade_launcher: { id: 'grenade_launcher', rank: 0, quality: 'common', timer: 0 },
      singularity_core: { id: 'singularity_core', rank: 0, quality: 'common', timer: 0 },
      quantum_shield: { id: 'quantum_shield', rank: 0, quality: 'common', timer: 0 },
      taiji_array: { id: 'taiji_array', rank: 0, quality: 'common', timer: 0 },
      cryo_spire: { id: 'cryo_spire', rank: 0, quality: 'common', timer: 0 },
      emerald_spring: { id: 'emerald_spring', rank: 0, quality: 'common', timer: 0 },
      time_dilation: { id: 'time_dilation', rank: 0, quality: 'common', timer: 0 },
      sonic_cannon: { id: 'sonic_cannon', rank: 0, quality: 'common', timer: 0 },
      chain_lightning: { id: 'chain_lightning', rank: 0, quality: 'common', timer: 0 },
      solar_flare: { id: 'solar_flare', rank: 0, quality: 'common', timer: 0 },
      plasma_blade: { id: 'plasma_blade', rank: 0, quality: 'common', timer: 0 },
      nano_swarm: { id: 'nano_swarm', rank: 0, quality: 'common', timer: 0 },
      photon_lance: { id: 'photon_lance', rank: 0, quality: 'common', timer: 0 },
      laser_array: { id: 'laser_array', rank: 0, quality: 'common', timer: 0 },
      hyper_thruster: { id: 'hyper_thruster', rank: 0, quality: 'common', timer: 0 },
      aegis_reflector: { id: 'aegis_reflector', rank: 0, quality: 'common', timer: 0 },
      chronos_scythe: { id: 'chronos_scythe', rank: 0, quality: 'common', timer: 0 }
    };

    // 主動裝備槽 (嚴格限制同時最多裝備 3 個主動武器，被動武器獨立常駐運作)
    this.equippedActiveWeapons = ['multishot'];

    // 舊相容裝備引用
    this.equipped = {
      main: this.arsenal.multishot,
      sub1: this.arsenal.homing_missile,
      sub2: this.arsenal.grenade_launcher,
      support: this.arsenal.prism_wingman,
      passive1: { id: 'overclock_ammo', rank: 0, quality: 'common' },
      passive2: { id: 'crit_core', rank: 0, quality: 'common' },
      passive3: this.arsenal.time_dilation
    };
    this.fusionActive = [];

    // 實體容器與神話特殊機制
    this.bullets = [];
    this.ebullets = [];
    this.enemies = [];
    this.particles = [];
    this.damageNumbers = [];
    this.showDamageNumbers = false; // 依需求關閉浮動傷害數字以維持畫面乾淨清爽

    // 超音速飛行粒子系統 (三層景深光束與流星粒子，徹底告別畫面前後拼貼割裂感)
    this.flightParticles = [];
    for (let i = 0; i < 54; i++) {
      this.flightParticles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        speed: 260 + Math.random() * 580,
        len: 12 + Math.random() * 50,
        width: 0.9 + Math.random() * 1.3,
        alpha: 0.25 + Math.random() * 0.55,
        layer: Math.floor(Math.random() * 3) // 0: 遠景星塵, 1: 中景光束, 2: 近景超光速拉絲
      });
    }

    this.hazardTelegraphs = []; // 預警線與預警圈
    this.lavaPools = []; // 熔岩地熱領域 (Meltdown Impact / Comet Spirit)
    this.bossMinions = []; // 神話 Boss 特殊機制實體 (暴食傀儡、甘露仙瓶、蛇首分身、雷鼓等)
    this.bossIntroSequence = null; // Boss/小Boss震撼登場特效
    this.bossDeathSequence = null; // Boss震撼華麗死亡序列 (多段殉爆、神光、核爆衝擊波)
    this.screenFlashAlpha = 0; // 全屏核爆白光透明度
    this.reiganShockwaves = []; // 靈丸命中純白外擴衝擊波與星芒粒子
    this.inspectedWeaponId = 'multishot'; // 武裝庫當前檢視武器
    this.selectedStartingWeapon = 'multishot'; // 初始自選出擊主武器
    this.hitStopTimer = 0; // 打擊感凍結幀計時器
    this.wingmanKillCount = 0; // 神鳥僚機累計擊殺
    this.taijiIndex = 0; // 五行太極法彈輪替索引
    this.chakrams = []; // 青玉飛輪盤旋實體
    this.orbitShields = []; // 埃癸斯環繞神盾實體
    this.singularities = []; // 虛空黑洞奇點實體
    this.currentBoss = null;

    // 戰鬥除錯輔助與統計
    this.godmode = false;
    this.showHitbox = false;
    this.totalDamageDealt = 0;
    this.totalGrazeCount = 0;

    // 答題與波次
    this.quizQueue = [];
    this.currentQuiz = null;
    this.quizCorrectCount = 0;
    this.quizTimer = 0;
    this.quizTimerMax = 15;
    this.waveTimer = 0;

    // 星空
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        speed: 40 + Math.random() * 90,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.7
      });
    }

    this.images = {};
    this.loadAssets();
    this.bindEvents();
    this.initData();
  }

  async initData() {
    await this.dataStore.loadInitialData();
  }

  loadAssets() {
    const list = [
      ['bg', 'assets/backgrounds/bg_stage_1.jpg'],
      ['player', 'assets/player/player.png'],
      ['enemy', 'assets/enemies/enemy.png'],
      ['enemy_scout', 'assets/enemies/enemy_scout.png'],
      ['enemy_gunner', 'assets/enemies/enemy_gunner.png'],
      ['enemy_star', 'assets/enemies/enemy_star.png'],
      ['enemy_bastion', 'assets/enemies/enemy_bastion.png'],
      ['enemy_charger', 'assets/enemies/enemy_charger.png'],
      ['enemy_bomber', 'assets/enemies/enemy_bomber.png'],
      ['boss_mini', 'assets/bosses/boss_mini.png'],
      ['boss_1', 'assets/bosses/boss_1_garuda.png'],
      ['boss_2', 'assets/bosses/boss_2_leigong.png'],
      ['boss_3', 'assets/bosses/boss_3_medusa.png'],
      ['boss_4', 'assets/bosses/boss_4_taotie.png'],
      ['boss_5', 'assets/bosses/boss_5_atlas.png'],
      ['boss_6', 'assets/bosses/boss_6_athena.png'],
      ['boss_7', 'assets/bosses/boss_7_hydra.png'],
      ['boss_8', 'assets/bosses/boss_8_cyclops.png'],
      ['boss_9', 'assets/bosses/boss_9_tamamo.png'],
      ['boss_10', 'assets/bosses/boss_10_tiamat.png'],
      ['icons', 'assets/icons/weapon_icons.png'],
      // 專屬 AI 生成元素特效
      ['fx_lightning', 'assets/fx/fx_lightning.png'],
      ['fx_fire_meteor', 'assets/fx/fx_fire_meteor.png'],
      ['fx_glacial_crystal', 'assets/fx/fx_glacial_crystal.png'],
      ['fx_golden_feather', 'assets/fx/fx_golden_feather.png'],
      ['fx_void_blackhole', 'assets/fx/fx_void_blackhole.png'],
      ['fx_holy_spear', 'assets/fx/fx_holy_spear.png'],
      ['fx_toxic_acid_orb', 'assets/fx/fx_toxic_acid_orb.png'],
      // Boss 機制專屬召喚物與爆裂破片貼圖 (告別陽春圓圈)
      ['minion_ambrosia_flask', 'assets/minions/minion_ambrosia_flask.png'],
      ['minion_hydra_head', 'assets/minions/minion_hydra_head.png'],
      ['minion_thunder_drum', 'assets/minions/minion_thunder_drum.png'],
      ['minion_taotie_meat', 'assets/minions/minion_taotie_meat.png'],
      ['minion_gorgon_shadow', 'assets/minions/minion_gorgon_shadow.png'],
      ['minion_titan_pillar', 'assets/minions/minion_titan_pillar.png'],
      ['minion_garuda_viper', 'assets/minions/minion_garuda_viper.png'],
      ['fx_rock_shard', 'assets/fx/fx_rock_shard.png'],
      ['fx_cluster_bomb', 'assets/fx/fx_cluster_bomb.png'],
      ['fx_feather_shard', 'assets/fx/fx_feather_shard.png']
    ];
    // 預載 10 大關卡 9:16 垂直神話背景貼圖
    for (let s = 1; s <= 10; s++) {
      list.push([`bg_stage_${s}`, `assets/backgrounds/bg_stage_${s}.jpg`]);
    }
    // 預載 16 款獨立神話武器高畫質圖標
    for (let i = 1; i <= 16; i++) {
      list.push([`weapon_${i}`, `assets/icons/weapons/weapon_${i}.png`]);
    }
    list.forEach(([k, src]) => {
      const img = new Image();
      img.src = src;
      this.images[k] = img;
    });
  }

  resize(w, h) {
    this.W = w;
    this.H = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  bindEvents() {
    const c = this.canvas;
    let touchDragging = false;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const onPointerDown = (e) => {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      if (this.state !== 'playing') return;
      this.sound.ensureContext();
      touchDragging = true;
      if (c.setPointerCapture && e.pointerId !== undefined) {
        try { c.setPointerCapture(e.pointerId); } catch(err) {}
      }
      const rect = c.getBoundingClientRect();
      lastTouchX = e.clientX - rect.left;
      lastTouchY = e.clientY - rect.top;
      if (e.pointerType === 'mouse') {
        this.player.targetX = Math.max(24, Math.min(this.W - 24, lastTouchX));
        this.player.targetY = Math.max(30, Math.min(this.H - 36, lastTouchY));
      }
      // 點擊/觸控螢幕任何一處：立即開始靈丸集氣！
      this.startSpiritCharge();
      if (e.cancelable && e.pointerType === 'touch') e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!touchDragging || this.state !== 'playing') return;
      // 雷公 Phase 2: 磁暴停頓控制
      if (this.player.stunTimer && this.player.stunTimer > 0) return;

      const rect = c.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;

      // 美杜莎 Phase 2: 石化凝視領域使移動速度下降 50%
      const slowFactor = this.player.gorgonSlowActive ? 0.5 : 1.0;

      if (e.pointerType === 'touch') {
        const dx = (curX - lastTouchX) * slowFactor;
        const dy = (curY - lastTouchY) * slowFactor;
        this.player.targetX = Math.max(24, Math.min(this.W - 24, this.player.targetX + dx));
        this.player.targetY = Math.max(30, Math.min(this.H - 36, this.player.targetY + dy));
      } else {
        if (slowFactor < 1.0) {
          const dx = (curX - this.player.targetX) * slowFactor;
          const dy = (curY - this.player.targetY) * slowFactor;
          this.player.targetX = Math.max(24, Math.min(this.W - 24, this.player.targetX + dx));
          this.player.targetY = Math.max(30, Math.min(this.H - 36, this.player.targetY + dy));
        } else {
          this.player.targetX = Math.max(24, Math.min(this.W - 24, curX));
          this.player.targetY = Math.max(30, Math.min(this.H - 36, curY));
        }
      }
      lastTouchX = curX;
      lastTouchY = curY;
    };

    const onPointerUp = (e) => {
      if (c.releasePointerCapture && e && e.pointerId !== undefined) {
        try { c.releasePointerCapture(e.pointerId); } catch(err) {}
      }
      if (!touchDragging && !this.spiritCharge.isCharging) return;
      touchDragging = false;
      // 鬆開手指或左鍵：若蓄力達到0.22秒以上則釋放靈丸！
      if (this.spiritCharge.isCharging) {
        if (this.spiritCharge.chargeTime >= 0.22) {
          this.releaseSpiritCharge();
        } else {
          this.spiritCharge.isCharging = false;
          const sz = document.getElementById('spiritChargeZone');
          if (sz) sz.classList.remove('charging');
        }
      }
    };

    c.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    window.addEventListener('keydown', (e) => {
      const isGameKey = e.key === ' ' || e.code === 'Space' ||
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
      if (this.state === 'playing' && isGameKey) {
        e.preventDefault();
      }
      if (this.state === 'playing') {
        if (this.player.stunTimer && this.player.stunTimer > 0) return;
        const slowFactor = this.player.gorgonSlowActive ? 0.5 : 1.0;
        const step = 28 * slowFactor;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.player.targetX -= step;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.player.targetX += step;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.player.targetY -= step;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.player.targetY += step;
        this.player.targetX = Math.max(24, Math.min(this.W - 24, this.player.targetX));
        this.player.targetY = Math.max(30, Math.min(this.H - 36, this.player.targetY));
        if ((e.key === ' ' || e.code === 'Space') && !this.spiritCharge.isCharging) {
          this.startSpiritCharge();
        }
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        if (this.state === 'playing') {
          e.preventDefault();
        }
        if (this.spiritCharge.isCharging) {
          this.releaseSpiritCharge();
        }
      }
    });

    // 靈丸集氣區相容監聽 (若 DOM 存在)
    const spiritZone = document.getElementById('spiritChargeZone');
    if (spiritZone) {
      spiritZone.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.startSpiritCharge();
      });
      spiritZone.addEventListener('pointerup', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.releaseSpiritCharge();
      });
      spiritZone.addEventListener('pointercancel', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.releaseSpiritCharge();
      });
      spiritZone.addEventListener('pointerleave', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.releaseSpiritCharge();
      });
    }

    // 背景音樂開關 (bgmBtn)
    const bgmBtn = document.getElementById('bgmBtn');
    if (bgmBtn) {
      bgmBtn.onclick = () => {
        if (!this.sound.bgm.isPlaying) {
          this.sound.bgm.start();
          bgmBtn.classList.remove('off');
          this.showToast('🎵 背景音樂已啟動！');
        } else {
          const unmuted = this.sound.bgm.toggleMute();
          bgmBtn.classList.toggle('off', !unmuted);
          this.showToast(unmuted ? '🎵 音樂：開啟' : '🔇 音樂：靜音');
        }
      };
    }

    // 安全事件綁定輔助函式 (杜絕元素缺失導致全遊戲崩潰)
    const setClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };

    // 全螢幕按鈕綁定 (支援行動端與平板)
    setClick('fullscreenBtn', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // 學員身分登錄初始載入與即時同步事件
    const nameInput = document.getElementById('studentNameInput');
    const gradeSelect = document.getElementById('studentGradeSelect');
    const badgeEl = document.getElementById('studentIdBadge');
    const mistakeBadge = document.getElementById('studentMistakeBadge');
    const studentSelect = document.getElementById('studentSelect');
    const statusEl = document.getElementById('studentSyncStatus');

    if (nameInput && this.dataStore.studentName) {
      nameInput.value = this.dataStore.studentName;
    }
    if (gradeSelect && this.dataStore.studentGrade) {
      gradeSelect.value = this.dataStore.studentGrade;
    }
    if (badgeEl && this.dataStore.currentStudentId) {
      badgeEl.textContent = `序號：${this.dataStore.currentStudentId}`;
    }
    const mistakes = this.dataStore.getMistakeCount(this.dataStore.currentStudentId);
    if (mistakeBadge) {
      mistakeBadge.textContent = mistakes > 0 ? `待雪恥錯題：${mistakes} 題` : '待雪恥錯題：0 題 (無未解決弱點)';
    }

    // 初始化學員名冊選單
    this.dataStore.updateStudentListUI();

    // 學員下拉選單變更
    if (studentSelect) {
      studentSelect.addEventListener('change', async () => {
        const val = studentSelect.value;
        if (val === '__new__') {
          if (nameInput) {
            nameInput.value = '';
            nameInput.focus();
          }
          if (badgeEl) badgeEl.textContent = '新序號待配發';
          if (mistakeBadge) mistakeBadge.textContent = '待雪恥錯題：0 題 (新學員)';
          if (statusEl) statusEl.textContent = '請輸入新學員姓名並點擊「確認學員」，將於 Google Sheet 建立新 S0000 學號';
          this.updatePermissionUI();
        } else {
          const opt = studentSelect.options[studentSelect.selectedIndex];
          const name = (opt && opt.dataset.name) || '';
          const grade = (opt && opt.dataset.grade) || '';
          await this.dataStore.switchStudent(val, name, grade);
          this.updatePermissionUI();
        }
      });
    }

    // 點擊確認學員按鈕
    setClick('registerStudentBtn', async () => {
      const isNew = studentSelect && studentSelect.value === '__new__';
      const name = (nameInput && nameInput.value.trim()) || '學員';
      const grade = (gradeSelect && gradeSelect.value) || '三年級';
      const sid = await this.dataStore.syncStudentProfile(name, grade, isNew);
      this.updatePermissionUI();
      this.showToast(`✅ 已確認學員：${name} (${sid})`);
    });

    if (nameInput) {
      nameInput.addEventListener('change', () => {
        const isNew = studentSelect && studentSelect.value === '__new__';
        this.dataStore.syncStudentProfile(nameInput.value, gradeSelect ? gradeSelect.value : '三年級', isNew);
        this.updatePermissionUI();
      });
    }
    if (gradeSelect) {
      gradeSelect.addEventListener('change', () => {
        const isNew = studentSelect && studentSelect.value === '__new__';
        this.dataStore.syncStudentProfile(nameInput ? nameInput.value : '', gradeSelect.value, isNew);
        this.updatePermissionUI();
      });
    }

    // UI 按鈕安全綁定
    setClick('startPlayBtn', async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const btn = document.getElementById('startPlayBtn');
      if (btn) {
        btn.disabled = true;
        btn.blur();
      }
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      try {
        const currentName = this.dataStore.studentName || '學員';
        const inputName = (nameInput && nameInput.value.trim()) || '';
        const isExplicitNew = studentSelect && studentSelect.value === '__new__' && inputName !== '' && inputName !== currentName;
        const name = inputName || currentName;
        const grade = (gradeSelect && gradeSelect.value) || this.dataStore.studentGrade || '三年級';
        await this.dataStore.syncStudentProfile(name, grade, isExplicitNew);
        this.updatePermissionUI();

        const select = document.getElementById('startStageSelect');
        const s = (select && parseInt(select.value)) || 1;
        this.startNewGame(s);
        if (this.sound.bgm && !this.sound.bgm.isPlaying) {
          this.sound.bgm.start();
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    setClick('pauseBtn', () => this.togglePause());
    setClick('resumeBtn', () => this.togglePause());
    setClick('resumeHeaderBtn', () => this.togglePause());
    setClick('pauseGsBtn', () => {
      this.togglePause();
      this.openGoogleSheetModal();
    });
    setClick('restartBtn', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      this.togglePause();
      this.startNewGame(1);
    });
    setClick('playAgainBtn', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      this.startNewGame(1);
    });
    setClick('labBtn', () => this.openLab());
    setClick('pauseLabBtn', () => {
      this.togglePause();
      this.openLab();
    });
    setClick('closeLabBtn', () => this.closeLab());
    setClick('skipUpgradeBtn', () => this.closeUpgradeScreen());

    // 初始武裝整備機庫事件
    setClick('openHangarBtn', () => this.openHangarModal());
    setClick('closeHangarBtn', () => this.closeHangarModal());
    setClick('confirmHangarBtn', () => this.closeHangarModal());

    // Google Sheet 連線面板事件
    this.bindGsEvents();
    this.bindLabEvents();
    this.updatePermissionUI();
  }

  // 權限隔離控制：僅有 S0001 (測試玩家) 具備 LAB 與 Google Sheet 設定權限
  updatePermissionUI() {
    const curId = (this.dataStore && this.dataStore.currentStudentId) || 'S0001';
    const isTester = (curId === 'S0001');

    const labBtn = document.getElementById('labBtn');
    const pauseLabBtn = document.getElementById('pauseLabBtn');
    const pauseGsBtn = document.getElementById('pauseGsBtn');
    const openGsBtn = document.getElementById('openGsBtn');

    if (labBtn) labBtn.style.display = isTester ? '' : 'none';
    if (pauseLabBtn) pauseLabBtn.style.display = isTester ? '' : 'none';
    if (pauseGsBtn) pauseGsBtn.style.display = isTester ? '' : 'none';
    if (openGsBtn) openGsBtn.style.display = isTester ? '' : 'none';
  }

  openHangarModal() {
    this.renderHangarWeaponsList();
    document.getElementById('hangarOverlay').classList.remove('hidden');
  }

  closeHangarModal() {
    document.getElementById('hangarOverlay').classList.add('hidden');
    const selected = STARFALL_WEAPONS_CATALOG.find(w => w.id === this.selectedStartingWeapon);
    const badge = document.getElementById('startWeaponBadge');
    if (badge && selected) {
      badge.textContent = `當前首發主武：${selected.name} (第 1 階) [${selected.tier || 'C'} 級]`;
    }
  }

  renderHangarWeaponsList() {
    const list = document.getElementById('hangarWeaponsList');
    if (!list) return;
    list.innerHTML = '';

    // 嚴格限制：一開始只能選擇 B 級或 C 級第 1 階主動主武器出擊（排除 S 級、A 級與所有被動輔助模組）
    const startingCandidates = STARFALL_WEAPONS_CATALOG.filter(w => !w.isPassive && (w.tier === 'B' || w.tier === 'C'));
    if (!startingCandidates.some(w => w.id === this.selectedStartingWeapon)) {
      this.selectedStartingWeapon = 'multishot';
    }

    startingCandidates.forEach(w => {
      const isSelected = w.id === this.selectedStartingWeapon;
      const card = document.createElement('div');
      card.className = `hangar-weapon-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="hangar-icon-box">
          <img src="${w.icon}" class="hangar-icon-img" alt="${w.name}" onerror="this.style.display='none'; this.parentNode.textContent='⚔️';" />
        </div>
        <div class="hangar-info">
          <div class="hangar-name-row">
            <span class="hangar-name">${w.name}</span>
            <span class="tier-badge tier-${(w.tier || 'C').toLowerCase()}">${w.tier || 'C'} 級</span>
            <span class="hangar-tag">第 1 階・主砲</span>
          </div>
          <p class="hangar-desc">${w.desc}</p>
        </div>
      `;
      card.onclick = () => {
        this.selectedStartingWeapon = w.id;
        this.sound.playCrit();
        this.renderHangarWeaponsList();
        const badge = document.getElementById('startWeaponBadge');
        if (badge) badge.textContent = `當前首發主武：${w.name} (第 1 階) [${w.tier || 'C'} 級]`;
        this.showToast(`已選定開局首發主武：${w.name} (第 1 階)！`);
      };
      list.appendChild(card);
    });
  }

  bindGsEvents() {
    const openGs = () => {
      const curId = (this.dataStore && this.dataStore.currentStudentId) || '';
      if (curId !== 'S0001') {
        this.showToast('權限不足：僅有 S0001 測試玩家可設定 Google Sheet');
        return;
      }
      document.getElementById('gsOverlay').classList.remove('hidden');
      const savedUrl = localStorage.getItem('starfall_gs_url') || (window.STARFALL_CONFIG && window.STARFALL_CONFIG.apiBaseUrl) || '';
      document.getElementById('gsUrlInput').value = savedUrl;
      const count = this.dataStore.questionBank ? this.dataStore.questionBank.length : 0;
      const isCloud = this.dataStore.isCloudSynced;
      document.getElementById('gsStatusBox').innerHTML = `
        <span style="color:${isCloud ? 'var(--green)' : 'var(--cyan)'}; font-weight:800;">${isCloud ? '✅ Google Sheet 題庫已就緒！' : 'ℹ️ 當前題庫狀態'}</span><br>
        目前遊戲內題庫總數：<b>${count.toLocaleString()}</b> 題（${isCloud ? '雲端試算表直連' : '本機題庫就緒'}）。<br>
        點擊下方「連線診斷測試」或「儲存設定」即可立即重新同步雲端試算表最新題目！
      `;
    };
    document.getElementById('openGsBtn').onclick = openGs;
    document.getElementById('pauseGsBtn').onclick = () => {
      this.togglePause();
      openGs();
    };
    document.getElementById('closeGsBtn').onclick = () => {
      document.getElementById('gsOverlay').classList.add('hidden');
    };

    document.getElementById('gsSaveBtn').onclick = async () => {
      const url = document.getElementById('gsUrlInput').value.trim();
      localStorage.setItem('starfall_gs_url', url);
      document.getElementById('gsStatusBox').innerHTML = '<span style="color:var(--gold);">⏳ 正在載入題庫與綁定學生...</span>';
      const ok = await this.dataStore.loadFromGoogleSheet(url);
      if (ok) {
        this.showToast('✅ Google Sheet 題庫已載入並套用！');
        document.getElementById('gsStatusBox').innerHTML = `
          <span style="color:var(--green); font-weight:800;">✅ 設定成功！</span><br>
          已即時載入 Google Sheet 題庫：<b>${this.dataStore.questionBank.length}</b> 題。<br>
          綁定學生：<b>${this.dataStore.studentName}</b> (${this.dataStore.currentStudentId})<br>
          答題紀錄將即時寫入試算表 <code>Attempts</code> 分頁！
        `;
      } else {
        this.showToast('⚠️ 已儲存網址，但連線試算表逾時。');
        document.getElementById('gsStatusBox').innerHTML = `
          <span style="color:var(--gold);">⚠️ 已儲存設定！</span><br>
          網址：<code>${url}</code><br>
          若暫時無法連線，遊戲將使用本機備援題庫。
        `;
      }
    };

    document.getElementById('gsTestBtn').onclick = async () => {
      const url = document.getElementById('gsUrlInput').value.trim();
      if (!url || !url.startsWith('http')) {
        document.getElementById('gsStatusBox').innerHTML = '<span style="color:var(--red);">❌ 請輸入有效的 HTTP/HTTPS Apps Script 網址！</span>';
        return;
      }
      document.getElementById('gsStatusBox').innerHTML = '<span style="color:var(--gold);">⏳ 正在連線診斷中，請稍候...</span>';
      try {
        const ok = await this.dataStore.loadFromGoogleSheet(url);
        if (ok) {
          localStorage.setItem('starfall_gs_url', url);
          document.getElementById('gsStatusBox').innerHTML = `
            <span style="color:var(--green); font-weight:800;">✅ 連線診斷成功！</span><br>
            已對接試算表雲端題庫：<b>${this.dataStore.questionBank.length}</b> 題！<br>
            學生識別：<b>${this.dataStore.studentName}</b> (${this.dataStore.currentStudentId})<br>
            作答資料與家長報表已啟用自動同步。
          `;
          this.showToast(`✅ 成功連線！載入 ${this.dataStore.questionBank.length} 題試算表題目`);
        } else {
          document.getElementById('gsStatusBox').innerHTML = `<span style="color:var(--red);">❌ 連線失敗。請確認 Apps Script 已發布為 Web App，且存取權限設為「所有人 (Anyone)」。</span>`;
        }
      } catch (err) {
        document.getElementById('gsStatusBox').innerHTML = `
          <span style="color:var(--red); font-weight:800;">❌ 連線異常：</span><br>
          ${err.message}<br>
          <small style="color:var(--text-muted);">常見原因：Apps Script 部署網址結尾不是 <code>/exec</code>，或是尚未授權試算表權限。</small>
        `;
      }
    };
  }

  // ============================================================
  // 靈丸蓄力核心邏輯
  // ============================================================
  startSpiritCharge() {
    if (this.state !== 'playing') return;
    this.spiritCharge.isCharging = true;
    this.spiritCharge.chargeTime = 0;
    this.spiritCharge.currentTier = 1;
    this.spiritCharge.tierVoicePlayed = false;
    document.getElementById('spiritChargeZone').classList.add('charging');
  }

  updateSpiritCharge(dt) {
    if (!this.spiritCharge.isCharging) return;
    const speedBoost = 1.0 + (this.player.grazeSync / 100) * 0.5;
    this.spiritCharge.chargeTime += dt * speedBoost;

    const t = this.spiritCharge.chargeTime;
    let tier = 1;
    if (t >= 2.6) tier = 5;
    else if (t >= 1.8) tier = 4;
    else if (t >= 1.0) tier = 3;
    else if (t >= 0.4) tier = 2;

    this.spiritCharge.currentTier = tier;

    if (tier === 5 && !this.spiritCharge.tierVoicePlayed) {
      this.spiritCharge.tierVoicePlayed = true;
      this.sound.vibrate([40, 30, 60]);
      this.sound.playLaser(1200);
      this.shake(4, 0.2);
    }

    if (Math.random() < 0.25) {
      this.sound.playSpiritCharge(Math.min(1, t / 2.6));
    }

    const ringCircle = document.getElementById('spiritRingCircle');
    const pct = Math.min(1, t / 2.6);
    ringCircle.style.strokeDashoffset = 251 * (1 - pct);
    ringCircle.style.stroke = tier === 5 ? '#ffffff' : (tier >= 3 ? '#67ffff' : '#33e0e0');

    // 粒子匯聚
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 38;
      this.particles.push(new Particle(
        this.player.x + Math.cos(angle) * dist,
        this.player.y + Math.sin(angle) * dist,
        -Math.cos(angle) * 140,
        -Math.sin(angle) * 140,
        tier >= 4 ? '#ffffff' : '#33e0e0',
        tier >= 4 ? 3 : 2,
        0.3
      ));
    }
  }

  releaseSpiritCharge() {
    if (!this.spiritCharge.isCharging) return;
    this.spiritCharge.isCharging = false;
    const sz = document.getElementById('spiritChargeZone');
    if (sz) sz.classList.remove('charging');
    const ringCircle = document.getElementById('spiritRingCircle');
    if (ringCircle) ringCircle.style.strokeDashoffset = 251;

    const tier = this.spiritCharge.currentTier;
    const isMax = tier === 5;
    const isComet = this.isFusionActive('comet_spirit');

    // 幽遊白書設定：未蓄滿（未達 Tier 5 或彗星靈丸）嚴格不播放發射音效！
    if (isMax || isComet) {
      this.sound.playSpiritFire(isMax, isComet);
      this.sound.vibrate(isComet ? [100, 60, 160] : [60, 40, 100]);
    }

    // 靈丸威力微調平衡：下修爆發係數，兼具痛感但絕不壓過常規武器
    const dmgMultipliers = [0, 1.0, 1.6, 2.4, 3.4, 4.8];
    let dmg = 85 * (dmgMultipliers[tier] || 1.0);
    if (isComet) dmg *= 1.6;

    const isGrazeEmp = (this.player.grazeSync >= 100);
    if (isGrazeEmp) {
      this.player.grazeSync = 0;
      dmg *= 2.5;
      this.cancelAllEnemyBullets('⚡【100% 擦彈同步過載 EMP】全屏彈幕消解！破除魔王絕境神盾！');
      this.sound.playCrit();
    }

    const b = new Bullet(this.player.x, this.player.y - 20, 0, isComet ? -820 : -720, true, dmg, 'spirit');
    b.pierce = (tier >= 5 || isComet || isGrazeEmp) ? 12 : (tier >= 4 ? 3 : (tier >= 3 ? 2 : 1));
    b.r = isComet ? 26 : (isGrazeEmp ? 32 : (9 + tier * 4.5));
    b.isMax = isMax;
    b.isComet = isComet;
    b.isGrazeEmp = isGrazeEmp;
    b.lastHitBossTime = 0;
    this.bullets.push(b);

    this.shake(isGrazeEmp ? 15 : (isComet ? 10 : (isMax ? 7 : 3)), isGrazeEmp ? 0.35 : 0.25);
  }

  // 擦彈過載全屏消彈與破防衝擊波
  cancelAllEnemyBullets(toastMsg = '彈幕全屏消解！') {
    if (this.ebullets && this.ebullets.length > 0) {
      this.ebullets.forEach(eb => {
        for (let i = 0; i < 2; i++) {
          this.particles.push(new Particle(eb.x, eb.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, '#67ffff', 2.5, 0.22));
        }
      });
      this.score += this.ebullets.length * 20;
      this.ebullets = [];
    }
    if (toastMsg) this.showToast(toastMsg);
  }

  // 靈丸擊中目標爆發之純白外擴衝擊波與星芒粒子 (幽遊白書經典視覺)
  createReiganShockwave(x, y, isMax = false, isComet = false) {
    this.sound.playReiganImpact(isComet);
    this.hitStopTimer = Math.max(this.hitStopTimer, 0.045);
    this.shake(isComet ? 12 : (isMax ? 8 : 4), 0.28);
    this.screenFlashAlpha = Math.max(this.screenFlashAlpha, isComet ? 0.6 : (isMax ? 0.4 : 0.2));

    if (!this.reiganShockwaves) this.reiganShockwaves = [];
    this.reiganShockwaves.push({
      x: x,
      y: y,
      r: 10,
      maxR: isComet ? 115 : (isMax ? 85 : 55),
      life: 0.35,
      maxLife: 0.35,
      isMax: isMax,
      isComet: isComet
    });

    // 16 條外散射純白星芒射線粒子
    const particleCount = isComet ? 20 : (isMax ? 16 : 8);
    for (let i = 0; i < particleCount; i++) {
      const ang = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const spd = (isComet ? 260 : 200) + Math.random() * 80;
      this.particles.push(new Particle(
        x, y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        i % 2 === 0 ? '#ffffff' : (isComet ? '#ff9138' : '#67ffff'),
        isComet ? 4.5 : (isMax ? 3.5 : 2.5),
        0.32
      ));
    }
  }

  isFusionActive(fusionId) {
    return this.fusionActive.includes(fusionId);
  }

  // 玩家基礎常駐火控 (無論裝備任何武器，始終發射雙聯直射電漿彈)
  fireBaseVulcan(dt) {
    this.player.baseShootTimer = (this.player.baseShootTimer || 0) + dt;
    if (this.player.baseShootTimer >= 0.13) {
      this.player.baseShootTimer = 0;
      const p = this.player;
      const bDmg = 16;
      const b1 = new Bullet(p.x - 10, p.y - 18, 0, -780, true, bDmg, 'player_vulcan');
      b1.color = '#38bdf8';
      b1.r = 3.5;
      const b2 = new Bullet(p.x + 10, p.y - 18, 0, -780, true, bDmg, 'player_vulcan');
      b2.color = '#38bdf8';
      b2.r = 3.5;
      this.bullets.push(b1, b2);
    }
  }

  isWeaponActiveEquipped(id) {
    if (!this.equippedActiveWeapons) this.equippedActiveWeapons = ['multishot'];
    return this.equippedActiveWeapons.includes(id) && (this.arsenal[id] && this.arsenal[id].rank > 0);
  }

  // ============================================================
  // 十六款神話機神多元武器發射管線與彈道機制
  // ============================================================
  fireWeapons(dt) {
    // 0. 基礎火控始終持續發射
    this.fireBaseVulcan(dt);

    const overclockRank = (this.arsenal.time_dilation && this.arsenal.time_dilation.rank) || 0;
    const rateMult = 1.0 + overclockRank * 0.12 + (this.player.grazeSync / 100) * 0.4;

    // 1. 多管神機砲 (multishot: 主動，需在主動裝備槽中)
    const ms = this.arsenal.multishot;
    if (ms && ms.rank > 0 && this.isWeaponActiveEquipped('multishot')) {
      ms.timer += dt;
      if (ms.timer >= 0.10 / rateMult) {
        ms.timer = 0;
        this.fireMultishot(ms.rank, ms.quality);
      }
    }

    // 2. 金陽聚焦光束 (beam_cannon: 主動)
    const bc = this.arsenal.beam_cannon;
    if (bc && bc.rank > 0 && this.isWeaponActiveEquipped('beam_cannon')) {
      bc.timer += dt;
      if (bc.timer >= 0.14) {
        bc.timer = 0;
        this.fireBeamCannon(bc.rank, bc.quality);
      }
    }

    // 3. 靈能聚變核心 (spirit_bullet: 被動，只要獲得即自律運作)
    const sp = this.arsenal.spirit_bullet;
    if (sp && sp.rank > 0) {
      sp.timer += dt;
      if (sp.timer >= 2.6 / rateMult) {
        sp.timer = 0;
        this.fireSpiritOrb(sp.rank, sp.quality);
      }
    }

    // 4. 超空泡穿甲鏢 (kinetic_dart: 主動)
    const kd = this.arsenal.kinetic_dart;
    if (kd && kd.rank > 0 && this.isWeaponActiveEquipped('kinetic_dart')) {
      kd.timer += dt;
      if (kd.timer >= 0.48 / rateMult) {
        kd.timer = 0;
        this.fireKineticDarts(kd.rank, kd.quality);
      }
    }

    // 5. 烈陽核融導彈 (homing_missile: 主動)
    const hm = this.arsenal.homing_missile;
    if (hm && hm.rank > 0 && this.isWeaponActiveEquipped('homing_missile')) {
      hm.timer += dt;
      if (hm.timer >= 1.10 / rateMult) {
        hm.timer = 0;
        this.fireHomingMissiles(hm.rank, hm.quality);
      }
    }

    // 6. 青玉風雷飛輪 (jade_chakram: 主動)
    const jc = this.arsenal.jade_chakram;
    if (jc && jc.rank > 0 && this.isWeaponActiveEquipped('jade_chakram')) {
      jc.timer += dt;
      if (jc.timer >= 1.4 / rateMult) {
        jc.timer = 0;
        this.fireJadeChakrams(jc.rank, jc.quality);
      }
    }

    // 7. 神鳥天翼隨行僚機 (combat_wingman: 被動僚機)
    const cw = this.arsenal.combat_wingman;
    if (cw && cw.rank > 0) {
      this.updateCombatWingman(cw.rank, cw.quality, dt);
    }

    // 8. 虹光折射星核 (prism_wingman: 被動僚機)
    const pw = this.arsenal.prism_wingman;
    if (pw && pw.rank > 0) {
      this.updatePrismWingman(pw.rank, dt);
    }

    // 9. 熾陽熔岩噴射核 (grenade_launcher: 主動)
    const gl = this.arsenal.grenade_launcher;
    if (gl && gl.rank > 0 && this.isWeaponActiveEquipped('grenade_launcher')) {
      gl.timer += dt;
      if (gl.timer >= 0.85 / rateMult) {
        gl.timer = 0;
        this.fireGrenade(gl.rank, gl.quality);
      }
    }

    // 10. 虛空重力奇點 (singularity_core: 被動)
    const sc = this.arsenal.singularity_core;
    if (sc && sc.rank > 0) {
      sc.timer += dt;
      if (sc.timer >= 3.6 / rateMult) {
        sc.timer = 0;
        this.fireSingularity(sc.rank, sc.quality);
      }
    }

    // 11. 埃癸斯神盾力場 (quantum_shield: 被動)
    const qs = this.arsenal.quantum_shield;
    if (qs && qs.rank > 0) {
      this.updateAegisShields(qs.rank, qs.quality, dt);
    }

    // 12. 五行太極陣盤 (taiji_array: 主動)
    const ta = this.arsenal.taiji_array;
    if (ta && ta.rank > 0 && this.isWeaponActiveEquipped('taiji_array')) {
      ta.timer += dt;
      if (ta.timer >= 0.30 / rateMult) {
        ta.timer = 0;
        this.fireTaijiArray(ta.rank, ta.quality);
      }
    }

    // 13. 玄天冰魄凌柱 (cryo_spire: 被動天降，自律運作)
    const cs = this.arsenal.cryo_spire;
    if (cs && cs.rank > 0) {
      cs.timer += dt;
      if (cs.timer >= 1.60 / rateMult) {
        cs.timer = 0;
        this.fireCryoSpires(cs.rank, cs.quality);
      }
    }

    // 14. 地脈翡翠仙泉 (emerald_spring: 被動)
    const es = this.arsenal.emerald_spring;
    if (es && es.rank > 0) {
      es.timer += dt;
      const cd = Math.max(3.5, 7.5 - es.rank * 0.8) / rateMult;
      if (es.timer >= cd) {
        es.timer = 0;
        this.pulseEmeraldSpring(es.rank, es.quality);
      }
    }

    // 15. 時空量子算力板 (time_dilation: 被動常駐力場，效果即時作用於彈速與暴擊)

    // 16. 裂變音浪重砲 (sonic_cannon: 主動)
    const sn = this.arsenal.sonic_cannon;
    if (sn && sn.rank > 0 && this.isWeaponActiveEquipped('sonic_cannon')) {
      sn.timer += dt;
      if (sn.timer >= 0.90 / rateMult) {
        sn.timer = 0;
        this.fireSonicCannon(sn.rank, sn.quality);
      }
    }

    // 17. 雷公天劫鏈弧 (chain_lightning: 主動)
    const cl = this.arsenal.chain_lightning;
    if (cl && cl.rank > 0 && this.isWeaponActiveEquipped('chain_lightning')) {
      cl.timer += dt;
      if (cl.timer >= 0.55 / rateMult) {
        cl.timer = 0;
        this.fireChainLightning(cl.rank, cl.quality);
      }
    }

    // 18. 熾陽破曉耀斑 (solar_flare: 主動)
    const sf = this.arsenal.solar_flare;
    if (sf && sf.rank > 0 && this.isWeaponActiveEquipped('solar_flare')) {
      sf.timer += dt;
      if (sf.timer >= 0.75 / rateMult) {
        sf.timer = 0;
        this.fireSolarFlare(sf.rank, sf.quality);
      }
    }

    // 19. 裂變等離子刃 (plasma_blade: 主動)
    const pb = this.arsenal.plasma_blade;
    if (pb && pb.rank > 0 && this.isWeaponActiveEquipped('plasma_blade')) {
      pb.timer += dt;
      if (pb.timer >= 0.60 / rateMult) {
        pb.timer = 0;
        this.firePlasmaBlade(pb.rank, pb.quality);
      }
    }

    // 20. 奈米蝕甲蟲群 (nano_swarm: 被動)
    const ns = this.arsenal.nano_swarm;
    if (ns && ns.rank > 0) {
      this.updateNanoSwarm(ns.rank, ns.quality, dt);
    }

    // 21. 天啟破城光錐 (photon_lance: 主動)
    const pl = this.arsenal.photon_lance;
    if (pl && pl.rank > 0 && this.isWeaponActiveEquipped('photon_lance')) {
      pl.timer += dt;
      if (pl.timer >= 0.85 / rateMult) {
        pl.timer = 0;
        this.firePhotonLance(pl.rank, pl.quality);
      }
    }

    // 22. 星陣軌道壁壘 (laser_array: 被動)
    const la = this.arsenal.laser_array;
    if (la && la.rank > 0) {
      this.updateLaserArray(la.rank, la.quality, dt);
    }

    // 23. 疾風超導噴流 (hyper_thruster: 被動)
    const ht = this.arsenal.hyper_thruster;
    if (ht && ht.rank > 0) {
      this.updateHyperThruster(ht.rank, ht.quality);
    }

    // 24. 神聖防衛折光稜鏡 (aegis_reflector: 被動)
    const ar = this.arsenal.aegis_reflector;
    if (ar && ar.rank > 0) {
      this.updateAegisReflector(ar.rank, ar.quality, dt);
    }

    // 25. 時序輪迴神鐮 (chronos_scythe: 主動)
    const cs2 = this.arsenal.chronos_scythe;
    if (cs2 && cs2.rank > 0 && this.isWeaponActiveEquipped('chronos_scythe')) {
      cs2.timer += dt;
      if (cs2.timer >= 0.95 / rateMult) {
        cs2.timer = 0;
        this.fireChronosScythe(cs2.rank, cs2.quality);
      }
    }
  }

  // 1. 多管神機砲
  fireMultishot(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const count = 1 + rank;
    const spread = 0.08 * (rank > 2 ? 1.25 : 1.0);
    const startAngle = -Math.PI / 2 - ((count - 1) * spread) / 2;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spread;
      const vx = Math.cos(angle) * 750;
      const vy = Math.sin(angle) * 750;
      const dmg = (36 + rank * 12) * qMult;
      const b = new Bullet(this.player.x, this.player.y - 14, vx, vy, true, dmg, 'gatling', rank);
      b.r = 4.0 + rank * 0.5;
      b.shred = true; // 疊加裂甲印記
      this.bullets.push(b);
    }
    this.sound.playVulcanFire();
  }

  // 2. 金陽聚焦光束
  fireBeamCannon(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const isRainbow = this.isFusionActive('prism_rainbow_sky');
    const isChrono = this.isFusionActive('chrono_judgement');

    let width = 14 + rank * 6;
    let dmg = (50 + rank * 22) * qMult;
    if (isRainbow) { width *= 1.6; dmg *= 1.8; }
    if (isChrono) { dmg *= 1.4; }

    const b = new Bullet(this.player.x, this.player.y - 30, 0, -1200, true, dmg, 'beam', rank);
    b.beamWidth = width;
    b.r = width / 2;
    b.pierce = 99;
    b.isRainbow = isRainbow;
    b.isChrono = isChrono;
    b.heatMelt = true;
    this.bullets.push(b);

    if (isRainbow) {
      for (let k = -2; k <= 2; k++) {
        if (k === 0) continue;
        const rb = new Bullet(this.player.x + k * 26, this.player.y - 20, k * 240, -950, true, dmg * 0.65, 'beam', rank);
        rb.beamWidth = 8; rb.r = 4; rb.pierce = 99; rb.isRainbow = true;
        this.bullets.push(rb);
      }
    }
    this.sound.playBeamLaser();
  }

  // 3. 靈能聚變核心
  fireSpiritOrb(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (130 + rank * 50) * qMult;
    const orb = new Bullet(this.player.x, this.player.y - 25, (Math.random() - 0.5) * 40, -150, true, dmg, 'spirit_orb', rank);
    orb.r = 18 + rank * 4;
    orb.zapTimer = 0;
    orb.life = 4.5;
    orb.pierce = 15;
    this.bullets.push(orb);
    this.sound.playSpiritOrbFire();
  }

  // 4. 超空泡穿甲鏢
  fireKineticDarts(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const darts = 2 + Math.floor(rank * 0.7);
    const dmg = (85 + rank * 28) * qMult;
    const spreadX = 14;
    const startX = this.player.x - ((darts - 1) * spreadX) / 2;
    for (let i = 0; i < darts; i++) {
      const b = new Bullet(startX + i * spreadX, this.player.y - 18, 0, -1080, true, dmg, 'kinetic_dart', rank);
      b.r = 4.0;
      b.pierce = 99; // 100% 貫穿
      b.pierceCount = 0;
      this.bullets.push(b);
    }
    this.sound.playRailgunFire();
  }

  // 5. 烈陽核融導彈
  fireHomingMissiles(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const isSwarm = this.isFusionActive('swarm_hunter');
    const count = (2 + Math.floor(rank * 0.8)) * (isSwarm ? 2 : 1);
    const dmg = (42 + rank * 14) * (isSwarm ? 1.35 : 1.0) * qMult;

    for (let i = 0; i < count; i++) {
      const offsetAngle = (i - (count - 1) / 2) * (isSwarm ? 0.2 : 0.35);
      const vx = Math.sin(offsetAngle) * (isSwarm ? 440 : 360);
      const vy = -420;
      const b = new Bullet(this.player.x + (i - (count - 1) / 2) * 10, this.player.y, vx, vy, true, dmg, 'homing', rank);
      b.life = 4.5;
      b.isSwarm = isSwarm;
      this.bullets.push(b);
    }
    this.sound.playMissileLaunch();
  }

  // 6. 青玉風雷飛輪
  fireJadeChakrams(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const count = 1 + Math.floor(rank * 0.5);
    const dmg = (140 + rank * 45) * qMult;
    for (let i = 0; i < count; i++) {
      const side = (i % 2 === 0 ? 1 : -1);
      const b = new Bullet(this.player.x + side * 15, this.player.y - 15, side * 140, -420, true, dmg, 'chakram', rank);
      b.r = 14 + rank * 3;
      b.life = 3.6;
      b.pierce = 99;
      b.chakramAngle = 0;
      this.bullets.push(b);
    }
    this.sound.playChakramWhir();
  }

  // 7. 神鳥天翼僚機
  updateCombatWingman(rank, quality, dt) {
    const droneCount = Math.min(4, rank);
    const qMult = this.getQualityMultiplier(quality);
    this.combatWingmanTimer = (this.combatWingmanTimer || 0) + dt;
    if (this.combatWingmanTimer >= 0.16) {
      this.combatWingmanTimer = 0;
      for (let i = 0; i < droneCount; i++) {
        const side = (i % 2 === 0 ? -1 : 1);
        const dist = 32 + Math.floor(i / 2) * 22;
        const wx = this.player.x + side * dist;
        const wy = this.player.y + 6 + Math.sin(this.time * 6 + i) * 6;
        const b = new Bullet(wx, wy, side * 30, -780, true, (32 + rank * 10) * qMult, 'wingman_needle');
        b.r = 3.5;
        b.color = '#f5bc38';
        this.bullets.push(b);
      }
    }
  }

  // 8. 虹光折射星核 (抗卡頓優化：平滑視覺連線 + 0.15s 離散計時傷害結算 + 目標快取)
  updatePrismWingman(rank, dt) {
    const isRainbow = this.isFusionActive('prism_rainbow_sky');
    const prismCount = (rank >= 2 || isRainbow) ? 2 : 1;
    const prismPositions = prismCount === 1 
      ? [{ x: this.player.x - 38, y: this.player.y - 10 }]
      : [{ x: this.player.x - 42, y: this.player.y - 8 }, { x: this.player.x + 42, y: this.player.y - 8 }];

    this.prismDamageTimer = (this.prismDamageTimer || 0) + dt;
    const isTick = this.prismDamageTimer >= 0.15;
    const elapsedTick = this.prismDamageTimer;
    if (isTick) {
      this.prismDamageTimer = 0;
    }

    if (!this.prismCachedTargets) this.prismCachedTargets = {};

    prismPositions.forEach((p, idx) => {
      let target = null;
      let cached = this.prismCachedTargets[idx];
      if (cached && !cached.dead && cached.hp > 0 && Math.hypot(cached.x - p.x, cached.y - p.y) < 650) {
        target = cached;
      } else {
        let minDist = 580;
        if (this.currentBoss && !this.currentBoss.dead) {
          target = this.currentBoss;
          minDist = Math.hypot(target.x - p.x, target.y - p.y);
        }
        this.enemies.forEach(e => {
          if (!e.dead && e.hp > 0) {
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < minDist) {
              minDist = d;
              target = e;
            }
          }
        });
        this.prismCachedTargets[idx] = target;
      }

      if (target) {
        p.beamTarget = { x: target.x, y: target.y };

        if (isTick) {
          let dps = 260 + rank * 110;
          if (isRainbow) dps *= 1.8;
          const tickDmg = dps * elapsedTick;
          if (target.isBoss) {
            this.damageBoss(target, tickDmg, 'beam', 'prism');
          } else {
            target.hp -= tickDmg;
            if (target.hp <= 0) target.dead = true;
          }

          let secondTarget = null;
          if (rank >= 3 || isRainbow) {
            this.enemies.forEach(e2 => {
              if (e2 !== target && !e2.dead && e2.hp > 0) {
                const d2 = Math.hypot(e2.x - target.x, e2.y - target.y);
                if (d2 < 240) secondTarget = e2;
              }
            });
            if (secondTarget) {
              secondTarget.hp -= tickDmg * 0.75;
              if (secondTarget.hp <= 0) secondTarget.dead = true;
            }
          }
          p.secondTarget = secondTarget ? { x: secondTarget.x, y: secondTarget.y } : null;
        } else {
          p.secondTarget = (p.secondTarget && !p.secondTarget.dead) ? p.secondTarget : null;
        }
      } else {
        p.beamTarget = null;
        p.secondTarget = null;
        this.prismCachedTargets[idx] = null;
      }
    });

    this.activePrisms = prismPositions;
  }

  // 9. 熾陽熔岩噴射核 (重型榴彈)
  fireGrenade(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const isMeltdown = this.isFusionActive('meltdown_impact');
    const b = new Bullet(
      this.player.x, this.player.y - 15,
      (Math.random() - 0.5) * 70, -440,
      true, (420 + rank * 140) * (isMeltdown ? 1.5 : 1.0) * qMult, 'grenade', rank
    );
    b.blastRadius = (55 + rank * 16) * (isMeltdown ? 1.4 : 1.0);
    b.isMeltdown = isMeltdown;
    this.bullets.push(b);
    this.sound.playGrenadeLaunch();
  }

  // 10. 虛空重力奇點
  fireSingularity(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const b = new Bullet(this.player.x, this.player.y - 20, 0, -260, true, (95 + rank * 38) * qMult, 'singularity', rank);
    b.targetY = Math.max(140, this.player.y - 220);
    b.radius = 70 + rank * 18;
    b.life = 3.2 + rank * 0.3;
    b.color = '#c054ff';
    this.bullets.push(b);
    this.sound.playSingularityHum();
  }

  // 11. 埃癸斯神盾力場
  updateAegisShields(rank, quality, dt) {
    const isAegis = this.isFusionActive('orbital_aegis');
    const count = (2 + rank) + (isAegis ? 2 : 0);
    const radius = 54 + rank * 8;
    this.orbitals = [];
    for (let i = 0; i < count; i++) {
      const a = this.time * 3.6 + (i / count) * Math.PI * 2;
      this.orbitals.push({
        x: this.player.x + Math.cos(a) * radius,
        y: this.player.y + Math.sin(a) * radius,
        r: 10 + rank * 1.5,
        isAegis: isAegis
      });
    }
  }

  // 12. 五行太極陣盤
  fireTaijiArray(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const elements = [
      { name: 'gold', color: '#ffd700', type: 'pierce' },
      { name: 'wood', color: '#48e583', type: 'life' },
      { name: 'water', color: '#38bdf8', type: 'slow' },
      { name: 'fire', color: '#ff4766', type: 'blast' },
      { name: 'earth', color: '#d97706', type: 'crush' }
    ];

    if (rank >= 5) {
      // Lv.5 MAX 終極特化：五色混元星陣齊發
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.22;
        const elem = elements[i];
        const b = new Bullet(this.player.x, this.player.y - 15, Math.cos(ang) * 650, Math.sin(ang) * 650, true, (75 + rank * 20) * qMult, 'taiji', rank);
        b.color = elem.color;
        b.elemType = elem.name;
        b.r = 6.0;
        this.bullets.push(b);
      }
    } else {
      const elem = elements[this.taijiIndex % elements.length];
      this.taijiIndex++;
      const b = new Bullet(this.player.x, this.player.y - 16, 0, -680, true, (65 + rank * 18) * qMult, 'taiji', rank);
      b.color = elem.color;
      b.elemType = elem.name;
      b.r = 6.0;
      this.bullets.push(b);
    }
    this.sound.playTaijiPulse();
  }

  // 13. 永凍冰錐尖塔
  fireCryoSpires(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const count = 1 + Math.floor(rank * 0.8);
    for (let i = 0; i < count; i++) {
      const tx = 40 + Math.random() * (this.W - 80);
      const b = new Bullet(tx, -40, 0, 750, true, (480 + rank * 160) * qMult, 'cryo_spire', rank);
      b.r = 14 + rank * 3;
      b.color = '#67ffff';
      b.targetY = 160 + Math.random() * 260;
      this.bullets.push(b);
    }
    this.sound.playIceSpireChime();
  }

  // 14. 地脈翡翠仙泉
  pulseEmeraldSpring(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (100 + rank * 45) * qMult;
    const pulse = new Bullet(this.player.x, this.player.y, 0, 0, true, dmg, 'emerald_pulse', rank);
    pulse.maxRadius = 110 + rank * 24;
    pulse.radius = 10;
    pulse.life = 0.55;
    pulse.color = '#48e583';
    this.bullets.push(pulse);

    // 仙泉生機修復：清掃周圍 100px 敵彈
    this.ebullets = this.ebullets.filter(eb => {
      return Math.hypot(eb.x - this.player.x, eb.y - this.player.y) > pulse.maxRadius;
    });
    this.sound.playEmeraldPulse();
  }

  // 16. 裂變音浪重砲
  fireSonicCannon(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const width = 85 + rank * 22;
    const dmg = (320 + rank * 110) * qMult;
    const wave = new Bullet(this.player.x, this.player.y - 20, 0, -520, true, dmg, 'sonic_wave', rank);
    wave.waveWidth = width;
    wave.r = width / 2;
    wave.life = 2.0;
    wave.pierce = 99;
    wave.color = '#ff9138';
    wave.hitEnemies = new Set(); // 記錄單次音浪已命中敵機，防止每幀重複造成巨額過量傷害
    wave.hitMinions = new Set(); // 記錄單次音浪已命中召喚物
    this.bullets.push(wave);
    this.sound.playSonicCannonBoom();
    this.shake(4, 0.18);
  }

  // 17. 雷公天劫鏈弧 (chain_lightning)
  fireChainLightning(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (180 + rank * 60) * qMult;
    const b = new Bullet(this.player.x, this.player.y - 18, 0, -820, true, dmg, 'chain_lightning', rank);
    b.r = 6 + rank * 1.0;
    b.color = '#38bdf8';
    b.chainCount = 2 + rank;
    b.pierce = 3;
    this.bullets.push(b);
    this.sound.playChainLightning();
  }

  // 18. 熾陽破曉耀斑 (solar_flare)
  fireSolarFlare(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (260 + rank * 85) * qMult;
    const b = new Bullet(this.player.x, this.player.y - 20, 0, -680, true, dmg, 'solar_flare', rank);
    b.r = 12 + rank * 2;
    b.pierce = 99; // 貫穿一切，不被反彈魔鏡阻擋
    b.color = '#ff7a29';
    b.isSolar = true;
    b.hitEnemies = new Set();
    b.hitMinions = new Set();
    this.bullets.push(b);
    this.sound.playSolarFlare();
  }

  // 19. 裂變等離子刃 (plasma_blade)
  firePlasmaBlade(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (130 + rank * 42) * qMult;
    const angles = [-0.22, 0.22];
    angles.forEach(ang => {
      const vx = Math.sin(ang) * 620;
      const vy = -Math.cos(ang) * 620;
      const b = new Bullet(this.player.x + (ang > 0 ? 14 : -14), this.player.y - 12, vx, vy, true, dmg, 'plasma_blade', rank);
      b.r = 14 + rank * 2;
      b.pierce = 4 + rank;
      b.shred = true;
      b.color = '#48e583';
      this.bullets.push(b);
    });
    this.sound.playPlasmaBlade();
  }

  // 20. 奈米蝕甲蟲群 (nano_swarm)
  updateNanoSwarm(rank, quality = 'common', dt) {
    const ns = this.arsenal.nano_swarm;
    ns.timer = (ns.timer || 0) + dt;
    if (ns.timer >= Math.max(1.2, 2.8 - rank * 0.3)) {
      ns.timer = 0;
      const qMult = this.getQualityMultiplier(quality);
      const dmg = (32 + rank * 12) * qMult;
      const count = 2 + Math.min(3, rank);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const b = new Bullet(
          this.player.x + Math.cos(ang) * 22,
          this.player.y + Math.sin(ang) * 22,
          Math.cos(ang) * 160,
          Math.sin(ang) * 160 - 220,
          true, dmg, 'nano_swarm', rank
        );
        b.r = 5;
        b.color = '#a855f7';
        b.pierce = 2;
        this.bullets.push(b);
      }
      this.sound.playNanoSwarm();
    }
  }

  // 21. 天啟破城光錐 (photon_lance)
  firePhotonLance(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (580 + rank * 180) * qMult;
    const b = new Bullet(this.player.x, this.player.y - 24, 0, -1020, true, dmg, 'photon_lance', rank);
    b.r = 16 + rank * 3;
    b.pierce = 99; // 絕對貫穿
    b.color = '#ffd700';
    b.hitEnemies = new Set();
    b.hitMinions = new Set();
    this.bullets.push(b);
    this.sound.playPhotonLance();
    this.shake(9, 0.24);
  }

  // 22. 星陣軌道壁壘 (laser_array)
  updateLaserArray(rank, quality = 'common', dt) {
    const la = this.arsenal.laser_array;
    la.rot = (la.rot || 0) + dt * 2.8;
    la.timer = (la.timer || 0) + dt;
    if (la.timer >= Math.max(0.22, 0.55 - rank * 0.07)) {
      la.timer = 0;
      const qMult = this.getQualityMultiplier(quality);
      const dmg = (26 + rank * 9) * qMult;
      const orbits = [la.rot, la.rot + Math.PI];
      orbits.forEach(ang => {
        const sx = this.player.x + Math.cos(ang) * 46;
        const sy = this.player.y + Math.sin(ang) * 46;
        const b = new Bullet(sx, sy, 0, -750, true, dmg, 'satellite_laser', rank);
        b.r = 4;
        b.color = '#38bdf8';
        this.bullets.push(b);
      });
      this.sound.playLaser(1150);
    }
  }

  // 23. 疾風超導噴流 (hyper_thruster)
  updateHyperThruster(rank, quality = 'common') {
    this.player.moveSpeedMultiplier = Math.max(this.player.moveSpeedMultiplier || 1.0, 1.22 + rank * 0.06);
    this.player.grazeRadius = 56 + rank * 5;
  }

  // 24. 神聖防衛折光稜鏡 (aegis_reflector)
  updateAegisReflector(rank, quality = 'common', dt) {
    const ar = this.arsenal.aegis_reflector;
    ar.timer = (ar.timer || 0) + dt;
    const cd = Math.max(1.6, 3.8 - rank * 0.45);
    if (ar.timer >= cd) {
      ar.timer = 0;
      let deflected = 0;
      if (this.ebullets && this.ebullets.length > 0) {
        this.ebullets.forEach(eb => {
          const dist = Math.hypot(eb.x - this.player.x, eb.y - this.player.y);
          if (dist < 80 && !eb.deflected) {
            eb.deflected = true;
            eb.vy = -Math.abs(eb.vy) * 1.3;
            eb.vx = (Math.random() - 0.5) * 140;
            eb.player = true;
            eb.color = '#38bdf8';
            deflected++;
          }
        });
      }
      if (deflected > 0) {
        this.sound.playLaser(1400);
        this.showToast(`🛡️【神聖折光稜鏡】偏折了 ${deflected} 發敵彈！`);
      }
    }
  }

  // 25. 時序輪迴神鐮 (chronos_scythe)
  fireChronosScythe(rank, quality = 'common') {
    const qMult = this.getQualityMultiplier(quality);
    const dmg = (620 + rank * 200) * qMult;
    const b = new Bullet(this.player.x, this.player.y - 28, (Math.random() - 0.5) * 60, -420, true, dmg, 'chronos_scythe', rank);
    b.r = 30 + rank * 5;
    b.pierce = 99;
    b.color = '#ffd700';
    b.isScythe = true;
    b.hitEnemies = new Set();
    b.hitMinions = new Set();
    this.bullets.push(b);
    this.sound.playChronosScythe();
    this.shake(10, 0.28);
  }

  getQualityMultiplier(quality) {
    if (typeof quality === 'number') {
      const tierMap = [1.0, 1.0, 1.45, 2.1, 3.2, 5.0];
      return tierMap[quality] || 1.0;
    }
    const map = {
      common: 1.0, tier1: 1.0,
      good: 1.45, tier2: 1.45,
      rare: 2.1, tier3: 2.1,
      epic: 3.2, tier4: 3.2,
      legendary: 5.0, tier5: 5.0
    };
    return map[quality] || 1.0;
  }

  triggerHitStop(duration = 0.032) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  createHitSparks(x, y, vx = 0, vy = -400, color = '#ffd700', count = 5, rank = 1) {
    const rankColors = {
      1: '#38bdf8', // 靈能天藍
      2: '#4ade80', // 翡翠耀綠
      3: '#a855f7', // 虛空幽紫
      4: '#fb923c', // 熾烈熔橙
      5: '#facc15'  // 弒神金曜
    };
    const sparkColor = rank > 1 ? (rankColors[rank] || color) : color;
    const actualCount = Math.floor(count * (1 + (rank - 1) * 0.45));
    const baseAngle = Math.atan2(-vy, -vx) || -Math.PI / 2;
    for (let i = 0; i < actualCount; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.8;
      const speed = 80 + Math.random() * (180 + rank * 35);
      const svx = Math.cos(angle) * speed;
      const svy = Math.sin(angle) * speed;
      const size = (2 + Math.random() * 2) * (1 + rank * 0.22);
      this.particles.push(new Particle(x, y, svx, svy, sparkColor, size, 0.20 + Math.random() * 0.15 + rank * 0.04));
    }
    if (rank >= 4) {
      // 高階爆破震波光環
      this.particles.push(new Particle(x, y, 0, 0, '#ffffff', 8 + rank * 2.5, 0.12));
    }
  }

  // ============================================================
  // 統一傷害入口 damageBoss() (徹底修復 Boss 無法消滅與護盾 Bug)
  // ============================================================
  damageBoss(boss, damage, type = 'normal', source = 'bullet') {
    if (!boss || boss.dead) return;
    if (boss.invulnerable) {
      if (source === 'spirit' && type === 'spirit' && (this.lastEmpFired || damage > 500)) {
        boss.invulnerable = false;
        boss.desperationActive = false;
        boss.stunTimer = 3.0;
        this.bossMinions = this.bossMinions.filter(m => m.type !== 'garuda_feather_anchor' && m.type !== 'thunder_drum_anchor' && m.type !== 'gorgon_hex_mirror');
        this.showToast('⚡【100% 擦彈過載 EMP】強行擊穿魔王絕境神盾！魔王陷入 3.0 秒癱瘓！');
      } else {
        return;
      }
    }

    // 暴擊判定
    const critRank = this.equipped.passive2.rank;
    const isCrit = Math.random() < (0.15 + critRank * 0.12);
    let finalDmg = damage;
    if (isCrit) finalDmg *= (2.0 + critRank * 0.3);

    // 護盾極性規則 (全面平衡：不再永久回血阻斷通關)
    if (boss.shieldType === 'blue' && type === 'normal') {
      finalDmg *= 0.6;
    } else if (boss.shieldType === 'green') {
      finalDmg *= 0.8; // 綠色護盾僅提供 20% 生命護甲減傷，不再永久回血！
    } else if (boss.shieldType === 'orange' && type === 'beam') {
      finalDmg *= 0.55;
    }

    // 虹晶天幕真融合：無視護盾減傷並穿透增傷
    if (this.isFusionActive('prism_rainbow_sky')) {
      finalDmg *= 1.35;
    }

    // 迦樓羅專屬第二階段：金羽天罡神盾屏障 (Feather Barrier 承受傷害)
    if (boss.featherBarrierHp && boss.featherBarrierHp > 0) {
      boss.featherBarrierHp -= finalDmg;
      this.sound.playLaser(1200);
      for (let i = 0; i < 4; i++) {
        this.particles.push(new Particle(
          boss.x + (Math.random() - 0.5) * 60,
          boss.y + (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          '#ffd700',
          3,
          0.2
        ));
      }
      // 超空泡穿甲鏢具有穿透暗線剋制，對本體造成 40% 穿透傷害
      if (type === 'kinetic' || source === 'kinetic') {
        boss.hp -= finalDmg * 0.4;
      }
      if (boss.featherBarrierHp <= 0) {
        boss.featherBarrierHp = 0;
        boss.featherShieldActive = false;
        boss.stunTimer = 1.8;
        this.sound.playExplosion(true);
        this.shake(12, 0.4);
        this.showToast('💥 迦樓羅金羽屏障破碎！陷入 1.8 秒大硬直癱瘓！');
      }
      this.totalDamageDealt += finalDmg;
      this.score += Math.round(finalDmg * 2);
      return; // 傷害由金羽神盾吸收，不扣減本體血量
    }

    boss.hp -= finalDmg;
    boss.hitFlash = 0.08;
    this.totalDamageDealt += finalDmg;
    this.score += Math.round(finalDmg * 2);

    // 1-3 關魔王背水一戰機制 (HP <= 15% 時觸發絕境機制，鎖血保底防止純暴力秒殺跳過機制)
    if ((boss.stage === 1 || boss.stage === 2 || boss.stage === 3) && boss.hp <= boss.maxHp * 0.15 && !boss.desperationTriggered && !boss.isMini) {
      boss.hp = Math.max(1, Math.min(boss.hp, Math.floor(boss.maxHp * 0.14)));
      this.triggerBossDesperation(boss);
    }

    // 打擊感音效與金屬火花回饋 (保留音效與震動，移除阻斷引擎渲染之凍結幀)
    if (isCrit) {
      this.sound.playCrit();
      this.shake(5, 0.18);
    } else {
      if (Math.random() < 0.4) this.sound.playHit();
    }

    // 命中火花粒子
    this.particles.push(new Particle(
      boss.x + (Math.random() - 0.5) * 40,
      boss.y + (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.5) * 120,
      isCrit ? '#ffd700' : '#33e0e0',
      isCrit ? 3.5 : 2,
      0.25
    ));

    // 傷害數字 (依使用者需求預設關閉以維持畫面清爽)
    if (this.showDamageNumbers && (Math.random() < 0.4 || isCrit || source === 'spirit')) {
      this.damageNumbers.push(new DamageNumber(
        boss.x + (Math.random() - 0.5) * 50,
        boss.y + (Math.random() - 0.5) * 40,
        Math.round(finalDmg),
        isCrit
      ));
    }

    // 重型打擊觸發強烈音效與畫面震動 (移除 hitStopTimer 停頓以維持 60 FPS 絲滑流暢)
    if (source === 'spirit' || source === 'grenade' || finalDmg > 280) {
      this.sound.playExplosion(true);
      this.shake(7, 0.28);
    }

    // 神話隱藏剋制彩蛋機制檢查
    this.checkBossMythicWeakness(boss, type, source);

    // 階段轉換判定 (第 10 關具備 3 個階段，其餘 Boss 具備 2 個階段)
    if (boss.phases >= 3) {
      if (boss.hp <= boss.maxHp * 0.66 && boss.phase === 1) {
        this.triggerBossPhase2(boss);
      } else if (boss.hp <= boss.maxHp * 0.33 && boss.phase === 2) {
        this.triggerBossPhase3(boss);
      } else if (boss.hp <= 0 && !boss.dying) {
        this.startBossDefeatCinematic(boss);
      }
    } else {
      if (boss.hp <= boss.maxHp * 0.5 && boss.phase === 1 && boss.phases > 1) {
        this.triggerBossPhase2(boss);
      } else if (boss.hp <= 0 && !boss.dying) {
        this.startBossDefeatCinematic(boss);
      }
    }
  }

  // 神話暗線剋制彩蛋機制 (Secret Mythic Weakness Counters)
  checkBossMythicWeakness(boss, type, source) {
    if (!boss || boss.dead || boss.dying) return;
    if (!boss.weaknessCounters) boss.weaknessCounters = {};
    if (boss.weaknessCooldown && boss.weaknessCooldown > 0) return;

    const s = boss.stage || 1;
    // 1. 迦樓羅 (Stage 1) 弱點：虛空重力奇點 (受重力引力強行壓制，墜地硬直癱瘓 3.5 秒)
    if (s === 1 && (type === 'singularity' || source === 'singularity')) {
      boss.weaknessCounters.singularity = (boss.weaknessCounters.singularity || 0) + 1;
      if (boss.weaknessCounters.singularity >= 3) {
        boss.weaknessCounters.singularity = 0;
        boss.weaknessCooldown = 12.0;
        boss.stunTimer = 3.5;
        this.sound.playSecretCounterTrigger();
        this.shake(8, 0.35);
        this.showToast('✨【神話暗線剋制】迦樓羅天羽受虛空重力牽引失衡，墜地失能硬直 3.5 秒！');
      }
    }

    // 2. 雷公 (Stage 2) 弱點：青玉風雷飛輪 (金屬切割切斷連環雷鼓，電容短路重創 8% 生命並癱瘓 3 秒)
    if (s === 2 && (type === 'chakram' || source === 'chakram')) {
      boss.weaknessCounters.chakram = (boss.weaknessCounters.chakram || 0) + 1;
      if (boss.weaknessCounters.chakram >= 15) {
        boss.weaknessCounters.chakram = 0;
        boss.weaknessCooldown = 10.0;
        boss.stunTimer = 3.0;
        boss.hp -= boss.maxHp * 0.08;
        this.sound.playSecretCounterTrigger();
        this.shake(10, 0.4);
        this.showToast('✨【神話暗線剋制】青玉金屬刃切斷雷鼓連鎖導電線！電容短路重創 8% 生命並癱瘓 3 秒！');
      }
    }

    // 3. 美杜莎 (Stage 3) 弱點：玄冰凌柱 (蛇髮群妖受到玄冰絕對急凍，進入 4 秒冰封冬眠！全場蛇彈消解！)
    if (s === 3 && (type === 'cryo_spire' || source === 'cryo_spire')) {
      boss.weaknessCounters.cryo = (boss.weaknessCounters.cryo || 0) + 1;
      if (boss.weaknessCounters.cryo >= 20) {
        boss.weaknessCounters.cryo = 0;
        boss.weaknessCooldown = 12.0;
        boss.stunTimer = 4.0;
        this.ebullets = [];
        this.sound.playSecretCounterTrigger();
        this.shake(8, 0.35);
        this.showToast('✨【神話暗線剋制】美杜莎妖蛇受玄冰急凍！進入 4 秒冰封冬眠，場上蛇彈全數瓦解！');
      }
    }

    // 3B. 美杜莎石化凝視解鎖：金陽聚焦光束熱能融化石化凝視 (4 秒移速全面恢復)
    if (s === 3 && (type === 'beam' || source === 'beam')) {
      if (this.player.gorgonSlowActive) {
        this.player.gorgonSlowActive = false;
        this.player.gorgonPurgeTimer = 4.0;
        this.showToast('✨【金陽神光熱能】驅散美杜莎石化凝視！4 秒移動速度全面恢復！');
      }
    }

    // 4. 饕餮 (Stage 4) 弱點：熾陽熔岩榴彈 (貪食吞噬高爆熔岩核，腹內內爆反噬重創 10% 生命！)
    if (s === 4 && (type === 'grenade' || source === 'grenade')) {
      boss.weaknessCounters.grenade = (boss.weaknessCounters.grenade || 0) + 1;
      if (boss.weaknessCounters.grenade >= 3) {
        boss.weaknessCounters.grenade = 0;
        boss.weaknessCooldown = 14.0;
        boss.stunTimer = 2.5;
        boss.hp -= boss.maxHp * 0.10;
        this.bossMinions = [];
        this.ebullets = [];
        this.sound.playSecretCounterTrigger();
        this.shake(14, 0.5);
        this.showToast('✨【神話暗線剋制】饕餮吞食高爆熔岩核引發腹腔內爆！重創 10% 生命且傀儡全滅！');
      }
    }

    // 6. 雅典娜 (Stage 6) 弱點：五行太極陣盤 (陰陽生剋五行玄機破解埃癸斯神盾，神盾永久碎裂！)
    if (s === 6 && (type === 'taiji' || source === 'taiji')) {
      boss.weaknessCounters.taiji = (boss.weaknessCounters.taiji || 0) + 1;
      if (boss.weaknessCounters.taiji >= 15) {
        boss.weaknessCounters.taiji = 0;
        boss.weaknessCooldown = 15.0;
        boss.shieldType = 'none';
        boss.hp -= boss.maxHp * 0.06;
        this.sound.playSecretCounterTrigger();
        this.shake(9, 0.35);
        this.showToast('✨【神話暗線剋制】五行太極陰陽生剋破陣！雅典娜埃癸斯神盾崩解碎裂！');
      }
    }

    // 8. 獨眼巨人 (Stage 8) 弱點：裂變音浪重砲 (聽覺中樞共振震裂，打鐵熔爐熄火停擺 4 秒！)
    if (s === 8 && (type === 'sonic_wave' || source === 'sonic_wave')) {
      boss.weaknessCounters.sonic = (boss.weaknessCounters.sonic || 0) + 1;
      if (boss.weaknessCounters.sonic >= 10) {
        boss.weaknessCounters.sonic = 0;
        boss.weaknessCooldown = 12.0;
        boss.stunTimer = 4.0;
        this.sound.playSecretCounterTrigger();
        this.shake(10, 0.4);
        this.showToast('✨【神話暗線剋制】音浪重砲貫穿獨眼巨人聽覺中樞！神鐵熔爐冷卻停擺 4 秒！');
      }
    }

    // 9. 玉藻前 (Stage 9) 弱點：金陽聚焦光束 (陽光照破九尾天狐魅影，全數幻象分身當場蒸發幻滅！)
    if (s === 9 && (type === 'beam' || source === 'beam')) {
      boss.weaknessCounters.beam = (boss.weaknessCounters.beam || 0) + 1;
      if (boss.weaknessCounters.beam >= 25) {
        boss.weaknessCounters.beam = 0;
        boss.weaknessCooldown = 12.0;
        boss.stunTimer = 3.0;
        this.bossMinions = [];
        this.sound.playSecretCounterTrigger();
        this.shake(8, 0.35);
        this.showToast('✨【神話暗線剋制】金陽神光照破九尾狐魅影！玉藻前所有幻影分身當場蒸發！');
      }
    }
  }

  triggerBossPhase2(boss) {
    boss.phase = 2;
    boss.invulnerable = true;
    boss.invulnTimer = 2.0; // 變身短暫無敵 2 秒，會在 updateBoss 中遞減解鎖！
    this.ebullets = [];
    this.sound.playWarningAlert();
    this.sound.speak(`${boss.name}：第二型態展開！`);
    this.showToast(`${boss.name} 裝甲全面重組，狂暴攻擊模式啟動！`);

    if (boss.stage === 1) {
      boss.featherBarrierHp = 10000;
      boss.maxFeatherBarrierHp = 10000;
      boss.featherShieldActive = true;
      this.sound.playLaser(1500);
      this.showToast('🦅 迦樓羅展開【金羽天罡神盾屏障】！吸收 10,000 點傷害！');
    } else if (boss.stage === 2) {
      boss.shockCycleTimer = 0;
      boss.shockTelegraphed = false;
      this.showToast('⚡ 雷公激發【九天磁暴】！每 3 秒引發 0.5 秒靜電拘束！');
    } else if (boss.stage === 3) {
      this.player.gorgonSlowActive = true;
      this.showToast('🐍 美杜莎開啟【石化凝視領域】！戰機移速降低 50%！（金陽神光可融化解鎖）');
    }
  }

  triggerBossPhase3(boss) {
    boss.phase = 3;
    boss.invulnerable = true;
    boss.invulnTimer = 2.5; // 變身短暫無敵 2.5 秒
    this.ebullets = [];
    this.sound.playWarningAlert();
    this.sound.playBossEntranceSiren();
    this.showToast(`🌌【${boss.name}】第三型態：混沌原初創世終極神格降臨！`);
    this.shake(14, 0.5);
  }

  // 1-3 關魔王絕境背水一戰機制 (Desperation Overload)
  triggerBossDesperation(b) {
    if (!b || b.dead || b.dying || b.desperationTriggered || b.isMini) return;
    b.desperationTriggered = true;
    b.desperationActive = true;
    const bx = (b.x !== undefined) ? b.x : (this.W ? this.W * 0.5 : 240);
    const by = (b.y !== undefined) ? b.y : 150;
    const w = this.W || 480;
    this.ebullets = [];
    this.sound.playWarningAlert();

    if (b.stage === 1) {
      b.invulnerable = true;
      b.invulnTimer = 999;
      this.sound.playLaser(1400);
      this.shake(10, 0.35);
      this.showToast('⚠️【迦樓羅・涅槃金羽陣】靈能結界展開！魔王完全無敵，請蓄力發射【靈丸】擊破 4 處金羽錨點！');
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        this.bossMinions.push({
          type: 'garuda_feather_anchor',
          name: '涅槃金羽錨點',
          requiresSpirit: true,
          x: bx + Math.cos(ang) * 85,
          y: by + Math.sin(ang) * 85,
          r: 18,
          hp: 800,
          maxHp: 800,
          angle: ang
        });
      }
    } else if (b.stage === 2) {
      b.invulnerable = true;
      b.invulnTimer = 999;
      this.sound.playLaser(1600);
      this.shake(10, 0.35);
      this.showToast('⚠️【雷公・天劫囚籠】無敵磁暴激活！常規武器無效，請蓄力發射【靈丸】摧毀天雷法鼓！');
      this.bossMinions.push({
        type: 'thunder_drum_anchor',
        name: '天雷法鼓・左',
        requiresSpirit: true,
        x: w * 0.22,
        y: by + 30,
        r: 22,
        hp: 1200,
        maxHp: 1200
      });
      this.bossMinions.push({
        type: 'thunder_drum_anchor',
        name: '天雷法鼓・右',
        requiresSpirit: true,
        x: w * 0.78,
        y: by + 30,
        r: 22,
        hp: 1200,
        maxHp: 1200
      });
    } else if (b.stage === 3) {
      b.invulnerable = true;
      b.invulnTimer = 999;
      this.sound.playLaser(900);
      this.shake(8, 0.3);
      this.showToast('⚠️【美杜莎・蛇髮魔鏡】靈能反彈壁壘！魔王處於無敵狀態，請使用【靈丸】摧毀 3 面魔鏡！');
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2;
        this.bossMinions.push({
          type: 'gorgon_hex_mirror',
          name: '蛇髮魔鏡',
          requiresSpirit: true,
          x: bx + Math.cos(ang) * 95,
          y: by + Math.sin(ang) * 95,
          r: 20,
          hp: 1000,
          maxHp: 1000,
          angle: ang
        });
      }
    }
  }

  startBossDefeatCinematic(boss) {
    if (!boss || boss.dying) return;
    boss.dying = true;
    boss.invulnerable = true;
    boss.hp = 0;

    // 顯示神話 Boss 專屬敗北遺言卡片
    const overlay = document.getElementById('bossDefeatOverlay');
    if (overlay) {
      const nameEl = document.getElementById('bossDefeatName');
      const quoteEl = document.getElementById('bossDefeatQuote');
      if (nameEl) nameEl.textContent = `【${boss.name}】神格崩解`;
      if (quoteEl) quoteEl.textContent = boss.defeatVoiceLine || '「這不可能...我的神威竟然...」';
      overlay.style.display = 'flex';
    }

    // 清空場上敵彈與危害標記，轉化為金光粒子
    this.ebullets.forEach(eb => {
      this.particles.push(new Particle(eb.x, eb.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#f5bc38', 3, 0.6));
    });
    this.ebullets = [];
    this.hazardTelegraphs = [];
    this.bossMinions = [];

    // 音效與強烈震動反饋
    this.sound.playBossDeathSupernova();
    this.sound.playBossDefeatQuote(boss.stage || 1, boss.id || '');
    this.sound.vibrate([150, 80, 250, 100, 450]);
    this.shake(20, 2.6);

    // 初始化華麗多階段大破滅序列 (2.8 秒)
    this.bossDeathSequence = {
      boss: boss,
      timer: 2.8,
      maxTimer: 2.8,
      shards: [],
      shockwaves: [],
      godRays: [],
      supernovaTriggered: false
    };

    // 放射穿甲破裂神光束 (16 束向外暴射的光柱)
    for (let i = 0; i < 16; i++) {
      this.bossDeathSequence.godRays.push({
        angle: (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        length: 0,
        maxLength: 340 + Math.random() * 220,
        width: 5 + Math.random() * 7,
        speed: 380 + Math.random() * 320,
        color: Math.random() < 0.5 ? '#f5bc38' : '#ff4766'
      });
    }

    this.showToast(`💥 ${boss.name} 核心過載引爆！動力爐極限大破滅！`);
    // Boss 擊破時立即解除所有異常狀態 (如美杜莎減速)
    this.resetPlayerStatusEffects();
  }

  finishBossDefeat(boss) {
    boss.dead = true;
    this.currentBoss = null;
    this.bossDeathSequence = null;
    const overlay = document.getElementById('bossDefeatOverlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('bossHud').style.display = 'none';
    document.getElementById('ultimateWarning').style.display = 'none';
    const tacAlert = document.getElementById('bossTacticalAlert');
    if (tacAlert) tacAlert.style.display = 'none';
    this.resetPlayerStatusEffects();
    this.startQuizPhase();
  }

  onBossDefeated(boss) {
    this.startBossDefeatCinematic(boss);
  }

  // 統一重置戰機所有受控狀態 (徹底根除美杜莎減速、硬直停頓等狀態帶入下一關之問題)
  resetPlayerStatusEffects() {
    if (!this.player) return;
    this.player.gorgonSlowActive = false;
    this.player.gorgonPurgeTimer = 0;
    this.player.stunTimer = 0;
    this.player.moveSpeedMultiplier = 1.0;
    this.player.bulletSlowFactor = 1.0;
    this.player.speed = 400;
  }

  // ============================================================
  // 擦彈判定 (Graze System)
  // ============================================================
  checkGraze(eb) {
    const dist = Math.hypot(eb.x - this.player.x, eb.y - this.player.y);
    if (dist < this.player.grazeRadius && dist > this.player.hitboxRadius) {
      if (!eb.grazed) {
        eb.grazed = true;
        this.player.grazeSync = Math.min(100, this.player.grazeSync + 6);
        this.totalGrazeCount++;
        this.score += 60;
        this.sound.playGraze();
        this.particles.push(new Particle(
          (this.player.x + eb.x) / 2,
          (this.player.y + eb.y) / 2,
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 90,
          '#67ffff',
          2.5,
          0.22
        ));
      }
    }
  }

  // ============================================================
  // 波次推進與神話 Boss 生成 (平衡 HP 與專屬多元機制)
  // ============================================================
  startNewGame(stage = 1) {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (this.canvas) {
      this.canvas.tabIndex = 1;
      if (typeof this.canvas.focus === 'function') {
        try { this.canvas.focus(); } catch(err) {}
      }
    }
    this.state = 'playing';
    this.stage = stage;
    this.wave = 1;
    this.score = 0;
    this.resetPlayerStatusEffects();
    if (stage === 1 && this.dataStore) {
      this.dataStore.resetSessionQuestions();
      this.sessionTotalAnswered = 0;
      this.sessionTotalCorrect = 0;
    }
    this.player.hp = 3;
    this.player.shield = false;
    this.player.grazeSync = 0;
    this.player.bulletSlowFactor = 1.0;
    this.player.moveSpeedMultiplier = 1.0;
    this.player.speed = 400;
    this.player.baseShootTimer = 0;
    this.player.stunTimer = 0;
    this.player.gorgonSlowActive = false;
    this.player.gorgonPurgeTimer = 0;
    this.player.x = this.W / 2;
    this.player.y = this.H - 100;
    this.player.targetX = this.player.x;
    this.player.targetY = this.player.y;
    this.enemies = [];
    this.bullets = [];
    this.ebullets = [];
    this.hazardTelegraphs = [];
    this.lavaPools = [];
    this.currentBoss = null;
    this.bossDeathSequence = null;
    this.screenFlashAlpha = 0;
    this.waveTimer = 0;

    // 武裝庫初始化：所有武器重置為 0 階，並啟用玩者自選之首發武器 (限定 B/C 級主動武器，Rank 1)
    const validCandidates = STARFALL_WEAPONS_CATALOG.filter(w => !w.isPassive && (w.tier === 'B' || w.tier === 'C'));
    let startWep = this.selectedStartingWeapon || 'multishot';
    if (!validCandidates.some(w => w.id === startWep)) {
      startWep = 'multishot';
      this.selectedStartingWeapon = 'multishot';
    }

    if (this.arsenal) {
      Object.keys(this.arsenal).forEach(key => {
        this.arsenal[key].rank = 0;
        this.arsenal[key].timer = 0;
        this.arsenal[key].quality = 'common';
      });
      if (this.arsenal[startWep]) {
        this.arsenal[startWep].rank = 1;
        this.equipped.main = this.arsenal[startWep];
      }
    }

    const selObj = STARFALL_WEAPONS_CATALOG.find(w => w.id === startWep);
    if (selObj && !selObj.isPassive && (selObj.tier === 'B' || selObj.tier === 'C')) {
      this.equippedActiveWeapons = [startWep];
    } else {
      this.equippedActiveWeapons = ['multishot'];
      if (this.arsenal && this.arsenal.multishot) {
        this.arsenal.multishot.rank = 1;
        this.arsenal.multishot.quality = 'common';
      }
    }

    if (this.sound && this.sound.bgm) {
      this.sound.bgm.setStage(this.stage);
      this.sound.bgm.start();
    }

    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    this.updateHUD();
    const wepName = selObj ? selObj.name : '多管神機砲';
    this.showToast(`第 ${this.stage} 關 任務開始！首發武裝：${wepName} Lv.1`);
  }

  updateWave(dt) {
    if (this.currentBoss) {
      this.updateBoss(dt);
      return;
    }

    this.waveTimer += dt;
    if (this.wave === 1) {
      if (this.waveTimer % 2.6 < dt) {
        this.spawnMobWave();
      }
      if (this.waveTimer >= 22) {
        this.wave = 2;
        this.waveTimer = 0;
        this.spawnMiniBoss();
      }
    } else if (this.wave === 3) {
      if (this.waveTimer % 2.8 < dt) {
        this.spawnMobWave();
      }
      if (this.waveTimer >= 14) {
        this.wave = 4;
        this.waveTimer = 0;
        this.spawnMajorBoss(this.stage);
      }
    }
  }

  // 多元雜兵種類 (scout 突擊機, gunner 重裝重砲, star 旋轉星核, bastion 要塞巨艦, charger 衝撞機, bomber 自爆機)
  spawnMobWave() {
    const stage = this.stage;
    // 依關卡難度權重挑選敵機種類
    const pool = ['scout', 'scout', 'gunner'];
    if (stage >= 2) pool.push('gunner', 'star', 'charger');
    if (stage >= 3) pool.push('star', 'bastion', 'charger', 'bomber');
    if (stage >= 5) pool.push('star', 'bastion', 'bastion', 'charger', 'bomber', 'bomber'); // 第 5 關高威脅波次

    const count = 3 + Math.floor(Math.random() * (stage >= 5 ? 4 : 3));
    for (let i = 0; i < count; i++) {
      const type = pool[Math.floor(Math.random() * pool.length)];
      const x = 40 + Math.random() * (this.W - 80);
      let enemy;

      if (type === 'scout') {
        // 1. 紅翼突擊偵察機：高機動蛇行俯衝，瞄準自機發射高速光針
        enemy = new Entity(x, -35, 16);
        enemy.type = 'scout';
        enemy.maxHp = 45 + stage * 18;
        enemy.hp = enemy.maxHp;
        enemy.baseX = x;
        enemy.vy = 170 + stage * 14;
        enemy.age = Math.random() * Math.PI;
        enemy.shootCooldown = 0.8 + Math.random() * 0.9;
        enemy.scoreVal = 100;
      } else if (type === 'gunner') {
        // 2. 碧甲重裝機砲兵：快速入場並懸停空中，發射雙聯交叉扇形彈幕
        enemy = new Entity(x, -40, 18);
        enemy.type = 'gunner';
        enemy.maxHp = 95 + stage * 28;
        enemy.hp = enemy.maxHp;
        enemy.vy = 120 + stage * 10;
        enemy.hoverY = 110 + Math.random() * 110;
        enemy.hoverTimer = 2.6 + Math.random() * 0.8;
        enemy.shootCooldown = 0.9 + Math.random() * 0.8;
        enemy.scoreVal = 180;
      } else if (type === 'star') {
        // 3. 金芒旋刃星曜：自體旋轉、斜向遊弋，週期性蓄能爆發全方位 6/8 芒光刺
        enemy = new Entity(x, -45, 18);
        enemy.type = 'star';
        enemy.maxHp = 145 + stage * 36;
        enemy.hp = enemy.maxHp;
        enemy.vy = 65 + stage * 8;
        enemy.vx = (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 35);
        enemy.rotation = Math.random() * Math.PI * 2;
        enemy.shootCooldown = 1.4 + Math.random() * 1.0;
        enemy.scoreVal = 260;
      } else if (type === 'charger') {
        // 4. 赤隼衝撞機：入場鎖定自機 X 軸發射預警紅線，隨後超音速極速俯衝撞擊！
        enemy = new Entity(x, -45, 18);
        enemy.type = 'charger';
        enemy.maxHp = 75 + stage * 20;
        enemy.hp = enemy.maxHp;
        enemy.vy = 95;
        enemy.lockTimer = 0.75;
        enemy.charging = false;
        enemy.hasTelegraphed = false;
        enemy.scoreVal = 230;
      } else if (type === 'bomber') {
        // 5. 核芯自爆機：飄向玩家區域，受到重創或近身時倒數自爆並噴射 8 向破片彈幕！
        enemy = new Entity(x, -50, 20);
        enemy.type = 'bomber';
        enemy.maxHp = 105 + stage * 26;
        enemy.hp = enemy.maxHp;
        enemy.vy = 75 + stage * 8;
        enemy.fuse = 0;
        enemy.scoreVal = 250;
      } else {
        // 6. 紫霄無畏要塞重機神：慢速推進重裝甲，發射重型爆破電漿球與雙翼連續雷射
        enemy = new Entity(x, -55, 26);
        enemy.type = 'bastion';
        enemy.maxHp = 330 + stage * 80;
        enemy.hp = enemy.maxHp;
        enemy.vy = 40 + stage * 6;
        enemy.shootCooldown = 1.8 + Math.random() * 1.2;
        enemy.scoreVal = 450;
      }

      enemy.hitFlashTimer = 0;
      enemy.flinchX = 0;
      this.enemies.push(enemy);
    }
  }

  spawnMiniBoss() {
    const hp = (this.stage && this.stage <= 3) ? 21000 : 50000;
    this.currentBoss = {
      isBoss: true,
      isMini: true,
      id: 'mini_boss',
      defeatVoiceLine: '「前哨巡察艦動力爐過載...全面撤退！」',
      name: '星宿巡察艦・前哨神械',
      x: this.W / 2,
      y: -60,
      targetY: 135,
      hp: hp,
      maxHp: hp,
      hitboxRadius: 42,
      phase: 1,
      phases: 1,
      invulnerable: false,
      invulnTimer: 0,
      shieldType: 'none',
      skillTimer: 0,
      ultimateTimer: 0,
      assetKey: 'boss_mini'
    };
    this.showBossHUD(this.currentBoss);
    this.triggerBossEntrance(this.currentBoss, true);
  }

  spawnMajorBoss(stage) {
    if (stage && stage >= 1 && stage <= 10) {
      this.stage = stage;
      if (this.sound && this.sound.bgm) {
        this.sound.bgm.setStage(stage);
      }
    }
    const baseHps = [0, 50400, 56700, 65100, 175000, 195000, 215000, 235000, 255000, 240000, 480000];
    const fallbackBossNames = [
      '', '迦樓羅・裂空王', '雷公・震霄', '美杜莎・返照', '饕餮・萬喰',
      '阿特拉斯・墜星', '雅典娜・神盾', '許德拉・再生', '獨眼巨人・天爐',
      '玉藻前・幻械', '提亞瑪特・混沌母艦'
    ];
    const bList = this.dataStore.bossData ? this.dataStore.bossData.bosses : [];
    const bData = bList.find(b => b.stage === stage) || {
      name: fallbackBossNames[stage] || `關卡 ${stage} 神話領主`,
      shieldType: 'none',
      introVoice: '降臨！'
    };

    let hp = bData.baseHp || baseHps[stage] || 50400;
    if (stage <= 3 && hp > 100000) {
      hp = Math.round(hp * 0.6); // 1-3 關難度實質調降 40%
    }
    this.currentBoss = {
      isBoss: true,
      isMini: false,
      stage: stage,
      id: bData.id || `boss_${stage}`,
      name: bData.name,
      defeatVoiceLine: bData.defeatVoiceLine || '',
      x: this.W / 2,
      y: -100,
      targetY: 155,
      hp: hp,
      maxHp: hp,
      hitboxRadius: bData.hitboxRadius || 50,
      phase: 1,
      phases: stage === 10 ? 3 : 2,
      invulnerable: false,
      invulnTimer: 0,
      shieldType: bData.shieldType || 'none',
      ultimates: bData.ultimates || [],
      skillTimer: 0,
      ultimateTimer: 0,
      patternIndex: 0,
      assetKey: `boss_${stage}`,
      introVoice: bData.introVoice
    };
    this.showBossHUD(this.currentBoss);
    this.triggerBossEntrance(this.currentBoss, false);
  }

  // Boss & 小 Boss 震撼登場特效與全場清屏衝擊波
  triggerBossEntrance(boss, isMini) {
    this.ebullets = []; // 清屏普通敵彈
    this.bossIntroSequence = {
      active: true,
      timer: 2.2,
      maxTimer: 2.2,
      isMini: isMini,
      boss: boss,
      shockwaveTriggered: false
    };

    // 顯示全屏警報橫幅
    const overlay = document.getElementById('bossEntranceOverlay');
    if (overlay) {
      document.getElementById('bossEntranceBadge').textContent = isMini
        ? '⚠️ ALERT: ELITE THREAT APPROACHING ⚠️'
        : '⚠️ WARNING: MYTHIC MECHA DETECTED ⚠️';
      document.getElementById('bossEntranceTitle').textContent = isMini
        ? `【${boss.name}】先鋒現身`
        : `第 ${boss.stage} 關【${boss.name}】降臨`;
      document.getElementById('bossEntranceSub').textContent = isMini
        ? '先鋒前哨精英機甲 // 進入接敵陣位'
        : '神話神格已展開 // 全域警戒模式啟動';
      overlay.classList.remove('hidden');
    }

    this.sound.playBossEntranceSiren();
    this.shake(8, 0.4);
    setTimeout(() => {
      this.sound.speak(boss.introVoice || `${boss.name}，出戰！`);
    }, 900);
  }

  showBossHUD(boss) {
    const hud = document.getElementById('bossHud');
    document.getElementById('bossName').textContent = boss.name;
    document.getElementById('bossPhase').textContent = `PHASE ${boss.phase}`;
    hud.style.display = 'flex';
  }

  // ============================================================
  // 十大 Boss 專屬多元攻擊模式、神話機制與實體生命週期
  // ============================================================
  updateBoss(dt) {
    const b = this.currentBoss;
    if (!b || b.dead || b.dying) return;

    // 無敵計時器倒數解鎖
    if (b.invulnerable) {
      b.invulnTimer -= dt;
      if (b.invulnTimer <= 0) {
        b.invulnerable = false;
        b.invulnTimer = 0;
      }
    }

    // 弱點反制冷卻與硬直癱瘓倒數
    if (b.weaknessCooldown > 0) b.weaknessCooldown -= dt;
    if (b.stunTimer > 0) {
      b.stunTimer -= dt;
      // 處於硬直癱瘓狀態，產生電弧/冰晶粒子，停止移動與技能發射
      this.particles.push(new Particle(
        b.x + (Math.random() - 0.5) * 60,
        b.y + (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        Math.random() < 0.5 ? '#67ffff' : '#ffd700',
        3,
        0.2
      ));
      return;
    }

    // 進場與十大 Boss 專屬移動軌跡演算法
    if (b.y < b.targetY) {
      b.y += 130 * dt;
    } else {
      const s = b.stage || 1;
      const t = this.time;
      switch (s) {
        case 1: { // 1. 迦樓羅：8 字型滑翔與高空盤旋 (Lissajous 8-figure dive)
          b.x = this.W / 2 + Math.sin(t * 1.8) * 110;
          b.y = b.targetY + Math.sin(t * 3.6) * 35;
          break;
        }
        case 2: { // 2. 雷公：Z 字型疾雷折線與雷殛閃現 (Lightning Z-glide & flash teleport)
          b.teleportTimer = (b.teleportTimer || 0) + dt;
          if (b.teleportTimer >= 3.2) {
            b.teleportTimer = 0;
            const positions = [this.W * 0.22, this.W * 0.5, this.W * 0.78];
            const targetX = positions[Math.floor(Math.random() * positions.length)];
            for (let i = 0; i < 8; i++) {
              this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, '#f5bc38', 4, 0.3));
            }
            b.x = targetX;
            this.sound.playLaser(1400);
          } else {
            b.x += (Math.sin(t * 5.0) > 0 ? 1 : -1) * 140 * dt;
            b.x = Math.max(50, Math.min(this.W - 50, b.x));
            b.y = b.targetY + Math.sin(t * 2.5) * 15;
          }
          break;
        }
        case 3: { // 3. 美杜莎：蛇形 S 曲線游弋 (Serpentine S-curve slither)
          b.x = this.W / 2 + Math.sin(t * 1.3) * 125 + Math.sin(t * 3.9) * 25;
          b.y = b.targetY + Math.cos(t * 2.6) * 24;
          break;
        }
        case 4: { // 4. 饕餮：重力深陷與貪婪下壓 (Gravitational sink & center pull)
          b.x = this.W / 2 + Math.sin(t * 0.8) * 70;
          b.y = b.targetY + Math.pow(Math.sin(t * 1.4), 2) * 36;
          break;
        }
        case 5: { // 5. 阿特拉斯：天穹重磅下墜與泰坦重踏 (Titanic ground pound drop)
          b.atlasDropTimer = (b.atlasDropTimer || 0) + dt;
          if (b.atlasDropTimer >= 4.0) {
            b.atlasDropTimer = 0;
            this.shake(8, 0.3);
          }
          const dropPhase = (b.atlasDropTimer % 4.0);
          if (dropPhase < 1.0) {
            b.y = b.targetY - 25 * dropPhase;
          } else if (dropPhase < 1.4) {
            b.y = b.targetY + 45;
          } else {
            b.y = b.targetY;
            b.x = this.W / 2 + Math.sin(t * 1.0) * 80;
          }
          break;
        }
        case 6: { // 6. 雅典娜：軍事正三角巡弋陣型 (Tactical triangle patrol)
          const p = (t * 0.6) % 3;
          const apexY = b.targetY - 20;
          const baseY = b.targetY + 30;
          if (p < 1) {
            b.x = (this.W / 2) + p * 110;
            b.y = apexY + p * (baseY - apexY);
          } else if (p < 2) {
            const p2 = p - 1;
            b.x = (this.W / 2 + 110) - p2 * 220;
            b.y = baseY;
          } else {
            const p3 = p - 2;
            b.x = (this.W / 2 - 110) + p3 * 110;
            b.y = baseY - p3 * (baseY - apexY);
          }
          break;
        }
        case 7: { // 7. 許德拉：九頭蛇身劇毒波狀擺動 (Hydra multi-head sway)
          b.x = this.W / 2 + Math.sin(t * 1.5) * 105;
          b.y = b.targetY + Math.sin(t * 3.0) * 30 + Math.cos(t * 0.8) * 16;
          break;
        }
        case 8: { // 8. 獨眼巨人：鋼鐵重步梯形前進 (Iron step marching)
          const stepIdx = Math.floor(t * 1.6) % 6;
          const stepPositions = [this.W * 0.2, this.W * 0.35, this.W * 0.5, this.W * 0.65, this.W * 0.8, this.W * 0.5];
          const targetStepX = stepPositions[stepIdx];
          b.x += (targetStepX - b.x) * 6.0 * dt;
          b.y = b.targetY + (stepIdx % 2 === 0 ? 15 : -10);
          break;
        }
        case 9: { // 9. 玉藻前：天狐幻境魅影穿梭 (Tamamo decoy phasing drift)
          b.x = this.W / 2 + Math.sin(t * 1.2) * 115;
          b.y = b.targetY + Math.cos(t * 1.8) * 28;
          b.phaseShimmer = Math.sin(t * 4.0) > 0.3;
          break;
        }
        case 10: { // 10. 提亞瑪特：原初混沌宇宙軌道旋轉 (Cosmic orbital revolution)
          const orbitR = b.phase === 3 ? 120 : 95;
          const orbitSpd = b.phase === 3 ? 1.4 : 0.9;
          b.x = this.W / 2 + Math.cos(t * orbitSpd) * orbitR;
          b.y = b.targetY + Math.sin(t * orbitSpd) * 45;
          break;
        }
        default: {
          b.x = this.W / 2 + Math.sin(t * 1.6) * 85;
          break;
        }
      }
    }

    // 更新神話機制附屬實體 (暴食傀儡、甘露仙瓶、蛇首分身、雷鼓、龍卵等)
    this.bossMinions.forEach(m => {
      m.x += (m.vx || 0) * dt;
      m.y += (m.vy || 0) * dt;
      if (m.timer !== undefined) {
        m.timer -= dt;
        if (m.timer <= 0) {
          m.dead = true;
          if (m.onExpire) m.onExpire(this, b);
        }
      }

      // 饕餮暴食傀儡走向饕餮之口
      if (m.type === 'taotie_food' && !m.dead) {
        const dx = b.x - m.x;
        const dy = (b.y + 20) - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 32) {
          m.dead = true;
          // 饕餮吞噬！立即回血 6% 並噴發暴食酸液
          b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.06);
          this.sound.playExplosion(false);
          this.showToast('饕餮吞噬了貪食傀儡！生命回復 6% 並狂暴吐息！');
          for (let k = -3; k <= 3; k++) {
            const eb = new Bullet(b.x, b.y + 25, k * 55, 230, false, 1, 'bile');
            eb.color = '#ff9138'; eb.r = 7;
            this.ebullets.push(eb);
          }
        }
      }

      // 蛇首分身自發射擊
      if (m.type === 'hydra_head' && !m.dead) {
        m.shootTimer = (m.shootTimer || 0) + dt;
        if (m.shootTimer >= 1.6) {
          m.shootTimer = 0;
          for (let k = -1; k <= 1; k++) {
            const eb = new Bullet(m.x, m.y + 12, k * 65, 200, false, 1, 'venom');
            eb.color = '#48e583'; eb.r = 6;
            this.ebullets.push(eb);
          }
        }
      }

      // 蛇髮鏡像分身射擊
      if (m.type === 'gorgon_clone' && !m.dead) {
        m.shootTimer = (m.shootTimer || 0) + dt;
        if (m.shootTimer >= 2.0) {
          m.shootTimer = 0;
          for (let a = 0; a < 6; a++) {
            const ang = (a / 6) * Math.PI * 2;
            const eb = new Bullet(m.x, m.y, Math.cos(ang) * 160, Math.sin(ang) * 160, false, 1, 'mirror_bullet');
            eb.color = '#c054ff';
            this.ebullets.push(eb);
          }
        }
      }

      // 迦樓羅金羽錨點旋轉護衛
      if (m.type === 'garuda_feather_anchor' && !m.dead) {
        m.angle = (m.angle || 0) + dt * 1.6;
        m.x = b.x + Math.cos(m.angle) * 85;
        m.y = b.y + Math.sin(m.angle) * 85;
      }

      // 美杜莎蛇髮魔鏡旋轉反彈壁壘
      if (m.type === 'gorgon_hex_mirror' && !m.dead) {
        m.angle = (m.angle || 0) + dt * 1.5;
        m.x = b.x + Math.cos(m.angle) * 95;
        m.y = b.y + Math.sin(m.angle) * 95;
      }
    });
    this.bossMinions = this.bossMinions.filter(m => !m.dead);

    // 檢查 1-3 關魔王背水一戰機制是否被瓦解
    if (b.desperationActive) {
      const spiritMinions = this.bossMinions.filter(m => m.requiresSpirit && !m.dead);
      if (spiritMinions.length > 0) {
        b.invulnerable = true;
      }

      if (b.stage === 1) {
        const anchors = this.bossMinions.filter(m => m.type === 'garuda_feather_anchor');
        if (anchors.length === 0) {
          b.desperationActive = false;
          b.invulnerable = false;
          b.stunTimer = 3.0;
          this.sound.playExplosion(true);
          this.shake(14, 0.45);
          this.cancelAllEnemyBullets('💥【靈能破盾】金羽錨點全數破除！迦樓羅神盾瓦解，陷入 3.0 秒大癱瘓！');
        }
      } else if (b.stage === 2) {
        const drums = this.bossMinions.filter(m => m.type === 'thunder_drum_anchor');
        if (drums.length === 0) {
          b.desperationActive = false;
          b.invulnerable = false;
          b.hp = Math.max(1, b.hp - b.maxHp * 0.08);
          b.stunTimer = 3.0;
          this.sound.playExplosion(true);
          this.shake(14, 0.45);
          this.cancelAllEnemyBullets('💥【靈能破盾】天雷法鼓崩壞！雷公受到 8% 電荷反噬並癱瘓 3.0 秒！');
        }
      } else if (b.stage === 3) {
        const mirrors = this.bossMinions.filter(m => m.type === 'gorgon_hex_mirror');
        if (mirrors.length === 0) {
          b.desperationActive = false;
          b.invulnerable = false;
          b.stunTimer = 3.0;
          this.sound.playExplosion(true);
          this.shake(14, 0.45);
          this.cancelAllEnemyBullets('💥【靈能破盾】三座蛇髮魔鏡全數粉碎！美杜莎陷入 3.0 秒重度眩暈！');
        }
      }
    }

    b.skillTimer += dt;
    b.ultimateTimer += dt;

    // 每 2.0 秒執行一輪專屬機制攻擊
    if (b.skillTimer >= 2.0) {
      b.skillTimer = 0;
      if (b.isMini) {
        this.executeMiniBossAttack(b);
      } else {
        this.executeBossUniqueAttack(b);
      }
    }

    // 大招預警 (每 14 秒一次，預警 2.8 秒)
    const ultCooldown = 14.0;
    if (b.ultimateTimer >= ultCooldown - 2.8 && !b.warningActive) {
      b.warningActive = true;
      b.ultVariant = (b.ultVariant === undefined ? 0 : (b.ultVariant + 1));
      const fallbackSkill = (b.name || '領主') + '・神格超載天罰';
      const ult = (b.ultimates && b.ultimates.length > 0)
        ? b.ultimates[b.ultVariant % b.ultimates.length]
        : { name: fallbackSkill, voiceLine: '' };
      this.showUltimateWarning(ult.name, ult.voiceLine);
    }
    if (b.ultimateTimer >= ultCooldown) {
      b.ultimateTimer = 0;
      b.warningActive = false;
      this.releaseBossUltimate(b);
    }

    // 雷公 Phase 2：每 3 秒引發全場磁暴，戰機強制停頓 0.5 秒
    if (b.stage === 2 && b.phase >= 2 && !b.dead && !b.dying) {
      b.shockCycleTimer = (b.shockCycleTimer || 0) + dt;
      if (b.shockCycleTimer >= 2.4 && !b.shockTelegraphed) {
        b.shockTelegraphed = true;
        this.showToast('⚡【九天磁暴預警】0.6 秒後天雷拘束！注意安全走位！');
        this.hazardTelegraphs.push({
          type: 'circle', x: this.player.x, y: this.player.y, r: 48,
          life: 0.6, color: 'rgba(56, 189, 248, 0.65)'
        });
      }
      if (b.shockCycleTimer >= 3.0) {
        b.shockCycleTimer = 0;
        b.shockTelegraphed = false;
        this.player.stunTimer = 0.5;
        this.sound.playLaser(1600);
        this.sound.vibrate([80, 50, 80]);
        this.showToast('⚡【九天磁暴拘束】戰機短路停頓 0.5 秒！');
      }
    }

    // 更新血條與副標題動態指示
    const pct = Math.max(0, b.hp / b.maxHp) * 100;
    document.getElementById('bossHpFill').style.width = pct + '%';
    document.getElementById('bossHpGhost').style.width = pct + '%';
    const subTitleEl = document.getElementById('bossSubTitle');
    if (subTitleEl) {
      if (b.stage === 1 && b.featherBarrierHp > 0) {
        subTitleEl.textContent = `🛡️ 金羽神盾: ${Math.round(b.featherBarrierHp)} / ${b.maxFeatherBarrierHp || 10000}`;
        subTitleEl.style.color = '#ffd700';
      } else if (b.stage === 2 && b.phase >= 2) {
        const shockIn = Math.max(0, 3.0 - (b.shockCycleTimer || 0)).toFixed(1);
        subTitleEl.textContent = `⚡ 磁暴拘束倒數: ${shockIn}s`;
        subTitleEl.style.color = '#38bdf8';
      } else if (b.stage === 3 && b.phase >= 2) {
        subTitleEl.textContent = this.player.gorgonSlowActive ? '🗿 石化凝視領域作用中 (移速 -50%)' : '✨ 石化融化中 (移速正常)';
        subTitleEl.style.color = '#d8b4fe';
      }
    }

    // 更新置頂戰術指示警報條 (Boss Tactical Alert，清晰告訴玩家現在機制與應對方案)
    const tacAlert = document.getElementById('bossTacticalAlert');
    if (tacAlert) {
      if (b.invulnerable && b.invulnTimer > 0) {
        tacAlert.style.display = 'block';
        if (b.stage === 1) {
          tacAlert.innerHTML = `🛡️ <b>【金羽神盾】Boss 無敵中 (${b.invulnTimer.toFixed(1)}s)</b> ➔ 🎯 <b>戰術指示：先擊破周圍 4 枚金色神羽錨點！</b>`;
        } else if (b.stage === 2) {
          tacAlert.innerHTML = `⚡ <b>【超導電牢】Boss 無敵中 (${b.invulnTimer.toFixed(1)}s)</b> ➔ 🎯 <b>戰術指示：先摧毀兩側天雷法鼓！</b>`;
        } else if (b.stage === 3) {
          tacAlert.innerHTML = `🪞 <b>【蛇髮魔鏡】鏡面反彈常規子彈</b> ➔ 🎯 <b>戰術指示：擊碎魔鏡或用貫穿光束/榴彈破壞！</b>`;
        } else {
          tacAlert.innerHTML = `🛡️ <b>【神聖無敵】防護罩展開中 (${b.invulnTimer.toFixed(1)}s)</b> ➔ 🎯 <b>戰術指示：閃避彈幕等待過載！</b>`;
        }
      } else if (b.stage === 3 && b.phase >= 2) {
        tacAlert.style.display = 'block';
        tacAlert.innerHTML = this.player.gorgonSlowActive
          ? `🐍 <b>【石化凝視】戰機移速 -50%</b> ➔ 🎯 <b>戰術指示：使用「金陽聚焦光束」熱能可暫時驅散石化！</b>`
          : `✨ <b>【石化暫時驅散】戰機移速正常</b> ➔ 🎯 <b>戰術指示：趁現在全力輸出！</b>`;
      } else if (b.stage === 1 && b.featherBarrierHp > 0) {
        tacAlert.style.display = 'block';
        tacAlert.innerHTML = `🛡️ <b>【金羽天罡神盾】吸收傷害中</b> ➔ 🎯 <b>戰術指示：集中火力全力打破護盾！</b>`;
      } else if (b.stage === 2 && b.phase >= 2) {
        tacAlert.style.display = 'block';
        const shockIn = Math.max(0, 3.0 - (b.shockCycleTimer || 0)).toFixed(1);
        tacAlert.innerHTML = `⚡ <b>【九天磁暴】倒數 ${shockIn}s</b> ➔ 🎯 <b>戰術指示：注意每 3 秒引發 0.5s 戰機短路拘束！</b>`;
      } else {
        tacAlert.style.display = 'none';
      }
    }
  }

  // 前哨神械 (Mini-Boss) 十大神話魔王招式巡迴武裝投影 (每輪依序巡迴 10 大 Boss 標誌性武裝)
  executeMiniBossAttack(boss) {
    boss.miniCycle = (boss.miniCycle || 0) + 1;
    const step = (boss.miniCycle - 1) % 10;
    const moveNames = [
      '【迦樓羅・金羽狂嵐】',
      '【雷公・九天落雷】',
      '【美杜莎・石化蛇鏡】',
      '【饕餮・熔岩噬火】',
      '【阿特拉斯・重力巨岩】',
      '【雅典娜・神聖金矛】',
      '【許德拉・九首酸泡】',
      '【獨眼巨人・天爐星火】',
      '【玉藻前・九尾妖火】',
      '【提亞瑪特・混沌創世】'
    ];
    this.showToast(`⚡ 前哨神械投影 ${moveNames[step]}`);

    switch (step) {
      case 0: // 迦樓羅：5 向 -> 3 向金羽風刃 (feather) (減少 30%)
        for (let i = -1; i <= 1; i++) {
          const ang = Math.PI / 2 + i * 0.45;
          const eb = new Bullet(boss.x, boss.y + 15, Math.cos(ang) * 190, Math.sin(ang) * 190, false, 1, 'feather');
          eb.color = '#ffd700'; eb.r = 7;
          this.ebullets.push(eb);
        }
        break;

      case 1: // 雷公：3 道 -> 2 道垂直落雷預警 + 閃電打擊 (thunder) (減少 30%)
        for (let k = 0; k < 2; k++) {
          const tx = 70 + k * (this.W - 140) + (Math.random() - 0.5) * 40;
          this.hazardTelegraphs.push({
            type: 'line', x1: tx, y1: 0, x2: tx, y2: this.H,
            life: 0.55, width: 22, color: 'rgba(56, 189, 248, 0.7)'
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playLaser(950);
            const eb = new Bullet(tx, 0, 0, 440, false, 1, 'thunder');
            eb.color = '#38bdf8'; eb.r = 8;
            this.ebullets.push(eb);
          }, 550);
        }
        break;

      case 2: // 美杜莎：8 向 -> 5 向蛇髮石化光線 (petrify_beam) (減少 30%)
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * Math.PI * 2 + (this.time * 0.5);
          const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 170, Math.sin(ang) * 170, false, 1, 'petrify_beam');
          eb.color = '#c054ff'; eb.r = 7;
          this.ebullets.push(eb);
        }
        break;

      case 3: // 饕餮：3 向熔岩火球 (fireball)
        for (let i = -1; i <= 1; i++) {
          const eb = new Bullet(boss.x, boss.y + 15, i * 65, 230, false, 1, 'fireball');
          eb.color = '#ff9138'; eb.r = 9;
          this.ebullets.push(eb);
        }
        break;

      case 4: // 阿特拉斯：重力巨岩下墜 + 碎裂 (boulder)
        const boulder = new Bullet(boss.x, boss.y, (Math.random() - 0.5) * 50, 180, false, 1, 'boulder');
        boulder.r = 16; boulder.color = '#f5bc38';
        this.ebullets.push(boulder);
        setTimeout(() => {
          if (!boulder.dead) {
            boulder.dead = true;
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2;
              const frag = new Bullet(boulder.x, boulder.y, Math.cos(a) * 210, Math.sin(a) * 210, false, 1, 'rock_fragment');
              frag.color = '#f5bc38'; frag.r = 5;
              this.ebullets.push(frag);
            }
          }
        }, 1100);
        break;

      case 5: // 雅典娜：直貫神聖金矛 (holy_spear)
        const spearX = this.player.x;
        this.hazardTelegraphs.push({
          type: 'line', x1: spearX, y1: 0, x2: spearX, y2: this.H,
          life: 0.6, width: 24, color: 'rgba(255, 215, 0, 0.7)'
        });
        setTimeout(() => {
          if (!boss || boss.dead) return;
          this.sound.playLaser(1100);
          const eb = new Bullet(spearX, 0, 0, 480, false, 1, 'holy_spear');
          eb.color = '#ffd700'; eb.r = 8;
          this.ebullets.push(eb);
        }, 600);
        break;

      case 6: // 許德拉：4 團酸性毒泡 (venom)
        for (let i = 0; i < 4; i++) {
          const vx = (i - 1.5) * 60;
          const eb = new Bullet(boss.x, boss.y + 15, vx, 190, false, 1, 'venom');
          eb.color = '#48e583'; eb.r = 7.5;
          this.ebullets.push(eb);
        }
        break;

      case 7: // 獨眼巨人：天爐熔火流星 (magma)
        for (let i = 0; i < 6; i++) {
          const ang = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          const spd = 160 + Math.random() * 80;
          const eb = new Bullet(boss.x, boss.y + 15, Math.cos(ang) * spd, Math.sin(ang) * spd, false, 1, 'magma');
          eb.color = '#ff4766'; eb.r = 6;
          this.ebullets.push(eb);
        }
        break;

      case 8: // 玉藻前：九尾妖火環繞發散 (foxfire)
        for (let i = 0; i < 9; i++) {
          const ang = this.time * 2.0 + (i / 9) * Math.PI * 2;
          const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 190, Math.sin(ang) * 190, false, 1, 'foxfire');
          eb.color = '#e0409a'; eb.r = 6;
          this.ebullets.push(eb);
        }
        break;

      case 9: // 提亞瑪特：原初混沌黑洞漩渦彈 (chaos)
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + (this.time * 0.4);
          const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'chaos');
          eb.color = '#b359ff'; eb.r = 7;
          this.ebullets.push(eb);
        }
        break;
    }
  }

  // 十大神話機神專屬特徵與神話機制攻擊
  executeBossUniqueAttack(boss) {
    const s = boss.stage || 1;
    boss.patternIndex = (boss.patternIndex || 0) + 1;
    const isPhase2 = boss.phase >= 2;

    switch (s) {
      case 1: // 迦樓羅・裂空王 (彈幕減少 30%)
        {
          const mode = boss.patternIndex % 3;
          if (mode === 0) {
            // 模式 1：神鳥羽刃旋風 (Feather Barrage) - 7 -> 5 枚金羽
            for (let i = -2; i <= 2; i++) {
              const ang = Math.PI / 2 + (i / 2) * 0.48;
              const spd = isPhase2 ? 220 : 180;
              const eb = new Bullet(boss.x, boss.y + 20, Math.cos(ang) * spd, Math.sin(ang) * spd, false, 1, 'feather');
              eb.color = '#ffd700';
              eb.driftPhase = i * 0.8;
              this.ebullets.push(eb);
            }
          } else if (mode === 1) {
            // 模式 2：一飛沖天 (Skyward Dive) - 預警線 + 直線衝刺 + 3 枚滯空金羽 (原5枚，減少30%)
            const targetX = this.player.x;
            this.hazardTelegraphs.push({
              type: 'line', x1: targetX, y1: 0, x2: targetX, y2: this.H,
              life: 1.0, width: 34, color: 'rgba(255, 71, 102, 0.5)'
            });
            setTimeout(() => {
              if (!boss || boss.dead) return;
              this.sound.playExplosion(false);
              this.shake(5, 0.22);
              for (let k = 0; k < 3; k++) {
                const fy = 150 + k * 120;
                const fb = new Bullet(targetX, fy, 0, 0, false, 1, 'floating_feather');
                fb.detonateTimer = 3.0;
                this.ebullets.push(fb);
              }
            }, 1000);
          } else {
            // 模式 3：裂空神爪 (Gale Claw Slices) - 雙十字交錯斬線 (6 -> 4 碎片)
            this.hazardTelegraphs.push({
              type: 'line', x1: 0, y1: 100, x2: this.W, y2: 460,
              life: 1.1, width: 24, color: 'rgba(245, 188, 56, 0.55)'
            });
            this.hazardTelegraphs.push({
              type: 'line', x1: this.W, y1: 100, x2: 0, y2: 460,
              life: 1.1, width: 24, color: 'rgba(245, 188, 56, 0.55)'
            });
            setTimeout(() => {
              if (!boss || boss.dead) return;
              for (let k = 0; k < 4; k++) {
                const eb = new Bullet(boss.x, boss.y + 15, (k - 1.5) * 65, 210, false, 1, 'feather_shard');
                eb.color = '#ff9138'; eb.r = 6;
                this.ebullets.push(eb);
              }
            }, 1100);
          }

          // 第二型態機制：召喚風神翼蛇，若未及時破壞將被迦樓羅吞噬回血 15%
          if (isPhase2 && boss.patternIndex % 4 === 0 && this.bossMinions.filter(m => m.type === 'garuda_viper').length === 0) {
            this.showToast('迦樓羅展開裂空雙翼，召喚 3 具風神翼蛇！若未阻截將被其吞噬回血！');
            for (let k = 0; k < 3; k++) {
              this.bossMinions.push({
                type: 'garuda_viper', name: '風神翼蛇',
                x: 60 + k * 120, y: 70, r: 18, hp: 280, maxHp: 280,
                vx: (k === 1 ? 0 : (k === 0 ? 50 : -50)), vy: 35, color: '#48e583'
              });
            }
          }
        }
        break;

      case 2: // 雷公・震霄 (彈幕減少 30%)
        {
          const mode = boss.patternIndex % 3;
          if (mode === 0) {
            // 模式 1：雷電五芒星陣 (Lightning Pentagram)
            const cx = this.W / 2, cy = 200, r = 100;
            const starPoints = [];
            for (let p = 0; p < 5; p++) {
              const ang = -Math.PI / 2 + p * (Math.PI * 2 / 5);
              starPoints.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
            }
            const starOrder = [0, 2, 4, 1, 3, 0];
            for (let p = 0; p < 5; p++) {
              const p1 = starPoints[starOrder[p]];
              const p2 = starPoints[starOrder[p + 1]];
              this.hazardTelegraphs.push({
                type: 'line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
                life: 1.3, width: 20, color: 'rgba(56, 189, 248, 0.65)'
              });
            }
            setTimeout(() => {
              if (!boss || boss.dead) return;
              this.sound.playLaser(1200);
              starPoints.forEach((pt) => {
                const ang = Math.atan2(this.player.y - pt.y, this.player.x - pt.x);
                const eb = new Bullet(pt.x, pt.y, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'thunder');
                eb.color = '#38bdf8'; eb.r = 7;
                this.ebullets.push(eb);
              });
            }, 1300);
          } else if (mode === 1) {
            // 模式 2：天頂驚雷劈 (原 10 道，減少 30% 為 7 道)
            for (let strike = 0; strike < 7; strike++) {
              setTimeout(() => {
                if (!boss || boss.dead) return;
                const tx = strike % 2 === 0
                  ? this.player.x + (Math.random() - 0.5) * 50
                  : 40 + Math.random() * (this.W - 80);
                this.hazardTelegraphs.push({
                  type: 'line', x1: tx, y1: 0, x2: tx, y2: this.H,
                  life: 0.45, width: 26, color: 'rgba(51, 224, 224, 0.7)'
                });
                setTimeout(() => {
                  if (!boss || boss.dead) return;
                  this.sound.playLaser(950);
                  const eb = new Bullet(tx, 0, 0, 440, false, 1, 'thunder_bolt');
                  eb.color = '#ffffff'; eb.r = 8;
                  this.ebullets.push(eb);
                }, 450);
              }, strike * 150);
            }
          } else {
            // 模式 3：雷鼓霹靂電網 (原 8 發，減少 30% 為 5 發)
            for (let a = 0; a < 5; a++) {
              const ang = (a / 5) * Math.PI * 2 + (boss.patternIndex * 0.25);
              const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 170, Math.sin(ang) * 170, false, 1, 'thunder');
              eb.color = '#67ffff'; eb.r = 6;
              this.ebullets.push(eb);
            }
          }

          // 召喚乾坤雙雷鼓結界
          if (!boss.hasSummonedDrums && this.bossMinions.filter(m => m.type === 'thunder_drum').length === 0) {
            boss.hasSummonedDrums = true;
            this.showToast('雷公召喚【乾坤雙雷鼓】結界！雷盾減傷 50%，打爆雙鼓以破除雷盾！');
            this.bossMinions.push({
              type: 'thunder_drum', name: '乾坤雷鼓(左)',
              x: 55, y: 170, r: 24, hp: 550, maxHp: 550, color: '#38bdf8'
            });
            this.bossMinions.push({
              type: 'thunder_drum', name: '乾坤雷鼓(右)',
              x: this.W - 55, y: 170, r: 24, hp: 550, maxHp: 550, color: '#38bdf8'
            });
          }
        }
        break;

      case 3: // 美杜莎・返照 (彈幕減少 30%)
        if (!isPhase2) {
          // 原 8 發，減少 30% 為 5 發
          for (let i = 0; i < 5; i++) {
            const ang = (i / 5) * Math.PI * 2 + (boss.patternIndex * 0.2);
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 160, Math.sin(ang) * 160, false, 1, 'mirror_bullet');
            eb.color = '#b359ff';
            this.ebullets.push(eb);
          }
        } else {
          // 第二型態：石化光環 + 蛇髮分身 (原 12 發，減少 30% 為 8 發)
          this.hazardTelegraphs.push({
            type: 'circle', x: this.player.x, y: this.player.y, r: 60, life: 1.4, color: 'rgba(179, 89, 255, 0.45)'
          });
          setTimeout(() => {
            for (let a = 0; a < 8; a++) {
              const ang = (a / 8) * Math.PI * 2;
              const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 190, Math.sin(ang) * 190, false, 1, 'petrify_beam');
              eb.color = '#d991ff'; eb.r = 7;
              this.ebullets.push(eb);
            }
          }, 1400);

          if (!boss.hasCloned && this.bossMinions.filter(m => m.type === 'gorgon_clone').length === 0) {
            boss.hasCloned = true;
            this.showToast('美杜莎蛇髮狂舞，分裂出 2 具戈爾貢蛇髮幻影！');
            this.bossMinions.push({
              type: 'gorgon_clone', name: '蛇髮幻影(左)',
              x: boss.x - 75, y: boss.y + 20, r: 22, hp: 450, maxHp: 450, color: '#b359ff'
            });
            this.bossMinions.push({
              type: 'gorgon_clone', name: '蛇髮幻影(右)',
              x: boss.x + 75, y: boss.y + 20, r: 22, hp: 450, maxHp: 450, color: '#b359ff'
            });
          }
        }
        break;

      case 4: // 饕餮・噬界 (Phase 2 召喚並吞噬貪食傀儡回血)
        this.player.targetY -= (isPhase2 ? 22 : 14); // 引力向 Boss 牽引
        this.particles.push(new Particle(this.W / 2, boss.y + 30, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#ff9138', 5, 0.4));
        const fireCount = isPhase2 ? 7 : 5;
        for (let i = 0; i < fireCount; i++) {
          const offset = (i - (fireCount - 1) / 2) * 45;
          const eb = new Bullet(boss.x, boss.y + 25, offset, 210 + Math.abs(offset) * 0.3, false, 1, 'fireball');
          eb.r = 8; eb.color = '#ff9138';
          this.ebullets.push(eb);
        }

        // 饕餮專屬神話機制：召喚暴食傀儡走入巨口，若未打爆則被吞噬回血！
        if (isPhase2 && boss.patternIndex % 3 === 0 && this.bossMinions.filter(m => m.type === 'taotie_food').length === 0) {
          this.showToast('⚠️ 饕餮張開噬界血口，召喚貪食傀儡！全力阻截，防止饕餮吞食回血！');
          for (let k = 0; k < 4; k++) {
            this.bossMinions.push({
              type: 'taotie_food', name: '貪食傀儡',
              x: 50 + k * 80, y: -20, r: 16, hp: 180, maxHp: 180,
              vx: 0, vy: 55, color: '#f5bc38',
              onDestroy: (game) => {
                game.sound.playExplosion(false);
                game.score += 200;
              }
            });
          }
        }
        break;

      case 5: // 阿特拉斯・墜星 (Phase 2 召喚擎天神柱)
        const boulder = new Bullet(boss.x, boss.y, (Math.random() - 0.5) * 60, 190, false, 1, 'boulder');
        boulder.r = 18; boulder.color = '#f5bc38';
        this.ebullets.push(boulder);
        setTimeout(() => {
          if (!boulder.dead) {
            boulder.dead = true;
            const fragCount = isPhase2 ? 12 : 8;
            for (let k = 0; k < fragCount; k++) {
              const a = (k / fragCount) * Math.PI * 2;
              const frag = new Bullet(boulder.x, boulder.y, Math.cos(a) * 220, Math.sin(a) * 220, false, 1, 'rock_fragment');
              frag.color = '#f5bc38';
              this.ebullets.push(frag);
            }
          }
        }, 1200);

        if (isPhase2 && !boss.hasSummonedPillars && this.bossMinions.filter(m => m.type === 'celestial_pillar').length === 0) {
          boss.hasSummonedPillars = true;
          this.showToast('阿特拉斯召喚【擎天神柱】重力鎖定戰場！8 秒內未打爆將引發隕石雨！');
          this.bossMinions.push({
            type: 'celestial_pillar', name: '擎天重力柱',
            x: this.W / 2, y: 190, r: 28, hp: 800, maxHp: 800, timer: 8.0, color: '#f5bc38',
            onExpire: (game, b) => {
              game.shake(12, 0.6);
              game.showToast('擎天柱坍縮！天崩地裂隕石雨爆發！');
              for (let m = 0; m < 18; m++) {
                const eb = new Bullet(Math.random() * game.W, 0, (Math.random() - 0.5) * 80, 280, false, 1, 'meteor');
                eb.color = '#ff9138'; eb.r = 10;
                game.ebullets.push(eb);
              }
            }
          });
        }
        break;

      case 6: // 雅典娜・聖裁 (Phase 2 召喚神聖甘露仙瓶，6秒未破回血 25%)
        const lanceCount = isPhase2 ? 9 : 6;
        for (let i = 0; i < lanceCount; i++) {
          const offset = (i - (lanceCount - 1) / 2) * 22;
          const eb = new Bullet(boss.x + offset, boss.y + 30, offset * 0.8, 250, false, 1, 'lance');
          eb.color = '#48e583'; eb.r = 6;
          this.ebullets.push(eb);
        }

        // 雅典娜神聖甘露仙瓶機制 (補血瓶機制！)
        if (isPhase2 && !boss.hasSummonedAmbrosia && this.bossMinions.filter(m => m.type === 'ambrosia_vessel').length === 0) {
          boss.hasSummonedAmbrosia = true;
          this.sound.playWarningAlert();
          this.showToast('⚠️ 雅典娜召喚【奧林帕斯神聖甘露仙瓶】！6 秒內未擊破將瞬間恢復 25% 生命！');
          this.bossMinions.push({
            type: 'ambrosia_vessel', name: '神聖甘露仙瓶',
            x: boss.x + 85, y: boss.y + 15, r: 24, hp: 750, maxHp: 750, timer: 6.0, color: '#48e583',
            onExpire: (game, b) => {
              // 未及時打破：雅典娜飲下神釀回血 25%！
              b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.25);
              b.invulnerable = true;
              b.invulnTimer = 2.5;
              game.sound.playCrit();
              game.showToast('雅典娜飲下神聖甘露！生命恢復 25% 並獲黃金霸體！');
            },
            onDestroy: (game, b) => {
              // 玩家及時打破仙瓶：甘露灑落為玩家回血與同步率！
              game.sound.playCrit();
              game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
              game.player.grazeSync = 100;
              game.showToast('神聖甘露仙瓶被擊碎！甘露灑落，玩家裝甲修復 +1，同步率滿載！');
              b.hp -= 400; // 雅典娜受到破瓶反噬
            }
          });
        }
        break;

      case 7: // 許德拉・淵毒 (Phase 2 斷首分裂出雙蛇首)
        const hydraWaves = isPhase2 ? 9 : 6;
        for (let i = 0; i < hydraWaves; i++) {
          const angle = Math.PI / 2 + (i - (hydraWaves - 1) / 2) * 0.25;
          const speed = 190 + (i % 2) * 40;
          const eb = new Bullet(boss.x, boss.y + 20, Math.cos(angle) * speed, Math.sin(angle) * speed, false, 1, 'venom');
          eb.color = '#48e583'; eb.r = 7;
          this.ebullets.push(eb);
        }

        // 許德拉斷首分裂神話機制
        if (isPhase2 && !boss.hasSplitHeads && this.bossMinions.filter(m => m.type === 'hydra_head').length === 0) {
          boss.hasSplitHeads = true;
          this.showToast('九頭蛇斷首分裂！兩側蛇首分身自主噴吐交叉毒酸！');
          this.bossMinions.push({
            type: 'hydra_head', name: '淵毒蛇首(左)',
            x: 55, y: 155, r: 22, hp: 650, maxHp: 650, color: '#48e583',
            onDestroy: (game, b) => {
              b.hp -= 350;
              game.showToast('左側毒蛇首被斬斷！九頭蛇受到巨額重創！');
            }
          });
          this.bossMinions.push({
            type: 'hydra_head', name: '淵毒蛇首(右)',
            x: this.W - 55, y: 155, r: 22, hp: 650, maxHp: 650, color: '#48e583',
            onDestroy: (game, b) => {
              b.hp -= 350;
              game.showToast('右側毒蛇首被斬斷！九頭蛇受到巨額重創！');
            }
          });
        }
        break;

      case 8: // 獨眼巨人・天爐 (Phase 2 召喚鍛造熔爐核心)
        this.hazardTelegraphs.push({
          type: 'line', x1: this.player.x, y1: 0, x2: this.player.x, y2: this.H,
          life: 1.3, width: 36, color: 'rgba(255, 145, 56, 0.5)'
        });
        setTimeout(() => {
          this.sound.playLaser(1300);
          for (let y = 100; y < this.H; y += 70) {
            const eb = new Bullet(this.player.x, y, (Math.random() - 0.5) * 60, 260, false, 1, 'slag');
            eb.color = '#ff9138'; eb.r = 8;
            this.ebullets.push(eb);
          }
        }, 1300);

        if (isPhase2 && !boss.hasSummonedForge && this.bossMinions.filter(m => m.type === 'forge_core').length === 0) {
          boss.hasSummonedForge = true;
          this.showToast('獨眼巨人展開【赫菲斯托斯鍛造熔爐】！破壞熔爐使其過載癱瘓！');
          this.bossMinions.push({
            type: 'forge_core', name: '鍛造熔爐',
            x: this.W / 2, y: 120, r: 26, hp: 850, maxHp: 850, color: '#ff4766',
            onDestroy: (game, b) => {
              game.sound.playExplosion(true);
              b.invulnerable = false;
              b.invulnTimer = 0;
              b.hp -= 500;
              game.showToast('鍛造熔爐引爆過載！獨眼巨人陷入癱瘓！');
            }
          });
        }
        break;

      case 9: // 玉藻前・幻械 (Phase 2 召喚殺生石與魅影分身)
        const tails = isPhase2 ? 14 : 9;
        for (let i = 0; i < tails; i++) {
          const ang = this.time * 2.0 + (i / tails) * Math.PI * 2;
          const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 200, Math.sin(ang) * 200, false, 1, 'foxfire');
          eb.color = '#e0409a'; eb.r = 6.5;
          this.ebullets.push(eb);
        }

        if (isPhase2 && !boss.hasSummonedSessho && this.bossMinions.filter(m => m.type === 'sessho_seki').length === 0) {
          boss.hasSummonedSessho = true;
          this.showToast('玉藻前祭出【殺生石】並化出九尾妖狐幻影！速破殺生石以辨真身！');
          this.bossMinions.push({
            type: 'sessho_seki', name: '殺生石',
            x: this.W / 2, y: 180, r: 24, hp: 700, maxHp: 700, color: '#e0409a',
            onDestroy: (game, b) => {
              game.sound.playCrit();
              b.hp -= 400;
              game.showToast('殺生石碎裂！妖狐幻影消散，玉藻前真身現形！');
            }
          });
        }
        break;

      case 10: // 提亞瑪特・混沌母艦 (Phase 2 產下混沌龍卵，限時孵化)
        const chaosCount = isPhase2 ? 18 : 12;
        const colors = ['#67ffff', '#ff4766', '#f5bc38', '#48e583', '#b359ff'];
        for (let i = 0; i < chaosCount; i++) {
          const ang = (i / chaosCount) * Math.PI * 2 + (boss.patternIndex * 0.15);
          const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 220, Math.sin(ang) * 220, false, 1, 'chaos');
          eb.color = colors[i % colors.length];
          eb.r = 7;
          this.ebullets.push(eb);
        }
        if (isPhase2) this.shake(5, 0.25);

        if (isPhase2 && boss.patternIndex % 4 === 0 && this.bossMinions.filter(m => m.type === 'chaos_egg').length === 0) {
          this.showToast('⚠️ 提亞瑪特產下【混沌龍卵】！7 秒內速破龍卵，阻止幼龍獻祭核爆！');
          for (let k = 0; k < 3; k++) {
            this.bossMinions.push({
              type: 'chaos_egg', name: `混沌龍卵 ${k+1}`,
              x: 65 + k * 110, y: 150, r: 20, hp: 420, maxHp: 420, timer: 7.0, color: '#b359ff',
              onExpire: (game, b) => {
                game.shake(14, 0.7);
                game.showToast('混沌幼龍破卵而出！向提亞瑪特獻祭引爆滅世核波！');
                for (let a = 0; a < 16; a++) {
                  const ang = (a / 16) * Math.PI * 2;
                  const eb = new Bullet(65 + k * 110, 150, Math.cos(ang) * 240, Math.sin(ang) * 240, false, 1, 'chaos_nova');
                  eb.color = '#ff4766'; eb.r = 8;
                  game.ebullets.push(eb);
                }
              }
            });
          }
        }
        break;

      default:
        for (let i = 0; i < 12; i++) {
          const ang = this.time * 2.5 + (i / 12) * Math.PI * 2;
          const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 200, Math.sin(ang) * 200, false, 1, 'spiral');
          eb.color = '#ff4766';
          this.ebullets.push(eb);
        }
        break;
    }
  }

  showUltimateWarning(name, voiceLine) {
    const banner = document.getElementById('ultimateWarning');
    const bossName = this.currentBoss ? this.currentBoss.name : '神話領主';
    const titleEl = document.getElementById('warningTitle');
    if (titleEl) {
      titleEl.textContent = `【${bossName}】發動神話大招：${name}！`;
    }
    banner.style.display = 'flex';
    this.sound.playBossUltimateWarning(this.currentBoss ? this.currentBoss.stage : 1);
    setTimeout(() => {
      banner.style.display = 'none';
    }, 2800);
  }

  releaseBossUltimate(boss) {
    const s = boss.stage || 1;
    this.sound.playBossUltimateCast(s);
    this.shake(12, 0.45);
    this.screenFlashAlpha = 0.55;
    const variant = (boss.ultVariant !== undefined) ? (boss.ultVariant % 2) : 0;

    switch (s) {
      case 1: { // 迦樓羅 (大招彈幕減少 30%)
        if (variant === 0) {
          // 大招 1：羽化流星天罰 (漫天金羽瀑布 + 3 枚滯空金羽炸彈，原24發/4枚減少30%)
          const featherCount = 16;
          for (let i = 0; i < featherCount; i++) {
            setTimeout(() => {
              if (!boss || boss.dead) return;
              const x = 30 + Math.random() * (this.W - 60);
              const eb = new Bullet(x, boss.y + 20, (Math.random() - 0.5) * 40, 200 + Math.random() * 50, false, 1, 'feather_storm');
              eb.color = '#ffd700';
              eb.driftPhase = Math.random() * Math.PI * 2;
              this.ebullets.push(eb);
            }, i * 60);
          }
          for (let k = 0; k < 3; k++) {
            const fx = 60 + k * 105;
            const fy = 200 + (k % 2) * 120;
            const fb = new Bullet(fx, fy, 0, 0, false, 1, 'floating_feather');
            fb.detonateTimer = 3.0;
            this.ebullets.push(fb);
          }
        } else {
          // 新增大招 2：暴風神喙・萬里穿雲擊 (左右風暴封鎖 + 穿雲俯衝風刃爆發，原8發減少30%為5發)
          this.hazardTelegraphs.push({
            type: 'line', x1: 30, y1: 0, x2: 30, y2: this.H,
            life: 1.2, width: 36, color: 'rgba(255, 215, 0, 0.5)'
          });
          this.hazardTelegraphs.push({
            type: 'line', x1: this.W - 30, y1: 0, x2: this.W - 30, y2: this.H,
            life: 1.2, width: 36, color: 'rgba(255, 215, 0, 0.5)'
          });
          const targetX = this.player.x;
          this.hazardTelegraphs.push({
            type: 'line', x1: targetX, y1: 0, x2: targetX, y2: this.H,
            life: 1.0, width: 50, color: 'rgba(255, 71, 102, 0.65)'
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playLaser(1300);
            this.shake(14, 0.5);
            for (let a = 0; a < 5; a++) {
              const ang = (a / 5) * Math.PI * 2;
              const eb = new Bullet(targetX, 250, Math.cos(ang) * 240, Math.sin(ang) * 240, false, 1, 'feather');
              eb.color = '#ffd700'; eb.r = 8;
              this.ebullets.push(eb);
            }
          }, 1000);
        }
        break;
      }
      case 2: { // 雷公 (大招彈幕減少 30%)
        if (variant === 0) {
          // 大招 1：九天雷霆萬鈞 (全屏天頂交錯雷網 + 五芒星雷爆，原4道/20發減少30%為3道/13發)
          for (let k = 0; k < 3; k++) {
            const ly = 150 + k * 130;
            this.hazardTelegraphs.push({
              type: 'line', x1: 0, y1: ly, x2: this.W, y2: ly,
              life: 1.0, width: 22, color: 'rgba(56, 189, 248, 0.65)'
            });
            setTimeout(() => {
              for (let x = 20; x < this.W; x += 55) {
                const eb = new Bullet(x, ly, 0, 220, false, 1, 'thunder_bolt');
                eb.color = '#67ffff'; eb.r = 6;
                this.ebullets.push(eb);
              }
            }, 1000);
          }
          for (let i = 0; i < 13; i++) {
            const ang = (i / 13) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'thunder');
            eb.color = '#38bdf8'; eb.r = 7;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：乾坤雷煞・雷暴核心超載 (環狀雷球電弧 + 十字落雷裂隙，原16發減少30%為11發)
          const cx = boss.x, cy = boss.y;
          this.hazardTelegraphs.push({
            type: 'line', x1: cx, y1: 0, x2: cx, y2: this.H,
            life: 1.2, width: 30, color: 'rgba(56, 189, 248, 0.7)'
          });
          this.hazardTelegraphs.push({
            type: 'line', x1: 0, y1: cy, x2: this.W, y2: cy,
            life: 1.2, width: 30, color: 'rgba(56, 189, 248, 0.7)'
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playLaser(1400);
            this.shake(14, 0.5);
            for (let a = 0; a < 11; a++) {
              const ang = (a / 11) * Math.PI * 2;
              const eb = new Bullet(cx, cy, Math.cos(ang) * 230, Math.sin(ang) * 230, false, 1, 'thunder');
              eb.color = '#ffffff'; eb.r = 7;
              this.ebullets.push(eb);
            }
          }, 1200);
        }
        break;
      }
      case 3: { // 美杜莎 (大招彈幕減少 30%)
        if (variant === 0) {
          // 大招 1：顧影自憐・萬蛇鏡界 (原20發減少30%為14發紫色旋轉鏡面光束)
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 190, Math.sin(ang) * 190, false, 1, 'petrify_beam');
            eb.color = '#d991ff'; eb.r = 7.5;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：邪眼凝視・深淵石化射線 (原14發減少30%為9發毒晶碎屑)
          this.hazardTelegraphs.push({
            type: 'circle', x: this.player.x, y: this.player.y, r: 80,
            life: 1.3, color: 'rgba(179, 89, 255, 0.55)'
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playCrit();
            for (let k = 0; k < 9; k++) {
              const ang = (k / 9) * Math.PI * 2;
              const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'petrify_beam');
              eb.color = '#c054ff'; eb.r = 7;
              this.ebullets.push(eb);
            }
          }, 1300);
        }
        break;
      }
      case 4: { // 饕餮
        if (variant === 0) {
          // 大招 1：萬物同喰・噬天黑洞 (中心強大引力吸引戰機並環形射出 16 顆重力黑洞彈)
          this.singularities.push({
            x: this.W / 2, y: 220, r: 40, pullRadius: 260, duration: 4.5, maxDuration: 4.5, isPlayer: false
          });
          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 190, Math.sin(ang) * 190, false, 1, 'fireball');
            eb.color = '#ff9138'; eb.r = 8;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：暴食狂宴・混沌嘔火熔流 (3 波重力熔岩彈 + 地面遺留高溫熔岩領域)
          for (let wave = 0; wave < 3; wave++) {
            setTimeout(() => {
              if (!boss || boss.dead) return;
              this.sound.playExplosion(false);
              for (let i = -2; i <= 2; i++) {
                const ang = Math.PI / 2 + (i / 2) * 0.4;
                const eb = new Bullet(boss.x, boss.y + 20, Math.cos(ang) * 220, Math.sin(ang) * 220, false, 1, 'fireball');
                eb.color = '#ff4766'; eb.r = 8.5;
                this.ebullets.push(eb);
              }
            }, wave * 350);
          }
          this.lavaPools.push({ x: this.player.x, y: this.H - 120, r: 65, duration: 4.0, maxDuration: 4.0, isPlayer: false });
        }
        break;
      }
      case 5: { // 阿特拉斯
        if (variant === 0) {
          // 大招 1：泰坦重壓・地動山搖 (全屏重力壓頂 + 12 塊巨岩碎屑)
          this.shake(16, 0.6);
          for (let i = 0; i < 12; i++) {
            const x = 30 + Math.random() * (this.W - 60);
            const eb = new Bullet(x, 40, (Math.random() - 0.5) * 50, 220 + Math.random() * 60, false, 1, 'boulder');
            eb.color = '#f5bc38'; eb.r = 10;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：墜星天罰・億萬流星雨 (召喚天外巨型隕石於半空中殉爆)
          for (let m = 0; m < 2; m++) {
            const mx = (m === 0 ? this.W * 0.35 : this.W * 0.65);
            const meteor = new Bullet(mx, 20, 0, 160, false, 1, 'boulder');
            meteor.r = 24; meteor.color = '#ff9138';
            this.ebullets.push(meteor);
            setTimeout(() => {
              if (!meteor.dead) {
                meteor.dead = true;
                this.sound.playExplosion(true);
                this.shake(14, 0.4);
                for (let k = 0; k < 16; k++) {
                  const ang = (k / 16) * Math.PI * 2;
                  const frag = new Bullet(meteor.x, meteor.y, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'rock_shard');
                  frag.color = '#f5bc38'; frag.r = 6;
                  this.ebullets.push(frag);
                }
              }
            }, 1000);
          }
        }
        break;
      }
      case 6: { // 雅典娜
        if (variant === 0) {
          // 大招 1：長槍貫日・絕對聖裁 (金色長槍神光 + 浮游砲齊射)
          const px = this.player.x;
          this.hazardTelegraphs.push({
            type: 'line', x1: px, y1: 0, x2: px, y2: this.H,
            life: 1.1, width: 34, color: 'rgba(255, 215, 0, 0.75)'
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playLaser(1300);
            for (let y = 50; y < this.H; y += 40) {
              const eb = new Bullet(px, y, 0, 360, false, 1, 'holy_spear');
              eb.color = '#ffd700'; eb.r = 7.5;
              this.ebullets.push(eb);
            }
          }, 1100);
        } else {
          // 新增大招 2：智慧法陣・聖光十字誅絕 (金色雙十字預警 + 神聖星環爆發)
          const cx = this.W / 2, cy = 240;
          this.hazardTelegraphs.push({
            type: 'line', x1: cx, y1: 0, x2: cx, y2: this.H,
            life: 1.2, width: 28, color: 'rgba(255, 215, 0, 0.7)'
          });
          this.hazardTelegraphs.push({
            type: 'line', x1: 0, y1: cy, x2: this.W, y2: cy,
            life: 1.2, width: 28, color: 'rgba(255, 215, 0, 0.7)'
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playCrit();
            for (let a = 0; a < 20; a++) {
              const ang = (a / 20) * Math.PI * 2;
              const eb = new Bullet(cx, cy, Math.cos(ang) * 220, Math.sin(ang) * 220, false, 1, 'divine_ring');
              eb.color = '#ffffff'; eb.r = 7;
              this.ebullets.push(eb);
            }
          }, 1200);
        }
        break;
      }
      case 7: { // 許德拉
        if (variant === 0) {
          // 大招 1：九首死靈・毒沼暴湧 (8 團深淵劇毒酸泡落地擴散)
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y + 20, Math.cos(ang) * 180, Math.sin(ang) * 180, false, 1, 'venom');
            eb.color = '#48e583'; eb.r = 8;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：九首齊鳴・滅世腐蝕毒濤 (九蛇首同時噴射 18 道交叉正弦毒波)
          for (let i = 0; i < 18; i++) {
            setTimeout(() => {
              if (!boss || boss.dead) return;
              const ang = Math.PI / 2 + Math.sin(i * 0.45) * 0.6;
              const eb = new Bullet(boss.x, boss.y + 25, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'venom');
              eb.color = '#22c55e'; eb.r = 7.5;
              this.ebullets.push(eb);
            }, i * 70);
          }
        }
        break;
      }
      case 8: { // 獨眼巨人
        if (variant === 0) {
          // 大招 1：赫菲斯托斯・滅世掃蕩 (360 度旋轉天爐光束)
          for (let i = 0; i < 22; i++) {
            const ang = (i / 22) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 220, Math.sin(ang) * 220, false, 1, 'magma');
            eb.color = '#ff4766'; eb.r = 7;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：巨神重錘・震地熔岩碎裂波 (地面猛烈噴發 4 道垂直熔火柱)
          for (let col = 0; col < 4; col++) {
            const fx = 45 + col * (this.W - 90) / 3;
            this.hazardTelegraphs.push({
              type: 'line', x1: fx, y1: this.H, x2: fx, y2: 0,
              life: 1.1, width: 28, color: 'rgba(255, 71, 102, 0.7)'
            });
            setTimeout(() => {
              if (!boss || boss.dead) return;
              this.sound.playLaser(1100);
              for (let y = this.H; y > 150; y -= 50) {
                const eb = new Bullet(fx, y, (Math.random() - 0.5) * 40, -280, false, 1, 'slag');
                eb.color = '#ff9138'; eb.r = 8;
                this.ebullets.push(eb);
              }
            }, 1100);
          }
        }
        break;
      }
      case 9: { // 玉藻前
        if (variant === 0) {
          // 大招 1：九尾妖火・媚影迷蹤 (18 發粉紫狐火迴旋)
          for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 200, Math.sin(ang) * 200, false, 1, 'foxfire');
            eb.color = '#e0409a'; eb.r = 7;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：殺生結界・八面魅影幻滅 (召喚 4 具殘影交錯齊射幽冥狐火光刃)
          const offsets = [
            { x: 50, y: 150 }, { x: this.W - 50, y: 150 },
            { x: 70, y: 320 }, { x: this.W - 70, y: 320 }
          ];
          offsets.forEach(pt => {
            this.hazardTelegraphs.push({
              type: 'circle', x: pt.x, y: pt.y, r: 35, life: 1.2, color: 'rgba(224, 64, 154, 0.6)'
            });
          });
          setTimeout(() => {
            if (!boss || boss.dead) return;
            this.sound.playLaser(1250);
            offsets.forEach(pt => {
              const ang = Math.atan2(this.player.y - pt.y, this.player.x - pt.x);
              for (let d = -1; d <= 1; d++) {
                const eb = new Bullet(pt.x, pt.y, Math.cos(ang + d * 0.25) * 240, Math.sin(ang + d * 0.25) * 240, false, 1, 'foxfire');
                eb.color = '#f472b6'; eb.r = 7;
                this.ebullets.push(eb);
              }
            });
          }, 1200);
        }
        break;
      }
      case 10: { // 提亞瑪特
        if (variant === 0) {
          // 大招 1：創世終焉・萬象歸虛 (全屏十字毀滅星光 + 24 發五彩混沌龍息)
          for (let i = 0; i < 24; i++) {
            const ang = (i / 24) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 220, Math.sin(ang) * 220, false, 1, 'chaos');
            eb.color = ['#67ffff', '#ff4766', '#f5bc38', '#48e583', '#b359ff'][i % 5];
            eb.r = 8;
            this.ebullets.push(eb);
          }
        } else {
          // 新增大招 2：虛數深淵・維度坍縮黑星 (召喚 2 顆雙子黑洞拋射反物質泯滅碎星)
          this.singularities.push({
            x: this.W * 0.3, y: 200, r: 36, pullRadius: 220, duration: 4.0, maxDuration: 4.0, isPlayer: false
          });
          this.singularities.push({
            x: this.W * 0.7, y: 200, r: 36, pullRadius: 220, duration: 4.0, maxDuration: 4.0, isPlayer: false
          });
          for (let i = 0; i < 20; i++) {
            const ang = (i / 20) * Math.PI * 2;
            const eb = new Bullet(boss.x, boss.y, Math.cos(ang) * 210, Math.sin(ang) * 210, false, 1, 'chaos');
            eb.color = '#a855f7'; eb.r = 8;
            this.ebullets.push(eb);
          }
        }
        break;
      }
      default: {
        const count = 24 + this.knowledgePressure * 2;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = 220;
          const eb = new Bullet(boss.x, boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed, false, 1, 'ult_bullet');
          eb.r = 7;
          eb.color = '#ff4766';
          this.ebullets.push(eb);
        }
      }
    }
  }

  // ============================================================
  // 神話 Boss 專屬神話機制直接觸發 (LAB 調測與自發戰略)
  // ============================================================
  triggerBossMythicMechanic(boss) {
    if (!boss || boss.dead) {
      this.showToast('場上無活躍 Boss，請先生成 Boss！');
      return;
    }
    const s = boss.stage || 1;
    this.sound.playWarningAlert();

    switch (s) {
      case 1: // 迦樓羅・裂空王：召喚風神翼蛇機兵 (若場上有翼蛇則吞食狂暴回血)
        if (this.bossMinions.some(m => m.type === 'garuda_viper')) {
          this.bossMinions = this.bossMinions.filter(m => m.type !== 'garuda_viper');
          boss.hp = Math.min(boss.maxHp, boss.hp + Math.round(boss.maxHp * 0.15));
          this.sound.playExplosion(true);
          this.sound.speak('迦樓羅：吞噬生靈，雙翼化為裂空金焰！');
          this.showToast('🦅 迦樓羅吞噬翼蛇機兵，回復 15% 生命並狂暴！');
          this.showBossHUD(boss);
        } else {
          this.sound.speak('迦樓羅：裂空神鳥，群蛇降臨！');
          this.showToast('🦅 迦樓羅召喚 3 具【風神翼蛇】機兵！');
          for (let k = 0; k < 3; k++) {
            this.bossMinions.push({
              type: 'garuda_viper', name: '風神翼蛇',
              x: 60 + k * 140, y: 80, r: 18, hp: 320, maxHp: 320,
              vx: (k === 1 ? 0 : (k === 0 ? 60 : -60)), vy: 40, color: '#48e583'
            });
          }
        }
        break;

      case 2: // 雷公・震霄：召喚雙子乾坤雷鼓結界
        this.bossMinions = this.bossMinions.filter(m => m.type !== 'thunder_drum');
        this.sound.speak('雷公：乾坤雷鼓，震懾蒼穹！');
        this.showToast('⚡ 雷公召喚【乾坤雷鼓】結界！雷盾減傷 50%，速破雙鼓！');
        this.bossMinions.push({
          type: 'thunder_drum', name: '乾坤雷鼓(左)',
          x: 55, y: 170, r: 24, hp: 600, maxHp: 600, color: '#38bdf8'
        });
        this.bossMinions.push({
          type: 'thunder_drum', name: '乾坤雷鼓(右)',
          x: this.W - 55, y: 170, r: 24, hp: 600, maxHp: 600, color: '#38bdf8'
        });
        break;

      case 3: // 美杜莎・返照：蛇鏡凝視 + 召喚石化殘影分身
        this.sound.speak('美杜莎：直視我的蛇瞳，化為永恆的石雕吧！');
        this.showToast('🐍 美杜莎啟動【蛇鏡石化凝視】並製造 2 具殘影分身！');
        this.bossMinions.push({
          type: 'gorgon_shadow', name: '石化殘影(左)',
          x: boss.x - 90, y: boss.y + 40, r: 28, hp: 450, maxHp: 450, color: '#9d4edd'
        });
        this.bossMinions.push({
          type: 'gorgon_shadow', name: '石化殘影(右)',
          x: boss.x + 90, y: boss.y + 40, r: 28, hp: 450, maxHp: 450, color: '#9d4edd'
        });
        this.screenFlashAlpha = 0.6;
        break;

      case 4: // 饕餮・萬喰：吞噬黑洞 + 召喚暴食傀儡走向巨口
        this.sound.speak('饕餮：天地萬物，皆為我腹中之糧！');
        this.showToast('👹 饕餮張開深淵巨口！召喚 4 具暴食機甲傀儡，未擊毀將被其吞噬回血！');
        for (let i = 0; i < 4; i++) {
          this.bossMinions.push({
            type: 'taotie_food', name: '暴食傀儡',
            x: 50 + i * 100, y: 560, r: 16, hp: 220, maxHp: 220,
            vx: 0, vy: -55, color: '#ff4766'
          });
        }
        break;

      case 5: // 阿特拉斯・墜星：天穹重力扭曲 + 召喚引力星核
        this.sound.speak('阿特拉斯：承受萬鈞星穹之重吧！');
        this.showToast('🪐 阿特拉斯引爆【天穹引力星核】！引力牽引與流星雨啟動！');
        for (let m = 0; m < 5; m++) {
          setTimeout(() => {
            if (this.currentBoss) {
              const tx = 40 + Math.random() * (this.W - 80);
              this.hazardTelegraphs.push({
                type: 'circle', x: tx, y: 400 + Math.random() * 200, r: 45, life: 1.5, color: 'rgba(245, 188, 56, 0.6)'
              });
            }
          }, m * 300);
        }
        break;

      case 6: // 雅典娜・神盾：召喚聖光甘露仙瓶 (未及時打破則回血 35%)
        this.bossMinions = this.bossMinions.filter(m => m.type !== 'elixir_flask');
        this.sound.speak('雅典娜：奧林匹斯之甘露，治癒神祇！');
        this.showToast('🏺 雅典娜召喚【甘露仙瓶】！6 秒內未打破將回復 Boss 35% HP！');
        this.bossMinions.push({
          type: 'elixir_flask', name: '甘露仙瓶',
          x: this.W / 2, y: 220, r: 24, hp: 380, maxHp: 380,
          timer: 6.0, color: '#48e583',
          onExpire: (g, currentBoss) => {
            if (currentBoss && !currentBoss.dead) {
              const heal = Math.round(currentBoss.maxHp * 0.35);
              currentBoss.hp = Math.min(currentBoss.maxHp, currentBoss.hp + heal);
              g.sound.playCrit();
              g.showToast(`✨ 甘露仙瓶生效！${currentBoss.name} 回復了 ${heal} 點生命！`);
              g.damageNumbers.push(new DamageNumber(currentBoss.x, currentBoss.y, `+${heal}`, false, true));
              g.showBossHUD(currentBoss);
            }
          }
        });
        break;

      case 7: // 許德拉・再生：九頭蛇毒首分裂
        this.sound.speak('許德拉：斬斷一首，再生二首！');
        this.showToast('🐉 許德拉分裂出 3 具劇毒蛇首要塞，展開毒液交錯掃射！');
        for (let k = 0; k < 3; k++) {
          this.bossMinions.push({
            type: 'hydra_head', name: `毒首 #${k + 1}`,
            x: 70 + k * 130, y: 150, r: 22, hp: 500, maxHp: 500,
            vx: (k === 1 ? 0 : (k === 0 ? 40 : -40)), vy: 0, color: '#48e583'
          });
        }
        break;

      case 8: // 獨眼巨人・天爐：熔爐地火噴發 + 火山岩漿池
        this.sound.speak('獨眼巨人：天爐之火，焚盡世間凡物！');
        this.showToast('🔥 獨眼巨人開啟【天爐熔岩噴射】！戰場蔓延高熱熔岩池！');
        for (let i = 0; i < 4; i++) {
          this.lavaPools.push({
            x: 60 + i * 100, y: 450 + (i % 2) * 80, r: 42,
            damage: 25, duration: 8.0, color: 'rgba(255, 100, 30, 0.7)'
          });
        }
        break;

      case 9: // 玉藻前・幻械：九尾天狐幻象 + 妖火封鎖
        this.sound.speak('玉藻前：九尾迷離，虛實莫測～');
        this.showToast('🦊 玉藻前展開【九尾狐火迷津】！召喚 2 具幻狐真影！');
        this.bossMinions.push({
          type: 'gorgon_shadow', name: '幻狐機甲(左)',
          x: boss.x - 110, y: boss.y + 30, r: 26, hp: 520, maxHp: 520, color: '#ff4766'
        });
        this.bossMinions.push({
          type: 'gorgon_shadow', name: '幻狐機甲(右)',
          x: boss.x + 110, y: boss.y + 30, r: 26, hp: 520, maxHp: 520, color: '#ff4766'
        });
        break;

      case 10: // 提亞瑪特・混沌母艦：創世混沌黑洞 + 混沌龍卵孵化
        this.sound.speak('提亞瑪特：原初之混沌，重塑寰宇宇宙！');
        this.showToast('🌌 提亞瑪特釋放【創世混沌黑洞】！吸引力場與混沌龍卵啟動！');
        for (let i = 0; i < 2; i++) {
          this.bossMinions.push({
            type: 'taotie_food', name: `混沌龍卵 #${i + 1}`,
            x: 100 + i * 200, y: 190, r: 22, hp: 650, maxHp: 650,
            vx: 0, vy: 25, color: '#b359ff'
          });
        }
        break;
    }
  }

  // ============================================================
  // 答題與升級整備
  // ============================================================
  startQuizPhase() {
    this.state = 'quiz';
    this.resetPlayerStatusEffects();
    this.quizQueue = this.dataStore.pickAdaptiveQuestions(5, this.stage || 1);
    this.quizCorrectCount = 0;
    this.showNextQuestion();
  }

  showNextQuestion() {
    if (this.quizQueue.length === 0) {
      this.endQuizPhase();
      return;
    }

    this.currentQuiz = this.quizQueue.shift();
    const q = this.currentQuiz;
    const screen = document.getElementById('quizScreen');
    screen.classList.remove('hidden');

    document.getElementById('quizQuestion').textContent = q.question;
    document.getElementById('quizSubjectBadge').textContent = q.subject || '國語文';
    document.getElementById('quizSkillBadge').textContent = q.skill || '語文素養';
    
    const revBadge = document.getElementById('quizReviewBadge');
    const peerBadge = document.getElementById('quizPeerBadge');
    if (q.isRevenge) {
      if (revBadge) {
        revBadge.style.display = 'inline-block';
        revBadge.textContent = '錯題復仇';
      }
      if (peerBadge) peerBadge.style.display = 'none';
    } else if (q.isPeerMistake) {
      if (peerBadge) {
        peerBadge.style.display = 'inline-block';
        peerBadge.textContent = '💡 同儕易錯重點題';
      }
      if (revBadge) revBadge.style.display = 'none';
    } else {
      if (revBadge) revBadge.style.display = 'none';
      if (peerBadge) peerBadge.style.display = 'none';
    }

    const diffStars = '★'.repeat(q.difficulty) + '☆'.repeat(Math.max(0, 3 - q.difficulty));
    document.getElementById('quizDiff').textContent = diffStars;

    const optsContainer = document.getElementById('quizOpts');
    optsContainer.innerHTML = '';
    const keys = ['A', 'B', 'C', 'D'];
    q.opts.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.innerHTML = `<span class="opt-key">${keys[idx]}</span><span>${optText}</span>`;
      btn.onclick = () => this.handleAnswer(idx);
      optsContainer.appendChild(btn);
    });

    const expBox = document.getElementById('quizExplain');
    expBox.style.display = 'none';
    expBox.textContent = '';

    this.quizTimer = this.quizTimerMax;
  }

  handleAnswer(selectedIdx) {
    if (this.state !== 'quiz' || !this.currentQuiz) return;
    const q = this.currentQuiz;
    const isCorrect = selectedIdx === q.ans;
    const btns = document.querySelectorAll('.opt-btn');

    // 檢查是否為「舊錯題重複答錯」
    const sid = (this.dataStore && this.dataStore.currentStudentId) || 'S0001';
    const sidMap = this.dataStore ? this.dataStore.getStudentProgressMap(sid) : {};
    const prevP = sidMap[q.question_id];
    const isRepeatedWrong = !isCorrect && prevP && prevP.wrong >= 1;

    this.sessionTotalAnswered = (this.sessionTotalAnswered || 0) + 1;
    if (isCorrect) {
      this.sessionTotalCorrect = (this.sessionTotalCorrect || 0) + 1;
      this.quizCorrectCount++;
      btns[selectedIdx].classList.add('correct');
      this.sound.playLaser(1100);
      this.score += 300;
      if (q.isRevenge) {
        this.knowledgePressure = Math.max(0, this.knowledgePressure - 1);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        this.showToast('✨ 錯題雪恥成功！知識壓力 -1，裝甲修復 +1');
      }
    } else {
      btns[selectedIdx].classList.add('wrong');
      btns[q.ans].classList.add('correct');
      this.sound.playExplosion(false);

      if (isRepeatedWrong) {
        // 重複答錯嚴重懲罰：結算評級額外扣減 1 題！
        this.quizCorrectCount = Math.max(0, this.quizCorrectCount - 1);
        this.knowledgePressure = Math.min(10, this.knowledgePressure + 2);
        this.sound.playWarningAlert();
        this.shake(12, 0.45);
        this.showToast('⚠️ 舊錯題重複答錯！【重度懲罰】：結算評級額外扣減 1 題！');
      } else {
        this.knowledgePressure = Math.min(10, this.knowledgePressure + 1);
      }
    }

    this.dataStore.recordAttempt({
      question_id: q.question_id,
      question: q.question,
      selected_option: 'ABCD'[selectedIdx],
      correct: isCorrect,
      timestamp: new Date().toISOString(),
      stage: this.stage,
      boss_name: this.currentBoss ? this.currentBoss.name : 'MiniBoss',
      is_review: q.isReview
    });

    if (q.explanation_short) {
      const expBox = document.getElementById('quizExplain');
      expBox.style.display = 'block';
      if (isRepeatedWrong) {
        expBox.innerHTML = `<span style="color:#ff4766; font-weight:800; font-size:13px;">❌ 舊錯題重複答錯！【重度懲罰】：結算評級額外扣減 1 題！</span><br><b>正確解答：</b> 選項 ${'ABCD'[q.ans]}<br><b>解析：</b> ${q.explanation_short}`;
      } else {
        expBox.innerHTML = `<b>${isCorrect ? '答對了！' : '解析：'}</b> ${q.explanation_short}`;
      }
    }

    setTimeout(() => {
      this.showNextQuestion();
    }, isRepeatedWrong ? 1800 : 1200);
  }

  endQuizPhase() {
    document.getElementById('quizScreen').classList.add('hidden');
    this.openUpgradeScreen();
  }

  openUpgradeScreen() {
    this.state = 'upgrade';
    const screen = document.getElementById('upgradeScreen');
    screen.classList.remove('hidden');

    const correct = Math.max(0, Math.min(5, this.quizCorrectCount || 0));
    document.getElementById('upgradeCorrectCount').textContent = `${correct}/5`;

    const tierHeaderLabels = [
      '0 題答對 // 應急生存補給 (無解鎖武器)',
      '1 題答對 // 解鎖【C 級】基礎裝備庫',
      '2 題答對 // 解鎖【C 級】基礎裝備庫',
      '3 題答對 // 解鎖【B 級】裝備庫 (保障 1 款 B 級)',
      '4 題答對 // 解鎖【A 級】主力裝備庫 (保障 1 款 A 級)',
      '5 題滿分 // 解鎖【S 級】神話裝備庫 (保障 1 款 S 級神兵)'
    ];
    document.getElementById('upgradeQualityBadge').textContent = tierHeaderLabels[correct] || tierHeaderLabels[1];

    const grid = document.getElementById('upgradeCardsGrid');
    grid.innerHTML = '';
    const choices = this.generateUpgradeChoices(correct);

    choices.forEach(c => {
      const card = document.createElement('div');
      const isFusion = !!c.isFusion;
      const tierClass = c.tierRating ? `tier-${c.tierRating.toLowerCase()}` : '';

      // 依主武/被動/特化/真融合賦予專屬邊界與名稱特效 class (四色光效與外框區隔)
      let nameClass = 'name-active';
      let cardTypeClass = 'card-active';
      if (isFusion) {
        nameClass = 'name-fusion';
        cardTypeClass = 'card-fusion';
      } else if (c.isPerk) {
        nameClass = 'name-perk';
        cardTypeClass = 'card-perk';
      } else if (c.isPassive) {
        nameClass = 'name-passive';
        cardTypeClass = 'card-passive';
      }

      card.className = `upgrade-card ${c.quality || 'quality-good'} ${tierClass} ${cardTypeClass} ${isFusion ? 'fusion-card' : ''}`;

      // 主被動標籤 (明顯呈現)
      let typeBadgeHtml = '';
      if (isFusion) {
        typeBadgeHtml = `<span class="type-badge type-fusion">🔥 終極・真融合</span>`;
      } else if (c.isPerk) {
        typeBadgeHtml = `<span class="type-badge type-perk">🛡️ 生存・特化</span>`;
      } else if (c.isPassive) {
        typeBadgeHtml = `<span class="type-badge type-passive">🛡️ 被動・常駐</span>`;
      } else {
        typeBadgeHtml = `<span class="type-badge type-active">⚡ 主動・主武</span>`;
      }

      // 評級標籤 (S/A/B/C 級)
      const tierBadgeHtml = c.tierRating
        ? `<span class="tier-badge tier-${c.tierRating.toLowerCase()}">${c.tierRating} 級</span>`
        : '';

      // 等級標籤
      const rankTagHtml = c.isPerk
        ? `<span class="upgrade-rank-tag max">生存特化</span>`
        : (isFusion
          ? `<span class="upgrade-rank-tag max" style="background:var(--gold); color:#000; font-weight:900;">真・融合解鎖</span>`
          : `<span class="upgrade-rank-tag ${c.targetRank === 5 ? 'max' : ''}">${c.currentRank === 0 ? '新解鎖 Lv.1' : `Lv.${c.currentRank} → Lv.${c.targetRank} (MAX 5)`}</span>`);

      // 融合素材標註 (緊湊單行膠囊)
      let fusionHtml = '';
      if (c.fusionHints && c.fusionHints.length > 0) {
        fusionHtml = c.fusionHints.map(hint => {
          if (hint.hasPartner) {
            return `<div class="upgrade-fusion-pill partner-owned">
              <span>✨ 可與《${hint.partnerName}》融合為【${hint.fusionName}】(搭檔已持有)</span>
            </div>`;
          } else {
            return `<div class="upgrade-fusion-pill">
              <span>🔗 可與《${hint.partnerName}》融合成【${hint.fusionName}】</span>
            </div>`;
          }
        }).join('');
      }

      const iconHtml = c.icon
        ? `<img src="${c.icon}" class="upgrade-icon-img" alt="${c.name}" onerror="this.style.display='none'; this.parentNode.textContent='⚔️';" />`
        : '⚔️';

      card.innerHTML = `
        <div class="upgrade-icon-box">${iconHtml}</div>
        <div class="upgrade-info">
          <div class="upgrade-name-row">
            <span class="upgrade-name ${nameClass}">${c.name}</span>
            <div class="upgrade-badges-group">
              ${typeBadgeHtml}
              ${tierBadgeHtml}
              ${rankTagHtml}
            </div>
          </div>
          <div class="upgrade-stats-line">${c.statProgression || c.specialEffect || ''}</div>
          ${fusionHtml}
        </div>
      `;
      card.onclick = () => {
        this.applyUpgrade(c);
        this.closeUpgradeScreen();
      };
      grid.appendChild(card);
    });
  }

  generateUpgradeChoices(correctCount = 3) {
    const list = [];
    const rawWpns = (this.dataStore && this.dataStore.weaponData && this.dataStore.weaponData.length > 0)
      ? this.dataStore.weaponData
      : STARFALL_WEAPONS_CATALOG;
    const wpns = rawWpns.map(w => {
      const cat = STARFALL_WEAPONS_CATALOG.find(c => c.id === w.id) || {};
      return {
        ...cat,
        ...w,
        tier: w.tier || cat.tier || 'C',
        tierName: w.tierName || cat.tierName || 'C 級・基礎武裝'
      };
    });

    // 情況 A：答對 0 題（嚴格不提供武器！僅提供三項微幅生存特化）
    if (correctCount === 0) {
      return [
        {
          isPerk: true,
          perkType: 'repair_1hp',
          name: '緊急奈米修復栓',
          icon: 'assets/icons/weapons/weapon_14.png',
          specialEffect: '戰機裝甲修復 +1 HP',
          desc: '微型奈米醫療注劑，小幅修復戰機受損結構，恢復 1 點生命值（不高於最大生命值 3）。'
        },
        {
          isPerk: true,
          perkType: 'speed_boost',
          name: '輔助姿態推進器',
          icon: 'assets/icons/weapons/weapon_1.png',
          specialEffect: '戰機移動速度 +6%',
          desc: '微調引擎輔助噴嘴推力，永久微幅提升機體移動靈敏度 6%。'
        },
        {
          isPerk: true,
          perkType: 'bullet_slow',
          name: '干擾抑阻力場',
          icon: 'assets/icons/weapons/weapon_10.png',
          specialEffect: '敵方彈幕速度 -5%',
          desc: '釋放低頻微波阻尼力場，微幅降低所有敵方子彈飛行速度 5%。'
        }
      ];
    }

    // 候選武器池：排除已經升至 5 階 (MAX) 的武器
    let candidateWeapons = wpns.filter(w => {
      const eq = this.findEquippedWeapon(w.id);
      const curRank = eq ? eq.rank : 0;
      return curRank < 5;
    });

    // 強勢武器門檻與稀有度抑制 (如超聲震盪重砲 sonic_cannon 清彈範圍過大)：
    // 1. 必須本輪 5 題全部答對 (5/5 滿分) 才有資格出現在三選一候選池中 (未滿分 0% 機率)
    // 2. 即使 5 題全部答對，出現機率亦大幅調降 (僅 20% 機率納入池中，出現機率降低 80%)
    if (correctCount < 5) {
      candidateWeapons = candidateWeapons.filter(w => w.id !== 'sonic_cannon');
    } else {
      if (Math.random() > 0.20) {
        candidateWeapons = candidateWeapons.filter(w => w.id !== 'sonic_cannon');
      }
    }

    // 輔助函式：從池中隨機抽取指定數量不重複元素
    const pickRandom = (pool, count) => {
      const picked = [];
      const temp = [...pool];
      while (picked.length < count && temp.length > 0) {
        const idx = Math.floor(Math.random() * temp.length);
        picked.push(temp[idx]);
        temp.splice(idx, 1);
      }
      return picked;
    };

    // 依照答對題數限制武器評級庫 (Tier)
    // 答對 1 或 2 題：只有 C 級武器
    // 答對 3 題：B 級及以下（B 或 C 級），保障 1 個 B 級
    // 答對 4 題：A 級及以下（A, B, C 級），保障 1 個 A 級
    // 答對 5 題：S 級及以下（S, A, B, C 級），保障 1 個 S 級
    const chosenWpns = [];

    if (correctCount === 1 || correctCount === 2) {
      const cPool = candidateWeapons.filter(w => w.tier === 'C');
      chosenWpns.push(...pickRandom(cPool, 3));
    } else if (correctCount === 3) {
      const bPool = candidateWeapons.filter(w => w.tier === 'B');
      if (bPool.length > 0) {
        const guaranteed = bPool[Math.floor(Math.random() * bPool.length)];
        chosenWpns.push(guaranteed);
      }
      const remainPool = candidateWeapons.filter(w => (w.tier === 'B' || w.tier === 'C') && !chosenWpns.some(cw => cw.id === w.id));
      chosenWpns.push(...pickRandom(remainPool, 3 - chosenWpns.length));
    } else if (correctCount === 4) {
      const aPool = candidateWeapons.filter(w => w.tier === 'A');
      if (aPool.length > 0) {
        const guaranteed = aPool[Math.floor(Math.random() * aPool.length)];
        chosenWpns.push(guaranteed);
      }
      const remainPool = candidateWeapons.filter(w => (w.tier === 'A' || w.tier === 'B' || w.tier === 'C') && !chosenWpns.some(cw => cw.id === w.id));
      chosenWpns.push(...pickRandom(remainPool, 3 - chosenWpns.length));
    } else if (correctCount >= 5) {
      const sPool = candidateWeapons.filter(w => w.tier === 'S');
      if (sPool.length > 0) {
        const guaranteed = sPool[Math.floor(Math.random() * sPool.length)];
        chosenWpns.push(guaranteed);
      }
      const remainPool = candidateWeapons.filter(w => (w.tier === 'S' || w.tier === 'A' || w.tier === 'B' || w.tier === 'C') && !chosenWpns.some(cw => cw.id === w.id));
      chosenWpns.push(...pickRandom(remainPool, 3 - chosenWpns.length));
    }

    const tierQualityMap = {
      S: 'quality-legendary',
      A: 'quality-epic',
      B: 'quality-rare',
      C: 'quality-good'
    };

    const tierQualityMultiplier = {
      S: 2.2,
      A: 1.8,
      B: 1.4,
      C: 1.1
    };

    // 取得真融合定義庫以分析融合搭檔
    const fusions = (this.dataStore && this.dataStore.fusionData && this.dataStore.fusionData.fusions && this.dataStore.fusionData.fusions.length > 0)
      ? this.dataStore.fusionData.fusions
      : STARFALL_FUSIONS;

    chosenWpns.forEach((w) => {
      const eq = this.findEquippedWeapon(w.id);
      const currentRank = eq ? eq.rank : 0;
      const targetRank = currentRank + 1;
      const tierRating = w.tier || 'C';
      const qualityClass = tierQualityMap[tierRating] || 'quality-good';
      const mult = tierQualityMultiplier[tierRating] || 1.2;

      // 檢查此武器是否為真融合武器素材
      const relatedFusions = fusions.filter(f => f.ingredients && f.ingredients.includes(w.id));
      const fusionHints = relatedFusions.map(f => {
        const partnerId = f.ingredients.find(id => id !== w.id);
        const partnerW = (this.dataStore && this.dataStore.weaponData && this.dataStore.weaponData.find(x => x.id === partnerId))
          || STARFALL_WEAPONS_CATALOG.find(x => x.id === partnerId);
        const partnerEquipped = this.findEquippedWeapon(partnerId);
        const hasPartner = !!(partnerEquipped && partnerEquipped.rank > 0);
        return {
          fusionName: f.name,
          partnerName: partnerW ? partnerW.name : partnerId,
          partnerId: partnerId,
          hasPartner: hasPartner
        };
      });

      const baseDmg = w.baseDmg || 50;
      const currentDmg = Math.round(baseDmg * (1 + currentRank * 0.28) * mult);
      const targetDmg = Math.round(baseDmg * (1 + targetRank * 0.28) * mult);
      let statSummary = '';
      if (w.isPassive) {
        statSummary = `🛡️ ${w.tag || '被動常駐'} ｜ 增益強化至 Lv.${targetRank}`;
      } else {
        statSummary = `⚡ 威力: ${currentRank === 0 ? targetDmg : `${currentDmg} ➔ ${targetDmg}`} ｜ ${w.tag || '主動火控'}`;
      }

      list.push({
        isFusion: false,
        weaponId: w.id,
        isPassive: !!w.isPassive,
        name: w.name,
        tierRating: tierRating,
        tierName: w.tierName || `${tierRating} 級裝備`,
        currentRank: currentRank,
        targetRank: targetRank,
        quality: qualityClass,
        qualityMultiplier: mult,
        icon: w.icon || `assets/icons/weapons/weapon_1.png`,
        tierLabel: `【${tierRating} 級・${w.tierName ? w.tierName.split('・')[1] || w.tierName : '裝備'}】`,
        specialEffect: targetRank === 5
          ? `【MAX 終極特化】威力大幅昇華，已達最高階！`
          : `${w.tag || '常規裝備'}｜提升至 Lv.${targetRank}`,
        statProgression: statSummary,
        desc: `${w.desc}（升至 Lv.${targetRank}）`,
        fusionHints: fusionHints
      });
    });

    // 檢查是否有符合條件的真融合武器 (兩項特定素材武器均達到 Rank >= 3，且尚未激活該真融合)
    const availableFusions = [];
    if (fusions && fusions.length > 0) {
      fusions.forEach(f => {
        if (this.isFusionActive(f.id)) return;
        const [ing1, ing2] = f.ingredients;
        const w1 = this.findEquippedWeapon(ing1);
        const w2 = this.findEquippedWeapon(ing2);
        const r1 = w1 ? w1.rank : 0;
        const r2 = w2 ? w2.rank : 0;
        if (r1 >= 3 && r2 >= 3) {
          availableFusions.push(f);
        }
      });
    }

    // 若有符合解鎖條件的真融合武器，保證在升級選項中提供一項金色傳奇【真・融合解鎖】！
    if (availableFusions.length > 0) {
      const f = availableFusions[Math.floor(Math.random() * availableFusions.length)];
      const fusionCard = {
        isFusion: true,
        fusionId: f.id,
        name: `【真・融合】${f.name}`,
        quality: 'quality-legendary',
        qualityMultiplier: 5.0,
        icon: 'assets/icons/weapons/weapon_3.png',
        tierLabel: '★【雙素材 Lv.3 覺醒真融合】★',
        specialEffect: f.resonance ? `${f.resonance.name}：${f.resonance.effect}` : '雙武器共鳴終極特化',
        statProgression: f.resonance ? `🔥 ${f.resonance.name}：${f.resonance.effect}` : '雙武器共鳴終極特化',
        desc: `${f.description}（結合兩大武裝終極威力）`
      };
      if (list.length >= 3) {
        list[2] = fusionCard;
      } else {
        list.push(fusionCard);
      }
    }

    // 若候選武器不足 3 款（大多已升滿 5 階），以生存特化補足
    if (list.length < 3) {
      const fallbackPerks = [
        {
          isPerk: true,
          perkType: 'repair_1hp',
          name: '緊急奈米修復栓',
          icon: 'assets/icons/weapons/weapon_14.png',
          specialEffect: '戰機裝甲修復 +1 HP',
          statProgression: '🛡️ 戰機裝甲修復 +1 HP（上限 3 HP）',
          desc: '微型奈米醫療注劑，小幅修復戰機受損結構，恢復 1 點生命值。'
        },
        {
          isPerk: true,
          perkType: 'speed_boost',
          name: '全武裝高能超頻陣列',
          icon: 'assets/icons/weapons/weapon_1.png',
          specialEffect: '戰機移動速度 +6%，靈丸蓄力微幅加快',
          statProgression: '⚡ 機動速度 +6% ｜ 靈丸蓄力微幅加快',
          desc: '戰機供能導軌超頻加速，提高機動性與靈丸充能反應速度。'
        },
        {
          isPerk: true,
          perkType: 'bullet_slow',
          name: '虛空阻尼波形發生器',
          icon: 'assets/icons/weapons/weapon_10.png',
          specialEffect: '敵方彈幕速度 -5%',
          statProgression: '🌀 敵方彈幕飛行速度 -5%',
          desc: '釋放空間相位偏轉波，使所有敵機發射之子彈減速 5%。'
        }
      ];
      for (const p of fallbackPerks) {
        if (list.length >= 3) break;
        if (!list.some(s => s.name === p.name)) list.push(p);
      }
    }

    return list;
  }

  findEquippedWeapon(id) {
    if (this.arsenal && this.arsenal[id]) {
      return this.arsenal[id];
    }
    for (let slot in this.equipped) {
      if (this.equipped[slot] && this.equipped[slot].id === id) {
        return this.equipped[slot];
      }
    }
    return null;
  }

  applyUpgrade(choice) {
    if (choice.isPerk) {
      if (choice.perkType === 'repair_1hp' || choice.perkType === 'repair') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        this.score += 300;
        this.showToast('奈米應急搶修！戰機生命 +1 HP！');
      } else if (choice.perkType === 'speed_boost') {
        this.player.moveSpeedMultiplier = (this.player.moveSpeedMultiplier || 1.0) * 1.06;
        this.player.speed = 400 * this.player.moveSpeedMultiplier;
        this.showToast('姿態推進器過載！戰機移動速度永久提升 6%！');
      } else if (choice.perkType === 'bullet_slow') {
        this.player.bulletSlowFactor = (this.player.bulletSlowFactor || 1.0) * 0.95;
        this.showToast('干擾抑阻力場啟動！敵方彈幕速度降低 5%！');
      }
      this.sound.playCrit();
      return;
    }

    if (choice.isFusion) {
      this.fusionActive.push(choice.fusionId);
      this.sound.playCrit();
      this.sound.speak(`真融合：${choice.name} 啟動！`);
      this.showToast(`啟動真融合：${choice.name}！火力全面昇華！`);
      return;
    }

    // 裝備提升 (雙向同步 arsenal 與 equipped)
    if (this.arsenal && this.arsenal[choice.weaponId]) {
      this.arsenal[choice.weaponId].rank = choice.targetRank;
      this.arsenal[choice.weaponId].quality = choice.quality;
    }
    const eq = this.findEquippedWeapon(choice.weaponId);
    if (eq) {
      eq.rank = choice.targetRank;
      eq.quality = choice.quality;
    }

    // 主動武器裝備管理 (若未裝備且當前主動槽未滿3個，自動裝備)
    const cat = STARFALL_WEAPONS_CATALOG.find(w => w.id === choice.weaponId);
    if (cat && !cat.isPassive) {
      if (!this.equippedActiveWeapons) this.equippedActiveWeapons = [];
      if (!this.equippedActiveWeapons.includes(choice.weaponId)) {
        if (this.equippedActiveWeapons.length < 3) {
          this.equippedActiveWeapons.push(choice.weaponId);
          this.showToast(`${choice.name} 晉升至 Lv.${choice.targetRank} 並裝備至主動槽！`);
        } else {
          this.showToast(`${choice.name} 晉升至 Lv.${choice.targetRank}！（庫存中，按暫停可在武器庫更換）`);
        }
      } else {
        this.showToast(`${choice.name} 晉升至 Lv.${choice.targetRank}！`);
      }
    } else {
      this.showToast(`${choice.name} 晉升至 Lv.${choice.targetRank}！被動自律生效中`);
    }

    this.sound.playCrit();
    const rankLabel = choice.targetRank === 5 ? 'MAX (終極特化)' : `Lv.${choice.targetRank}`;
    this.sound.speak(`${choice.name} 升至第 ${choice.targetRank} 階！`);
  }

  closeUpgradeScreen() {
    document.getElementById('upgradeScreen').classList.add('hidden');
    this.state = 'playing';
    // 進入新波次或新關卡時，徹底清除上一關留存之任何負面減速/硬直狀態
    this.resetPlayerStatusEffects();

    if (this.wave === 2) {
      this.wave = 3;
      this.waveTimer = 0;
      this.showToast('喘息波次：測試新裝備火力！');
    } else if (this.wave === 4) {
      if (this.stage < this.maxStage) {
        this.stage++;
        this.wave = 1;
        this.waveTimer = 0;
        if (this.sound && this.sound.bgm) {
          this.sound.bgm.setStage(this.stage);
        }
        this.showToast(`突破！進入第 ${this.stage} 關！`);
      } else {
        this.onGameVictory();
      }
    }
  }

  onGameVictory() {
    this.state = 'gameover';
    document.getElementById('gameOverTitle').textContent = '神話登頂！全十關通關！';
    document.getElementById('endScore').textContent = this.score;
    document.getElementById('endStage').textContent = '第 10 關 (全破)';
    const total = this.sessionTotalAnswered || 0;
    const correct = this.sessionTotalCorrect || 0;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const accEl = document.getElementById('endAcc');
    if (accEl) accEl.textContent = `${rate}% (${correct}/${total} 題)`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
    this.sound.speak('恭喜！十位神話機神全數擊破！');
  }

  onGameOver() {
    this.state = 'gameover';
    document.getElementById('gameOverTitle').textContent = '戰機裝甲瓦解';
    document.getElementById('endScore').textContent = this.score;
    document.getElementById('endStage').textContent = `第 ${this.stage} 關`;
    const total = this.sessionTotalAnswered || 0;
    const correct = this.sessionTotalCorrect || 0;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const accEl = document.getElementById('endAcc');
    if (accEl) accEl.textContent = `${rate}% (${correct}/${total} 題)`;
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  // ============================================================
  // 更新與渲染迴圈 (Hit-stop, Shake, Hazard Telegraphs)
  // ============================================================
  update(dt) {
    if (this.state !== 'playing') return;

    // Hit-stop 凍結幀
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    this.time += dt;

    // 玩家平滑移動與絕對邊界限制 (移動嚴禁超出畫面)
    const p = this.player;

    // 安全防護屏障：若場上無活躍之美杜莎 Boss (Stage 3 Phase 2+)，強制清除石化減速，絕不外溢至後續波次或關卡
    const hasActiveMedusa = this.currentBoss && this.currentBoss.stage === 3 && this.currentBoss.phase >= 2 && !this.currentBoss.dead && !this.currentBoss.dying;
    if (!hasActiveMedusa && p.gorgonSlowActive) {
      p.gorgonSlowActive = false;
      p.gorgonPurgeTimer = 0;
    }

    // 石化狀態解除倒數計時（如使用光束砲高溫融化解除）
    if (p.gorgonPurgeTimer && p.gorgonPurgeTimer > 0) {
      p.gorgonPurgeTimer -= dt;
      if (p.gorgonPurgeTimer <= 0) {
        p.gorgonPurgeTimer = 0;
        // 若美杜莎還在 Phase 2，石化領域再次生效
        const medusa = (this.currentBoss && this.currentBoss.stage === 3 && this.currentBoss.phase >= 2 && !this.currentBoss.dead && !this.currentBoss.dying) ? this.currentBoss : null;
        if (medusa) p.gorgonSlowActive = true;
      }
    }

    // 雷公 Phase 2: 磁暴拘束強制停頓
    if (p.stunTimer && p.stunTimer > 0) {
      p.stunTimer -= dt;
      p.targetX = p.x;
      p.targetY = p.y;
      // 戰機短路電弧粒子
      if (Math.random() < 0.4) {
        this.particles.push(new Particle(
          p.x + (Math.random() - 0.5) * 30,
          p.y + (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
          '#38bdf8',
          0.3,
          2.5
        ));
      }
    } else {
      // 美杜莎 Phase 2: 石化凝視領域使玩家移動速度下降 50%
      const slow = p.gorgonSlowActive ? 0.5 : 1.0;
      p.x += (p.targetX - p.x) * (0.22 * slow);
      p.y += (p.targetY - p.y) * (0.22 * slow);
    }

    p.x = Math.max(24, Math.min(this.W - 24, p.x));
    p.y = Math.max(30, Math.min(this.H - 36, p.y));
    if (p.invulnTime > 0) p.invulnTime -= dt;

    this.updateSpiritCharge(dt);
    this.fireWeapons(dt);

    // Boss 震撼登場序曲更新 (法陣蓄能、清屏衝擊波與警報淡出)
    if (this.bossIntroSequence && this.bossIntroSequence.active) {
      this.bossIntroSequence.timer -= dt;
      if (this.bossIntroSequence.timer <= 1.0 && !this.bossIntroSequence.shockwaveTriggered) {
        this.bossIntroSequence.shockwaveTriggered = true;
        this.sound.playExplosion(true);
        this.shake(12, 0.45);
        this.ebullets = []; // 衝擊波震撼清屏消彈
        const overlay = document.getElementById('bossEntranceOverlay');
        if (overlay) overlay.classList.add('hidden');
      }
      if (this.bossIntroSequence.timer <= 0) {
        this.bossIntroSequence.active = false;
      }
    }

    // Boss 震撼大破滅極限連環爆炸與超新星序列更新
    if (this.bossDeathSequence && this.bossDeathSequence.boss) {
      const seq = this.bossDeathSequence;
      const b = seq.boss;
      seq.timer -= dt;

      // 機身劇烈微震動
      b.shakeOffsetX = (Math.random() - 0.5) * 16;
      b.shakeOffsetY = (Math.random() - 0.5) * 16;

      // 機體表面持續爆發高能微火球
      if (Math.random() < 0.85) {
        const px = b.x + (Math.random() - 0.5) * (b.w || 140);
        const py = b.y + (Math.random() - 0.5) * (b.h || 120);
        this.particles.push(new Particle(
          px, py,
          (Math.random() - 0.5) * 140,
          (Math.random() - 0.5) * 140,
          Math.random() < 0.5 ? '#ff4766' : '#f5bc38',
          4 + Math.random() * 4,
          0.6
        ));
      }

      // 神光射線延伸
      seq.godRays.forEach(ray => {
        if (ray.length < ray.maxLength) ray.length += ray.speed * dt;
      });

      // 衝擊波外擴
      seq.shockwaves.forEach(sw => {
        sw.r += sw.speed * dt;
        sw.alpha = Math.max(0, sw.alpha - dt * 1.6);
      });

      // 殘骸運動更新
      seq.shards.forEach(sh => {
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.rot += sh.vrot * dt;
        sh.alpha = Math.max(0, sh.alpha - dt * 0.45);
      });

      // 倒數至 1.2s 時觸發超新星終極核爆
      if (seq.timer <= 1.2 && !seq.supernovaTriggered) {
        seq.supernovaTriggered = true;
        this.screenFlashAlpha = 1.0; // 全螢幕耀眼核爆白光
        this.shake(26, 1.2);
        this.sound.playExplosion(true);
        this.sound.playBossDeathSupernova();

        // 噴發 3 重巨大光環衝擊波
        for (let k = 0; k < 3; k++) {
          seq.shockwaves.push({
            r: 25 + k * 20,
            speed: 460 + k * 90,
            alpha: 1.0,
            color: k === 0 ? '#ffffff' : (k === 1 ? '#f5bc38' : '#ff4766')
          });
        }

        // 機體炸裂為 36 塊燃燒機甲殘骸
        for (let i = 0; i < 36; i++) {
          const angle = (i / 36) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const spd = 140 + Math.random() * 260;
          seq.shards.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd + 70,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 8,
            size: 9 + Math.random() * 16,
            alpha: 1.0,
            color: Math.random() < 0.35 ? '#ffffff' : (Math.random() < 0.65 ? '#f5bc38' : '#33e0e0')
          });
        }
      }

      // 白光漸漸消退
      if (this.screenFlashAlpha > 0) {
        this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 1.3);
      }

      // 序列結束：徹底銷毀 Boss 並進入答題
      if (seq.timer <= 0) {
        this.finishBossDefeat(b);
      }
    } else if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 1.5);
    }

    // 迴轉光子球與軌道壁壘 (Orbital Aegis) 攔截敵彈
    if (this.orbitals && this.orbitals.length > 0) {
      this.orbitals.forEach(orb => {
        this.ebullets.forEach(eb => {
          if (!eb.dead && Math.hypot(eb.x - orb.x, eb.y - orb.y) < orb.r + eb.r) {
            eb.dead = true;
            this.particles.push(new Particle(orb.x, orb.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#33e0e0', 2, 0.2));
            this.player.grazeSync = Math.min(100, this.player.grazeSync + (orb.isAegis ? 4 : 2));
            if (orb.isAegis) {
              // 軌道壁壘真融合：偏折吸收敵彈並反彈高能光刃
              const dagger = new Bullet(orb.x, orb.y, (Math.random() - 0.5) * 100, -540, true, 75, 'normal');
              dagger.color = '#33e0e0';
              this.bullets.push(dagger);
            }
          }
        });
      });
    }

    // 熔岩地熱領域 (Meltdown Impact / Comet Spirit) 傷害與消彈 (抗卡頓：0.20s 離散計時結算)
    this.lavaPools.forEach(lp => {
      lp.life -= dt;
      lp.tickTimer = (lp.tickTimer || 0) + dt;
      if (lp.tickTimer >= 0.20) {
        const stepDt = lp.tickTimer;
        lp.tickTimer = 0;
        const tickDmg = lp.dps * stepDt;
        this.enemies.forEach(e => {
          if (!e.dead && Math.hypot(e.x - lp.x, e.y - lp.y) < lp.r + e.r) {
            e.hp -= tickDmg;
            if (e.hp <= 0) e.dead = true;
          }
        });
        if (this.currentBoss && !this.currentBoss.dead) {
          if (Math.hypot(this.currentBoss.x - lp.x, this.currentBoss.y - lp.y) < lp.r + this.currentBoss.hitboxRadius) {
            this.damageBoss(this.currentBoss, tickDmg, 'fire', 'lava');
          }
        }
      }
      this.ebullets.forEach(eb => {
        if (!eb.dead && Math.hypot(eb.x - lp.x, eb.y - lp.y) < lp.r) {
          eb.dead = true;
          this.particles.push(new Particle(eb.x, eb.y, 0, -20, '#ff9138', 2, 0.15));
        }
      });
    });
    this.lavaPools = this.lavaPools.filter(lp => lp.life > 0);

    // 玩家子彈推進
    this.bullets.forEach(b => {
      // 追蹤飛彈 (蜂群獵手 Swarm Hunter 狂暴索敵)
      if (b.type === 'homing') {
        let target = null;
        let minDist = 750;
        if (this.currentBoss && !this.currentBoss.dead) {
          target = this.currentBoss;
          minDist = Math.hypot(target.x - b.x, target.y - b.y);
        }
        this.enemies.forEach(e => {
          if (e.dead) return;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < minDist && (!target || b.isSwarm)) {
            minDist = d;
            target = e;
          }
        });
        if (target) {
          const targetAng = Math.atan2(target.y - b.y, target.x - b.x);
          const curAng = Math.atan2(b.vy, b.vx);
          const diff = Math.atan2(Math.sin(targetAng - curAng), Math.cos(targetAng - curAng));
          const turnRate = b.isSwarm ? 9.5 : 5.2;
          const newAng = curAng + Math.sign(diff) * Math.min(Math.abs(diff), turnRate * dt);
          const spd = b.isSwarm ? 540 : 440;
          b.vx = Math.cos(newAng) * spd;
          b.vy = Math.sin(newAng) * spd;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // 碧玉飛輪旋轉與削彈 (Jade Chakram Razor Blade)
      if (b.type === 'chakram') {
        b.rotation = (b.rotation || 0) + dt * 14;
        this.ebullets.forEach(eb => {
          if (!eb.dead && Math.hypot(eb.x - b.x, eb.y - b.y) < b.r + eb.r + 4) {
            eb.dead = true;
            this.particles.push(new Particle(eb.x, eb.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#48e583', 2, 0.2));
          }
        });
      }

      // 奇異點核心重力漩渦 (Singularity Core Gravitational Pull)
      if (b.type === 'singularity') {
        b.vy *= 0.96;
        const pullRadius = b.radius || 115;
        this.enemies.forEach(e => {
          if (!e.dead) {
            const dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < pullRadius && dist > 5) {
              const pullForce = (1 - dist / pullRadius) * 110 * dt;
              e.x += (b.x - e.x) / dist * pullForce;
              e.y += (b.y - e.y) / dist * pullForce;
            }
          }
        });
        this.ebullets.forEach(eb => {
          if (!eb.dead && Math.hypot(eb.x - b.x, eb.y - b.y) < 42) {
            eb.dead = true;
            this.particles.push(new Particle(eb.x, eb.y, 0, 0, '#b359ff', 2, 0.15));
          }
        });
      }

      // 音波震盪圈消彈與擴散 (Sonic Cannon Shockwave)
      if (b.type === 'sonic_wave') {
        b.r = Math.min(95, (b.r || 20) + dt * 75);
        this.ebullets.forEach(eb => {
          if (!eb.dead && Math.hypot(eb.x - b.x, eb.y - b.y) < b.r + eb.r) {
            eb.dead = true;
            this.particles.push(new Particle(eb.x, eb.y, (Math.random() - 0.5) * 40, -30, '#33e0e0', 1.8, 0.15));
          }
        });
      }

      // 翡翠靈泉脈衝波 (Emerald Spring Shockwave)
      if (b.type === 'emerald_pulse') {
        b.r = (b.r || 15) + dt * 160;
        this.ebullets.forEach(eb => {
          if (!eb.dead && Math.hypot(eb.x - b.x, eb.y - b.y) < b.r) {
            eb.dead = true;
          }
        });
      }

      // 榴彈引爆 (熔核轟擊 Meltdown Impact 留存熔岩)
      if (b.type === 'grenade' && (b.life <= 0 || b.y <= 130)) {
        b.dead = true;
        this.sound.playExplosion(false);
        this.shake(5, 0.2);
        const radius = b.blastRadius || 60;
        this.enemies.forEach(e => {
          if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < radius + e.r) {
            e.hp -= b.damage;
            if (e.hp <= 0) e.dead = true;
          }
        });
        if (this.currentBoss && !this.currentBoss.dead) {
          if (Math.hypot(this.currentBoss.x - b.x, this.currentBoss.y - b.y) < radius + this.currentBoss.hitboxRadius) {
            this.damageBoss(this.currentBoss, b.damage, 'grenade', 'grenade');
          }
        }
        const poolDps = b.isMeltdown ? 260 : (75 + (b.rank || 1) * 28);
        this.lavaPools.push({ x: b.x, y: b.y, r: b.blastRadius || 75, life: 5.0, dps: poolDps });
      }

      if (b.life <= 0 || b.y < -50 || b.y > this.H + 50 || b.x < -50 || b.x > this.W + 50) {
        b.dead = true;
      }
    });

    // 敵彈推進
    this.ebullets.forEach(eb => {
      if (eb.type === 'floating_feather') {
        // 迦樓羅滯空金羽：在原地輕微漂浮，倒數 3.0 秒後原地劇烈爆炸！
        eb.vx *= 0.92;
        eb.vy *= 0.92;
        eb.detonateTimer = (eb.detonateTimer !== undefined ? eb.detonateTimer : 3.0) - dt;
        if (eb.detonateTimer <= 0 && !eb.dead) {
          eb.dead = true;
          this.sound.playExplosion(false);
          this.shake(5, 0.2);
          for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2;
            const shard = new Bullet(eb.x, eb.y, Math.cos(angle) * 220, Math.sin(angle) * 220, false, 1, 'feather_shard');
            shard.color = '#ff9138';
            shard.r = 5;
            this.ebullets.push(shard);
          }
        }
      } else if (eb.type === 'feather' || eb.type === 'feather_storm') {
        // 羽毛飄動軌跡 (神鳥羽毛飄動下落)
        eb.driftAge = (eb.driftAge || 0) + dt;
        eb.x += Math.sin(eb.driftAge * 6 + (eb.driftPhase || 0)) * 50 * dt;
      }

      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      eb.life -= dt;
      if (eb.life <= 0 || eb.y > this.H + 40 || eb.y < -40 || eb.x < -40 || eb.x > this.W + 40) {
        eb.dead = true;
      }
      this.checkGraze(eb);

      // 玩家核心判定 (半徑 7px)
      if (!this.godmode && p.invulnTime <= 0) {
        const d = Math.hypot(eb.x - p.x, eb.y - p.y);
        if (d < p.hitboxRadius + eb.r) {
          eb.dead = true;
          this.onPlayerHit();
        }
      }
    });

    // 雜兵推進、AI 行為與多元彈幕射擊
    const bulletSlow = this.player.bulletSlowFactor || 1.0;
    const bulletSpeedBase = 1.0 + (this.stage - 1) * 0.10;

    this.enemies.forEach(e => {
      // 受擊白光與擊退微震衰減
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;
      if (e.flinchX) e.flinchX *= 0.85;

      // 4 種敵機獨特移動模式
      if (e.type === 'scout') {
        // 蛇行俯衝
        e.age = (e.age || 0) + dt;
        e.x = e.baseX + Math.sin(e.age * 4.2) * 55;
        e.y += e.vy * dt;

        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = 1.2 + Math.random() * 0.8;
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          const spd = 250 * bulletSpeedBase * bulletSlow;
          const eb = new Bullet(e.x, e.y + 12, Math.cos(ang) * spd, Math.sin(ang) * spd, false, 1, 'scout_laser');
          eb.color = '#ec4899';
          eb.r = 3.5;
          this.ebullets.push(eb);
        }
      } else if (e.type === 'gunner') {
        // 快速進場懸停，發射交叉雙聯彈
        if (e.y < e.hoverY) {
          e.y += e.vy * dt;
        } else if (e.hoverTimer > 0) {
          e.hoverTimer -= dt;
          e.x += Math.sin(this.time * 2.5) * 20 * dt;
        } else {
          e.y += (e.vy * 0.75) * dt;
        }

        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = 1.3 + Math.random() * 0.7;
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          const spd = 220 * bulletSpeedBase * bulletSlow;
          [-0.20, 0.20].forEach(offset => {
            const a = ang + offset;
            const eb = new Bullet(e.x + Math.sin(offset) * 14, e.y + 14, Math.cos(a) * spd, Math.sin(a) * spd, false, 1, 'gunner_bullet');
            eb.color = '#10b981';
            eb.r = 4.5;
            this.ebullets.push(eb);
          });
        }
      } else if (e.type === 'star') {
        // 旋轉遊弋，蓄能放射 6 芒光刺
        e.x += (e.vx || 0) * dt;
        e.y += e.vy * dt;
        e.rotation = (e.rotation || 0) + dt * 3.2;
        if (e.x < 35 || e.x > this.W - 35) {
          e.vx = -e.vx;
        }

        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = 2.0 + Math.random() * 0.9;
          const spikes = 6;
          const spd = 185 * bulletSpeedBase * bulletSlow;
          const baseRot = e.rotation || 0;
          for (let k = 0; k < spikes; k++) {
            const a = baseRot + (k * Math.PI * 2) / spikes;
            const eb = new Bullet(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, false, 1, 'star_spike');
            eb.color = '#f59e0b';
            eb.r = 4;
            this.ebullets.push(eb);
          }
        }
      } else if (e.type === 'bastion') {
        // 要塞重砲：慢速沉穩推進，發射超大電漿砲球與雙翼雷射
        e.y += e.vy * dt;

        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = 2.4 + Math.random() * 1.1;
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          const spd = 175 * bulletSpeedBase * bulletSlow;
          const heavyBall = new Bullet(e.x, e.y + 22, Math.cos(ang) * spd, Math.sin(ang) * spd, false, 1, 'bastion_ball');
          heavyBall.color = '#a855f7';
          heavyBall.r = 8.5;
          this.ebullets.push(heavyBall);

          [-20, 20].forEach(sx => {
            const sideB = new Bullet(e.x + sx, e.y + 16, 0, spd * 1.15, false, 1, 'bastion_side');
            sideB.color = '#c084fc';
            sideB.r = 4;
            this.ebullets.push(sideB);
          });
        }
      } else if (e.type === 'charger') {
        // 5. 赤隼衝撞機：超音速俯衝撞擊
        if (!e.charging) {
          e.y += e.vy * dt;
          e.lockTimer -= dt;
          if (e.lockTimer > 0 && e.lockTimer < 0.45 && !e.hasTelegraphed) {
            e.hasTelegraphed = true;
            this.hazardTelegraphs.push({
              type: 'line', x1: e.x, y1: e.y, x2: e.x, y2: this.H,
              life: 0.45, width: 22, color: 'rgba(255, 71, 102, 0.65)'
            });
          }
          if (e.lockTimer <= 0) {
            e.charging = true;
            e.vy = 480 * bulletSpeedBase; // 極速衝刺俯衝
            this.sound.playLaser(1100);
          }
        } else {
          e.y += e.vy * dt;
          if (Math.random() < 0.6) {
            this.particles.push(new Particle(e.x + (Math.random() - 0.5) * 8, e.y - 16, (Math.random() - 0.5) * 20, -120, '#ff9138', 3, 0.2));
          }
        }
      } else if (e.type === 'bomber') {
        // 6. 核芯自爆機：飄向自機，近身或重傷自爆
        e.y += e.vy * dt;
        e.x += Math.sin(this.time * 2.5 + e.y * 0.03) * 30 * dt;
        const distToP = Math.hypot(p.x - e.x, p.y - e.y);
        if ((distToP < 125 || e.hp < e.maxHp * 0.35) && e.fuse <= 0) {
          e.fuse = 0.6;
          this.sound.playWarningAlert();
        }
        if (e.fuse > 0) {
          e.fuse -= dt;
          if (Math.random() < 0.5) {
            this.particles.push(new Particle(e.x, e.y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, '#ff4766', 3.5, 0.15));
          }
          if (e.fuse <= 0) {
            e.dead = true;
            this.sound.playExplosion(true);
            this.shake(8, 0.3);
            const shards = 8;
            for (let k = 0; k < shards; k++) {
              const ang = (k / shards) * Math.PI * 2;
              const eb = new Bullet(e.x, e.y, Math.cos(ang) * 200, Math.sin(ang) * 200, false, 1, 'shrapnel');
              eb.color = '#ff4766'; eb.r = 6;
              this.ebullets.push(eb);
            }
          }
        }
      }

      if (e.y > this.H + 50) e.dead = true;
    });

    // 碰撞檢測 (玩家子彈 vs 雜兵 & 強化打擊感、凍結幀、擊退與金屬火花)
    this.bullets.forEach(b => {
      if (!b.isPlayer || b.dead) return;
      this.enemies.forEach(e => {
        if (e.dead) return;
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < b.r + e.r) {
          if (b.hitEnemies) {
            if (b.hitEnemies.has(e)) return;
            b.hitEnemies.add(e);
          }
          e.hp -= b.damage;
          b.pierce--;
          if (b.pierce <= 0) b.dead = true;

          // 打擊感回饋：受擊白光閃爍、擊退微震與方向火花 (移除每發小怪受擊凍結幀以消除卡頓)
          e.hitFlashTimer = 0.08;
          e.flinchX = (Math.random() - 0.5) * 7;
          e.y -= Math.min(6, b.damage * 0.06);
          this.createHitSparks(b.x, b.y, b.vx, b.vy, '#38bdf8', 4);

          // 浮動傷害數字 (預設關閉以保持畫面純淨)
          if (this.showDamageNumbers && (Math.random() < 0.45 || b.damage > 50)) {
            this.damageNumbers.push(new DamageNumber(b.x + (Math.random() - 0.5) * 16, b.y - 12, Math.round(b.damage), false));
          }

          if (e.hp <= 0) {
            e.dead = true;
            this.score += e.scoreVal || 100;
            this.sound.playExplosion(false);
            this.shake(3, 0.15);
            // 敵機擊毀火花爆散
            this.createHitSparks(e.x, e.y, 0, 0, '#ff9138', 8);
          }
          if (b.type === 'spirit') {
            this.createReiganShockwave(b.x, b.y, b.isMax, b.isComet);
            if (b.isComet) {
              this.lavaPools.push({ x: b.x, y: b.y, r: 90, life: 4.0, dps: 240 });
              for (let k = 0; k < 5; k++) {
                setTimeout(() => {
                  this.sound.playExplosion(true);
                  this.shake(5, 0.2);
                  this.ebullets.forEach(eb => {
                    if (Math.hypot(eb.x - b.x, eb.y - b.y) < 140) eb.dead = true;
                  });
                }, k * 120);
              }
            }
          }
        }
      });

      // 玩家子彈 vs Boss 召喚物 / 神話機制實體 (仙瓶、蛇首、雷鼓、饕餮肉魄等)
      if (this.bossMinions && this.bossMinions.length > 0) {
        this.bossMinions.forEach(m => {
          if (m.dead) return;
          const d = Math.hypot(b.x - m.x, b.y - m.y);
          if (d < b.r + m.r) {
            // 靈丸專屬破盾機制：若該實體設定 requiresSpirit，則非靈丸武器無法造成傷害！
            if (m.requiresSpirit && b.type !== 'spirit') {
              b.dead = true;
              this.sound.playLaser(1200);
              this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 70, '#38bdf8', 3, 0.25));
              if (!this._lastSpiritPromptTime || (this.time - this._lastSpiritPromptTime > 2.5)) {
                this._lastSpiritPromptTime = this.time;
                this.showToast('🛡️【靈能結界】常規武器無效！請按住蓄力發射【靈丸】造成傷害！');
              }
              return;
            }

            // 美杜莎蛇髮魔鏡：反彈常規子彈（金陽光束、破曉耀斑、破城光錐與 EMP 靈丸可穿透或擊碎）
            if (m.type === 'gorgon_hex_mirror' && !m.requiresSpirit) {
              if (b.type !== 'beam' && b.type !== 'photon_lance' && b.type !== 'solar_flare' && !b.isGrazeEmp) {
                b.dead = true;
                const angToPlayer = Math.atan2(this.player.y - m.y, this.player.x - m.x);
                const eb = new Bullet(m.x, m.y, Math.cos(angToPlayer) * 260, Math.sin(angToPlayer) * 260, false, 1, 'reflected');
                eb.color = '#c054ff'; eb.r = 6;
                this.ebullets.push(eb);
                this.sound.playLaser(950);
                this.particles.push(new Particle(m.x, m.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#c054ff', 4, 0.3));
                return;
              }
            }

            if (b.hitMinions) {
              if (b.hitMinions.has(m)) return;
              b.hitMinions.add(m);
            }
            // 100% 擦彈 EMP 靈丸對絕境機制實體造成 500% 超載粉碎傷害
            const dmg = b.isGrazeEmp ? b.damage * 5 : b.damage;
            m.hp -= dmg;
            b.pierce--;
            if (b.pierce <= 0) b.dead = true;
            this.sound.playHit();
            this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#f5bc38', 2.5, 0.25));
            if (this.showDamageNumbers) {
              this.damageNumbers.push(new DamageNumber(m.x + (Math.random() - 0.5) * 20, m.y - 12, Math.round(dmg), false));
            }
            if (b.type === 'spirit') {
              this.createReiganShockwave(b.x, b.y, b.isMax, b.isComet);
            }
            if (m.hp <= 0) {
              m.dead = true;
              this.sound.playExplosion(false);
              this.shake(5, 0.2);
              if (m.onDestroy) m.onDestroy(this, this.currentBoss);
            }
          }
        });
      }

      // 玩家子彈 vs Boss (抗卡頓節流防護：穿透武器對 Boss 傷害間隔至少 0.18s)
      if (this.currentBoss && !this.currentBoss.dead) {
        const boss = this.currentBoss;
        const d = Math.hypot(b.x - boss.x, b.y - boss.y);
        if (d < b.r + boss.hitboxRadius) {
          const now = this.time;
          if (b.lastHitBossTime && (now - b.lastHitBossTime < 0.18)) {
            return;
          }
          b.lastHitBossTime = now;

          // 若場上仍有需要靈丸破除的召喚物/核心，Boss 處於完全無敵狀態
          const hasSpiritMinions = this.bossMinions && this.bossMinions.some(m => m.requiresSpirit && !m.dead);
          if (hasSpiritMinions && !b.isGrazeEmp) {
            boss.invulnerable = true;
            this.sound.playLaser(1300);
            this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#38bdf8', 3.5, 0.3));
            if (!this._lastBossShieldPromptTime || (this.time - this._lastBossShieldPromptTime > 2.5)) {
              this._lastBossShieldPromptTime = this.time;
              this.showToast('🛡️【魔王結界無敵】請先以蓄力【靈丸】摧毀所有結界核心實體！');
            }
            if (b.pierce <= 1) b.dead = true;
            return;
          }

          if (b.isGrazeEmp && boss.invulnerable) {
            boss.invulnerable = false;
            boss.desperationActive = false;
            boss.stunTimer = 3.0;
            this.bossMinions = this.bossMinions.filter(m => m.type !== 'garuda_feather_anchor' && m.type !== 'thunder_drum_anchor' && m.type !== 'gorgon_hex_mirror');
            this.showToast('⚡【EMP 擦彈過載】靈丸強行擊穿無敵神盾！魔王癱瘓 3.0 秒！');
          }

          if (b.type === 'spirit') {
            this.damageBoss(boss, b.damage, 'spirit', 'spirit');
            this.createReiganShockwave(b.x, b.y, b.isMax, b.isComet);
            b.pierce--;
            if (b.pierce <= 0) b.dead = true;
            if (b.isComet) {
              this.lavaPools.push({ x: b.x, y: b.y, r: 85, life: 3.5, dps: 200 });
              for (let k = 0; k < 4; k++) {
                setTimeout(() => {
                  this.sound.playExplosion(true);
                  this.shake(5, 0.2);
                  this.ebullets.forEach(eb => {
                    if (Math.hypot(eb.x - b.x, eb.y - b.y) < 130) eb.dead = true;
                  });
                }, k * 120);
              }
            }
          } else if (b.type === 'sonic_wave') {
            this.damageBoss(boss, b.damage, 'sonic_wave', 'bullet');
            b.pierce--;
            if (b.pierce <= 0) b.dead = true;
          } else {
            this.damageBoss(boss, b.damage, b.type, 'bullet');
            b.pierce--;
            if (b.pierce <= 0) b.dead = true;
          }
        }
      }
    });

    // 危險預警計時
    this.hazardTelegraphs.forEach(h => { h.life -= dt; });
    this.hazardTelegraphs = this.hazardTelegraphs.filter(h => h.life > 0);

    // 靈丸純白擴散衝擊波生命週期
    if (this.reiganShockwaves && this.reiganShockwaves.length > 0) {
      this.reiganShockwaves.forEach(sw => { sw.life -= dt; });
      this.reiganShockwaves = this.reiganShockwaves.filter(sw => sw.life > 0);
    }

    // 清理死亡物件
    this.bullets = this.bullets.filter(b => !b.dead);
    this.ebullets = this.ebullets.filter(eb => !eb.dead);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.bossMinions = (this.bossMinions || []).filter(m => !m.dead);

    // 粒子與飄字
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.life > 0);
    this.damageNumbers.forEach(dn => dn.update(dt));
    this.damageNumbers = this.damageNumbers.filter(dn => dn.life > 0);

    this.updateWave(dt);

    this.stars.forEach(s => {
      s.y += s.speed * dt;
      if (s.y > this.H) { s.y = 0; s.x = Math.random() * this.W; }
    });

    // 超音速飛行粒子動態位移更新
    if (this.flightParticles) {
      this.flightParticles.forEach(fp => {
        fp.y += fp.speed * dt;
        if (fp.y > this.H + fp.len) {
          fp.y = -fp.len;
          fp.x = Math.random() * this.W;
        }
      });
    }

    this.updateHUD();
  }

  onPlayerHit() {
    if (this.player.shield) {
      this.player.shield = false;
      this.player.invulnTime = 1.4;
      this.sound.playExplosion(false);
      this.showToast('量子護盾抵擋了一次致命衝擊！');
      return;
    }
    this.player.hp--;
    this.player.invulnTime = 1.8;
    this.player.grazeSync = Math.max(0, this.player.grazeSync - 30);
    this.sound.playExplosion(true);
    this.sound.vibrate([60, 40, 80]);
    this.shake(9, 0.35);

    if (this.player.hp <= 0) {
      this.onGameOver();
    }
  }

  shake(mag, dur) {
    this.shakeMag = mag;
    this.shakeDur = dur;
  }

  updateHUD() {
    document.getElementById('hudStageWave').textContent = `關卡 ${this.stage}-${this.wave}`;
    document.getElementById('hudScore').textContent = this.score;

    const pressEl = document.getElementById('hudPressure');
    const p = this.knowledgePressure;
    pressEl.textContent = `Lv.${p} (${p >= 7 ? '地獄' : (p >= 4 ? '緊張' : '平穩')})`;
    pressEl.style.color = p >= 7 ? 'var(--red)' : (p >= 4 ? 'var(--orange)' : 'var(--cyan)');

    const hpContainer = document.getElementById('hudHpCells');
    hpContainer.innerHTML = '';
    for (let i = 0; i < this.player.maxHp; i++) {
      const c = document.createElement('div');
      c.className = `hp-cell ${i < this.player.hp ? 'active' : ''}`;
      hpContainer.appendChild(c);
    }

    const shieldBadge = document.getElementById('hudShieldBadge');
    if (this.player.shield) {
      shieldBadge.className = 'shield-badge';
      shieldBadge.textContent = '🛡 護盾在線';
    } else {
      shieldBadge.className = 'shield-badge off';
      shieldBadge.textContent = '🛡 護盾離線';
    }

    document.getElementById('hudSyncBar').style.width = this.player.grazeSync + '%';
  }

  // ============================================================
  // 十大關卡神話主題專屬動態背景 (根據各關 Boss 招式與神話定制)
  // ============================================================
  renderStageBackground(ctx) {
    const s = this.stage || 1;
    const t = this.time;
    const W = this.W;
    const H = this.H;

    // 1. 各關卡專屬 9:16 垂直神話全景天幕 (沉浸天幕 + 超音速光流粒子，徹底消除上下拼貼接縫色差)
    const bgKey = `bg_stage_${s}`;
    const bgImg = this.images[bgKey] || this.images.bg;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      // 保持全景沉浸天幕，並帶有微幅戰術呼吸浮動感 (徹底避免上下硬拼接產生的色差割裂)
      const swayY = Math.sin(t * 0.4) * 6;
      ctx.drawImage(bgImg, 0, swayY, W, H);

      // (相容性保留標記: bgY - H 舊捲軸接縫割裂已升級為超音速粒子光流無縫天幕)
      const bgY = 0; // Legacy ref: bgY - H
    } else {
      // 備用漸層底色
      const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
      baseGrad.addColorStop(0, '#040d1a');
      baseGrad.addColorStop(1, '#0b223d');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. 超音速飛行流星與光速粒子 (3 層景深：遠景星塵、中景光束、近景拉絲)
    if (this.flightParticles && this.flightParticles.length > 0) {
      ctx.save();
      for (let i = 0; i < this.flightParticles.length; i++) {
        const fp = this.flightParticles[i];
        if (fp.layer === 0) {
          // 遠景星塵
          ctx.fillStyle = `rgba(255, 255, 255, ${fp.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fp.width * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (fp.layer === 1) {
          // 中景光束
          ctx.strokeStyle = `rgba(180, 220, 255, ${fp.alpha * 0.75})`;
          ctx.lineWidth = fp.width;
          ctx.beginPath();
          ctx.moveTo(fp.x, fp.y);
          ctx.lineTo(fp.x, fp.y + fp.len * 0.6);
          ctx.stroke();
        } else {
          // 近景超光速拉絲
          const grad = ctx.createLinearGradient(fp.x, fp.y, fp.x, fp.y + fp.len);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.5, `rgba(140, 210, 255, ${fp.alpha})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${fp.alpha * 1.2})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = fp.width * 1.4;
          ctx.beginPath();
          ctx.moveTo(fp.x, fp.y);
          ctx.lineTo(fp.x, fp.y + fp.len);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 2. 疊加各關卡神話環境氣氛微光與粒子
    ctx.save();
    switch (s) {
      case 1: // 迦樓羅・裂空王：金羽風切與浮空天宮微光
        ctx.strokeStyle = 'rgba(245, 188, 56, 0.22)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) {
          const lx = (i * 65 + t * 25) % W;
          const ly = (t * 400 + i * 120) % (H + 100) - 50;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx, ly + 40);
          ctx.stroke();
        }
        break;
      case 2: // 雷公・震霄：雷雲夜空遠景雷暴閃爍
        if (Math.sin(t * 8) > 0.88) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.fillRect(0, 0, W, H);
        }
        break;
      case 3: // 美杜莎・石化之眼：神廟幽綠石化浮塵
        for (let j = 0; j < 6; j++) {
          const fx = (Math.sin(t * 1.5 + j) * 45 + (j * 75)) % W;
          const fy = (t * 60 + j * 130) % H;
          ctx.fillStyle = 'rgba(72, 229, 131, 0.3)';
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 4: // 饕餮・貪暴之口：赤紅熔岩天門升騰餘燼
        for (let j = 0; j < 8; j++) {
          const fx = (Math.cos(t * 2.0 + j) * 50 + (j * 55)) % W;
          const fy = H - ((t * 80 + j * 90) % H);
          ctx.fillStyle = 'rgba(255, 100, 30, 0.4)';
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 5: // 阿特拉斯・擎天泰坦：星穹巨柱重力流光
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.18)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const y = (t * 40 + i * 220) % H;
          ctx.beginPath();
          ctx.arc(W / 2, y, 110 + i * 50, 0, Math.PI);
          ctx.stroke();
        }
        break;
      case 6: // 雅典娜・正義之矛：金色聖殿神聖光柱
        ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
        ctx.fillRect(W * 0.22, 0, W * 0.56, H);
        break;
      case 7: // 許德拉・蝕骨九頭蛇：酸液沼澤毒霧幽綠
        ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
        ctx.fillRect(0, 0, W, H);
        break;
      case 8: // 獨眼巨人・熔火之瞳：天爐熔岩高熱波紋
        if (Math.sin(t * 6) > 0.72) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
          ctx.fillRect(0, 0, W, H);
        }
        break;
      case 9: // 玉藻前・妖狐幻魅：櫻華血月夜櫻瓣與狐火
        for (let j = 0; j < 7; j++) {
          const fx = (Math.sin(t * 1.8 + j) * 60 + (j * 60)) % W;
          const fy = (t * 70 + j * 110) % H;
          ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 10: // 提亞瑪特・混沌創世龍：宇宙原初暗黑脈衝
        const pulse = Math.sin(t * 3) * 0.06 + 0.06;
        ctx.fillStyle = `rgba(168, 85, 247, ${pulse})`;
        ctx.fillRect(0, 0, W, H);
        break;
    }
    ctx.restore();

    // 基礎星光流動
    this.stars.forEach(st => {
      ctx.fillStyle = `rgba(220, 235, 255, ${st.alpha * 0.75})`;
      ctx.fillRect(st.x, st.y, st.size, st.size);
    });
  }

  // ============================================================
  // Canvas 渲染系統 (高細節機甲與戰場可讀性)
  // ============================================================
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    ctx.save();
    if (this.shakeDur > 0) {
      this.shakeDur -= 1 / 60;
      const ox = (Math.random() - 0.5) * this.shakeMag;
      const oy = (Math.random() - 0.5) * this.shakeMag;
      ctx.translate(ox, oy);
    }

    // 1. 各關卡專屬神話動態背景 (Stage 1~10 依神話 Boss 招式定制)
    this.renderStageBackground(ctx);

    // 2. 危險預警線與預警圈 (Telegraphs)
    this.hazardTelegraphs.forEach(h => {
      ctx.save();
      if (h.type === 'line') {
        ctx.fillStyle = h.color || 'rgba(255, 71, 102, 0.4)';
        ctx.fillRect(h.x1 - h.width / 2, h.y1, h.width, h.y2 - h.y1);
      } else if (h.type === 'circle') {
        ctx.strokeStyle = h.color || 'rgba(51, 224, 224, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = h.color.replace('0.5', '0.15');
        ctx.fill();
      }
      ctx.restore();
    });

    // 2.5 Boss / 小Boss 震撼降臨召喚法陣與空間裂隙衝擊波
    if (this.bossIntroSequence && this.bossIntroSequence.active) {
      const seq = this.bossIntroSequence;
      const boss = seq.boss;
      if (boss) {
        const progress = Math.max(0, Math.min(1.0, 1.0 - (seq.timer / seq.maxTimer)));
        const targetX = boss.x;
        const targetY = boss.targetY || 135;
        ctx.save();
        ctx.translate(targetX, targetY);

        const rot = this.time * 4.5;
        const hexR = seq.isMini ? 85 : 130;
        const mainColor = seq.isMini ? '#33e0e0' : '#ff4766';

        // 旋轉多重外光環
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, hexR, 0, Math.PI * 2);
        ctx.stroke();

        // 逆旋轉內同心環
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, hexR * 0.72, -rot * 1.4, -rot * 1.4 + Math.PI * 1.8);
        ctx.stroke();

        // 神聖召喚六芒星 / 八芒星陣
        ctx.beginPath();
        const pts = seq.isMini ? 6 : 8;
        for (let i = 0; i < pts; i++) {
          const a1 = rot + (i * Math.PI * 2 / pts);
          const a2 = rot + ((i + 2) * Math.PI * 2 / pts);
          ctx.moveTo(Math.cos(a1) * hexR, Math.sin(a1) * hexR);
          ctx.lineTo(Math.cos(a2) * hexR, Math.sin(a2) * hexR);
        }
        ctx.stroke();

        // 虛空裂隙粒子向中心匯聚
        for (let p = 0; p < 8; p++) {
          const ang = (p / 8) * Math.PI * 2 + rot * 2.0;
          const dist = hexR * (1.0 - ((progress * 2.5 + p * 0.12) % 1.0));
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // 衝擊波環擴散
        if (seq.shockwaveTriggered) {
          const shockRatio = Math.max(0, Math.min(1.0, 1.0 - seq.timer));
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - shockRatio)})`;
          ctx.lineWidth = 6 * (1 - shockRatio * 0.5);
          ctx.beginPath();
          ctx.arc(0, 0, shockRatio * 420, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 3. 稜鏡僚機射線渲染
    if (this.activePrisms) {
      this.activePrisms.forEach(p => {
        if (p.beamTarget) {
          ctx.save();
          ctx.strokeStyle = 'rgba(51, 224, 224, 0.8)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.beamTarget.x, p.beamTarget.y);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.beamTarget.x, p.beamTarget.y);
          ctx.stroke();

          if (p.secondTarget) {
            ctx.strokeStyle = 'rgba(0, 162, 255, 0.75)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.beamTarget.x, p.beamTarget.y);
            ctx.lineTo(p.secondTarget.x, p.secondTarget.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      });
    }

    // 3.5 熔岩地熱領域 (Meltdown Impact / Comet Spirit)
    if (this.lavaPools && this.lavaPools.length > 0) {
      this.lavaPools.forEach(lp => {
        ctx.save();
        const grad = ctx.createRadialGradient(lp.x, lp.y, 4, lp.x, lp.y, lp.r);
        grad.addColorStop(0, 'rgba(255, 145, 56, 0.7)');
        grad.addColorStop(0.6, 'rgba(255, 71, 102, 0.4)');
        grad.addColorStop(1, 'rgba(255, 71, 102, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, lp.r, 0, Math.PI * 2);
        ctx.fill();

        // 熔岩冒泡火星
        if (Math.random() < 0.25) {
          ctx.fillStyle = '#ffe680';
          ctx.beginPath();
          const bubbleX = lp.x + (Math.random() - 0.5) * lp.r * 1.3;
          const bubbleY = lp.y + (Math.random() - 0.5) * lp.r * 1.3;
          ctx.arc(bubbleX, bubbleY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    // 4. 迴轉光子球與軌道壁壘 (Orbital Aegis)
    if (this.orbitals) {
      this.orbitals.forEach(orb => {
        ctx.save();
        ctx.fillStyle = orb.isAegis ? '#33e0e0' : '#67ffff';
        ctx.shadowColor = orb.isAegis ? '#48e583' : '#00a2ff';
        ctx.shadowBlur = orb.isAegis ? 14 : 10;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
        if (orb.isAegis) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // 5. 玩家子彈 (支援真融合武器特效與 1-5 階視覺質變)
    this.bullets.forEach(b => {
      ctx.save();
      // 武器階級視覺層次 (Rank 1-5 肉眼可見階級進化)
      const rk = b.rank || 1;
      if (rk >= 2) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 5 + rk * 3;
      }
      if (rk >= 3) {
        // Rank 3+: 烈焰殘影光尾 (嚴格排除音波、神鐮、光刃、光束等特殊幾何武器，絕不繪製突兀實心圓圈)
        if (b.type !== 'sonic_wave' && b.type !== 'chronos_scythe' && b.type !== 'plasma_blade' && b.type !== 'beam') {
          ctx.fillStyle = b.color;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(b.x, b.y + 6, b.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }
      if (rk >= 4) {
        // Rank 4+: 熾烈電弧環繞 (排除音波、神鐮、光刃、光束)
        if (b.type !== 'sonic_wave' && b.type !== 'chronos_scythe' && b.type !== 'plasma_blade' && b.type !== 'beam') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          const arcAng = (this.time * 18 + b.x) % (Math.PI * 2);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 3, arcAng, arcAng + 1.2);
          ctx.stroke();
        }
      }
      if (rk >= 5) {
        // Rank 5 MAX: 弒神金曜星芒十字光暈 (排除音波與神鐮，避免在寬域彈道上出現突兀十字)
        if (b.type !== 'sonic_wave' && b.type !== 'chronos_scythe') {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(b.x - b.r - 4, b.y);
          ctx.lineTo(b.x + b.r + 4, b.y);
          ctx.moveTo(b.x, b.y - b.r - 4);
          ctx.lineTo(b.x, b.y + b.r + 4);
          ctx.stroke();
        }
      }

      if (b.type === 'spirit') {
        ctx.fillStyle = b.isComet ? '#f5bc38' : (b.isMax ? '#ffffff' : '#67ffff');
        ctx.shadowColor = b.isComet ? '#ff9138' : '#00a2ff';
        ctx.shadowBlur = b.r * 1.8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        // 彗星靈丸旋轉彗尾
        if (b.isComet) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 6, this.time * 8, this.time * 8 + Math.PI);
          ctx.stroke();
        }
      } else if (b.type === 'beam') {
        if (b.isRainbow) {
          const colors = ['#ff4766', '#f5bc38', '#48e583', '#33e0e0', '#b359ff'];
          const c = colors[Math.floor(this.time * 25) % colors.length];
          ctx.fillStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 12;
          ctx.fillRect(b.x - b.beamWidth / 2, b.y, b.beamWidth, 75);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x - b.beamWidth / 4, b.y, b.beamWidth / 2, 75);
        } else if (b.isChrono) {
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 12;
          ctx.fillRect(b.x - b.beamWidth / 2, b.y, b.beamWidth, 65);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x - b.beamWidth / 4, b.y, b.beamWidth / 2, 65);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x - b.beamWidth / 4, b.y, b.beamWidth / 2, 60);
          ctx.fillStyle = 'rgba(51, 224, 224, 0.5)';
          ctx.fillRect(b.x - b.beamWidth / 2, b.y, b.beamWidth, 60);
        }
      } else if (b.type === 'homing') {
        // 巡弋微型飛彈：高細節彈體、尾翼與後部推進烈焰
        ctx.save();
        ctx.translate(b.x, b.y);
        const ang = Math.atan2(b.vy, b.vx);
        ctx.rotate(ang);
        // 飛彈主體
        ctx.fillStyle = b.isSwarm ? '#38bdf8' : '#e2e8f0';
        ctx.fillRect(-8, -2.5, 14, 5);
        // 彈頭
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(6, -2.5); ctx.lineTo(12, 0); ctx.lineTo(6, 2.5);
        ctx.closePath();
        ctx.fill();
        // 側翼
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-8, -5, 3, 10);
        // 尾噴烈焰
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-8, -2); ctx.lineTo(-14 - Math.random() * 5, 0); ctx.lineTo(-8, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (b.type === 'grenade') {
        ctx.fillStyle = b.isMeltdown ? '#ff4766' : '#f5bc38';
        ctx.shadowColor = '#ff4766';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'spirit_orb') {
        // 靈丸能量球
        ctx.fillStyle = '#67ffff';
        ctx.shadowColor = '#00a2ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'chakram') {
        // 碧玉飛輪旋轉光刃
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation || (this.time * 14));
        ctx.fillStyle = 'rgba(72, 229, 131, 0.85)';
        ctx.shadowColor = '#48e583';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI / 2);
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * (b.r + 4), Math.sin(ang) * (b.r + 4));
        }
        ctx.stroke();
        ctx.restore();
      } else if (b.type === 'singularity') {
        // 奇異點黑洞重力漩渦 (AI 黑洞特效)
        const bhImg = this.images.fx_void_blackhole;
        if (bhImg && bhImg.complete && bhImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(this.time * 6.0);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(bhImg, -b.r * 1.5, -b.r * 1.5, b.r * 3.0, b.r * 3.0);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(b.x, b.y);
          const sRot = this.time * 8.0;
          ctx.fillStyle = '#0a001a';
          ctx.beginPath();
          ctx.arc(0, 0, b.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9d4edd';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#b359ff';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(0, 0, b.r + 3, sRot, sRot + Math.PI * 1.5);
          ctx.stroke();
          ctx.restore();
        }
      } else if (b.type === 'cryo_spire') {
        // 玄冰凌柱下墜突刺 (AI 冰晶特效)
        const cryoImg = this.images.fx_glacial_crystal;
        if (cryoImg && cryoImg.complete && cryoImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 4);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(cryoImg, -14, -14, 28, 28);
          ctx.restore();
        } else {
          ctx.fillStyle = '#a0f0ff'; ctx.shadowColor = '#67ffff'; ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y + 16); ctx.lineTo(b.x - 6, b.y - 14); ctx.lineTo(b.x + 6, b.y - 14);
          ctx.closePath(); ctx.fill();
        }
      } else if (b.type === 'holy_spear') {
        // 正義神矛 (AI 金矛特效)
        const spImg = this.images.fx_holy_spear;
        if (spImg && spImg.complete && spImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx) - Math.PI / 2);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(spImg, -14, -22, 28, 44);
          ctx.restore();
        } else {
          ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ff9138'; ctx.shadowBlur = 12;
          ctx.fillRect(b.x - 2, b.y - 20, 4, 40);
        }
      } else if (b.type === 'feather' || b.type === 'feather_blade') {
        // 金羽飛刃 (AI 神鳥金羽特效)
        const fImg = this.images.fx_golden_feather;
        if (fImg && fImg.complete && fImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 4);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(fImg, -14, -14, 28, 28);
          ctx.restore();
        } else {
          ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ff9138'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (b.type === 'flame' || b.type === 'flame_thrower') {
        // 烈焰噴射 (AI 熔火流星特效)
        const flImg = this.images.fx_fire_meteor;
        if (flImg && flImg.complete && flImg.naturalWidth > 0) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI * 0.75);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(flImg, -16, -16, 32, 32);
          ctx.restore();
        } else {
          ctx.fillStyle = '#ff9138'; ctx.shadowColor = '#ff4766'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (b.type === 'sonic_wave') {
        // 超聲震盪重砲：高科技同心超音速衝擊波弧光紋理 (前緣高亮白青，後掠同心震盪，絕無圓形殘影)
        ctx.save();
        // 1. 最外層超強高頻衝擊波前緣
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        // 2. 次層青藍能量聲波
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3.2;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, Math.max(10, b.r - 12), Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();

        // 3. 內層虛線微波震盪脈衝
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.6)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.arc(b.x, b.y, Math.max(6, b.r - 24), Math.PI * 1.22, Math.PI * 1.78);
        ctx.stroke();
        ctx.restore();
      } else if (b.type === 'emerald_pulse') {
        // 翡翠靈泉擴散環
        ctx.strokeStyle = 'rgba(72, 229, 131, 0.85)';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#48e583';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.type === 'kinetic_dart') {
        // 動能貫穿長箭
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00a2ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 1.5, b.y - 14, 3, 28);
        ctx.fillStyle = '#33e0e0';
        ctx.fillRect(b.x - 3, b.y - 6, 6, 12);
      } else if (b.type === 'chain_lightning') {
        // 雷公天劫電弧
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#67ffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 12);
        ctx.lineTo(b.x + (Math.random() - 0.5) * 8, b.y - 4);
        ctx.lineTo(b.x - (Math.random() - 0.5) * 8, b.y + 4);
        ctx.lineTo(b.x, b.y + 12);
        ctx.stroke();
      } else if (b.type === 'solar_flare') {
        // 熾陽日珥耀斑
        ctx.fillStyle = '#ff7a29';
        ctx.shadowColor = '#ff4766';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'plasma_blade') {
        // 等離子月牙光刃
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
        ctx.strokeStyle = '#48e583';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, -Math.PI * 0.6, -Math.PI * 0.4);
        ctx.stroke();
        ctx.restore();
      } else if (b.type === 'nano_swarm') {
        // 奈米蟲群晶核
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'photon_lance') {
        // 天啟破城光錐
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.fillRect(b.x - 3, b.y - 30, 6, 60);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(b.x - 6, b.y - 15, 12, 30);
      } else if (b.type === 'chronos_scythe') {
        // 時序輪迴神鐮：流線型命運月牙死神之刃 (金黃 + 虛空紫流光，徹底消除圓形實心/殘影)
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(this.time * 7);
        // 主弧光刀刃 (金黃漸層)
        const bladeGrad = ctx.createLinearGradient(-b.r, -b.r, b.r, b.r);
        bladeGrad.addColorStop(0, '#ffffff');
        bladeGrad.addColorStop(0.3, '#ffd700');
        bladeGrad.addColorStop(0.8, '#c084fc');
        bladeGrad.addColorStop(1, '#9333ea');
        
        ctx.strokeStyle = bladeGrad;
        ctx.lineWidth = 5.5;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        // 外弧月牙
        ctx.arc(0, 0, b.r, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        // 內刃鋒銳高光
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, b.r - 4, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();

        // 鋒刃兩端時空耀星
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(Math.cos(-Math.PI * 0.45) * b.r, Math.sin(-Math.PI * 0.45) * b.r, 3.5, 0, Math.PI * 2);
        ctx.arc(Math.cos(Math.PI * 0.45) * b.r, Math.sin(Math.PI * 0.45) * b.r, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (b.type === 'satellite_laser') {
        // 軌道衛星雷射
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 1.5, b.y - 10, 3, 20);
      } else {
        ctx.fillStyle = b.color || '#33e0e0';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 6. 敵方彈幕 (全量 AI 量身打造專屬元素貼圖與高質感能量光梭渲染，徹底消除粗糙圓圈)
    this.ebullets.forEach(eb => {
      ctx.save();
      if (eb.type === 'feather_shard') {
        const img = this.images.fx_feather_shard;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI / 2);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -14, -14, 28, 28);
        } else {
          ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ff9138'; ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, -12); ctx.lineTo(4, 8); ctx.lineTo(-4, 8); ctx.closePath();
          ctx.fill();
        }
      } else if (eb.type === 'feather' || eb.type === 'feather_storm') {
        const img = this.images.fx_golden_feather;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI / 4);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -14, -14, 28, 28);
        } else {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(Math.atan2(eb.vy, eb.vx));
          ctx.fillStyle = eb.color || '#f5bc38';
          ctx.shadowColor = '#ff9138';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(12, 0); ctx.quadraticCurveTo(0, -6, -10, 0); ctx.quadraticCurveTo(0, 6, 12, 0); ctx.fill();
        }
      } else if (eb.type === 'floating_feather') {
        const img = this.images.fx_golden_feather;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.sin(this.time * 4 + eb.x) * 0.4);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -18, -18, 36, 36);
        } else {
          ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ff9138'; ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(14, 0); ctx.quadraticCurveTo(0, -7, -12, 0); ctx.quadraticCurveTo(0, 7, 14, 0); ctx.fill();
        }
        // 爆炸倒數環狀指示
        const fuseRatio = Math.max(0, (eb.detonateTimer || 0) / 3.0);
        ctx.strokeStyle = `rgba(255, 71, 102, ${0.4 + 0.6 * (1 - fuseRatio)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2 * fuseRatio);
        ctx.stroke();
      } else if (eb.type === 'boulder') {
        // 阿特拉斯巨大隕石巨岩
        const img = this.images.fx_rock_shard;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(this.time * 3.5);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -22, -22, 44, 44);
        } else {
          ctx.fillStyle = '#d97706'; ctx.shadowColor = '#f5bc38'; ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(0, -20); ctx.lineTo(18, -10); ctx.lineTo(14, 16); ctx.lineTo(-12, 18); ctx.lineTo(-18, -8); ctx.closePath();
          ctx.fill();
        }
      } else if (eb.type === 'rock_fragment' || eb.type === 'slag') {
        // 爆裂岩石碎塊 / 鍛造高溫融渣
        const img = this.images.fx_rock_shard;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI / 2);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -12, -12, 24, 24);
        } else {
          ctx.fillStyle = eb.type === 'slag' ? '#ff9138' : '#f5bc38';
          ctx.shadowColor = '#ff4766'; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(0, -10); ctx.lineTo(8, 4); ctx.lineTo(-6, 8); ctx.closePath();
          ctx.fill();
        }
      } else if (eb.type === 'shrapnel') {
        // 自爆機兵高爆集群破片
        const img = this.images.fx_cluster_bomb;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI / 2);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -13, -13, 26, 26);
        } else {
          ctx.fillStyle = '#ff4766'; ctx.shadowColor = '#ff9138'; ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, -10); ctx.lineTo(8, 6); ctx.lineTo(-8, 6); ctx.closePath();
          ctx.fill();
        }
      } else if (eb.type === 'thunder' || eb.type === 'thunder_bolt') {
        // 雷電攻擊：垂直縱向貫穿延伸，沿彈道向量方向延伸拉長
        const img = this.images.fx_lightning;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.atan2(eb.vy, eb.vx) - Math.PI / 2);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.globalCompositeOperation = 'lighter';
          if (eb.type === 'thunder_bolt') {
            // 天劫落雷 / 神雷重殛：縱向超長雷光槍 (112px)
            ctx.drawImage(img, -14, -56, 28, 112);
          } else {
            // 雷公雷鼓疾電：縱向雷弧梭 (60px)
            ctx.drawImage(img, -12, -30, 24, 60);
          }
        } else {
          ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#67ffff'; ctx.shadowBlur = 14;
          const h = eb.type === 'thunder_bolt' ? 60 : 36;
          ctx.fillRect(-3, -h / 2, 6, h);
        }
      } else if (eb.type === 'fireball' || eb.type === 'magma') {
        const img = this.images.fx_fire_meteor;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI * 0.75);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -20, -20, 40, 40);
        } else {
          ctx.fillStyle = '#ff9138'; ctx.shadowColor = '#ff4766'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (eb.type === 'petrify_beam' || eb.type === 'mirror_bullet') {
        const img = this.images.fx_glacial_crystal;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI / 4);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -16, -16, 32, 32);
        } else {
          ctx.fillStyle = '#c054ff'; ctx.shadowColor = '#d991ff'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (eb.type === 'venom') {
        const img = this.images.fx_toxic_acid_orb;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(this.time * 4);
          ctx.drawImage(img, -16, -16, 32, 32);
        } else {
          ctx.fillStyle = '#48e583'; ctx.shadowColor = '#48e583'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (eb.type === 'holy_spear') {
        const img = this.images.fx_holy_spear;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(Math.atan2(eb.vy, eb.vx) - Math.PI / 2);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -16, -26, 32, 52);
        } else {
          ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffea00'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (eb.type === 'chaos' || eb.type === 'chaos_nova') {
        const img = this.images.fx_void_blackhole;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.translate(eb.x, eb.y);
          ctx.rotate(this.time * 6);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -20, -20, 40, 40);
        } else {
          ctx.fillStyle = '#b359ff'; ctx.shadowColor = '#ff4766'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (eb.type === 'foxfire') {
        const img = this.images.fx_fire_meteor;
        ctx.translate(eb.x, eb.y);
        ctx.rotate(this.time * 4);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, -15, -15, 30, 30);
        } else {
          ctx.fillStyle = '#e0409a'; ctx.shadowColor = '#ff4766'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(0, 0, eb.r, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // 常規敵彈：升級為動態定向氣動能量光梭 (非單調平面圓圈)
        ctx.translate(eb.x, eb.y);
        const spd = Math.hypot(eb.vx, eb.vy);
        if (spd > 35) {
          ctx.rotate(Math.atan2(eb.vy, eb.vx));
          const bulletLen = Math.max(eb.r * 2.2, 12);
          const bulletWid = Math.max(eb.r * 1.0, 4.5);
          const grad = ctx.createLinearGradient(-bulletLen * 0.7, 0, bulletLen * 0.6, 0);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.3, eb.color || '#ff4766');
          grad.addColorStop(1, '#ffffff');
          ctx.fillStyle = grad;
          ctx.shadowColor = eb.color || '#ff4766';
          ctx.shadowBlur = 9;
          ctx.beginPath();
          ctx.ellipse(0, 0, bulletLen * 0.7, bulletWid * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          // 內部耀斑高光
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(bulletLen * 0.25, 0, bulletLen * 0.3, bulletWid * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 靜止/懸浮子彈：立體聚能光球
          const grad = ctx.createRadialGradient(-eb.r * 0.3, -eb.r * 0.3, 1, 0, 0, eb.r);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.4, eb.color || '#ff4766');
          grad.addColorStop(1, 'rgba(0,0,0,0.5)');
          ctx.fillStyle = grad;
          ctx.shadowColor = eb.color || '#ff4766';
          ctx.shadowBlur = 9;
          ctx.beginPath();
          ctx.arc(0, 0, eb.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });

    // 6.5 靈丸純白擴散衝擊波與星芒光環 (幽遊白書經典視覺)
    if (this.reiganShockwaves && this.reiganShockwaves.length > 0) {
      this.reiganShockwaves.forEach(sw => {
        ctx.save();
        const progress = 1 - (sw.life / sw.maxLife);
        const curR = sw.r + (sw.maxR - sw.r) * Math.sin(progress * Math.PI / 2);
        const alpha = Math.max(0, sw.life / sw.maxLife);

        // 外層耀眼純白厚擴散光環
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
        ctx.shadowColor = sw.isComet ? '#ff9138' : '#ffffff';
        ctx.shadowBlur = 24;
        ctx.lineWidth = 5 * alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, curR, 0, Math.PI * 2);
        ctx.stroke();

        // 內層次級幽藍/金黃光環
        ctx.strokeStyle = sw.isComet ? `rgba(245, 188, 56, ${alpha * 0.8})` : `rgba(103, 255, 255, ${alpha * 0.8})`;
        ctx.shadowColor = sw.isComet ? '#f5bc38' : '#33e0e0';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, curR * 0.72, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });
    }

    // 7. 多元雜兵渲染 (4 款專屬造型、受擊白光與重裝血條)
    this.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x + (e.flinchX || 0), e.y);

      if (e.hitFlashTimer > 0) {
        ctx.filter = 'brightness(2.8) contrast(1.5)';
      }

      let img = null;
      let w = 46, h = 46;
      if (e.type === 'scout') {
        img = this.images.enemy_scout;
        w = 42; h = 42;
      } else if (e.type === 'gunner') {
        img = this.images.enemy_gunner;
        w = 46; h = 46;
      } else if (e.type === 'star') {
        img = this.images.enemy_star;
        w = 46; h = 46;
        ctx.rotate(e.rotation || 0);
      } else if (e.type === 'bastion') {
        img = this.images.enemy_bastion;
        w = 60; h = 60;
      } else if (e.type === 'charger') {
        img = this.images.enemy_charger;
        w = 46; h = 46;
      } else if (e.type === 'bomber') {
        img = this.images.enemy_bomber;
        w = 48; h = 48;
        if (e.fuse > 0) {
          const pulse = 1.0 + Math.sin(this.time * 25) * 0.15;
          ctx.scale(pulse, pulse);
        }
      } else {
        img = this.images.enemy;
      }

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.fillStyle = e.type === 'scout' ? '#ec4899' : (e.type === 'gunner' ? '#10b981' : (e.type === 'star' ? '#f59e0b' : '#a855f7'));
        ctx.beginPath();
        ctx.moveTo(0, 20); ctx.lineTo(-18, -16); ctx.lineTo(18, -16); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -3, 6, 6);
      }
      ctx.restore();

      // 小型血條指示（重型敵機受到傷害時顯示）
      if ((e.type === 'bastion' || e.type === 'star') && e.hp < e.maxHp) {
        ctx.save();
        const barW = e.r * 2;
        const barH = 3;
        const hpRatio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(e.x - barW / 2, e.y - e.r - 8, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : (hpRatio > 0.25 ? '#f59e0b' : '#ef4444');
        ctx.fillRect(e.x - barW / 2, e.y - e.r - 8, barW * hpRatio, barH);
        ctx.restore();
      }
    });

    // 7.4 戰術視覺化：Boss 與附屬核心（金羽錨點 / 天雷法鼓 / 蛇髮魔鏡）間的高能能量連結光束
    if (this.currentBoss && !this.currentBoss.dead && !this.currentBoss.dying && this.bossMinions && this.bossMinions.length > 0) {
      const b = this.currentBoss;
      this.bossMinions.forEach(m => {
        if (m.dead) return;
        ctx.save();
        let beamColor = '#ffd700';
        let glowCol = '#f59e0b';
        if (m.type === 'thunder_drum_anchor' || m.type === 'thunder_drum') {
          beamColor = '#38bdf8'; glowCol = '#0284c7';
        } else if (m.type === 'gorgon_hex_mirror' || m.type === 'gorgon_shadow') {
          beamColor = '#c084fc'; glowCol = '#9333ea';
        }
        ctx.strokeStyle = beamColor;
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 10;
        ctx.lineWidth = b.invulnerable ? 2.8 : 1.5;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -this.time * 30;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // 沿著連結光束向錨點流動之能量脈衝粒子
        const pulseT = (this.time * 2.2 + (m.x || 0) * 0.01) % 1.0;
        const px = b.x + (m.x - b.x) * pulseT;
        const py = b.y + (m.y - b.y) * pulseT;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 7.5 神話機制專屬附屬實體渲染 (Sprite 圖形化管線：全量採用專屬 AI Sprite 與動態 HUD 儀表，告別圓圈)
    if (this.bossMinions && this.bossMinions.length > 0) {
      this.bossMinions.forEach(m => {
        if (m.dead) return;
        ctx.save();
        ctx.translate(m.x, m.y);

        let spriteImg = null;
        let spriteW = m.r * 2.4;
        let spriteH = m.r * 2.4;
        let label = m.name || '召喚物';
        let barColor = '#f5bc38';
        let glowColor = '#ffd700';

        if (m.type === 'ambrosia_bottle' || m.type === 'ambrosia_vessel' || m.type === 'elixir_flask') {
          // 雅典娜聖水瓶 / 神酒仙樽 (Ambrosia Vessel)
          spriteImg = this.images.minion_ambrosia_flask;
          spriteW = 48; spriteH = 48;
          label = `🏺 神聖甘露仙瓶 ${m.timer !== undefined ? m.timer.toFixed(1) + 's' : ''}`;
          barColor = '#48e583';
          glowColor = '#ffd700';
          // 仙樽漂浮呼吸動態
          ctx.translate(0, Math.sin(this.time * 4) * 3);
        } else if (m.type === 'taotie_food' || m.type === 'taotie_meat') {
          // 饕餮貪食傀儡 / 血肉核心
          spriteImg = this.images.minion_taotie_meat;
          spriteW = 40; spriteH = 40;
          label = '🥩 饕餮血肉傀儡 (速阻!)';
          barColor = '#ff4766';
          glowColor = '#ff4766';
          const pulse = 1 + Math.sin(this.time * 8 + m.x) * 0.08;
          ctx.scale(pulse, pulse);
        } else if (m.type === 'hydra_head') {
          // 九頭蛇毒首分身
          spriteImg = this.images.minion_hydra_head;
          spriteW = 46; spriteH = 46;
          label = '🐍 淵毒蛇首要塞';
          barColor = '#48e583';
          glowColor = '#33e0e0';
          ctx.rotate(Math.sin(this.time * 3 + m.x) * 0.15);
        } else if (m.type === 'thunder_drum') {
          // 雷公乾坤雷鼓
          spriteImg = this.images.minion_thunder_drum;
          spriteW = 48; spriteH = 48;
          label = '🥁 乾坤震雷戰鼓';
          barColor = '#38bdf8';
          glowColor = '#ffd700';
          // 雷鼓背景戰意旋轉金環
          ctx.save();
          const drumRot = this.time * 3.5;
          ctx.strokeStyle = 'rgba(245, 188, 56, 0.6)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, m.r + 4, drumRot, drumRot + Math.PI * 1.5);
          ctx.stroke();
          ctx.restore();
        } else if (m.type === 'gorgon_shadow' || m.type === 'gorgon_clone') {
          // 美杜莎石化殘影 / 蛇髮分身
          spriteImg = this.images.minion_gorgon_shadow;
          spriteW = 46; spriteH = 46;
          label = '👁️ 戈爾貢蛇影殘像';
          barColor = '#b359ff';
          glowColor = '#9d4edd';
          ctx.globalAlpha = 0.88 + Math.sin(this.time * 6) * 0.12;
        } else if (m.type === 'celestial_pillar' || m.type === 'titan_pillar') {
          // 阿特拉斯擎天神柱
          spriteImg = this.images.minion_titan_pillar;
          spriteW = 40; spriteH = 58;
          label = `🏛️ 擎天重力柱 ${m.timer !== undefined ? m.timer.toFixed(1) + 's' : ''}`;
          barColor = '#f5bc38';
          glowColor = '#ff9138';
        } else if (m.type === 'garuda_viper') {
          // 迦樓羅風神翼蛇
          spriteImg = this.images.minion_garuda_viper;
          spriteW = 44; spriteH = 44;
          label = '🪶 風神翠玉翼蛇';
          barColor = '#48e583';
          glowColor = '#4ade80';
          if (m.vx || m.vy) {
            ctx.rotate(Math.atan2(m.vy || 1, m.vx || 0) - Math.PI / 2);
          }
        } else if (m.type === 'forge_core') {
          // 獨眼巨人赫菲斯托斯鍛造熔爐
          spriteImg = this.images.minion_thunder_drum;
          spriteW = 50; spriteH = 50;
          label = '🔥 赫菲斯托斯天爐核心';
          barColor = '#ff4766';
          glowColor = '#ff9138';
        } else if (m.type === 'sessho_seki') {
          // 玉藻前殺生石
          spriteImg = this.images.minion_gorgon_shadow;
          spriteW = 46; spriteH = 46;
          label = '🦊 妖狐殺生石';
          barColor = '#e0409a';
          glowColor = '#b359ff';
        } else if (m.type === 'chaos_egg') {
          // 提亞瑪特混沌龍卵
          spriteImg = this.images.fx_void_blackhole;
          spriteW = 48; spriteH = 48;
          label = '🌌 混沌原初龍卵';
          barColor = '#b359ff';
          glowColor = '#67ffff';
        } else if (m.type === 'garuda_feather_anchor') {
          // 迦樓羅涅槃金羽錨點
          spriteImg = this.images.fx_feather_shard;
          spriteW = 42; spriteH = 42;
          label = '🪶 涅槃金羽錨點 [⚡需靈丸破壞]';
          barColor = '#ffd700';
          glowColor = '#ff9138';
          ctx.rotate(this.time * 3);
        } else if (m.type === 'thunder_drum_anchor') {
          // 雷公天劫法鼓錨點
          spriteImg = this.images.minion_thunder_drum;
          spriteW = 48; spriteH = 48;
          label = '🥁 天雷法鼓 [⚡需靈丸破壞]';
          barColor = '#38bdf8';
          glowColor = '#38bdf8';
        } else if (m.type === 'gorgon_hex_mirror') {
          // 美杜莎蛇髮魔鏡
          spriteImg = this.images.minion_gorgon_shadow;
          spriteW = 44; spriteH = 44;
          label = '🪞 蛇髮魔鏡 [⚡需靈丸破壞]';
          barColor = '#c054ff';
          glowColor = '#c054ff';
          ctx.rotate(this.time * 2);
        }

        // 1. 繪製精美 Sprite 貼圖 (若貼圖存在)
        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 14;
          ctx.drawImage(spriteImg, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
        } else {
          // 備用幾何戰術多邊形晶核 (絕非單調平塗圓圈)
          ctx.fillStyle = barColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          const sides = 6;
          for (let s = 0; s < sides; s++) {
            const a = (s / sides) * Math.PI * 2;
            const px = Math.cos(a) * m.r;
            const py = Math.sin(a) * m.r;
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }

        // 1.5 靈丸專屬結界能量光環 (旋轉天青靈能虛線環)
        if (m.requiresSpirit) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -this.time * 24;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(spriteW, spriteH) / 2 + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 2. 限時機制的圓形進度計時環 (僅作為 HUD 儀表，不遮擋主體)
        if (m.timer !== undefined && m.timer > 0) {
          const maxT = m.type === 'celestial_pillar' ? 8.0 : 6.0;
          const timerRatio = Math.max(0, m.timer / maxT);
          ctx.strokeStyle = timerRatio > 0.35 ? '#48e583' : '#ff4766';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = timerRatio > 0.35 ? '#48e583' : '#ff4766';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(spriteW, spriteH) / 2 + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerRatio);
          ctx.stroke();
        }

        // 2.5 戰術瞄準指示準星 (🎯 弱點目標 / ⚡ 需靈丸破壞)
        if (this.currentBoss && (this.currentBoss.invulnerable || m.type.includes('anchor') || m.type === 'thunder_drum_anchor' || m.type === 'gorgon_hex_mirror')) {
          ctx.save();
          const retRot = this.time * 3.5;
          ctx.strokeStyle = m.requiresSpirit ? '#38bdf8' : '#ff4766';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = m.requiresSpirit ? '#38bdf8' : '#ff4766';
          ctx.shadowBlur = 10;
          const retR = Math.max(spriteW, spriteH) / 2 + 7;
          ctx.beginPath();
          ctx.arc(0, 0, retR, retRot, retRot + Math.PI * 0.45);
          ctx.arc(0, 0, retR, retRot + Math.PI, retRot + Math.PI * 1.45);
          ctx.stroke();

          // 懸浮弱點標籤
          ctx.fillStyle = m.requiresSpirit ? '#38bdf8' : '#ff4766';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 4;
          const retLabelY = -Math.max(spriteW, spriteH) / 2 - 20;
          ctx.fillText(m.requiresSpirit ? '⚡ 需靈丸破壞' : '🎯 優先擊破弱點', 0, retLabelY);
          ctx.restore();
        }

        // 3. 戰術頂部懸浮名牌
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 3;
        const tagY = -Math.max(spriteW, spriteH) / 2 - 8;
        ctx.strokeText(label, 0, tagY);
        ctx.fillText(label, 0, tagY);

        // 4. 精密健康度血條
        if (m.maxHp && m.hp !== undefined) {
          const barW = Math.max(42, m.r * 2);
          const barH = 5;
          const barY = Math.max(spriteW, spriteH) / 2 + 6;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);
          const hpRatio = Math.max(0, Math.min(1, m.hp / m.maxHp));
          ctx.fillStyle = barColor;
          ctx.shadowColor = barColor;
          ctx.shadowBlur = 4;
          ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
        }

        ctx.restore();
      });
    }

    // 8. 神話 Boss 渲染 (多型態體型質變、能量神翼、光環光刃與眼部光束耀斑)
    if (this.currentBoss && !this.currentBoss.dead) {
      const b = this.currentBoss;
      ctx.save();
      ctx.translate(b.x + (b.shakeOffsetX || 0), b.y + (b.shakeOffsetY || 0));

      // 動態調整體型尺寸與碰撞體積 (Phase 1: 165px, Phase 2: 205px [+25%], Phase 3: 245px [+50%])
      const size = b.isMini ? 125 : (b.phase === 3 ? 245 : (b.phase >= 2 ? 205 : 165));
      b.hitboxRadius = (b.isMini ? 42 : 50) * (b.phase === 3 ? 1.45 : (b.phase >= 2 ? 1.25 : 1.0));

      if (b.dying) {
        // 大破滅瀕死過載白光頻閃
        if (Math.floor(this.time * 24) % 2 === 0) {
          ctx.filter = 'brightness(3.5) contrast(1.8)';
        }
      } else if (b.hitFlash > 0) {
        b.hitFlash -= 1 / 60;
        ctx.filter = 'brightness(2.4)';
      } else if (b.phase === 3) {
        // Phase 3: 宇宙原初神性狂暴濾鏡
        ctx.filter = 'saturate(1.8) hue-rotate(180deg) brightness(1.15)';
      } else if (b.phase >= 2) {
        // Phase 2: 狂暴深紅神格重構濾鏡
        ctx.filter = 'saturate(1.4) hue-rotate(-20deg)';
      }

      // 8.1 渲染神話機神階段動態能量羽翼 (展翼於機身後方)
      this.renderBossEnergyWings(ctx, b, this.time);

      // 8.2 渲染神話機神光環、電弧與神格氣場
      this.renderBossAuras(ctx, b, this.time);

      // 8.25 無敵神盾：高科技六角能量蜂巢力場與戰術 IMMUNE 浮空文字
      if (b.invulnerable) {
        ctx.save();
        const shieldR = b.hitboxRadius + 18;
        const shieldPulse = 1.0 + Math.sin(this.time * 8) * 0.04;
        ctx.scale(shieldPulse, shieldPulse);

        // 外層旋轉六角能量力場
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ff9138';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        const hexAngle = this.time * 1.5;
        for (let s = 0; s < 6; s++) {
          const a = hexAngle + (s / 6) * Math.PI * 2;
          const hx = Math.cos(a) * shieldR;
          const hy = Math.sin(a) * shieldR;
          if (s === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        // 內層半透明防護力場
        ctx.fillStyle = 'rgba(245, 188, 56, 0.16)';
        ctx.fill();

        // 懸浮 IMMUNE 無敵警示標記
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 4;
        ctx.strokeText('🛡️ IMMUNE 無敵', 0, -shieldR - 10);
        ctx.fillText('🛡️ IMMUNE 無敵', 0, -shieldR - 10);
        ctx.restore();
      }

      // 8.3 繪製 Boss 主體機甲
      const img = this.images[b.assetKey];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = '#141e30';
        ctx.beginPath();
        ctx.arc(0, 0, b.hitboxRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0409a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // 8.4 渲染機神眼部光束耀斑與動力爐光芒
      this.renderBossOpticFlares(ctx, b, this.time);

      if (this.showHitbox) {
        ctx.strokeStyle = '#ff4766';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, b.hitboxRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8.5 Boss 破滅神光、衝擊波與金屬碎片殘骸渲染
    if (this.bossDeathSequence && this.bossDeathSequence.boss) {
      const seq = this.bossDeathSequence;
      const b = seq.boss;

      // 1. 穿甲破裂神光束 (God Rays)
      seq.godRays.forEach(ray => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ray.angle);
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createLinearGradient(0, 0, ray.length, 0);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, ray.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, -ray.width / 2, ray.length, ray.width);
        ctx.restore();
      });

      // 2. 超新星外擴衝擊波 (Concentric Shockwaves)
      seq.shockwaves.forEach(sw => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 4 + (1.0 - sw.alpha) * 8;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(b.x, b.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 3. 散落翻滾的機甲殘骸 (Debris Shards)
      seq.shards.forEach(sh => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.globalAlpha = sh.alpha;
        ctx.fillStyle = sh.color;
        ctx.shadowColor = sh.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-sh.size, -sh.size / 2);
        ctx.lineTo(sh.size, -sh.size / 3);
        ctx.lineTo(sh.size / 2, sh.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }

    // 9. 玩家戰機渲染
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invulnTime > 0 && Math.floor(this.time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (this.images.player && this.images.player.complete && this.images.player.naturalWidth > 0) {
      ctx.drawImage(this.images.player, -32, -32, 64, 64);
    } else {
      ctx.fillStyle = '#1c2436';
      ctx.beginPath();
      ctx.moveTo(0, -28); ctx.lineTo(-24, 22); ctx.lineTo(0, 14); ctx.lineTo(24, 22); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#33e0e0';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 小型核心判定發光點 (半徑 7px，約機身 22%)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#33e0e0';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, p.hitboxRadius, 0, Math.PI * 2);
    ctx.fill();

    if (this.showHitbox) {
      ctx.strokeStyle = 'rgba(255, 71, 102, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.hitboxRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(51, 224, 224, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, p.grazeRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 9.5 靈丸全螢幕按壓蓄力光環 (On-Canvas Spirit Charge Aura)
    if (this.spiritCharge && this.spiritCharge.isCharging) {
      const chargeRatio = Math.min(1.0, this.spiritCharge.chargeTime / 2.6);
      const tier = this.spiritCharge.currentTier;
      const isComet = this.isFusionActive('comet_spirit');
      const baseR = p.hitboxRadius + 14 + chargeRatio * 18;

      ctx.save();
      ctx.translate(p.x, p.y);

      // 旋轉動態電光外環
      const rot = this.time * 6.0;
      ctx.strokeStyle = isComet ? '#f5bc38' : (tier === 5 ? '#ffffff' : (tier >= 3 ? '#67ffff' : '#33e0e0'));
      ctx.lineWidth = 3 + chargeRatio * 3;
      ctx.shadowColor = isComet ? '#f5bc38' : (tier === 5 ? '#67ffff' : '#00a2ff');
      ctx.shadowBlur = 12 + chargeRatio * 16;

      ctx.beginPath();
      ctx.arc(0, 0, baseR, rot, rot + Math.PI * 2 * chargeRatio);
      ctx.stroke();

      // 內圈脈衝環
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.hitboxRadius + 6, -rot * 1.5, -rot * 1.5 + Math.PI * 1.5);
      ctx.stroke();

      // MAX 充能時四射電弧
      if (tier === 5 || isComet) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let a = 0; a < 4; a++) {
          const arcAng = (a / 4) * Math.PI * 2 + rot * 0.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(arcAng) * (baseR - 4), Math.sin(arcAng) * (baseR - 4));
          ctx.lineTo(Math.cos(arcAng) * (baseR + 12), Math.sin(arcAng) * (baseR + 12));
          ctx.stroke();
        }
      }

      // 戰機上方飄浮蓄力進度字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const tierLabel = isComet ? '⚡ 彗星靈丸 MAX' : (tier === 5 ? '⚡ 靈丸 MAX' : `靈丸蓄力 ${Math.floor(chargeRatio * 100)}%`);
      ctx.fillText(tierLabel, 0, -baseR - 8);

      ctx.restore();
    }

    // 10. 粒子與飄字 (依使用者需求關閉浮動傷害數字以維持戰鬥畫面清爽)
    this.particles.forEach(pt => pt.draw(ctx));
    if (this.showDamageNumbers) {
      this.damageNumbers.forEach(dn => dn.draw(ctx));
    }

    // 11. 全螢幕超新星大破滅強光白光濾鏡 (Nuclear White Flash Overlay)
    if (this.screenFlashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, this.screenFlashAlpha)})`;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }

    ctx.restore();
  }

  // 渲染 Boss 階段神話動態羽翼 (Phase 2 雙翼 / Phase 3 四重神聖羽翼)
  renderBossEnergyWings(ctx, b, time) {
    if (b.phase < 2) return;
    ctx.save();
    const flap = Math.sin(time * 5.5) * 0.22;
    const span = b.phase === 3 ? 140 : 105;

    for (let side = -1; side <= 1; side += 2) {
      const wingLayers = b.phase === 3 ? 2 : 1;
      for (let w = 0; w < wingLayers; w++) {
        ctx.save();
        const baseAngle = side * (0.45 + w * 0.4) + flap * side;
        ctx.rotate(baseAngle);

        // 羽翼能量羽瓣 (4 枚能量光刃組成一側翅膀)
        for (let f = 0; f < 4; f++) {
          const fLen = span * (1.0 - f * 0.18);
          const fWidth = 14 - f * 2.5;
          const fOffset = f * 12;

          ctx.beginPath();
          ctx.moveTo(side * 25, -fOffset);
          ctx.quadraticCurveTo(side * (fLen * 0.6), -fOffset - 18, side * fLen, -fOffset + 6);
          ctx.quadraticCurveTo(side * (fLen * 0.5), -fOffset + fWidth, side * 25, -fOffset + fWidth);
          ctx.closePath();

          const grad = ctx.createLinearGradient(side * 25, 0, side * fLen, 0);
          if (b.phase === 3) {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.35, 'rgba(168, 85, 247, 0.85)');
            grad.addColorStop(1, 'rgba(250, 204, 21, 0.75)');
          } else {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.4, 'rgba(255, 71, 102, 0.85)');
            grad.addColorStop(1, 'rgba(245, 188, 56, 0.7)');
          }
          ctx.fillStyle = grad;
          ctx.shadowColor = b.phase === 3 ? '#facc15' : '#ff4766';
          ctx.shadowBlur = 14;
          ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // 渲染 Boss 階段神格光環與環繞電弧 (Phase 2/3 神威符印)
  renderBossAuras(ctx, b, time) {
    if (b.phase < 2) return;
    ctx.save();

    // 1. 旋轉符印光環
    const r1 = b.hitboxRadius + 26;
    ctx.strokeStyle = b.phase === 3 ? 'rgba(250, 204, 21, 0.85)' : 'rgba(255, 71, 102, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = b.phase === 3 ? '#facc15' : '#ff4766';
    ctx.shadowBlur = 12;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, r1, time * 2.2, time * 2.2 + Math.PI * 2);
    ctx.stroke();

    if (b.phase === 3) {
      // Phase 3: 第二重逆向宇宙光環
      const r2 = b.hitboxRadius + 44;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, r2, -time * 1.8, -time * 1.8 + Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. 機體放射電漿弧線
    const arcCount = b.phase === 3 ? 6 : 4;
    for (let i = 0; i < arcCount; i++) {
      const a = (i / arcCount) * Math.PI * 2 + time * 3.0;
      const innerR = b.hitboxRadius * 0.7;
      const outerR = r1 + Math.sin(time * 8.0 + i) * 8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      const midA = a + (Math.random() - 0.5) * 0.3;
      ctx.lineTo(Math.cos(midA) * (innerR + outerR) * 0.5, Math.sin(midA) * (innerR + outerR) * 0.5);
      ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
      ctx.stroke();
    }

    // 3. 迦樓羅專屬：金羽神盾環繞羽刃屏障 (承受 10,000 傷害破盾)
    if (b.stage === 1 && b.featherBarrierHp > 0) {
      const featherOrbCount = 8;
      const shieldR = b.hitboxRadius + 32;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
      ctx.stroke();

      // 環繞旋轉的黃金羽刃
      for (let f = 0; f < featherOrbCount; f++) {
        const fa = (f / featherOrbCount) * Math.PI * 2 + time * 3.5;
        const fx = Math.cos(fa) * shieldR;
        const fy = Math.sin(fa) * shieldR;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(fa + Math.PI / 2);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(5, 5);
        ctx.lineTo(0, 12);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 渲染 Boss 眼部/核心光學耀斑 (Anamorphic Visor Flare & Reactor Glow)
  renderBossOpticFlares(ctx, b, time) {
    ctx.save();
    const size = b.isMini ? 125 : (b.phase === 3 ? 245 : (b.phase >= 2 ? 205 : 165));

    // 1. 動力爐核心光暈
    const corePulse = 0.8 + Math.sin(time * 6.0) * 0.25;
    const coreColor = b.phase === 3 ? '#facc15' : (b.phase >= 2 ? '#ff4766' : '#38bdf8');
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * corePulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, coreColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. 機神眼部光束耀斑 (水平光學橫向拉絲光束)
    if (b.phase >= 2) {
      const beamWidth = size * 0.65;
      const beamGrad = ctx.createLinearGradient(-beamWidth / 2, 0, beamWidth / 2, 0);
      beamGrad.addColorStop(0, 'transparent');
      beamGrad.addColorStop(0.5, '#ffffff');
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(-beamWidth / 2, -size * 0.12, beamWidth, 3.5);
    }
    ctx.restore();
  }

  // ============================================================
  // LAB 面板與輔助測試
  // ============================================================
  togglePause() {
    if (this.state === 'playing') {
      this.state = 'pause';
      this.updatePermissionUI();
      document.getElementById('pauseScreen').classList.remove('hidden');
      this.renderPauseArmory();
    } else if (this.state === 'pause') {
      this.state = 'playing';
      document.getElementById('pauseScreen').classList.add('hidden');
    }
  }

  // 作戰武裝庫整備 (支援主動武器 3 槽裝備/卸下/替換，與被動輔助裝置監控)
  // 作戰武裝庫整備 (緊湊型小圖示網格 + 即時戰術檢視面板 Inspector)
  renderPauseArmory() {
    const slotsGrid = document.getElementById('pauseActiveSlotsGrid');
    const activeTiles = document.getElementById('pauseActiveTilesContainer') || document.getElementById('pauseTilesContainer');
    const passiveTiles = document.getElementById('pausePassiveTilesContainer');
    const inspector = document.getElementById('armoryInspector');
    const countBadge = document.getElementById('activeSlotsCount');

    if (!slotsGrid || !activeTiles || !inspector) return;

    if (!this.equippedActiveWeapons) {
      this.equippedActiveWeapons = ['multishot'];
    }

    if (countBadge) {
      countBadge.textContent = `${this.equippedActiveWeapons.length} / 3`;
    }

    // 1. 渲染主動槽位 (3 個緊湊雙行卡片，確保 3 槽一覽無餘免拖曳)
    slotsGrid.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const wepId = this.equippedActiveWeapons[i];
      const slotEl = document.createElement('div');
      slotEl.className = `armory-slot-compact ${wepId ? 'equipped' : 'empty'}`;

      if (wepId) {
        const cat = STARFALL_WEAPONS_CATALOG.find(w => w.id === wepId) || {};
        const ars = this.arsenal[wepId] || { rank: 1, quality: 'common' };
        // 第一行顯示完整名稱，第二行顯示等級與卸下選項 (免除「主動欄 01」冗餘標註)
        slotEl.innerHTML = `
          <div class="slot-line-top" title="${cat.name || wepId}">${cat.name || wepId}</div>
          <div class="slot-line-bottom">
            <span class="slot-compact-lv">Lv.${ars.rank}</span>
            <button class="slot-compact-unequip" title="卸下此武器">卸下</button>
          </div>
        `;
        slotEl.onclick = () => {
          this.inspectedWeaponId = wepId;
          this.renderPauseArmory();
        };
        const unequipBtn = slotEl.querySelector('.slot-compact-unequip');
        if (unequipBtn) {
          unequipBtn.onclick = (e) => {
            e.stopPropagation();
            this.equippedActiveWeapons.splice(i, 1);
            this.renderPauseArmory();
            this.showToast(`已從主動槽位卸下 ${cat.name || wepId}`);
          };
        }
      } else {
        slotEl.innerHTML = `
          <div class="slot-line-top" style="color:var(--text-muted); font-size:10px;">（未裝備槽位）</div>
          <div class="slot-line-bottom">
            <span style="font-size:9px; color:var(--text-muted);">點選主動武器</span>
            <span style="font-size:11px; color:var(--cyan-bright); font-weight:bold;">＋</span>
          </div>
        `;
      }
      slotsGrid.appendChild(slotEl);
    }

    // 確定當前被檢視的武器 ID
    if (!this.inspectedWeaponId) {
      this.inspectedWeaponId = this.equippedActiveWeapons[0] || 'multishot';
    }

    // 2. 渲染主動武器與被動武器分區矩陣
    activeTiles.innerHTML = '';
    if (passiveTiles) passiveTiles.innerHTML = '';

    const renderWeaponTile = (w, targetContainer) => {
      const ars = this.arsenal[w.id];
      const isUnlocked = ars && ars.rank > 0;
      const isEquipped = this.equippedActiveWeapons.includes(w.id);
      const isSelected = this.inspectedWeaponId === w.id;

      const tile = document.createElement('div');
      tile.className = `armory-tile ${isEquipped ? 'is-equipped' : ''} ${w.isPassive ? 'is-passive' : ''} ${!isUnlocked ? 'is-locked' : ''} ${isSelected ? 'selected' : ''}`;
      tile.title = `${w.name} (${w.isPassive ? '被動' : '主動'}${isUnlocked ? ` Lv.${ars.rank}` : '・未取得'})`;

      const rankBadgeHtml = isUnlocked
        ? `<div class="tile-rank-badge ${ars.rank === 5 ? 'max' : ''}">${ars.rank === 5 ? 'MAX' : `L${ars.rank}`}</div>`
        : '';
      const dotHtml = isEquipped ? `<div class="tile-equipped-dot" title="已裝備於主動槽"></div>` : '';

      tile.innerHTML = `
        ${dotHtml}
        <img src="${w.icon}" alt="${w.name}" onerror="this.style.display='none'; this.parentNode.textContent='⚔️';" />
        ${rankBadgeHtml}
      `;

      // 滑鼠懸停即時預覽
      tile.onmouseenter = () => {
        this.inspectedWeaponId = w.id;
        this.renderArmoryInspector(w);
        document.querySelectorAll('.armory-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
      };

      // 點擊選定：若主動武器未裝滿3款，點選立即自動裝備！
      tile.onclick = () => {
        this.inspectedWeaponId = w.id;
        this.renderArmoryInspector(w);
        document.querySelectorAll('.armory-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');

        if (!w.isPassive && isUnlocked && !isEquipped) {
          if (this.equippedActiveWeapons.length < 3) {
            this.equippedActiveWeapons.push(w.id);
            this.renderPauseArmory();
            this.showToast(`⚡ 自動裝備至主動槽：${w.name}！`);
            return;
          } else {
            this.showToast('主動武器槽已滿 (3/3)！請先點選卸下現有槽位。');
          }
        }
      };

      targetContainer.appendChild(tile);
    };

    // 主動與被動明確分區顯示
    const activeList = STARFALL_WEAPONS_CATALOG.filter(w => !w.isPassive);
    const passiveList = STARFALL_WEAPONS_CATALOG.filter(w => w.isPassive);

    activeList.forEach(w => renderWeaponTile(w, activeTiles));
    if (passiveTiles) {
      passiveList.forEach(w => renderWeaponTile(w, passiveTiles));
    } else {
      passiveList.forEach(w => renderWeaponTile(w, activeTiles));
    }

    // 3. 渲染右側/下方即時檢視窗
    const curInspected = STARFALL_WEAPONS_CATALOG.find(w => w.id === this.inspectedWeaponId) || STARFALL_WEAPONS_CATALOG[0];
    this.renderArmoryInspector(curInspected);
  }

  // 即時戰術檢視面板 (Weapon Inspector)
  renderArmoryInspector(w) {
    const inspector = document.getElementById('armoryInspector');
    if (!inspector || !w) return;

    const ars = this.arsenal[w.id];
    const isUnlocked = ars && ars.rank > 0;
    const isEquipped = this.equippedActiveWeapons && this.equippedActiveWeapons.includes(w.id);
    const qMult = ars ? this.getQualityMultiplier(ars.quality) : 1.0;

    // 檢查是否有真融合配方
    const fusions = (this.dataStore && this.dataStore.fusionData && this.dataStore.fusionData.fusions)
      ? this.dataStore.fusionData.fusions
      : STARFALL_FUSIONS;
    const relatedFusion = fusions ? fusions.find(f => f.ingredients && f.ingredients.includes(w.id)) : null;
    let fusionHintHtml = '';
    if (relatedFusion) {
      const partnerId = relatedFusion.ingredients.find(id => id !== w.id);
      const partnerCat = STARFALL_WEAPONS_CATALOG.find(x => x.id === partnerId);
      const isPartnerActive = this.arsenal[partnerId] && this.arsenal[partnerId].rank >= 3;
      const isSelfActive = isUnlocked && ars.rank >= 3;
      fusionHintHtml = `
        <div class="inspector-fusion-hint">
          <span>★ 真融合配方：與【${partnerCat ? partnerCat.name : partnerId}】均達 Lv.3 覺醒【${relatedFusion.name}】！(${isSelfActive ? '✓ 自身已達' : '自身未達'} ｜ ${isPartnerActive ? '✓ 素材已達' : '素材未達'})</span>
        </div>
      `;
    }

    // 操作按鈕 HTML
    let actionBtnHtml = '';
    if (isEquipped) {
      actionBtnHtml = `<button class="btn sm danger" id="inspectorUnequipBtn" style="min-height:36px; padding:6px 14px; font-size:12px;">從主動槽卸下</button>`;
    } else if (w.isPassive) {
      actionBtnHtml = isUnlocked
        ? `<button class="btn sm disabled" style="opacity:0.85; min-height:36px; padding:6px 14px; font-size:12px; background:rgba(72,229,131,0.2); border:1px solid var(--green); color:var(--green); cursor:default;">⚡ 被動常駐自律生效中 (不佔主動槽)</button>`
        : `<button class="btn sm disabled" style="opacity:0.5; min-height:36px; padding:6px 14px; font-size:12px; cursor:default;">未取得 (答題獎勵解鎖)</button>`;
    } else if (isUnlocked) {
      actionBtnHtml = `<button class="btn sm gold" id="inspectorEquipBtn" style="min-height:36px; padding:6px 14px; font-size:12px;">裝備至主動槽 (${this.equippedActiveWeapons.length}/3)</button>`;
    } else {
      actionBtnHtml = `<button class="btn sm disabled" style="opacity:0.5; min-height:36px; padding:6px 14px; font-size:12px; cursor:default;">未解鎖 (請通過答題結算獲取)</button>`;
    }

    inspector.innerHTML = `
      <div class="inspector-header">
        <img src="${w.icon}" class="inspector-img" alt="${w.name}" onerror="this.style.display='none';" />
        <div class="inspector-title-box">
          <div class="inspector-name-row">
            <span class="inspector-name">${w.name}</span>
            <span class="tier-badge tier-${(w.tier || 'B').toLowerCase()}">${w.tier || 'B'} 級</span>
            <span class="${w.isPassive ? 'tag-passive' : 'tag-active'}">${w.isPassive ? '被動支援' : '主動發射'}</span>
            <span class="inspector-rank">${isUnlocked ? `Lv.${ars.rank} (威力 ×${qMult.toFixed(2)})` : '未取得'}</span>
          </div>
          <div style="font-size:11px; color:var(--cyan-bright); font-weight:700;">${w.tierName || (w.tier + ' 級')} ｜ ${w.tag} ｜ 基礎威力 ${w.baseDmg || 30}</div>
        </div>
      </div>
      <div class="inspector-desc">${w.desc}</div>
      ${fusionHintHtml}
      <div class="inspector-action-row">
        ${actionBtnHtml}
      </div>
    `;

    const eqBtn = inspector.querySelector('#inspectorEquipBtn');
    if (eqBtn) {
      eqBtn.onclick = () => {
        if (this.equippedActiveWeapons.length >= 3) {
          this.showToast('主動武器槽已滿 (最多3款)！請先卸下現有武器。');
          return;
        }
        this.equippedActiveWeapons.push(w.id);
        this.renderPauseArmory();
        this.showToast(`已裝備主動武器：${w.name}！`);
      };
    }

    const unBtn = inspector.querySelector('#inspectorUnequipBtn');
    if (unBtn) {
      unBtn.onclick = () => {
        const idx = this.equippedActiveWeapons.indexOf(w.id);
        if (idx !== -1) {
          this.equippedActiveWeapons.splice(idx, 1);
          this.renderPauseArmory();
          this.showToast(`已卸下主動武器：${w.name}`);
        }
      };
    }
  }

  openLab() {
    const curId = (this.dataStore && this.dataStore.currentStudentId) || '';
    if (curId !== 'S0001') {
      this.showToast('權限不足：僅有 S0001 測試玩家可使用 LAB 面板');
      return;
    }
    this.prevState = this.state;
    this.state = 'pause';
    document.getElementById('labOverlay').classList.remove('hidden');
    this.renderLabWeaponsList();
  }

  closeLab() {
    document.getElementById('labOverlay').classList.add('hidden');
    this.state = this.prevState || 'playing';
  }

  bindLabEvents() {
    document.querySelectorAll('.lab-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.lab-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.lab-panel').forEach(p => p.style.display = 'none');
        tab.classList.add('active');
        const target = document.getElementById(`labPanel-${tab.dataset.tab}`);
        if (target) target.style.display = 'block';
      };
    });

    document.querySelectorAll('[data-quality]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('[data-quality]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const q = btn.dataset.quality;
        for (let s in this.equipped) {
          if (this.equipped[s]) this.equipped[s].quality = q;
        }
        this.showToast(`已將全武器品質切換為：${q.toUpperCase()}`);
      };
    });

    document.getElementById('labMaxAllBtn').onclick = () => {
      // 將全 16 款武器升至滿階 Rank 5
      for (let wid in this.arsenal) {
        if (this.arsenal[wid]) this.arsenal[wid].rank = 5;
      }
      for (let s in this.equipped) {
        if (this.equipped[s]) this.equipped[s].rank = 5;
      }
      // 確保 3 個主動槽裝備滿
      const activeWpns = STARFALL_WEAPONS_CATALOG.filter(w => !w.isPassive).map(w => w.id);
      this.equippedActiveWeapons = activeWpns.slice(0, 3);

      this.renderLabWeaponsList();
      if (typeof this.renderPauseArmory === 'function') this.renderPauseArmory();
      this.showToast('全 16 款神話武器已全數升至滿階 Rank 5！');
    };
    document.getElementById('labClearAllBtn').onclick = () => {
      // 重設所有武器至 0 階，保留基礎多管機砲 Lv.1
      for (let wid in this.arsenal) {
        if (this.arsenal[wid]) this.arsenal[wid].rank = 0;
      }
      if (this.arsenal.multishot) this.arsenal.multishot.rank = 1;
      this.equippedActiveWeapons = ['multishot'];

      for (let s in this.equipped) {
        if (this.equipped[s]) this.equipped[s].rank = (s === 'main' ? 1 : 0);
      }
      this.fusionActive = [];
      this.renderLabWeaponsList();
      if (typeof this.renderPauseArmory === 'function') this.renderPauseArmory();
      this.showToast('已重設武器庫為基礎多管機砲配置！');
    };

    document.getElementById('labSpawnMiniBossBtn').onclick = () => {
      this.closeLab();
      this.spawnMiniBoss();
    };
    document.getElementById('labSpawnMajorBossBtn').onclick = () => {
      const s = parseInt(document.getElementById('labBossSelect').value) || 1;
      this.closeLab();
      this.spawnMajorBoss(s);
    };
    document.getElementById('labForceUltimateBtn').onclick = () => {
      if (this.currentBoss) {
        this.currentBoss.ultimateTimer = 13.5;
        this.closeLab();
      } else {
        this.showToast('當前場上無 Boss！');
      }
    };
    document.getElementById('labKillBossBtn').onclick = () => {
      if (this.currentBoss) {
        this.currentBoss.hp = 0;
        this.startBossDefeatCinematic(this.currentBoss);
        this.closeLab();
      } else {
        this.showToast('當前場上無活躍 Boss！');
      }
    };

    const p1Btn = document.getElementById('labBossPhase1Btn');
    if (p1Btn) {
      p1Btn.onclick = () => {
        if (this.currentBoss) {
          this.currentBoss.phase = 1;
          this.currentBoss.invulnerable = false;
          this.currentBoss.invulnTimer = 0;
          this.showBossHUD(this.currentBoss);
          this.showToast(`${this.currentBoss.name} 已切換為第 1 階段（常規戰術）！`);
        } else {
          this.showToast('當前場上無活躍 Boss！');
        }
      };
    }

    const p2Btn = document.getElementById('labBossPhase2Btn');
    if (p2Btn) {
      p2Btn.onclick = () => {
        if (this.currentBoss) {
          this.triggerBossPhase2(this.currentBoss);
          this.currentBoss.hp = Math.min(this.currentBoss.hp, Math.floor(this.currentBoss.maxHp * 0.5));
          this.showBossHUD(this.currentBoss);
        } else {
          this.showToast('當前場上無活躍 Boss！');
        }
      };
    }

    const hp100Btn = document.getElementById('labBossHp100Btn');
    if (hp100Btn) {
      hp100Btn.onclick = () => {
        if (this.currentBoss) {
          this.currentBoss.hp = this.currentBoss.maxHp;
          this.showBossHUD(this.currentBoss);
          this.showToast(`${this.currentBoss.name} 生命值已重置為 100%！`);
        }
      };
    }

    const hp50Btn = document.getElementById('labBossHp50Btn');
    if (hp50Btn) {
      hp50Btn.onclick = () => {
        if (this.currentBoss) {
          this.currentBoss.hp = Math.floor(this.currentBoss.maxHp * 0.5);
          this.showBossHUD(this.currentBoss);
          this.showToast(`${this.currentBoss.name} 生命值已調整為 50%（臨界變身線）！`);
        }
      };
    }

    const hp10Btn = document.getElementById('labBossHp10Btn');
    if (hp10Btn) {
      hp10Btn.onclick = () => {
        if (this.currentBoss) {
          this.currentBoss.hp = Math.max(10, Math.floor(this.currentBoss.maxHp * 0.1));
          this.showBossHUD(this.currentBoss);
          this.showToast(`${this.currentBoss.name} 生命值已調整為 10%（瀕死狀態）！`);
        }
      };
    }

    const mythicBtn = document.getElementById('labTriggerMythicMechanicBtn');
    if (mythicBtn) {
      mythicBtn.onclick = () => {
        if (this.currentBoss) {
          this.triggerBossMythicMechanic(this.currentBoss);
          this.closeLab();
        } else {
          this.showToast('當前場上無活躍 Boss，請先生成 Boss！');
        }
      };
    }

    const godBtn = document.getElementById('labGodmodeBtn');
    godBtn.onclick = () => {
      this.godmode = !this.godmode;
      godBtn.textContent = `無敵模式：${this.godmode ? '開' : '關'}`;
      godBtn.classList.toggle('active', this.godmode);
    };
    const hitBtn = document.getElementById('labHitboxBtn');
    hitBtn.onclick = () => {
      this.showHitbox = !this.showHitbox;
      hitBtn.textContent = `顯示碰撞框：${this.showHitbox ? '開' : '關'}`;
      hitBtn.classList.toggle('active', this.showHitbox);
    };
    document.getElementById('labClearBulletsBtn').onclick = () => {
      this.ebullets = [];
      this.showToast('已清空場上敵方子彈！');
    };
    document.getElementById('labSpawnDummyBtn').onclick = () => {
      const dummy = new Entity(this.W / 2, 140, 30);
      dummy.hp = 99999;
      dummy.vy = 0;
      dummy.shootCooldown = 999;
      this.enemies.push(dummy);
      this.closeLab();
      this.showToast('已生成高生命測試木樁！');
    };

    document.getElementById('labTriggerQuizBtn').onclick = () => {
      this.closeLab();
      this.startQuizPhase();
    };
    document.getElementById('labSimulatePerfectBtn').onclick = () => {
      this.quizCorrectCount = 5;
      this.knowledgePressure = Math.max(0, this.knowledgePressure - 2);
      this.closeLab();
      this.openUpgradeScreen();
      this.showToast('已模擬 5/5 全對，解鎖傳說升級！');
    };
    document.getElementById('labSimulateLowBtn').onclick = () => {
      this.quizCorrectCount = 1;
      this.knowledgePressure = Math.min(10, this.knowledgePressure + 3);
      this.closeLab();
      this.openUpgradeScreen();
      this.showToast('已模擬 1/5 答題，知識壓力大幅提升！');
    };
    document.getElementById('labResetPressureBtn').onclick = () => {
      this.knowledgePressure = 0;
      this.showToast('知識壓力已歸零！');
    };
  }

  renderLabWeaponsList() {
    this.renderLabFusionsList();

    const list = document.getElementById('labWeaponsList');
    if (!list) return;
    list.innerHTML = '';

    // 使用完整 16 款神話武器型錄 (STARFALL_WEAPONS_CATALOG)
    const wpns = (typeof STARFALL_WEAPONS_CATALOG !== 'undefined') ? STARFALL_WEAPONS_CATALOG : (this.dataStore.weaponData || []);

    wpns.forEach(w => {
      const ars = this.arsenal[w.id] || { rank: 0, quality: 'common' };
      const curRank = ars.rank || 0;
      const isEquippedActive = this.equippedActiveWeapons && this.equippedActiveWeapons.includes(w.id);

      const card = document.createElement('div');
      card.className = `lab-weapon-card ${isEquippedActive ? 'equipped-active' : ''}`;

      const tagClass = w.isPassive ? 'passive' : 'active';
      const tagLabel = w.isPassive ? '被動・常駐' : '主動・槽位';

      let equipButtonHtml = '';
      if (!w.isPassive) {
        equipButtonHtml = isEquippedActive
          ? `<button class="lab-equip-btn is-equipped" data-action="unequip" data-wid="${w.id}">已裝備 (點擊卸下)</button>`
          : `<button class="lab-equip-btn" data-action="equip" data-wid="${w.id}">裝備至主動槽</button>`;
      } else {
        equipButtonHtml = `<span style="font-size:10px; color:#d8b4fe; font-weight:700;">【全時被動生效】</span>`;
      }

      card.innerHTML = `
        <div class="lab-weapon-header">
          <div class="lab-weapon-info">
            <img class="lab-weapon-icon" src="${w.icon}" alt="${w.name}" onerror="this.style.display='none';" />
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="lab-weapon-name">${w.name}</span>
                <span class="tier-badge tier-${(w.tier || 'B').toLowerCase()}">${w.tier || 'B'} 級</span>
                <span class="lab-weapon-tag ${tagClass}">${tagLabel}</span>
              </div>
              <div style="font-size:10px; color:var(--text-muted); line-height:1.2; margin-top:2px;">${w.desc || ''}</div>
            </div>
          </div>
          <div>
            ${equipButtonHtml}
          </div>
        </div>
        <div style="display:flex; gap:4px; align-items:center; margin-top:4px;">
          <span style="font-size:11px; color:var(--text-muted); width:40px; font-weight:700;">階級:</span>
          ${[0, 1, 2, 3, 4, 5].map(r => `
            <button class="lab-toggle-btn ${curRank === r ? 'active' : ''}" style="min-height:28px; padding:2px 8px; font-size:11px; flex:1;" data-wid="${w.id}" data-rank="${r}">R${r}</button>
          `).join('')}
        </div>
      `;
      list.appendChild(card);
    });

    // 綁定主動武器裝備/卸下按鈕
    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const wid = btn.dataset.wid;
        const action = btn.dataset.action;
        const cat = STARFALL_WEAPONS_CATALOG.find(w => w.id === wid) || { name: wid };
        if (action === 'equip') {
          if (this.equippedActiveWeapons.includes(wid)) return;
          if (this.equippedActiveWeapons.length < 3) {
            this.equippedActiveWeapons.push(wid);
            if (this.arsenal[wid] && this.arsenal[wid].rank === 0) {
              this.arsenal[wid].rank = 1;
            }
            this.showToast(`已在 LAB 裝備主動武器：${cat.name}`);
          } else {
            this.showToast('主動槽已滿 3 個！請先卸下一款武器。');
          }
        } else if (action === 'unequip') {
          this.equippedActiveWeapons = this.equippedActiveWeapons.filter(id => id !== wid);
          this.showToast(`已在 LAB 卸下主動武器：${cat.name}`);
        }
        this.renderLabWeaponsList();
        if (typeof this.renderPauseArmory === 'function') this.renderPauseArmory();
      };
    });

    // 綁定階級 R0~R5 調節
    list.querySelectorAll('[data-rank]').forEach(btn => {
      btn.onclick = () => {
        const wid = btn.dataset.wid;
        const rank = parseInt(btn.dataset.rank);
        const cat = STARFALL_WEAPONS_CATALOG.find(w => w.id === wid);

        if (this.arsenal && this.arsenal[wid]) {
          this.arsenal[wid].rank = rank;
        }

        // 若提升主動武器且槽位有空缺，自動裝入主動槽
        if (cat && !cat.isPassive && rank > 0 && !this.equippedActiveWeapons.includes(wid)) {
          if (this.equippedActiveWeapons.length < 3) {
            this.equippedActiveWeapons.push(wid);
          }
        }
        // 若歸零 R0，且目前在主動槽中，自動卸下
        if (rank === 0 && this.equippedActiveWeapons.includes(wid)) {
          this.equippedActiveWeapons = this.equippedActiveWeapons.filter(id => id !== wid);
        }

        // 同步舊結構引用以防相容性破壞
        const eq = this.findEquippedWeapon(wid);
        if (eq) {
          eq.rank = rank;
        }

        this.renderLabWeaponsList();
        if (typeof this.renderPauseArmory === 'function') this.renderPauseArmory();
      };
    });
  }

  renderLabFusionsList() {
    const list = document.getElementById('labFusionsList');
    if (!list) return;
    list.innerHTML = '';
    const fusions = (this.dataStore && this.dataStore.fusionData) || [
      { id: 'comet_spirit', name: '彗星靈丸', desc: '5連巨型核爆 + 空間烈焰' },
      { id: 'prism_rainbow_sky', name: '虹晶天幕', desc: '僚機折射彩虹光網 + 破盾增傷' },
      { id: 'swarm_hunter', name: '蜂群獵手', desc: '雙僚機16枚追蹤蜂群導彈' },
      { id: 'orbital_aegis', name: '軌道壁壘', desc: '6重偏折護盾 + 反彈光刃' },
      { id: 'meltdown_impact', name: '熔核轟擊', desc: '5秒熔岩地熱 + 焚毀敵彈' },
      { id: 'chrono_judgement', name: '凝時裁決', desc: '全場敵彈減速60% + 時鐘齒輪' }
    ];

    fusions.forEach(fus => {
      const active = this.isFusionActive(fus.id);
      const btn = document.createElement('button');
      btn.className = `lab-fusion-btn ${active ? 'active' : ''}`;
      btn.innerHTML = `
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <b style="font-size:12px;">${fus.name}</b>
          <span style="font-size:10px; font-weight:800; color:${active ? 'var(--gold)' : 'var(--text-muted)'};">${active ? '【啟用中】' : '【點擊啟用】'}</span>
        </div>
        <span style="font-size:10px; color:var(--text-muted); line-height:1.3;">${fus.desc || fus.description || ''}</span>
      `;
      btn.onclick = () => {
        if (this.isFusionActive(fus.id)) {
          this.fusionActive = this.fusionActive.filter(id => id !== fus.id);
          this.showToast(`已關閉真融合：${fus.name}`);
        } else {
          this.fusionActive.push(fus.id);
          this.showToast(`⚡ 已啟動真融合：${fus.name}！`);
        }
        this.renderLabFusionsList();
      };
      list.appendChild(btn);
    });
  }

  showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }
}

// ============================================================
// 六、啟動與自適應視圖初始化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);

  function fitStage() {
    const vv = window.visualViewport;
    const maxW = (vv && vv.width) ? Math.floor(vv.width) : window.innerWidth;
    const maxH = (vv && vv.height) ? Math.floor(vv.height) : window.innerHeight;
    const ratio = maxH / maxW;

    let w, h;
    // 1. 手機直向 (寬度 <= 600px 且高寬比 >= 1.35) -> 全螢幕滿版無黑邊
    if (maxW <= 600 && ratio >= 1.35) {
      w = maxW;
      h = maxH;
    }
    // 2. 平板直向 (寬度 <= 1024px 且高寬比 >= 1.15) -> 舒適操作比例 (約 0.64)，方便雙手持機觸控
    else if (maxW <= 1024 && ratio >= 1.15) {
      h = maxH;
      w = Math.min(maxW, Math.floor(h * 0.64));
    }
    // 3. 桌面或橫向螢幕 -> 經典 9:16 直向街機視窗
    else {
      h = maxH;
      w = h * 9 / 16;
      if (w > maxW) {
        w = maxW;
        h = w * 16 / 9;
      }
    }

    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
    const stage = document.getElementById('stage');
    if (stage) {
      stage.style.width = Math.floor(w) + 'px';
      stage.style.height = Math.floor(h) + 'px';
    }
    game.resize(Math.floor(w), Math.floor(h));
  }

  window.addEventListener('resize', fitStage);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitStage);
  }
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 100));
  fitStage();

  let lastTime = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;
    game.update(dt);
    game.render();
  }
  requestAnimationFrame(loop);

  window.__starfallGame = game;
});
