(function(global) {
  'use strict';

  // Chord intervals (semitones from root)
  const CHORD_INTERVALS_OBXA = {
    maj:  [0, 4, 7],
    min:  [0, 3, 7],
    '7':  [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    m7:   [0, 3, 7, 10],
    sus4: [0, 5, 7],
    dim:  [0, 3, 6],
    aug:  [0, 4, 8],
  };

  class OBXaEngine {
    constructor() {
      this.ctx     = null;
      this.gain    = null;   // master output gain
      this._chorus = null;   // chorus nodes object
      this._voices = {};     // midi → { osc1, osc2, vcf, vca }
      this._chords = {};     // rootMidi → [midi, ...]
      this.ready   = false;

      // Parameters (knobs write here)
      this.p = {
        level:    0.7,
        osc1Wave: 'sawtooth',
        osc2Wave: 'sawtooth',
        detune:   8,      // cents, 0–30
        cutoff:   0.55,   // 0–1 → 80–8000 Hz (log)
        reso:     0.2,    // 0–1 → Q 0.5–8
        attack:   0.08,   // seconds
        decay:    0.5,    // seconds
        sustain:  0.6,    // 0–1
        release:  0.6,    // seconds
        chorus:   true,
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx = ctx;

      // Master gain
      this.gain = ctx.createGain();
      this.gain.gain.value = this.p.level;

      // Stereo chorus — two modulated delay lines, different LFO rates for width
      const lfo1 = ctx.createOscillator();
      const lfo2 = ctx.createOscillator();
      lfo1.type = lfo2.type = 'sine';
      lfo1.frequency.value = 0.5;   // left channel LFO
      lfo2.frequency.value = 0.7;   // right channel LFO (slightly different = wide stereo)

      const d1 = ctx.createDelay(0.05); d1.delayTime.value = 0.006;
      const d2 = ctx.createDelay(0.05); d2.delayTime.value = 0.008;
      const lg1 = ctx.createGain(); lg1.gain.value = 0.002;
      const lg2 = ctx.createGain(); lg2.gain.value = 0.002;
      lfo1.connect(lg1); lg1.connect(d1.delayTime);
      lfo2.connect(lg2); lg2.connect(d2.delayTime);
      lfo1.start(); lfo2.start();

      // Dry + wet mix
      const chorusMix = ctx.createGain(); chorusMix.gain.value = 0.5;
      const dryGain   = ctx.createGain(); dryGain.gain.value   = 0.5;

      this.gain.connect(d1);
      this.gain.connect(d2);
      this.gain.connect(dryGain);
      d1.connect(chorusMix);
      d2.connect(chorusMix);
      chorusMix.connect(dest);
      dryGain.connect(dest);

      this._chorus = { lfo1, lfo2, lg1, lg2, d1, d2, chorusMix, dryGain };
      this.ready = true;
    }

    destroy() {
      this.allNotesOff(0);
      if (this._chorus) {
        try { this._chorus.lfo1.stop(); } catch(e) {}
        try { this._chorus.lfo2.stop(); } catch(e) {}
      }
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    // ── Cutoff freq from 0–1 param (log scale 80–8000 Hz) ──
    _cutoffHz() {
      return 80 * Math.pow(100, this.p.cutoff);
    }

    // ── Q from reso param 0–1 (0.5–8) ──
    _resoQ() { return 0.5 + this.p.reso * 7.5; }

    // ── Play a chord: root MIDI + type ──
    chordOn(rootMidi, chordType, time) {
      if (!this.ready) return;
      const intervals = CHORD_INTERVALS_OBXA[chordType] || [0];
      const notes = intervals.map(i => rootMidi + i);

      // Release previous chord at this root
      this.chordOff(rootMidi, time);

      // Start each note in the chord
      notes.forEach(midi => this._noteOn(midi, time));

      // Track this chord
      this._chords[rootMidi] = notes;
    }

    chordOff(rootMidi, time) {
      const notes = this._chords[rootMidi];
      if (!notes) return;
      notes.forEach(midi => this._noteOff(midi, time));
      delete this._chords[rootMidi];
    }

    allNotesOff(time) {
      Object.keys(this._chords).map(Number).forEach(root => this.chordOff(root, time));
      // Also clean up any orphaned voices
      Object.keys(this._voices).map(Number).forEach(midi => this._noteOff(midi, time));
    }

    _noteOn(midi, time) {
      if (!this.ready) return;

      // Stop any existing voice on this midi
      if (this._voices[midi]) this._stopVoice(midi, time);

      const ctx = this.ctx;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const att  = Math.max(0.005, this.p.attack);
      const dec  = Math.max(0.01,  this.p.decay);
      const sus  = this.p.sustain;

      // OSC 1
      const osc1 = ctx.createOscillator();
      osc1.type = this.p.osc1Wave;
      osc1.frequency.value = freq;

      // OSC 2 — detuned for lush OB-Xa thickness
      const osc2 = ctx.createOscillator();
      osc2.type = this.p.osc2Wave;
      osc2.frequency.value = freq;
      osc2.detune.value = this.p.detune;

      // Oscillator mix
      const oscMix = ctx.createGain();
      oscMix.gain.value = 0.45;
      osc1.connect(oscMix);
      osc2.connect(oscMix);

      // VCF — lowpass filter
      const vcf = ctx.createBiquadFilter();
      vcf.type = 'lowpass';
      vcf.frequency.value = this._cutoffHz();
      vcf.Q.value = this._resoQ();

      // VCA
      const vca = ctx.createGain();
      vca.gain.value = 0;

      oscMix.connect(vcf);
      vcf.connect(vca);
      vca.connect(this.gain);

      // ADSR envelope — attack + decay/sustain
      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(0.8 * this.p.level, time + att);
      vca.gain.linearRampToValueAtTime(sus * 0.8 * this.p.level, time + att + dec);

      osc1.start(time);
      osc2.start(time);

      this._voices[midi] = { osc1, osc2, oscMix, vcf, vca };
    }

    _noteOff(midi, time) {
      const v = this._voices[midi];
      if (!v) return;
      const rel = Math.max(0.02, this.p.release);
      v.vca.gain.cancelScheduledValues(time);
      v.vca.gain.setValueAtTime(v.vca.gain.value, time);
      v.vca.gain.linearRampToValueAtTime(0, time + rel);
      const stop = time + rel + 0.05;
      try { v.osc1.stop(stop); } catch(e) {}
      try { v.osc2.stop(stop); } catch(e) {}
      delete this._voices[midi];
    }

    _stopVoice(midi, time) {
      const v = this._voices[midi];
      if (!v) return;
      try { v.osc1.stop(time); } catch(e) {}
      try { v.osc2.stop(time); } catch(e) {}
      delete this._voices[midi];
    }

    // ── Live update cutoff on all active voices ──
    updateCutoff() {
      const hz = this._cutoffHz();
      const q  = this._resoQ();
      Object.values(this._voices).forEach(v => {
        if (v.vcf) {
          v.vcf.frequency.value = hz;
          v.vcf.Q.value = q;
        }
      });
    }
  }

  global.OBXaEngine         = OBXaEngine;
  global.CHORD_INTERVALS_OBXA = CHORD_INTERVALS_OBXA;

})(window);
