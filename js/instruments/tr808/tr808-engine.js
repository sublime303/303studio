/* ── TR-808 Drum Engine ──
   Owner: TR-808 agent
   ──────────────────────── */
(function(global) {
  'use strict';

  const VOICES_808 = ['BD','SD','CH','OH','CP','LT','HT'];

  class TR808Engine {
    constructor() {
      this.ctx      = null;
      this.gain     = null;
      this.noiseBuf = null;
      this.ready    = false;

      // Per-voice params — knobs write directly here
      this.p = {
        BD: { level: 0.95, decay: 0.60, tune:  0   },
        SD: { level: 0.80, decay: 0.40, tone:  0.5 },
        CH: { level: 0.60, decay: 0.05              },
        OH: { level: 0.55, decay: 0.45              },
        CP: { level: 0.70, decay: 0.30              },
        LT: { level: 0.75, decay: 0.55, tune:  0   },
        HT: { level: 0.70, decay: 0.30, tune:  0   },
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

    // ── Voice methods (one per drum voice) ──────────────────────────

    /** Bass Drum — sine with pitch drop */
    BD(time) {
      const { ctx, gain: dst, p: { BD: p } } = this;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(dst); osc.type = 'sine';
      osc.frequency.setValueAtTime(180 + p.tune * 60, time);
      osc.frequency.exponentialRampToValueAtTime(55 + p.tune * 20, time + 0.065);
      g.gain.setValueAtTime(p.level, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.75);
      osc.start(time); osc.stop(time + p.decay * 0.8);
    }

    /** Snare Drum — highpass noise + triangle body tone */
    SD(time) {
      const { ctx, gain: dst, p: { SD: p } } = this;
      // Noise
      const ns  = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 1200;
      const ng  = ctx.createGain();
      ns.connect(hpf); hpf.connect(ng); ng.connect(dst);
      ng.gain.setValueAtTime(p.level * 0.85, time);
      ng.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.5);
      ns.start(time); ns.stop(time + p.decay * 0.5 + 0.01);
      // Body tone
      const osc = ctx.createOscillator(), og = ctx.createGain();
      osc.connect(og); og.connect(dst); osc.type = 'triangle';
      osc.frequency.value = 195 + p.tone * 100;
      og.gain.setValueAtTime(p.level * 0.5, time);
      og.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.2);
      osc.start(time); osc.stop(time + p.decay * 0.25);
    }

    /** Closed Hi-Hat — short highpass noise burst */
    CH(time) {
      const { ctx, gain: dst, p: { CH: p } } = this;
      const ns = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const f  = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
      const g  = ctx.createGain();
      ns.connect(f); f.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + Math.max(p.decay, 0.02));
      ns.start(time); ns.stop(time + Math.max(p.decay, 0.02) + 0.01);
    }

    /** Open Hi-Hat — longer highpass noise */
    OH(time) {
      const { ctx, gain: dst, p: { OH: p } } = this;
      const ns = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
      const f  = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      const g  = ctx.createGain();
      ns.connect(f); f.connect(g); g.connect(dst);
      g.gain.setValueAtTime(p.level * 0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay);
      ns.start(time); ns.stop(time + p.decay + 0.01);
    }

    /** Hand Clap — four bandpass noise bursts with increasing gap */
    CP(time) {
      const { ctx, gain: dst, p: { CP: p } } = this;
      [0, 0.008, 0.018, 0.032].forEach(dt => {
        const t  = time + dt;
        const ns = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
        const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1200; bpf.Q.value = 0.9;
        const g  = ctx.createGain();
        ns.connect(bpf); bpf.connect(g); g.connect(dst);
        const dur = 0.05 + dt * 4 * p.decay;
        g.gain.setValueAtTime(p.level * 0.7, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        ns.start(t); ns.stop(t + dur + 0.01);
      });
    }

    /** Low Tom — sine pitch drop at lower freq */
    LT(time) {
      const { ctx, gain: dst, p: { LT: p } } = this;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(dst); osc.type = 'sine';
      const f = 90 + p.tune * 30;
      osc.frequency.setValueAtTime(f * 2, time);
      osc.frequency.exponentialRampToValueAtTime(f, time + 0.04);
      g.gain.setValueAtTime(p.level, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.7);
      osc.start(time); osc.stop(time + p.decay * 0.75);
    }

    /** Hi Tom — sine pitch drop at higher freq */
    HT(time) {
      const { ctx, gain: dst, p: { HT: p } } = this;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(dst); osc.type = 'sine';
      const f = 220 + p.tune * 60;
      osc.frequency.setValueAtTime(f * 1.8, time);
      osc.frequency.exponentialRampToValueAtTime(f, time + 0.025);
      g.gain.setValueAtTime(p.level, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.6);
      osc.start(time); osc.stop(time + p.decay * 0.65);
    }
  }

  global.TR808Engine  = TR808Engine;
  global.VOICES_808   = VOICES_808;

})(window);
