(function(global) {
  'use strict';

  let _count = 0;

  class MS20Instrument {
    constructor() {
      this.type      = 'MS20';
      this.id        = 'ims20_' + (++_count);
      this.name      = 'MS-20 #' + _count;
      this.eng       = new global.MS20Engine();
      this.seq       = new global.MS20Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
      this._piano    = null;
      // osc wave buttons
      this._osc1BtnSaw = null;
      this._osc1BtnSqu = null;
      this._osc2BtnSaw = null;
      this._osc2BtnSqu = null;
      // osc2 detune display
      this._detuneDisplay = null;
      // step property buttons
      this._bOctLow  = null;
      this._bOctHigh = null;
      this._bRest    = null;
    }

    // ── Static descriptor ──────────────────────────────────────────
    static get descriptor() {
      return {
        type:        'MS20',
        label:       'Korg MS-20 Semi-Modular',
        badgeClass:  'badge-ms20',
        badgeText:   'MS-20',
        headerClass: 'ms20-header-bar',
      };
    }

    // ── createDOM ──────────────────────────────────────────────────
    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'ms20-card');

      // ── Oscillators + Filter panel ─────────────────────────────
      const synthPanel = mk('div', 'ms20-panel');
      synthPanel.innerHTML = '<div class="ms20-lbl">Synthesizer Controls</div>';
      const synthRow = mk('div', 'ms20-synth-row');

      // OSC section
      const oscSect = mk('div', 'ms20-osc-sect');
      oscSect.innerHTML = '<div class="ms20-lbl">Oscillators</div>';

      // OSC 1
      const osc1Row = mk('div', 'ms20-osc-row');
      const osc1Lbl = mk('div', 'ms20-osc-lbl'); osc1Lbl.textContent = 'OSC 1';
      const osc1Saw = mk('button', 'ms20-wave-btn active'); osc1Saw.textContent = 'SAW';
      const osc1Squ = mk('button', 'ms20-wave-btn');        osc1Squ.textContent = 'SQU';

      const setOsc1Wave = (wave) => {
        this.eng.p.osc1Wave = wave;
        osc1Saw.classList.toggle('active', wave === 'sawtooth');
        osc1Squ.classList.toggle('active', wave === 'square');
      };
      osc1Saw.onclick = () => setOsc1Wave('sawtooth');
      osc1Squ.onclick = () => setOsc1Wave('square');
      this._osc1BtnSaw = osc1Saw;
      this._osc1BtnSqu = osc1Squ;
      osc1Row.append(osc1Lbl, osc1Saw, osc1Squ);

      // OSC 2
      const osc2Row = mk('div', 'ms20-osc-row');
      const osc2Lbl = mk('div', 'ms20-osc-lbl'); osc2Lbl.textContent = 'OSC 2';
      const osc2Saw = mk('button', 'ms20-wave-btn');  osc2Saw.textContent = 'SAW';
      const osc2Squ = mk('button', 'ms20-wave-btn active'); osc2Squ.textContent = 'SQU';

      const setOsc2Wave = (wave) => {
        this.eng.p.osc2Wave = wave;
        osc2Saw.classList.toggle('active', wave === 'sawtooth');
        osc2Squ.classList.toggle('active', wave === 'square');
      };
      osc2Saw.onclick = () => setOsc2Wave('sawtooth');
      osc2Squ.onclick = () => setOsc2Wave('square');
      this._osc2BtnSaw = osc2Saw;
      this._osc2BtnSqu = osc2Squ;
      osc2Row.append(osc2Lbl, osc2Saw, osc2Squ);

      // OSC 2 detune
      const detuneRow = mk('div', 'ms20-detune-row');
      const detuneLbl = mk('div', 'ms20-osc-lbl'); detuneLbl.textContent = 'Detune';
      const detuneDown = mk('button', 'ms20-detune-btn'); detuneDown.textContent = '▼';
      const detuneDisp = mk('div', 'ms20-detune-disp'); detuneDisp.textContent = '0';
      const detuneUp   = mk('button', 'ms20-detune-btn'); detuneUp.textContent = '▲';
      this._detuneDisplay = detuneDisp;

      detuneDown.onclick = () => {
        this.eng.p.osc2Detune = Math.max(-7, this.eng.p.osc2Detune - 1);
        detuneDisp.textContent = this.eng.p.osc2Detune;
      };
      detuneUp.onclick = () => {
        this.eng.p.osc2Detune = Math.min(7, this.eng.p.osc2Detune + 1);
        detuneDisp.textContent = this.eng.p.osc2Detune;
      };
      detuneRow.append(detuneLbl, detuneDown, detuneDisp, detuneUp);

      oscSect.append(osc1Row, osc2Row, detuneRow);

      // FILTER section
      const filtSect = mk('div', 'ms20-filt-sect');
      filtSect.innerHTML = '<div class="ms20-lbl">Filter &amp; Envelope</div>';
      const filtKnobRow = mk('div', 'ms20-knob-row');

      const KNOB_DEFS = [
        { cls: 'ms20-hpcutoff', lbl: 'HPF Cut',   min: 0,     max: 1,   val: 0.1,  log: false, cb: v => { this.eng.p.hpCutoff = v; } },
        { cls: 'ms20-cutoff',   lbl: 'LPF Cut',   min: 0,     max: 1,   val: 0.5,  log: false, cb: v => { this.eng.p.cutoff   = v; } },
        { cls: 'ms20-reso',     lbl: 'Resonance', min: 0,     max: 1,   val: 0.4,  log: false, cb: v => { this.eng.p.reso     = v; } },
        { cls: 'ms20-envmod',   lbl: 'Env Mod',   min: 0,     max: 1,   val: 0.5,  log: false, cb: v => { this.eng.p.envMod   = v; } },
        { cls: 'ms20-attack',   lbl: 'Attack',    min: 0.003, max: 2,   val: 0.005, log: true, cb: v => { this.eng.p.attack   = v; } },
        { cls: 'ms20-decay',    lbl: 'Decay',     min: 0.01,  max: 2,   val: 0.3,  log: true,  cb: v => { this.eng.p.decay    = v; } },
        { cls: 'ms20-sustain',  lbl: 'Sustain',   min: 0,     max: 1,   val: 0.4,  log: false, cb: v => { this.eng.p.sustain  = v; } },
        { cls: 'ms20-release',  lbl: 'Release',   min: 0.02,  max: 3,   val: 0.2,  log: true,  cb: v => { this.eng.p.release  = v; } },
      ];

      KNOB_DEFS.forEach(kd => {
        const g   = mk('div', 'knob-group ' + kd.cls);
        const k   = mk('div', 'knob');
        const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        g.append(k, lbl);
        filtKnobRow.appendChild(g);
        this._knobs[kd.cls] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val, log: kd.log || false, onChange: kd.cb,
        });
      });

      filtSect.appendChild(filtKnobRow);
      synthRow.append(oscSect, filtSect);
      synthPanel.appendChild(synthRow);
      root.appendChild(synthPanel);

      // ── Step sequencer panel ────────────────────────────────────
      const seqPanel = mk('div', 'ms20-panel');
      seqPanel.innerHTML = '<div class="ms20-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'ms20-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'ms20-step');
        btn.innerHTML = '<div class="ms20-step-note">–</div><div class="ms20-step-oct"></div>';
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Note entry ─────────────────────────────────────────────
      const noteEntry = mk('div', 'ms20-note-entry');

      // Piano keyboard
      const pianoWrap = mk('div', 'ms20-piano-wrap');
      pianoWrap.innerHTML = '<div class="ms20-lbl">Note Input</div>';
      const piano = mk('div', 'ms20-piano');

      const PIANO_KEYS = [
        { note: 'C',  white: 0 }, { note: 'C#', black: 22  },
        { note: 'D',  white: 1 }, { note: 'D#', black: 57  },
        { note: 'E',  white: 2 }, { note: 'F',  white: 3   },
        { note: 'F#', black: 129},{ note: 'G',  white: 4   },
        { note: 'G#', black: 165},{ note: 'A',  white: 5   },
        { note: 'A#', black: 200},{ note: 'B',  white: 6   },
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'ms20-wkey' : 'ms20-bkey');
        if ('white' in k) {
          el.style.cssText = `left:${k.white * 36}px;width:35px`;
          el.innerHTML = `<span>${k.note}</span>`;
        } else {
          el.style.cssText = `left:${k.black}px`;
        }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._assignNote(k.note); });
        piano.appendChild(el);
      });
      this._piano = piano;
      pianoWrap.appendChild(piano);
      noteEntry.appendChild(pianoWrap);

      // Step properties
      const sprops = mk('div', 'ms20-step-props');
      sprops.innerHTML = '<div class="ms20-lbl" style="text-align:left">Step Edit</div>';

      const r1 = mk('div', 'ms20-prop-row');
      const bLow  = mk('button', 'ms20-prop-btn');        bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'ms20-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      r1.append(bLow, bHigh);

      const r2 = mk('div', 'ms20-prop-row');
      const bRest = mk('button', 'ms20-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      r2.append(bRest);

      sprops.append(r1, r2);
      this._bOctLow  = bLow;
      this._bOctHigh = bHigh;
      this._bRest    = bRest;

      noteEntry.appendChild(sprops);
      seqPanel.appendChild(noteEntry);
      root.appendChild(seqPanel);

      // ── Transport panel ─────────────────────────────────────────
      const transPanel = mk('div', 'ms20-panel');
      const transRow   = mk('div', 'ms20-transport');

      const btns = mk('div', 'ms20-btns');
      const playBtn = mk('button', 't-btn btn-play-ms20'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-ms20'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'pat-btns-ms20');
      global.MS20_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-ms20'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const clrB = mk('button', 'pat-b-ms20'); clrB.textContent = 'Clear';    clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-ms20'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-ms20'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(clrB, expB, impB, impI);

      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      // Wire step callback
      this.seq.onStep = idx => {
        this._stepBtns.forEach((b, j) => b.classList.toggle('playing', j === idx));
      };

      this._loadPreset(0);
      return root;
    }

    // ── Step editor helpers ────────────────────────────────────────
    _selectStep(i) {
      this._selStep = i;
      this._stepBtns.forEach((b, j) => b.classList.toggle('selected', j === i));
      const s = this.seq.steps[i];
      this._bOctLow.classList.toggle('active',  s.octave === 0);
      this._bOctHigh.classList.toggle('active', s.octave === 1);
      this._bRest.classList.toggle('active', s.rest);
      this._hlKey(s.note);
    }

    _hlKey(note) {
      this._piano.querySelectorAll('.ms20-wkey,.ms20-bkey').forEach(k =>
        k.classList.toggle('active', k.dataset.note === note)
      );
    }

    _assignNote(note) {
      const s = this.seq.steps[this._selStep];
      s.note = note; s.rest = false;
      this._refreshStep(this._selStep);
      this._hlKey(note);
      this._bRest.classList.remove('active');
      this._selectStep(this._selStep);
    }

    _setOct(oct) {
      this.seq.steps[this._selStep].octave = oct;
      this._refreshStep(this._selStep);
      this._selectStep(this._selStep);
    }

    _toggleRest() {
      const s = this.seq.steps[this._selStep];
      s.rest = !s.rest;
      this._refreshStep(this._selStep);
      this._selectStep(this._selStep);
    }

    _refreshStep(i) {
      const s = this.seq.steps[i], btn = this._stepBtns[i];
      if (!btn) return;
      const noteEl = btn.querySelector('.ms20-step-note');
      const octEl  = btn.querySelector('.ms20-step-oct');
      if (s.rest) {
        noteEl.textContent = '–';
        noteEl.className = 'ms20-step-rest';
        octEl.textContent  = '';
      } else {
        noteEl.textContent = s.note;
        noteEl.className = 'ms20-step-note';
        octEl.textContent  = s.octave === 1 ? '3' : '2';
      }
      btn.classList.toggle('has-note', !s.rest);
      btn.classList.toggle('is-rest',   s.rest);
    }

    _refreshAll() { for (let i = 0; i < 16; i++) this._refreshStep(i); }

    // ── BPM helper ─────────────────────────────────────────────────
    _adjBPM(d, abs) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, abs !== undefined ? abs : global.Bus.clock.bpm + d));
      const hd = document.getElementById('masterBpm');
      if (hd) hd.textContent = global.Bus.clock.bpm;
    }

    // ── Plugin interface ───────────────────────────────────────────
    play(btn) {
      global.Bus.init();
      global.Bus.resume();
      this.seq.play(global.Bus.ctx, global.Bus.gain);
      if (btn) btn.classList.add('on');
    }

    stop(playBtn) {
      this.seq.stop();
      if (playBtn) playBtn.classList.remove('on');
      this._stepBtns.forEach(b => b.classList.remove('playing'));
    }

    destroy() {
      this.stop(this._playBtn);
      this.eng.destroy();
    }

    getSongData() {
      return {
        version:    1,
        type:       'MS20',
        name:       this.name,
        bpm:        global.Bus.clock.bpm,
        osc1Wave:   this.eng.p.osc1Wave,
        osc2Wave:   this.eng.p.osc2Wave,
        osc2Detune: this.eng.p.osc2Detune,
        knobs: {
          cutoff:   this._knobs['ms20-cutoff'].value,
          reso:     this._knobs['ms20-reso'].value,
          hpCutoff: this._knobs['ms20-hpcutoff'].value,
          envMod:   this._knobs['ms20-envmod'].value,
          attack:   this._knobs['ms20-attack'].value,
          decay:    this._knobs['ms20-decay'].value,
          sustain:  this._knobs['ms20-sustain'].value,
          release:  this._knobs['ms20-release'].value,
        },
        steps: this.seq.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'MS20') { alert('Not an MS-20 file'); return; }
      if (!d.steps || d.steps.length !== 16) { alert('Invalid pattern data'); return; }
      this.seq.steps = d.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      if (d.osc1Wave) {
        this.eng.p.osc1Wave = d.osc1Wave;
        this._osc1BtnSaw.classList.toggle('active', d.osc1Wave === 'sawtooth');
        this._osc1BtnSqu.classList.toggle('active', d.osc1Wave === 'square');
      }
      if (d.osc2Wave) {
        this.eng.p.osc2Wave = d.osc2Wave;
        this._osc2BtnSaw.classList.toggle('active', d.osc2Wave === 'sawtooth');
        this._osc2BtnSqu.classList.toggle('active', d.osc2Wave === 'square');
      }
      if (d.osc2Detune != null) {
        this.eng.p.osc2Detune = d.osc2Detune;
        if (this._detuneDisplay) this._detuneDisplay.textContent = d.osc2Detune;
      }
      const k = d.knobs || {};
      if (k.cutoff   != null) this._knobs['ms20-cutoff'].setValue(k.cutoff);
      if (k.reso     != null) this._knobs['ms20-reso'].setValue(k.reso);
      if (k.hpCutoff != null) this._knobs['ms20-hpcutoff'].setValue(k.hpCutoff);
      if (k.envMod   != null) this._knobs['ms20-envmod'].setValue(k.envMod);
      if (k.attack   != null) this._knobs['ms20-attack'].setValue(k.attack);
      if (k.decay    != null) this._knobs['ms20-decay'].setValue(k.decay);
      if (k.sustain  != null) this._knobs['ms20-sustain'].setValue(k.sustain);
      if (k.release  != null) this._knobs['ms20-release'].setValue(k.release);
      this._refreshAll();
      this._selectStep(0);
    }

    // ── Pattern helpers ────────────────────────────────────────────
    _loadPreset(i) {
      const p = global.MS20_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      if (p.osc1Wave) {
        this.eng.p.osc1Wave = p.osc1Wave;
        this._osc1BtnSaw.classList.toggle('active', p.osc1Wave === 'sawtooth');
        this._osc1BtnSqu.classList.toggle('active', p.osc1Wave === 'square');
      }
      if (p.osc2Wave) {
        this.eng.p.osc2Wave = p.osc2Wave;
        this._osc2BtnSaw.classList.toggle('active', p.osc2Wave === 'sawtooth');
        this._osc2BtnSqu.classList.toggle('active', p.osc2Wave === 'square');
      }
      if (p.osc2Detune != null) {
        this.eng.p.osc2Detune = p.osc2Detune;
        if (this._detuneDisplay) this._detuneDisplay.textContent = p.osc2Detune;
      }
      const k = p.knobs || {};
      if (k.cutoff   != null) this._knobs['ms20-cutoff'].setValue(k.cutoff);
      if (k.reso     != null) this._knobs['ms20-reso'].setValue(k.reso);
      if (k.hpCutoff != null) this._knobs['ms20-hpcutoff'].setValue(k.hpCutoff);
      if (k.envMod   != null) this._knobs['ms20-envmod'].setValue(k.envMod);
      if (k.attack   != null) this._knobs['ms20-attack'].setValue(k.attack);
      if (k.decay    != null) this._knobs['ms20-decay'].setValue(k.decay);
      if (k.sustain  != null) this._knobs['ms20-sustain'].setValue(k.sustain);
      if (k.release  != null) this._knobs['ms20-release'].setValue(k.release);
      this._refreshAll();
      this._selectStep(0);
    }

    _clear() {
      this.seq.steps = this.seq._blank();
      this._refreshAll();
      this._selectStep(0);
    }

    _export() {
      const d = this.getSongData();
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.href = url;
      a.download = (this.name || 'ms20').replace(/[^a-z0-9_-]/gi, '_') + '.json';
      document.body?.appendChild(a);
      a.click();
      a.remove();
      // Some browsers (and KDE/portal download handlers) can fail if the object URL
      // is revoked too quickly.
      // Intentionally do not revoke the object URL.
    }

    _import(evt) {
      const file = evt.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { try { this.applySongData(JSON.parse(e.target.result)); } catch(err) { alert('Parse error: ' + err.message); } };
      reader.readAsText(file);
      evt.target.value = '';
    }
  }

  global.StudioInstruments       = global.StudioInstruments || {};
  global.StudioInstruments.MS20  = MS20Instrument;

})(window);
