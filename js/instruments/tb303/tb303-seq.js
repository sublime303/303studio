/* ── TB-303 Step Sequencer ──
   Subscribes to Bus.clock for timing — no own scheduler loop.
   Owner: TB-303 agent
   ────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  class TB303Seq {
    constructor(eng) {
      this.eng    = eng;
      this.steps  = this._blank();
      this.onStep = null;   // (stepIndex) => void — set by instrument for UI sync
      this._tick  = this._onTick.bind(this);
    }

    _blank() {
      return Array.from({ length: 16 }, () =>
        ({ note: 'C', octave: 0, accent: false, slide: false, rest: true })
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
      const step = this.steps[idx];
      const next = this.steps[(idx + 1) % 16];
      const dur  = global.Bus.clock.stepDur();

      // Schedule visual update at the exact audio moment
      const delay = (time - global.Bus.now) * 1000;
      setTimeout(() => { if (this.onStep) this.onStep(idx); }, Math.max(0, delay));

      if (step.rest) { this.eng.gateOff(time); return; }

      const midi      = global.noteToMidi(step.note, step.octave);
      const nextSlide = !next.rest && next.slide;
      const noteDur   = (step.slide || nextSlide) ? dur * 0.96 : dur * 0.48;

      this.eng.noteOn(midi, step.accent, step.slide, time);
      if (!nextSlide) this.eng.gateOff(time + noteDur);
    }
  }

  global.TB303Seq = TB303Seq;

})(window);
