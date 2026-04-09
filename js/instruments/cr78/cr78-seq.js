/* ── CR-78 Step Sequencer ──
   Subscribes to Bus.clock for timing — no own scheduler loop.
   Mirrors TR808Seq but uses VOICES_CR78 and CR78Engine.trigger().
   Owner: CR-78 agent
   ──────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  class CR78Seq {
    constructor(eng) {
      this.eng      = eng;
      this.patterns = {};
      global.VOICES_CR78.forEach(v => { this.patterns[v] = Array(16).fill(false); });
      this.onStep   = null;   // (stepIndex) => void
      this._tick    = this._onTick.bind(this);
    }

    play(ctx, dest) {
      this.eng.init(ctx, dest);
      global.Bus.clock.subscribe(this._tick);
      if (!global.Bus.clock.running) global.Bus.clock.start();
    }

    stop() {
      global.Bus.clock.unsubscribe(this._tick);
      if (this.onStep) this.onStep(-1);
    }

    // ── Clock callback ────────────────────────────────────────
    _onTick(step, time) {
      if (step === -1) {
        if (this.onStep) this.onStep(-1);
        return;
      }
      global.VOICES_CR78.forEach(v => {
        if (this.patterns[v][step]) this.eng.trigger(v, time);
      });
      const delay = (time - global.Bus.now) * 1000;
      setTimeout(() => {
        if (this.onStep) this.onStep(step);
      }, Math.max(0, delay));
    }
  }

  global.CR78Seq = CR78Seq;

})(window);
