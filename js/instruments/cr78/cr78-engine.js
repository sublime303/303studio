/* ── Roland CR-78 CompuRhythm Drum Engine ──
   Analog-style synthesis per voice using Web Audio API.
   Owner: CR-78 agent
   ─────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  const VOICES_CR78 = ['BD','SD','CH','OH','CY','CG','CB','MA'];

  class CR78Engine {
    constructor() {
      this.ctx      = null;
      this.gain     = null;
      this.noiseBuf = null;
      this.ready    = false;

      // Per-voice params — knobs write directly here
      this.p = {
        BD: { level: 0.90, decay: 0.50 },
        SD: { level: 0.80, decay: 0.40 },
        CH: { level: 0.65, decay: 0.08 },
        OH: { level: 0.60, decay: 0.40 },
        CY: { level: 0.55, decay: 0.60 },
        CG: { level: 0.75, decay: 0.30 },
        CB: { level: 0.70, decay: 0.50 },
        MA: { level: 0.60, decay: 0.06 },
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx  = ctx;
      this.gain = ctx.createGain();
      this.gain.gain.value = 0.85;
      this.gain.connect(dest);

      // Pre-generate 3-second noise buffer (reused by all voices)
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.ready = true;
    }

    destroy() {
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    // ── Dispatch trigger to named voice method ───────────────────
    trigger(voice, time) {
      if (!this.ready) return;
      if (typeof this[voice] === 'function') this[voice](time);
    }

    // ── Voice synthesis methods ──────────────────────────────────

    /** Bass Drum — sine with sharp pitch drop + WaveShaper distortion */
    BD(time) {
      const { ctx, gain: dst, p: { BD: p } } = this;

      // WaveShaper for slight crunch
      const ws = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
      }
      ws.curve = curve;
      ws.oversample = '2x';

      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';

      osc.connect(ws);
      ws.connect(g);
      g.connect(dst);

      // Sharp pitch envelope: 80 → 30 Hz in 0.06s
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.06);

      // Gain envelope: fast attack, decay
      const decayTime = p.decay * 0.7;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(p.level * 0.8, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

      osc.start(time);
      osc.stop(time + decayTime + 0.01);
    }

    /** Snare Drum — bandpass noise + short sine body tone */
    SD(time) {
      const { ctx, gain: dst, p: { SD: p } } = this;
      const decayTime = p.decay * 0.5;

      // Noise layer through bandpass
      const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass'; bpf.frequency.value = 280; bpf.Q.value = 1.5;
      const ng  = ctx.createGain();
      ns.connect(bpf); bpf.connect(ng); ng.connect(dst);
      ng.gain.setValueAtTime(0.0001, time);
      ng.gain.linearRampToValueAtTime(p.level * 0.85, time + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
      ns.start(time); ns.stop(time + decayTime + 0.01);

      // Sine body tone at 220 Hz
      const osc = ctx.createOscillator();
      const og  = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 220;
      osc.connect(og); og.connect(dst);
      const bodyDecay = decayTime * 0.4;
      og.gain.setValueAtTime(0.0001, time);
      og.gain.linearRampToValueAtTime(p.level * 0.5, time + 0.002);
      og.gain.exponentialRampToValueAtTime(0.001, time + bodyDecay);
      osc.start(time); osc.stop(time + bodyDecay + 0.01);
    }

    /** Closed Hi-Hat — white noise through highpass, very short decay */
    CH(time) {
      const { ctx, gain: dst, p: { CH: p } } = this;
      const decayTime = Math.max(p.decay * 0.8, 0.04);

      const ns = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const f  = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      const g  = ctx.createGain();
      ns.connect(f); f.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
      ns.start(time); ns.stop(time + decayTime + 0.01);
    }

    /** Open Hi-Hat — longer highpass noise + slight lowpass rolloff */
    OH(time) {
      const { ctx, gain: dst, p: { OH: p } } = this;
      const decayTime = Math.max(p.decay, 0.22);

      const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 6000;
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';  lpf.frequency.value = 10000;
      const g   = ctx.createGain();
      ns.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
      ns.start(time); ns.stop(time + decayTime + 0.01);
    }

    /** Cymbal — 6 square oscillators mixed, highpass, long decay */
    CY(time) {
      const { ctx, gain: dst, p: { CY: p } } = this;
      const freqs = [313, 415, 566, 772, 1022, 1457];
      const decayTime = Math.max(p.decay, 0.5);

      const mixer = ctx.createGain(); mixer.gain.value = 1 / freqs.length;
      const hpf   = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 5000;
      const g     = ctx.createGain();

      mixer.connect(hpf); hpf.connect(g); g.connect(dst);

      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'square'; osc.frequency.value = freq;
        osc.connect(mixer);
        osc.start(time); osc.stop(time + decayTime + 0.01);
      });

      g.gain.setValueAtTime(p.level * 0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
    }

    /** Conga — two sine oscillators for classic conga body */
    CG(time) {
      const { ctx, gain: dst, p: { CG: p } } = this;

      // Low conga body: 200 Hz
      const osc1 = ctx.createOscillator();
      const g1   = ctx.createGain();
      osc1.type = 'sine'; osc1.frequency.value = 200;
      osc1.frequency.setValueAtTime(260, time);
      osc1.frequency.exponentialRampToValueAtTime(200, time + 0.02);
      osc1.connect(g1); g1.connect(dst);
      const decay1 = p.decay * 0.5;
      g1.gain.setValueAtTime(0.0001, time);
      g1.gain.linearRampToValueAtTime(p.level * 0.8, time + 0.002);
      g1.gain.exponentialRampToValueAtTime(0.001, time + decay1);
      osc1.start(time); osc1.stop(time + decay1 + 0.01);

      // High conga slap: 350 Hz, shorter
      const osc2 = ctx.createOscillator();
      const g2   = ctx.createGain();
      osc2.type = 'sine'; osc2.frequency.value = 350;
      osc2.frequency.setValueAtTime(420, time);
      osc2.frequency.exponentialRampToValueAtTime(350, time + 0.01);
      osc2.connect(g2); g2.connect(dst);
      const decay2 = p.decay * 0.27;
      g2.gain.setValueAtTime(0.0001, time);
      g2.gain.linearRampToValueAtTime(p.level * 0.6, time + 0.002);
      g2.gain.exponentialRampToValueAtTime(0.001, time + decay2);
      osc2.start(time); osc2.stop(time + decay2 + 0.01);
    }

    /** Cowbell — sine + square at 562 Hz, bandpass filtered */
    CB(time) {
      const { ctx, gain: dst, p: { CB: p } } = this;
      const decayTime = Math.max(p.decay, 0.4);

      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 562; bpf.Q.value = 3;
      const g   = ctx.createGain();
      bpf.connect(g); g.connect(dst);

      // Sine component
      const sine = ctx.createOscillator();
      sine.type = 'sine'; sine.frequency.value = 562;
      sine.connect(bpf);
      sine.start(time); sine.stop(time + decayTime + 0.01);

      // Square component — adds the metallic clang
      const sq = ctx.createOscillator();
      sq.type = 'square'; sq.frequency.value = 562;
      const sqGain = ctx.createGain(); sqGain.gain.value = 0.3;
      sq.connect(sqGain); sqGain.connect(bpf);
      sq.start(time); sq.stop(time + decayTime + 0.01);

      g.gain.setValueAtTime(p.level * 0.6, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
    }

    /** Maracas — bandpass noise, very short shuffle-like burst */
    MA(time) {
      const { ctx, gain: dst, p: { MA: p } } = this;
      const decayTime = Math.max(p.decay * 0.6, 0.03);

      const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 6000; bpf.Q.value = 2;
      const g   = ctx.createGain();
      ns.connect(bpf); bpf.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.55, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
      ns.start(time); ns.stop(time + decayTime + 0.01);
    }
  }

  global.CR78Engine  = CR78Engine;
  global.VOICES_CR78 = VOICES_CR78;

})(window);
