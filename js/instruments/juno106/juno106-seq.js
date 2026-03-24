(function(global) {
  'use strict';

  class Juno106Seq {
    constructor(eng) {
      this.eng    = eng;
      this.steps  = this._blank();
      this.onStep = null;
      this._tick  = this._onTick.bind(this);
    }

    _blank() {
      return Array.from({ length: 16 }, () =>
        ({ root: 'C', octave: 0, type: 'min', rest: true })
      );
    }

    play(ctx, dest) {
      this.eng.init(ctx, dest);
      global.Bus.clock.subscribe(this._tick);
      if (!global.Bus.clock.running) global.Bus.clock.start();
    }

    stop() {
      global.Bus.clock.unsubscribe(this._tick);
      this.eng.allNotesOff(global.Bus.now);
      if (this.onStep) this.onStep(-1);
    }

    _onTick(step, time) {
      if (step === -1) {
        this.eng.allNotesOff(global.Bus.now);
        if (this.onStep) this.onStep(-1);
        return;
      }
      this._fire(step, time);
    }

    _fire(idx, time) {
      const step = this.steps[idx];
      const next = this.steps[(idx + 1) % 16];
      const dur  = global.Bus.clock.stepDur();

      const delay = (time - global.Bus.now) * 1000;
      setTimeout(() => { if (this.onStep) this.onStep(idx); }, Math.max(0, delay));

      if (step.rest) {
        this.eng.allNotesOff(time);
        return;
      }

      const rootMidi = global.noteToMidi(step.root, step.octave);
      this.eng.chordOn(rootMidi, step.type, time);

      // Schedule note-off at end of step (unless next step is also non-rest — legato)
      if (next.rest) {
        this.eng.allNotesOff(time + dur * 0.92);
      }
    }
  }

  global.Juno106Seq = Juno106Seq;

})(window);
