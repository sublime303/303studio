(function(global) {
  'use strict';

  class MS20Engine {
    constructor() {
      this.ctx    = null;
      this.gain   = null;
      this._voice = null; // { osc1, osc2, hpf, lpf, vca } — monophonic, one voice at a time
      this.ready  = false;

      this.p = {
        level:     0.75,
        osc1Wave:  'sawtooth', // sawtooth | square
        osc2Wave:  'square',
        osc2Detune: 0,         // semitones, -7 to +7
        cutoff:    0.5,        // 0-1 normalised → 80–8000 Hz log
        reso:      0.4,        // 0-1 → Q 0.5-18
        hpCutoff:  0.1,        // 0-1 → 20–800 Hz log
        envMod:    0.5,        // 0-1, how much env opens LPF
        attack:    0.005,
        decay:     0.3,
        sustain:   0.4,
        release:   0.2,
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx  = ctx;
      this.gain = ctx.createGain();
      this.gain.gain.value = this.p.level;
      this.gain.connect(dest);
      this.ready = true;
    }

    destroy() {
      this.allNotesOff(0);
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    // 80 * 100^cutoff → 80 Hz at 0, 8000 Hz at 1
    _lfFreq() { return 80 * Math.pow(100, this.p.cutoff); }

    // 20 * 40^hpCutoff → 20 Hz at 0, 800 Hz at 1
    _hpFreq() { return 20 * Math.pow(40, this.p.hpCutoff); }

    noteOn(midi, time) {
      if (!this.ready) return;
      const ctx  = this.ctx;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const att  = Math.max(0.003, this.p.attack);
      const dec  = Math.max(0.01,  this.p.decay);
      const sus  = this.p.sustain;

      // Stop previous voice (monophonic)
      if (this._voice) this._stopVoice(time);

      // OSC 1
      const osc1 = ctx.createOscillator();
      osc1.type = this.p.osc1Wave;
      osc1.frequency.value = freq;

      // OSC 2 — detuned by osc2Detune semitones
      const osc2 = ctx.createOscillator();
      osc2.type = this.p.osc2Wave;
      osc2.frequency.value = freq * Math.pow(2, this.p.osc2Detune / 12);

      // Mix both oscillators equally
      const mix = ctx.createGain();
      mix.gain.value = 0.5;
      osc1.connect(mix);
      osc2.connect(mix);

      // HPF (Korg MS-20 high-pass filter)
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = this._hpFreq();
      hpf.Q.value = 1.0;

      // LPF (Korg MS-20 low-pass filter) — the aggressive character
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.Q.value = this.p.reso * 17.5 + 0.5;

      // Filter envelope: LPF starts lower, opens on attack, decays to sustain level
      const lpfBase  = this._lfFreq();
      const lpfStart = Math.max(40, lpfBase * (1 - this.p.envMod));
      const lpfPeak  = Math.min(20000, lpfBase * (1 + this.p.envMod * 4));
      const lpfSus   = Math.max(40, lpfBase * (1 - this.p.envMod * (1 - sus)));

      lpf.frequency.setValueAtTime(lpfStart, time);
      lpf.frequency.linearRampToValueAtTime(lpfPeak, time + att);
      lpf.frequency.exponentialRampToValueAtTime(Math.max(lpfSus, 40), time + att + dec);

      // VCA with ADSR envelope
      const vca = ctx.createGain();
      vca.gain.value = 0;
      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(this.p.level, time + att);
      vca.gain.exponentialRampToValueAtTime(Math.max(this.p.level * sus, 0.001), time + att + dec);

      // Signal chain: mix → HPF → LPF → VCA → master gain
      mix.connect(hpf);
      hpf.connect(lpf);
      lpf.connect(vca);
      vca.connect(this.gain);

      osc1.start(time);
      osc2.start(time);

      this._voice = { osc1, osc2, mix, hpf, lpf, vca };
    }

    noteOff(midi, time) {
      if (!this._voice) return;
      const rel = Math.max(0.02, this.p.release);
      const v   = this._voice;
      v.vca.gain.cancelScheduledValues(time);
      v.vca.gain.setValueAtTime(v.vca.gain.value, time);
      v.vca.gain.linearRampToValueAtTime(0, time + rel);
      const stop = time + rel + 0.05;
      try { v.osc1.stop(stop); v.osc2.stop(stop); } catch(e) {}
      this._voice = null;
    }

    allNotesOff(time) {
      if (this._voice) this._stopVoice(time);
    }

    _stopVoice(time) {
      if (!this._voice) return;
      try { this._voice.osc1.stop(time); this._voice.osc2.stop(time); } catch(e) {}
      this._voice = null;
    }
  }

  global.MS20Engine = MS20Engine;

})(window);
