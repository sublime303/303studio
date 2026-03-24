(function(global) {
  'use strict';

  class MS20Seq {
    constructor(eng) {
      this.eng    = eng;
      this.steps  = this._blank();
      this.onStep = null;
      this._tick  = this._onTick.bind(this);
    }

    _blank() {
      return Array.from({ length: 16 }, () =>
        ({ note: 'C', octave: 0, rest: true })
      );
    }

    play(ctx, dest) {
      this.eng.init(ctx, dest);
      global.Bus.clock.subscribe(this._tick);
      if (!global.Bus.clock.running) global.Bus.clock.start();
    }

    stop() {
      global.Bus.clock.unsubscribe(this._tick);
      this.eng.allNotesOff(0);
      if (this.onStep) this.onStep(-1);
    }

    _onTick(step, time) {
      if (step === -1) { this.eng.allNotesOff(0); if (this.onStep) this.onStep(-1); return; }
      this._fire(step, time);
    }

    _fire(idx, time) {
      const step = this.steps[idx];
      const next = this.steps[(idx + 1) % 16];
      const dur  = global.Bus.clock.stepDur();

      const delay = (time - global.Bus.now) * 1000;
      setTimeout(() => { if (this.onStep) this.onStep(idx); }, Math.max(0, delay));

      if (step.rest) { this.eng.allNotesOff(time); return; }

      const midi = global.noteToMidi(step.note, step.octave);
      this.eng.noteOn(midi, time);
      if (next.rest) this.eng.noteOff(midi, time + dur * 0.85);
    }
  }

  global.MS20Seq = MS20Seq;

})(window);
