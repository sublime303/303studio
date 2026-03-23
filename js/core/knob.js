/* ── Knob UI component ──
   Accepts element references (not IDs) so multiple instances
   of the same instrument can coexist without ID conflicts.
   ─────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  class Knob {
    /**
     * @param {HTMLElement} el      - The knob element (rotates visually via its indicator child)
     * @param {HTMLElement} indEl   - The indicator element inside the knob
     * @param {object}      opts
     *   min, max       - value range
     *   val            - initial value (in raw units, not normalised)
     *   log            - if true, use logarithmic mapping
     *   onChange(v)    - called with raw value on every change
     */
    constructor(el, indEl, { min, max, val, log = false, onChange, onInteractionEnd }) {
      this.el  = el;
      this.ind = indEl;
      this.min = min; this.max = max; this.log = log;
      this.onChange = onChange;
      this.onInteractionEnd = onInteractionEnd || null;
      this._dy = null; this._v0 = null;

      el.addEventListener('pointerdown', e => {
        if (this.ind) this.ind.style.transition = '';
        this._dy = e.clientY;
        this._v0 = this._norm();
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      el.addEventListener('pointermove', e => {
        if (this._dy === null) return;
        this._setNorm(Math.max(0, Math.min(1, this._v0 + (this._dy - e.clientY) / 220)));
      });
      el.addEventListener('pointerup', () => {
        this._dy = null;
        if (this.onInteractionEnd) this.onInteractionEnd();
      });
      el.addEventListener('wheel', e => {
        e.preventDefault();
        this._setNorm(Math.max(0, Math.min(1, this._norm() - e.deltaY / 800)));
      }, { passive: false });

      this._setNorm(this._toNorm(val));
    }

    _toNorm(v) {
      return this.log
        ? Math.log(v / this.min) / Math.log(this.max / this.min)
        : (v - this.min) / (this.max - this.min);
    }
    _norm() { return this._toNorm(this.value); }

    _setNorm(n) {
      n = Math.max(0, Math.min(1, n));
      this.value = this.log
        ? this.min * Math.pow(this.max / this.min, n)
        : this.min + n * (this.max - this.min);
      this.value = Math.max(this.min, Math.min(this.max, this.value));
      if (this.ind) this.ind.style.transform = `rotate(${-135 + n * 270}deg)`;
      this.onChange(this.value);
    }

    /** Set value in raw units and update visuals */
    setValue(v) {
      this._setNorm(this._toNorm(Math.max(this.min, Math.min(this.max, v))));
    }

    /** Set value with a smooth rotation animation (does not trigger onInteractionEnd) */
    setValueAnimated(v, ms = 100) {
      if (this._dy !== null) return; // user is holding this knob — don't override
      if (this.ind) {
        this.ind.style.transition = '';
        void this.ind.offsetWidth; // force reflow so browser commits current position
        this.ind.style.transition = `transform ${ms}ms ease`;
      }
      this.setValue(v);
      if (this.ind) setTimeout(() => { this.ind.style.transition = ''; }, ms + 20);
    }
  }

  global.Knob = Knob;

})(window);
