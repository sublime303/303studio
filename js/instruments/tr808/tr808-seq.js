/* ── TR-808 Step Sequencer ──
   Subscribes to Bus.clock for timing — no own scheduler loop.
   Owner: TR-808 agent
   ─────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  class TR808Seq {
    constructor(eng) {
      this.eng     = eng;
      this.pattern = {};
      global.VOICES_808.forEach(v => { this.pattern[v] = Array(16).fill(false); });
      this.onStep  = null;   // (stepIndex) => void
      this._tick   = this._onTick.bind(this);
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

    // ── Clock callback ───────────────────────────────────────
    _onTick(step, time) {
      if (step === -1) {
        if (this.onStep) this.onStep(-1);
        return;
      }
      this._fire(step, time);
    }

    _fire(idx, time) {
      global.VOICES_808.forEach(v => {
        if (this.pattern[v][idx]) this.eng[v](time);
      });
      const delay = (time - global.Bus.now) * 1000;
      setTimeout(() => {
        if (this.onStep) this.onStep(idx);
      }, Math.max(0, delay));
    }
  }

  global.TR808Seq = TR808Seq;

})(window);
