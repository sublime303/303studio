(function(global) {
  'use strict';

  class ARP2600Engine {
    constructor() {
      this.ctx    = null;
      this.gain   = null;
      this._voice = null; // { vco1, vco2, vca, vcf } — monophonic
      this.ready  = false;

      this.p = {
        level:      0.75,
        vco1Wave:   'sawtooth',   // sawtooth | square | triangle
        vco2Wave:   'sawtooth',
        vco2Detune: 0,            // -12 to +12 semitones
        vco2Sync:   false,        // approximate phase reset on each note
        cutoff:     0.55,         // 0-1 → 60-8000 Hz log
        reso:       0.35,         // 0-1 → Q 0.5-12
        envMod:     0.5,          // filter env mod depth 0-1
        attack:     0.01,
        decay:      0.4,
        sustain:    0.35,
        release:    0.3,
        reverbMix:  0.25,         // 0-1, spring reverb wet amount
        ringMod:    false,        // ring modulator on/off
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx = ctx;

      // Master gain
      this.gain = ctx.createGain();
      this.gain.gain.value = this.p.level;

      // Spring reverb simulation: 3 feedback delay lines at 23ms, 31ms, 47ms
      // mixed together then filtered with a lowpass at 3000 Hz
      this._reverbBus  = ctx.createGain(); this._reverbBus.gain.value  = 1;
      this._reverbNode = this._buildReverb(ctx);
      this._reverbNode.connect(ctx.destination); // reverb output path

      // Dry / wet gains going to final dest
      this._dryGain    = ctx.createGain(); this._dryGain.gain.value    = 1 - this.p.reverbMix;
      this._reverbGain = ctx.createGain(); this._reverbGain.gain.value = this.p.reverbMix;

      // gain → dryGain → dest
      this.gain.connect(this._dryGain);
      this._dryGain.connect(dest);

      // gain → reverbBus → reverbNode → reverbGain → dest
      this.gain.connect(this._reverbBus);
      this._reverbBus.connect(this._reverbNode);
      this._reverbNode.connect(this._reverbGain);
      this._reverbGain.connect(dest);

      this.ready = true;
    }

    _buildReverb(ctx) {
      // Simple spring reverb approximation: 3 parallel comb filters (feedback delay lines)
      const out = ctx.createGain(); out.gain.value = 0.33;
      [0.023, 0.031, 0.047].forEach(t => {
        const delay = ctx.createDelay(0.1); delay.delayTime.value = t;
        const fb    = ctx.createGain(); fb.gain.value = 0.4;
        const lp    = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 3000;
        // Comb: input → delay → lp → fb → delay (loop), delay → out
        delay.connect(lp);
        lp.connect(fb);
        fb.connect(delay);
        delay.connect(out);
      });
      return out;
    }

    destroy() {
      this.allNotesOff(0);
      if (this.gain) this.gain.disconnect();
      if (this._dryGain)    this._dryGain.disconnect();
      if (this._reverbGain) this._reverbGain.disconnect();
      if (this._reverbBus)  this._reverbBus.disconnect();
      if (this._reverbNode) this._reverbNode.disconnect();
      this.ready = false;
    }

    _cutoffHz() {
      // 60 Hz to 8000 Hz logarithmic
      return 60 * Math.pow(8000 / 60, this.p.cutoff);
    }

    noteOn(midi, time) {
      if (!this.ready) return;
      this._stopVoice(time);

      const ctx   = this.ctx;
      const freq  = 440 * Math.pow(2, (midi - 69) / 12);
      const freq2 = freq * Math.pow(2, this.p.vco2Detune / 12);
      const att   = Math.max(0.003, this.p.attack);
      const dec   = Math.max(0.01,  this.p.decay);
      const sus   = this.p.sustain;

      // VCO 1
      const vco1 = ctx.createOscillator();
      vco1.type = this.p.vco1Wave;
      vco1.frequency.value = freq;

      // VCO 2
      const vco2 = ctx.createOscillator();
      vco2.type = this.p.vco2Wave;
      vco2.frequency.value = freq2;

      // Mix or ring mod
      let audioSource;
      if (this.p.ringMod) {
        // Ring modulator: vco2 modulates amplitude of vco1
        const ringCarrier = ctx.createGain();
        ringCarrier.gain.value = 0;  // start silent; vco2 drives the gain
        vco2.connect(ringCarrier.gain);
        vco1.connect(ringCarrier);
        audioSource = ringCarrier;
      } else {
        const mix = ctx.createGain(); mix.gain.value = 0.5;
        vco1.connect(mix);
        vco2.connect(mix);
        audioSource = mix;
      }

      // VCF — single biquad lowpass (ARP 2600 had a 4-pole but we approximate with 1 pole + Q)
      const cutHz = this._cutoffHz();
      const vcf = ctx.createBiquadFilter();
      vcf.type = 'lowpass';
      vcf.frequency.value = cutHz;
      vcf.Q.value = this.p.reso * 11.5 + 0.5; // Q range 0.5 to 12

      // Filter envelope
      const envDepth = cutHz * this.p.envMod * 3;
      const filterStart = Math.max(30, cutHz * (1 - this.p.envMod * 0.8));
      vcf.frequency.setValueAtTime(filterStart, time);
      vcf.frequency.linearRampToValueAtTime(Math.min(cutHz + envDepth, 18000), time + att);
      vcf.frequency.exponentialRampToValueAtTime(Math.max(cutHz * sus + 20, 30), time + att + dec);

      // VCA with ADSR
      const vca = ctx.createGain(); vca.gain.value = 0;
      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(this.p.level, time + att);
      vca.gain.exponentialRampToValueAtTime(Math.max(this.p.level * sus, 0.001), time + att + dec);

      audioSource.connect(vcf);
      vcf.connect(vca);
      vca.connect(this.gain);

      vco1.start(time);
      vco2.start(time);

      this._voice = { vco1, vco2, vca, vcf };
    }

    noteOff(midi, time) {
      if (!this._voice) return;
      const rel = Math.max(0.02, this.p.release);
      const v   = this._voice;
      v.vca.gain.cancelScheduledValues(time);
      v.vca.gain.setValueAtTime(v.vca.gain.value, time);
      v.vca.gain.linearRampToValueAtTime(0, time + rel);
      const stop = time + rel + 0.05;
      try { v.vco1.stop(stop); v.vco2.stop(stop); } catch(e) {}
      this._voice = null;
    }

    allNotesOff(time) { this.noteOff(null, time); }

    silence() { if (this._voice) this._stopVoice(0); }

    _stopVoice(time) {
      if (!this._voice) return;
      try { this._voice.vco1.stop(time); this._voice.vco2.stop(time); } catch(e) {}
      this._voice = null;
    }

    setReverbMix(v) {
      this.p.reverbMix = v;
      if (this._reverbGain) this._reverbGain.gain.value = v;
      if (this._dryGain)    this._dryGain.gain.value    = 1 - v;
    }
  }

  global.ARP2600Engine = ARP2600Engine;

})(window);
