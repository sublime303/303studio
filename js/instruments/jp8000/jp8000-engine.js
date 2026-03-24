(function(global) {
  'use strict';

  // Chord intervals for polyphonic mode
  const JP_CHORD = {
    unison: [0],
    oct:    [0, 12],
    '5th':  [0, 7],
    maj:    [0, 4, 7],
    min:    [0, 3, 7],
    maj7:   [0, 4, 7, 11],
    m7:     [0, 3, 7, 10],
  };

  class JP8000Engine {
    constructor() {
      this.ctx    = null;
      this.gain   = null;
      this._voices = {}; // midi → { oscs[], filter, vca }
      this.ready  = false;

      this.p = {
        level:    0.70,
        detune:   0.40,  // 0–1: spread of the 7 oscillators (0=unison, 1=wide)
        cutoff:   0.65,  // 0–1 → 200–16000 Hz log
        reso:     0.20,
        attack:   0.02,
        release:  0.35,
        chordType:'maj', // key into JP_CHORD
        portamento:0.0,  // 0–0.5s glide
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

    _cutoffHz() { return 200 * Math.pow(16000 / 200, this.p.cutoff); }
    _resoQ()    { return 0.5 + this.p.reso * 15; }

    // Build 7 detuned sawtooth oscillators for one note
    _superSaw(freq, time) {
      const ctx = this.ctx;
      // 7 oscillator detune spread: symmetric around center
      // detune param 0–1 maps to 0–100 cents spread per side
      const spread = this.p.detune * 100;
      const DETUNES = [-spread, -spread*0.62, -spread*0.28, 0, spread*0.28, spread*0.62, spread];

      const mix = ctx.createGain(); mix.gain.value = 1 / 7;
      const oscs = DETUNES.map(det => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.detune.value = det;
        o.connect(mix);
        return o;
      });
      return { oscs, mix };
    }

    noteOn(midi, time) {
      if (!this.ready) return;
      if (this._voices[midi]) this._stopVoice(midi, time);
      const ctx  = this.ctx;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const att  = Math.max(0.005, this.p.attack);

      const { oscs, mix } = this._superSaw(freq, time);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this._cutoffHz();
      filter.Q.value = this._resoQ();

      const vca = ctx.createGain(); vca.gain.value = 0;
      mix.connect(filter); filter.connect(vca); vca.connect(this.gain);

      vca.gain.setValueAtTime(0, time);
      vca.gain.linearRampToValueAtTime(this.p.level * 0.8, time + att);

      oscs.forEach(o => o.start(time));
      this._voices[midi] = { oscs, mix, filter, vca };
    }

    noteOff(midi, time) {
      const v = this._voices[midi]; if (!v) return;
      const rel = Math.max(0.02, this.p.release);
      v.vca.gain.cancelScheduledValues(time);
      v.vca.gain.setValueAtTime(v.vca.gain.value, time);
      v.vca.gain.linearRampToValueAtTime(0, time + rel);
      const stop = time + rel + 0.05;
      v.oscs.forEach(o => { try { o.stop(stop); } catch(e) {} });
      delete this._voices[midi];
    }

    allNotesOff(time) {
      Object.keys(this._voices).map(Number).forEach(m => this.noteOff(m, time));
    }

    _stopVoice(midi, time) {
      const v = this._voices[midi]; if (!v) return;
      v.oscs.forEach(o => { try { o.stop(time); } catch(e) {} });
      delete this._voices[midi];
    }

    // Play a chord from a root note
    chordOn(rootMidi, time) {
      const intervals = JP_CHORD[this.p.chordType] || [0, 4, 7];
      this.allNotesOff(time);
      intervals.forEach(i => this.noteOn(rootMidi + i, time));
    }

    updateFilter() {
      const hz = this._cutoffHz(), q = this._resoQ();
      Object.values(this._voices).forEach(v => {
        v.filter.frequency.value = hz;
        v.filter.Q.value = q;
      });
    }
  }

  global.JP8000Engine    = JP8000Engine;
  global.JP_CHORD_TYPES  = Object.keys(JP_CHORD);

})(window);
