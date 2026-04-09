/* ── TB-303 (Tie) Audio Engine ──
   Clone of TB-303 engine (shared sound), used by TB303_TIE instrument.
   ───────────────────────────── */
(function(global) {
  'use strict';

  class TB303TieEngine {
    constructor() {
      this.ctx = null; this.osc = null; this.filter = null;
      this.drive = null; this.vca = null; this.master = null; this.ready = false;

      // Synth params (normalised 0-1 unless noted)
      this.waveform  = 'sawtooth';
      this.tune      = 0;     // semitones, -7..+7
      this.cutoff    = 0.38;
      this.resonance = 0.32;
      this.envMod    = 0.50;
      this.decay     = 0.28;
      this.accentAmt = 0.60;
      this.driveAmt  = 0.45;  // 0..1
      this.prevFreq  = 0;
      this._vel      = 0.55;
    }

    cutoffHz()  { return 60  * Math.pow(130, this.cutoff);  }  // 60–7800 Hz
    resoQ()     { return 0.6 + this.resonance * 19.4;        }  // 0.6–20
    decaySec()  { return 0.05 * Math.pow(36,  this.decay);   }  // 50ms–1.8s

    /** Filter envelope shape for UI (same math as noteOn). accent = accented step */
    envelopeDiagram(accent) {
      const cutHz = this.cutoffHz();
      const decaySec = this.decaySec() * (accent ? 1.6 : 1.0);
      const boost = accent ? (1 + this.accentAmt * 0.7) : 1;
      const peakHz = Math.min(cutHz * Math.pow(2, this.envMod * 4.5 * boost), 18000);
      return { cutHz, peakHz, decaySec };
    }

    /** Lazy init — call inside a user-gesture handler */
    init(ctx, dest) {
      if (this.ready) return;
      this.ctx = ctx;

      this.osc    = ctx.createOscillator();
      this.filter = ctx.createBiquadFilter();
      this.drive  = ctx.createWaveShaper();
      this.vca    = ctx.createGain();
      this.master = ctx.createGain();

      this.osc.type               = this.waveform;
      this.osc.frequency.value    = 110;
      this.filter.type            = 'lowpass';
      this.filter.frequency.value = this.cutoffHz();
      this.filter.Q.value         = this.resoQ();
      this.drive.oversample       = '4x';
      this.drive.curve            = this._driveCurve(this.driveAmt);
      this.vca.gain.value         = 0;
      this.master.gain.value      = 0.7;

      this.osc.connect(this.filter);
      this.filter.connect(this.drive);
      this.drive.connect(this.vca);
      this.vca.connect(this.master);
      this.master.connect(dest);
      this.osc.start();
      this.ready = true;
    }

    destroy() {
      try { if (this.osc) this.osc.stop(); } catch (e) {}
      if (this.master) this.master.disconnect();
      this.ready = false;
    }

    noteOn(midi, accent, slide, time, retrig = true) {
      if (!this.ready) return;
      const freq = 440 * Math.pow(2, (midi + this.tune - 69) / 12);

      if (slide && this.prevFreq > 0) {
        this.osc.frequency.setValueAtTime(this.prevFreq, time);
        this.osc.frequency.linearRampToValueAtTime(freq, time + 0.065);
      } else {
        this.osc.frequency.setValueAtTime(freq, time);
      }
      this.prevFreq = freq;

      // On a real 303, slide is typically legato: the pitch changes without a full
      // envelope retrigger. We model that by skipping the VCA/filter envelope when retrig=false.
      if (!retrig) {
        if (accent) {
          const vel = 0.55 + this.accentAmt * 0.45;
          this._vel = vel;
          this.vca.gain.setValueAtTime(vel, time);
          // Nudge filter to the accented peak without running the full envelope ramp.
          const cut   = this.cutoffHz();
          const boost = (1 + this.accentAmt * 0.7);
          const peak  = Math.min(cut * Math.pow(2, this.envMod * 4.5 * boost), 18000);
          this.filter.frequency.setValueAtTime(Math.max(peak, cut), time);
          this.filter.Q.setValueAtTime(this.resoQ(), time);
        }
        return;
      }

      const vel = accent ? (0.55 + this.accentAmt * 0.45) : 0.55;
      this._vel = vel;
      this.vca.gain.setValueAtTime(vel, time);

      const cut   = this.cutoffHz();
      const decay = this.decaySec() * (accent ? 1.6 : 1.0);
      const boost = accent ? (1 + this.accentAmt * 0.7) : 1;
      const peak  = Math.min(cut * Math.pow(2, this.envMod * 4.5 * boost), 18000);

      this.filter.frequency.setValueAtTime(Math.max(peak, cut), time);
      this.filter.Q.setValueAtTime(this.resoQ(), time);
      if (peak > cut + 5) {
        this.filter.frequency.exponentialRampToValueAtTime(Math.max(cut, 22), time + decay);
      }
    }

    gateOff(time) {
      if (!this.ready) return;
      this.vca.gain.setValueAtTime(this._vel, time);
      this.vca.gain.linearRampToValueAtTime(0, time + 0.018);
    }

    silence() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.vca.gain.cancelScheduledValues(t);
      this.vca.gain.setValueAtTime(0, t + 0.02);
      this.filter.frequency.cancelScheduledValues(t);
      this.filter.frequency.setValueAtTime(this.cutoffHz(), t + 0.02);
      this.osc.frequency.cancelScheduledValues(t);
      this.prevFreq = 0;
    }

    setWave(t)   { this.waveform  = t; if (this.osc)    this.osc.type = t; }
    setTune(v)   { this.tune      = v; }
    setCutoff(v) { this.cutoff    = v; if (this.filter) this.filter.frequency.value = this.cutoffHz(); }
    setReso(v)   { this.resonance = v; if (this.filter) this.filter.Q.value         = this.resoQ();   }
    setEnvMod(v) { this.envMod    = v; }
    setDecay(v)  { this.decay     = v; }
    setAccent(v) { this.accentAmt = v; }
    setDrive(v)  { this.driveAmt  = Math.max(0, Math.min(1, v)); if (this.drive) this.drive.curve = this._driveCurve(this.driveAmt); }

    _driveCurve(amount) {
      const k = 2 + amount * 48;
      const n = 1024;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x);
      }
      return curve;
    }
  }

  global.TB303TieEngine = TB303TieEngine;

})(window);

