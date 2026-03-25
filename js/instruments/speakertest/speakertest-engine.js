/* ── Speaker Test Audio Engine ──
   Oscillator → gain → StereoPanner → bus
   ─────────────────────────────────────── */
(function(global) {
  'use strict';

  class SpeakerTestEngine {
    constructor() {
      this.ctx = null;
      this.osc = null;
      this.level = null;
      this.pan = null;
      this.dest = null;
      this.ready = false;
      this._audible = false;

      this.frequencyHz = 80;
      this.levelLin = 0.16;
      this.panVal = 0;
      this.waveform = 'sine';
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx = ctx;
      this.dest = dest;

      this.osc = ctx.createOscillator();
      this.level = ctx.createGain();
      this.pan = ctx.createStereoPanner();

      this.osc.type = this.waveform;
      this.osc.frequency.value = this.frequencyHz;
      this.level.gain.value = 0;
      this.pan.pan.value = this.panVal;

      this.osc.connect(this.level);
      this.level.connect(this.pan);
      this.pan.connect(dest);
      this.osc.start();
      this.ready = true;
    }

    destroy() {
      try { if (this.osc) this.osc.stop(); } catch (e) {}
      if (this.pan) this.pan.disconnect();
      this.ready = false;
      this.osc = null;
      this.level = null;
      this.pan = null;
      this.ctx = null;
      this.dest = null;
      this._audible = false;
    }

    silence() {
      this._audible = false;
      if (this.ready && this.level) this.level.gain.value = 0;
    }

    /** Call after init so user hears the tone */
    startAudible() {
      if (!this.ready || !this.level) return;
      this._audible = true;
      this.level.gain.value = this.levelLin;
    }

    setFrequencyHz(hz) {
      this.frequencyHz = hz;
      if (this.ready && this.osc) this.osc.frequency.value = hz;
    }

    setLevel(v) {
      this.levelLin = Math.max(0, Math.min(1, v));
      if (this.ready && this.level && this._audible) this.level.gain.value = this.levelLin;
    }

    setPan(v) {
      this.panVal = Math.max(-1, Math.min(1, v));
      if (this.ready && this.pan) this.pan.pan.value = this.panVal;
    }

    setWaveform(type) {
      this.waveform = type;
      if (this.ready && this.osc) this.osc.type = type;
    }
  }

  global.SpeakerTestEngine = SpeakerTestEngine;

})(window);
