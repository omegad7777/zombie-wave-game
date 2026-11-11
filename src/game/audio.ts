/**
 * Procedural Audio Synthesizer using Web Audio API
 * Zero external audio files (Zero 404s)
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatGain: GainNode | null = null;

  constructor() {
    // Lazy init on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.4, this.ctx.currentTime);
    }
  }

  // Helper: create white noise buffer
  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) this.initCtx();
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Weapon Shots
  public playShoot(weaponId: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    if (weaponId === 'colt') {
      // Crisp 1911 pistol gunshot: punchy transient + noise body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.18);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + 0.18);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.16);
      noise.start(t);
      noise.stop(t + 0.19);
    } else if (weaponId === 'shotgun') {
      // Heavy boom + wide noise blast + pump action click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
      gain.gain.setValueAtTime(1.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.35);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2500, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.35);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(1.1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(gain);
      gain.connect(this.masterGain);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.4);
      noise.start(t);
      noise.stop(t + 0.4);

      // Shotgun pump rack after 0.3s
      setTimeout(() => this.playMechanicalClick(0.3), 320);
    } else if (weaponId === 'ak47') {
      // Rapid assault rifle blast: high crack + punchy bass
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.13);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.16);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, t);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.15);
      noise.start(t);
      noise.stop(t + 0.17);
    } else if (weaponId === 'raygun') {
      // Iconic CoD Ray Gun sci-fi laser sound: pitch drop + resonant laser zap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2200, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.value = 6;
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.22);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      // Low bass punch
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(120, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.18);
      subGain.gain.setValueAtTime(0.9, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      sub.connect(subGain);
      subGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.25);
      sub.start(t);
      sub.stop(t + 0.2);
    }
  }

  // 2. Mechanical click / rack
  public playMechanicalClick(intensity = 0.5) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.04);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(intensity * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  // 3. Dry fire / out of ammo
  public playEmptyClick() {
    this.playMechanicalClick(0.6);
  }

  // 4. Reload sound
  public playReload() {
    this.playMechanicalClick(0.7);
    setTimeout(() => this.playMechanicalClick(0.9), 350);
    setTimeout(() => this.playMechanicalClick(0.6), 800);
  }

  // 5. Classic CoD Hitmarker "Tink"
  public playHitmarker(isHeadshot = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const freq = isHeadshot ? 1760 : 1320;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.setValueAtTime(freq * 1.05, t + 0.02);

    gain.gain.setValueAtTime(isHeadshot ? 0.6 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);

    if (isHeadshot) {
      // Crunchy wet headshot pop
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.12);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, t);
      const ngain = this.ctx.createGain();
      ngain.gain.setValueAtTime(0.7, t);
      ngain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(filter);
      filter.connect(ngain);
      ngain.connect(this.masterGain);
      noise.start(t);
    }
  }

  // 6. Zombie Growl / Groan
  public playZombieGrowl() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const baseFreq = 75 + Math.random() * 30;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, t + 0.25);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, t + 0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  // 7. Zombie Attack Slash
  public playZombieAttack() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.22);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  // 8. Player Hurt Grunt
  public playPlayerHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 9. Barricade Plank Rebuild (Hammer hit)
  public playBarricadeRepair() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Wood / nail strike
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
    noise.start(t);
    noise.stop(t + 0.08);
  }

  // 10. Barricade Plank Tear (Zombie breaking board)
  public playBarricadeBreak() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.25);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(200, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  // 11. Point Purchase (Door, Wall buy, Mystery box)
  public playPurchase() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      gain.gain.setValueAtTime(0.3, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.16);
    });
  }

  // 12. Deny / Insufficient points
  public playDeny() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // 13. Round Start Stinger (Ominous brass swell)
  public playRoundStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Deep brassy swell
    const freqs = [110, 138.59, 164.81]; // A2, C#3, E3 minor/dramatic chord
    freqs.forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.05, t + 1.8);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, t);
      filter.frequency.exponentialRampToValueAtTime(900, t + 1.2);
      filter.frequency.exponentialRampToValueAtTime(150, t + 2.2);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 2.4);
    });
  }

  // 14. Round End Stinger
  public playRoundEnd() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const notes = [440, 493.88, 554.37, 659.25];
    notes.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.15);
      gain.gain.setValueAtTime(0.35, t + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.15);
      osc.stop(t + idx * 0.15 + 0.45);
    });
  }

  // 15. Mystery Box Spinning Jingle (Classic creepy music box chime)
  public playMysteryBoxJingle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const jingleNotes = [523, 659, 784, 988, 880, 740, 659, 587, 523, 659];
    jingleNotes.forEach((f, idx) => {
      const noteTime = t + idx * 0.22;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, noteTime);
      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  // 16. Ray Gun Explosion Splash
  public playExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.45);
    noise.start(t);
    noise.stop(t + 0.5);
  }
}

export const sound = new SoundController();
