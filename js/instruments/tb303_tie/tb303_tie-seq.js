/* ── TB-303 (Tie) Step Sequencer ──
   Adds per-step `tie` as a real TB-303-style hold step:
   - If a step has `tie: true`, it does NOT trigger a new note; it holds the previous gate.
   - The previous step keeps the gate open when the NEXT step is tied.
   Subscribes to Bus.clock for timing — no own scheduler loop.
   ────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  class TB303TieSeq {
    constructor(eng) {
      this.eng    = eng;
      this.steps  = this._blank();
      this.onStep = null;   // (stepIndex) => void — set by instrument for UI sync
      this._tick  = this._onTick.bind(this);
    }

    _blank() {
      return Array.from({ length: 16 }, () =>
        ({ note: 'C', octave: 0, accent: false, slide: false, tie: false, rest: true })
      );
    }

    play(ctx, dest) {
      this.eng.init(ctx, dest);
      global.Bus.clock.subscribe(this._tick);
      if (!global.Bus.clock.running) global.Bus.clock.start();
    }

    stop() {
      global.Bus.clock.unsubscribe(this._tick);
      this.eng.silence();
      if (this.onStep) this.onStep(-1);
    }

    // ── Clock callback ───────────────────────────────────────
    _onTick(step, time) {
      if (step === -1) {
        this.eng.silence();
        if (this.onStep) this.onStep(-1);
        return;
      }
      this._fire(step, time);
    }

    _fire(idx, time) {
      const prev = this.steps[(idx - 1 + 16) % 16];
      const step = this.steps[idx];
      const next = this.steps[(idx + 1) % 16];
      const dur  = global.Bus.clock.stepDur();

      // Schedule visual update at the exact audio moment
      const delay = (time - global.Bus.now) * 1000;
      setTimeout(() => { if (this.onStep) this.onStep(idx); }, Math.max(0, delay));

      if (step.rest) { this.eng.gateOff(time); return; }
      if (step.tie) return; // hold previous note (no retrigger)

      const midi      = global.noteToMidi(step.note, step.octave);
      const nextSlide = !next.rest && next.slide;
      const nextTie   = !next.rest && next.tie;
      const longGate  = step.slide || nextSlide || nextTie;
      const noteDur   = longGate ? dur * 0.96 : dur * 0.48;

      // If this step is a slide and the previous step wasn't a rest/tie, treat it as legato:
      // glide pitch without fully retriggering envelopes.
      const legatoSlide = !!step.slide && !prev.rest && !prev.tie;
      this.eng.noteOn(midi, step.accent, step.slide, time, !legatoSlide);
      if (!nextSlide && !nextTie) this.eng.gateOff(time + noteDur);
    }
  }

  global.TB303TieSeq = TB303TieSeq;

})(window);

