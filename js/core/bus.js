/* ── Shared AudioContext + Master Clock ──
   Bus      — singleton AudioContext, all instruments connect here.
   Bus.clock — one scheduler loop; instruments subscribe(fn) and receive
               fn(stepIndex, audioTime) on every step. Only one source of
               nextT exists, so drift and phase offset are structurally
               impossible.
   ─────────────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  // ── Audio bus ────────────────────────────────────────────────
  const Bus = {
    ctx:  null,
    gain: null,

    init() {
      if (this.ctx) return;
      this.ctx  = new (window.AudioContext || window.webkitAudioContext)();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.85;
      this.gain.connect(this.ctx.destination);
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMasterVolume(v) {
      if (this.gain) this.gain.gain.value = Math.max(0, Math.min(1, v));
    },

    get now() { return this.ctx ? this.ctx.currentTime : 0; }
  };

  // ── Master clock ─────────────────────────────────────────────
  const clock = {
    bpm:     128,
    step:    0,
    nextT:   0,
    running: false,
    tid:     null,
    _subs:   new Set(),
    LOOK:    25,    // ms — setTimeout polling interval
    AHEAD:   0.12,  // s  — lookahead window

    stepDur() { return 60 / (this.bpm * 2); },

    // Register a tick callback: fn(stepIndex, audioTime)
    // stepIndex === -1 signals a stop event.
    subscribe(fn)   { this._subs.add(fn); },

    // Unsubscribe. If no subscribers remain the clock halts automatically.
    unsubscribe(fn) {
      this._subs.delete(fn);
      if (this._subs.size === 0) this._halt();
    },

    // Start the clock from step 0. Idempotent if already running.
    start() {
      if (this.running) return;
      this.running = true;
      this.step    = 0;
      this.nextT   = Bus.now + 0.05;
      this._sched();
    },

    // Hard-stop: notify all subscribers then tear down.
    stop() {
      this._subs.forEach(fn => fn(-1, 0));
      this._subs.clear();
      this._halt();
    },

    _halt() {
      this.running = false;
      clearTimeout(this.tid);
      this.tid  = null;
      this.step = 0;
    },

    _sched() {
      if (!this.running) return;
      while (this.nextT < Bus.now + this.AHEAD) {
        const s = this.step, t = this.nextT;
        this._subs.forEach(fn => fn(s, t));
        this.nextT += this.stepDur();
        this.step = (this.step + 1) % 16;
      }
      this.tid = setTimeout(() => this._sched(), this.LOOK);
    }
  };

  Bus.clock = clock;
  global.Bus = Bus;

})(window);
