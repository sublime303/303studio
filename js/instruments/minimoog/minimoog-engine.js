(function(global) {
  'use strict';

  class MiniMoogEngine {
    constructor() {
      this.ctx    = null;
      this.gain   = null;
      this._voice = null; // { oscs[], filter, vca } — monophonic, one voice at a time
      this.ready  = false;

      this.p = {
        level:    0.80,
        osc1Wave: 'sawtooth',  // sawtooth | square | triangle
        osc2Wave: 'sawtooth',
        osc3Wave: 'sawtooth',
        osc2Det:  7,    // semitone detune osc2 (−12..+12)
        osc3Det: -7,    // semitone detune osc3
        osc3Oct: -1,    // octave offset osc3 (0 or −1)
        cutoff:   0.45, // 0–1 → 80–12000 Hz log
        reso:     0.30, // 0–1 → Q 0.5–25
        attack:   0.01,
        decay:    0.25,
        sustain:  0.60,
        release:  0.25,
        envMod:   0.50, // how much envelope opens filter
        glide:    0.0,  // portamento time 0–0.5s
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
      this.silence();
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    _cutoffHz() { return 80 * Math.pow(12000 / 80, this.p.cutoff); }
    _resoQ()    { return 0.5 + this.p.reso * 24.5; }

    noteOn(midi, time) {
      if (!this.ready) return;
      const ctx  = this.ctx;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const att  = Math.max(0.003, this.p.attack);
      const dec  = Math.max(0.01,  this.p.decay);
      const sus  = this.p.sustain;

      // Stop previous voice (monophonic)
      if (this._voice) this._stopVoice(time);

      // Three oscillators
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();

      osc1.type = this.p.osc1Wave;
      osc2.type = this.p.osc2Wave;
      osc3.type = this.p.osc3Wave;

      osc1.frequency.value = freq;
      osc2.frequency.value = freq * Math.pow(2, this.p.osc2Det / 12);
      osc3.frequency.value = freq * Math.pow(2, (this.p.osc3Det + this.p.osc3Oct * 12) / 12);

      // Mix
      const mix = ctx.createGain(); mix.gain.value = 1 / 3;
      osc1.connect(mix); osc2.connect(mix); osc3.connect(mix);

      // Ladder filter approximation (cascade two biquad lowpass for steeper slope)
      const f1 = ctx.createBiquadFilter(); f1.type = 'lowpass';
      const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass';
      const cutHz = this._cutoffHz(), q = this._resoQ();
      f1.frequency.value = cutHz; f1.Q.value = q;
      f2.frequency.value = cutHz; f2.Q.value = 0.5;

      // Filter envelope
      const envPeak = Math.min(24000, cutHz * (1 + this.p.envMod * 8));
      f1.frequency.setValueAtTime(cutHz * 0.5, time);
      f1.frequency.linearRampToValueAtTime(envPeak, time + att);
      f1.frequency.exponentialRampToValueAtTime(Math.max(cutHz, 60), time + att + dec);
      f2.frequency.setValueAtTime(cutHz * 0.5, time);
      f2.frequency.linearRampToValueAtTime(envPeak, time + att);
      f2.frequency.exponentialRampToValueAtTime(Math.max(cutHz, 60), time + att + dec);

      // VCA
      const vca = ctx.createGain(); vca.gain.value = 0;
      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(this.p.level, time + att);
      vca.gain.exponentialRampToValueAtTime(Math.max(this.p.level * sus, 0.001), time + att + dec);

      mix.connect(f1); f1.connect(f2); f2.connect(vca); vca.connect(this.gain);

      osc1.start(time); osc2.start(time); osc3.start(time);

      this._voice = { osc1, osc2, osc3, f1, f2, vca };
    }

    noteOff(time) {
      if (!this._voice) return;
      const rel = Math.max(0.02, this.p.release);
      const v = this._voice;
      v.vca.gain.cancelScheduledValues(time);
      v.vca.gain.setValueAtTime(v.vca.gain.value, time);
      v.vca.gain.linearRampToValueAtTime(0, time + rel);
      const stop = time + rel + 0.05;
      try { v.osc1.stop(stop); v.osc2.stop(stop); v.osc3.stop(stop); } catch(e) {}
      this._voice = null;
    }

    silence() { if (this._voice) this._stopVoice(0); }

    _stopVoice(time) {
      if (!this._voice) return;
      try { this._voice.osc1.stop(time); this._voice.osc2.stop(time); this._voice.osc3.stop(time); } catch(e) {}
      this._voice = null;
    }
  }

  global.MiniMoogEngine = MiniMoogEngine;

})(window);
