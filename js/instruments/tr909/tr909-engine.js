/* ── TR-909 Drum Engine ──
   Owner: TR-909 agent
   ──────────────────────── */
(function(global) {
  'use strict';

  const VOICES_909 = ['BD','SD','CH','OH','CLP','LT','HT','RIM'];

  class TR909Engine {
    constructor() {
      this.ctx      = null;
      this.gain     = null;
      this.noiseBuf = null;
      this.ready    = false;

      // Per-voice params — knobs write directly here
      this.p = {
        BD:  { level: 0.95, decay: 0.50, tune: 0,   attack: 0.5 },
        SD:  { level: 0.80, decay: 0.35, tune: 0,   snappy: 0.5 },
        CH:  { level: 0.65, decay: 0.04 },
        OH:  { level: 0.60, decay: 0.40 },
        CLP: { level: 0.70, decay: 0.25 },
        LT:  { level: 0.75, decay: 0.45, tune: 0 },
        HT:  { level: 0.70, decay: 0.25, tune: 0 },
        RIM: { level: 0.65, decay: 0.08 },
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx  = ctx;
      this.gain = ctx.createGain();
      this.gain.gain.value = 0.85;
      this.gain.connect(dest);

      // Pre-generate 2-second noise buffer (reused by all voices)
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.ready = true;
    }

    destroy() {
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    // ── WaveShaper distortion curve helper ───────────────────────
    _distCurve(amount) {
      const n = 256, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    }

    // ── Metallic oscillator helper (for hats) ────────────────────
    _metalOsc(time, dur) {
      const FREQS = [459, 562, 635, 815, 1023, 1259];
      const mix = this.ctx.createGain(); mix.gain.value = 1 / FREQS.length;
      FREQS.forEach(f => {
        const osc = this.ctx.createOscillator(); osc.type = 'square';
        osc.frequency.value = f; osc.connect(mix);
        osc.start(time); osc.stop(time + dur + 0.01);
      });
      return mix;
    }

    // ── Voice methods ─────────────────────────────────────────────

    /** Bass Drum — punchy 909 kick with pitch sweep + distortion */
    BD(time) {
      const { ctx, gain: dst, p: { BD: p } } = this;

      // Main oscillator through waveshaper
      const osc  = ctx.createOscillator();
      const dist = ctx.createWaveShaper();
      const g    = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250 + p.tune * 80, time);
      osc.frequency.exponentialRampToValueAtTime(50 + p.tune * 20, time + 0.035);
      dist.curve = this._distCurve(150 + p.attack * 300);
      osc.connect(dist); dist.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 1.1, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.8);
      osc.start(time); osc.stop(time + p.decay * 0.8 + 0.01);

      // Attack transient — noise burst
      const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 800; bpf.Q.value = 0.5;
      const ng  = ctx.createGain();
      ns.connect(bpf); bpf.connect(ng); ng.connect(dst);
      ng.gain.setValueAtTime(p.level * 0.3 * p.attack, time);
      ng.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
      ns.start(time); ns.stop(time + 0.020);
    }

    /** Snare Drum — snappy 909 snare */
    SD(time) {
      const { ctx, gain: dst, p: { SD: p } } = this;

      // Body: bandpass noise
      const ns1  = ctx.createBufferSource(); ns1.buffer = this.noiseBuf;
      const bpf  = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1200 + p.tune * 400; bpf.Q.value = 0.8;
      const g1   = ctx.createGain();
      ns1.connect(bpf); bpf.connect(g1); g1.connect(dst);
      g1.gain.setValueAtTime(p.level * 0.8, time);
      g1.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.5);
      ns1.start(time); ns1.stop(time + p.decay * 0.5 + 0.01);

      // Crack: highpass noise
      const ns2  = ctx.createBufferSource(); ns2.buffer = this.noiseBuf;
      const hpf  = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 6000;
      const g2   = ctx.createGain();
      ns2.connect(hpf); hpf.connect(g2); g2.connect(dst);
      g2.gain.setValueAtTime(p.level * p.snappy * 0.9, time);
      g2.gain.exponentialRampToValueAtTime(0.001, time + 0.050);
      ns2.start(time); ns2.stop(time + 0.060);
    }

    /** Closed Hi-Hat — metallic short burst */
    CH(time) {
      const { ctx, gain: dst, p: { CH: p } } = this;
      const dur  = Math.max(p.decay, 0.015);
      const mix  = this._metalOsc(time, dur);
      const hpf  = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
      const g    = ctx.createGain();
      mix.connect(hpf); hpf.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    }

    /** Open Hi-Hat — metallic longer decay */
    OH(time) {
      const { ctx, gain: dst, p: { OH: p } } = this;
      const mix  = this._metalOsc(time, p.decay);
      const hpf  = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 6000;
      const bpf  = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 8000; bpf.Q.value = 0.3;
      const g    = ctx.createGain();
      mix.connect(hpf); hpf.connect(bpf); bpf.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay);
    }

    /** Clap — 909 clap: 4 noise bursts */
    CLP(time) {
      const { ctx, gain: dst, p: { CLP: p } } = this;
      [0, 0.006, 0.014, 0.024].forEach(dt => {
        const t   = time + dt;
        const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
        const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1100; bpf.Q.value = 1.2;
        const g   = ctx.createGain();
        ns.connect(bpf); bpf.connect(g); g.connect(dst);
        const dur = 0.04 + dt * 3 * p.decay;
        g.gain.setValueAtTime(p.level * 0.8, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        ns.start(t); ns.stop(t + dur + 0.01);
      });
    }

    /** Low Tom — sine pitch drop at lower freq */
    LT(time) {
      const { ctx, gain: dst, p: { LT: p } } = this;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(dst); osc.type = 'sine';
      const f = 95 + p.tune * 35;
      osc.frequency.setValueAtTime(f * 2.2, time);
      osc.frequency.exponentialRampToValueAtTime(f, time + 0.035);
      g.gain.setValueAtTime(p.level, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.7);
      osc.start(time); osc.stop(time + p.decay * 0.75);
    }

    /** Hi Tom — sine pitch drop at higher freq */
    HT(time) {
      const { ctx, gain: dst, p: { HT: p } } = this;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(dst); osc.type = 'sine';
      const f = 240 + p.tune * 70;
      osc.frequency.setValueAtTime(f * 2.0, time);
      osc.frequency.exponentialRampToValueAtTime(f, time + 0.022);
      g.gain.setValueAtTime(p.level, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.55);
      osc.start(time); osc.stop(time + p.decay * 0.6);
    }

    /** Rimshot — sine chirp + bandpass noise */
    RIM(time) {
      const { ctx, gain: dst, p: { RIM: p } } = this;

      // Sine chirp (triangle)
      const osc = ctx.createOscillator(), og = ctx.createGain();
      osc.connect(og); og.connect(dst); osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, time);
      osc.frequency.exponentialRampToValueAtTime(400, time + 0.012);
      og.gain.setValueAtTime(p.level * 0.6, time);
      og.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
      osc.start(time); osc.stop(time + 0.020);

      // Noise through bandpass
      const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1800; bpf.Q.value = 2.0;
      const ng  = ctx.createGain();
      ns.connect(bpf); bpf.connect(ng); ng.connect(dst);
      ng.gain.setValueAtTime(p.level * 0.5, time);
      ng.gain.exponentialRampToValueAtTime(0.001, time + p.decay);
      ns.start(time); ns.stop(time + p.decay + 0.010);
    }
  }

  global.TR909Engine = TR909Engine;
  global.VOICES_909  = VOICES_909;

})(window);
