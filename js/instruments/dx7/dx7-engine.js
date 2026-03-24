(function(global) {
  'use strict';

  // FM algorithms (simplified 2-operator each for Web Audio compatibility)
  // Each algorithm describes how carriers and modulators are connected.
  // carrier: produces audio output; modulator: modulates carrier's frequency
  const DX7_ALGORITHMS = {
    'E.Piano': {
      description: '2-op FM: modulator feedback loop',
      // Carrier: sine. Modulator: sine at carrier freq * ratio, modulates carrier frequency.
      // This gives the DX7 electric piano timbre.
      carrierRatio: 1.0,
      modRatio:     14.0,
      modIndex:     0.5,   // 0–1 controls modulation depth (mapped to 0–1000 Hz)
    },
    'Bass': {
      carrierRatio: 1.0,
      modRatio:     1.0,
      modIndex:     0.8,
    },
    'Bells': {
      carrierRatio: 1.0,
      modRatio:     3.5,
      modIndex:     0.6,
    },
    'Brass': {
      carrierRatio: 1.0,
      modRatio:     1.0,
      modIndex:     0.4,
    },
    'Marimba': {
      carrierRatio: 1.0,
      modRatio:     3.0,
      modIndex:     0.3,
    },
  };

  class DX7Engine {
    constructor() {
      this.ctx     = null;
      this.gain    = null;
      this._voices = {}; // midi → { carrier, modulator, modGain, vca }
      this.ready   = false;

      this.p = {
        level:     0.75,
        algorithm: 'E.Piano', // key into DX7_ALGORITHMS
        modIndex:  0.5,   // overrides algorithm default if changed by knob
        attack:    0.01,
        decay:     0.50,
        sustain:   0.30,
        release:   0.40,
        feedback:  0.0,   // 0–1 (not wired in simplified version, kept for knob)
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx  = ctx;
      this.gain = ctx.createGain(); this.gain.gain.value = this.p.level;
      this.gain.connect(dest);
      this.ready = true;
    }

    destroy() {
      this.allNotesOff(0);
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    noteOn(midi, time) {
      if (!this.ready) return;
      if (this._voices[midi]) this._stopVoice(midi, time);

      const ctx   = this.ctx;
      const algo  = DX7_ALGORITHMS[this.p.algorithm] || DX7_ALGORITHMS['E.Piano'];
      const freq  = 440 * Math.pow(2, (midi - 69) / 12);
      const att   = Math.max(0.003, this.p.attack);
      const dec   = Math.max(0.01,  this.p.decay);
      const sus   = this.p.sustain;

      // Modulator oscillator
      const modOsc  = ctx.createOscillator();
      modOsc.type   = 'sine';
      modOsc.frequency.value = freq * algo.modRatio;

      // Modulator gain controls the modulation depth (index)
      // modIndex 0–1 → 0 to freq * modRatio * 2 (frequency deviation)
      const modGain = ctx.createGain();
      const maxDev  = freq * algo.modRatio * 2 * this.p.modIndex;
      modGain.gain.setValueAtTime(0, time);
      modGain.gain.linearRampToValueAtTime(maxDev, time + att);
      modGain.gain.exponentialRampToValueAtTime(Math.max(maxDev * sus, 0.001), time + att + dec);

      modOsc.connect(modGain);

      // Carrier oscillator — modulator feeds into its frequency
      const carrier = ctx.createOscillator();
      carrier.type  = 'sine';
      carrier.frequency.value = freq * algo.carrierRatio;
      modGain.connect(carrier.frequency);

      // VCA with ADSR
      const vca = ctx.createGain(); vca.gain.value = 0;
      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(this.p.level, time + att);
      vca.gain.exponentialRampToValueAtTime(Math.max(this.p.level * sus, 0.001), time + att + dec);

      carrier.connect(vca);
      vca.connect(this.gain);

      modOsc.start(time); carrier.start(time);
      this._voices[midi] = { carrier, modOsc, modGain, vca };
    }

    noteOff(midi, time) {
      const v = this._voices[midi]; if (!v) return;
      const rel = Math.max(0.02, this.p.release);
      v.vca.gain.cancelScheduledValues(time);
      v.vca.gain.setValueAtTime(v.vca.gain.value, time);
      v.vca.gain.linearRampToValueAtTime(0, time + rel);
      const stop = time + rel + 0.05;
      try { v.carrier.stop(stop); v.modOsc.stop(stop); } catch(e) {}
      delete this._voices[midi];
    }

    allNotesOff(time) {
      Object.keys(this._voices).map(Number).forEach(m => this.noteOff(m, time));
    }

    _stopVoice(midi, time) {
      const v = this._voices[midi]; if (!v) return;
      try { v.carrier.stop(time); v.modOsc.stop(time); } catch(e) {}
      delete this._voices[midi];
    }
  }

  global.DX7Engine       = DX7Engine;
  global.DX7_ALGORITHMS  = DX7_ALGORITHMS;

})(window);
