(function(global) {
  'use strict';

  // Chord intervals (semitones from root)
  const CHORD_INTERVALS = {
    maj:  [0, 4, 7],
    min:  [0, 3, 7],
    '7':  [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    m7:   [0, 3, 7, 10],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    dim:  [0, 3, 6],
    aug:  [0, 4, 8],
  };

  class Juno106Engine {
    constructor() {
      this.ctx     = null;
      this.gain    = null;  // master output gain
      this._chorus = null;  // chorus nodes object
      this._voices = {};    // midi → { oscs[], filter, vca, stopTime }
      this.ready   = false;

      // Parameters (knobs write here)
      this.p = {
        level:    0.75,
        cutoff:   0.55,   // 0–1 → 200–8000 Hz (log)
        reso:     0.20,   // 0–1 → Q 0.5–18
        attack:   0.02,   // seconds
        release:  0.45,   // seconds
        chorus:   true,
        lfoRate:  0.5,    // 0–1 → 0.1–8 Hz
        lfoCutoff:0.0,    // 0–1 LFO→filter depth
        sub:      true,   // sub oscillator on/off
      };
    }

    init(ctx, dest) {
      if (this.ready) return;
      this.ctx  = ctx;

      // Master gain
      this.gain = ctx.createGain();
      this.gain.gain.value = this.p.level;

      // Chorus — two modulated delay lines (BBD simulation)
      const lfo1 = ctx.createOscillator();
      const lfo2 = ctx.createOscillator();
      lfo1.type = lfo2.type = 'sine';
      lfo1.frequency.value = 0.5;
      lfo2.frequency.value = 0.5;

      const d1 = ctx.createDelay(0.05); d1.delayTime.value = 0.007;
      const d2 = ctx.createDelay(0.05); d2.delayTime.value = 0.009;
      const lg1 = ctx.createGain(); lg1.gain.value = 0.003;
      const lg2 = ctx.createGain(); lg2.gain.value = 0.003;
      lfo1.connect(lg1); lg1.connect(d1.delayTime);
      lfo2.connect(lg2); lg2.connect(d2.delayTime);
      lfo1.start(); lfo2.start();

      // Dry + wet mix
      const chorusMix = ctx.createGain(); chorusMix.gain.value = 0.5;
      const dryGain   = ctx.createGain(); dryGain.gain.value   = 0.5;

      this.gain.connect(d1);
      this.gain.connect(d2);
      this.gain.connect(dryGain);
      d1.connect(chorusMix); d2.connect(chorusMix);
      chorusMix.connect(dest);
      dryGain.connect(dest);

      this._chorus = { lfo1, lfo2, lg1, lg2, d1, d2, chorusMix, dryGain };
      this.ready = true;
    }

    destroy() {
      this.allNotesOff(0);
      if (this._chorus) { this._chorus.lfo1.stop(); this._chorus.lfo2.stop(); }
      if (this.gain) this.gain.disconnect();
      this.ready = false;
    }

    // ── Cutoff freq from 0–1 param (log scale 200–8000 Hz) ──
    _cutoffHz() {
      return 200 * Math.pow(8000 / 200, this.p.cutoff);
    }

    // ── Q from reso param 0–1 ──
    _resoQ() { return 0.5 + this.p.reso * 17.5; }

    // ── Play a set of MIDI notes simultaneously ──
    noteOn(midiNotes, time) {
      if (!this.ready) return;
      const ctx = this.ctx;
      const att = Math.max(0.005, this.p.attack);
      const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);

      midiNotes.forEach(midi => {
        // Stop any existing voice on this note
        if (this._voices[midi]) this._stopVoice(midi, time);

        const f = freq(midi);

        // DCO: sawtooth (main) + detuned sawtooth + optional sub square
        const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = f;
        const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = f; osc2.detune.value = 8;
        const sub  = ctx.createOscillator(); sub.type  = 'square';   sub.frequency.value  = f / 2;

        // Oscillator mix
        const oscMix = ctx.createGain(); oscMix.gain.value = this.p.sub ? 0.33 : 0.45;
        osc1.connect(oscMix); osc2.connect(oscMix);
        if (this.p.sub) sub.connect(oscMix);

        // HPF (slight, like Juno's HPF slider at minimum)
        const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 40;

        // VCF
        const vcf = ctx.createBiquadFilter();
        vcf.type = 'lowpass';
        vcf.frequency.value = this._cutoffHz();
        vcf.Q.value = this._resoQ();

        // VCA
        const vca = ctx.createGain(); vca.gain.value = 0;

        oscMix.connect(hpf); hpf.connect(vcf); vcf.connect(vca); vca.connect(this.gain);

        // Envelope: attack
        vca.gain.setValueAtTime(0, time);
        vca.gain.linearRampToValueAtTime(0.8 * this.p.level, time + att);

        osc1.start(time); osc2.start(time); sub.start(time);

        this._voices[midi] = { osc1, osc2, sub, hpf, vcf, vca };
      });
    }

    noteOff(midiNotes, time) {
      const rel = Math.max(0.02, this.p.release);
      midiNotes.forEach(midi => {
        const v = this._voices[midi]; if (!v) return;
        v.vca.gain.cancelScheduledValues(time);
        v.vca.gain.setValueAtTime(v.vca.gain.value, time);
        v.vca.gain.linearRampToValueAtTime(0, time + rel);
        const stop = time + rel + 0.05;
        v.osc1.stop(stop); v.osc2.stop(stop); v.sub.stop(stop);
        delete this._voices[midi];
      });
    }

    allNotesOff(time) {
      this.noteOff(Object.keys(this._voices).map(Number), time);
    }

    _stopVoice(midi, time) {
      const v = this._voices[midi]; if (!v) return;
      try { v.osc1.stop(time); v.osc2.stop(time); v.sub.stop(time); } catch(e) {}
      delete this._voices[midi];
    }

    // ── Play a chord: root MIDI + type ──
    chordOn(rootMidi, type, time) {
      const intervals = CHORD_INTERVALS[type] || [0, 4, 7];
      const notes = intervals.map(i => rootMidi + i);
      this.allNotesOff(time);
      this.noteOn(notes, time);
    }

    // ── Live update cutoff on all active voices ──
    updateCutoff() {
      const hz = this._cutoffHz(), q = this._resoQ();
      Object.values(this._voices).forEach(v => {
        if (v.vcf) { v.vcf.frequency.value = hz; v.vcf.Q.value = q; }
      });
    }
  }

  global.Juno106Engine    = Juno106Engine;
  global.JUNO_CHORD_TYPES = Object.keys({ maj:[],min:[],7:[],maj7:[],m7:[],sus2:[],sus4:[],dim:[],aug:[] });

})(window);
