(function(global) {
  'use strict';

  let _count = 0;

  class DX7Instrument {
    constructor() {
      this.type      = 'DX7';
      this.id        = 'idx7_' + (++_count);
      this.name      = 'DX7 #' + _count;
      this.eng       = new global.DX7Engine();
      this.seq       = new global.DX7Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
      this._algoBtns = {};
    }

    static get descriptor() {
      return {
        type:        'DX7',
        label:       'Yamaha DX7 FM Synth',
        badgeClass:  'badge-dx7',
        badgeText:   'DX7',
        headerClass: 'dx7-header-bar',
      };
    }

    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'dx7-card');

      // ── Algorithm + Synth controls panel ──────────────────────────────────
      const ctrlPanel = mk('div', 'dx7-panel');
      ctrlPanel.innerHTML = '<div class="dx7-lbl">Synthesizer</div>';
      const ctrlRow = mk('div', 'dx7-controls');

      // Algorithm selector
      const algoSect = mk('div', 'dx7-algo-sect');
      const algoLbl = mk('div', 'dx7-lbl'); algoLbl.textContent = 'Algorithm';
      const algoBtns = mk('div', 'dx7-algo-btns');
      Object.keys(global.DX7_ALGORITHMS).forEach(name => {
        const b = mk('button', 'dx7-algo-btn');
        b.textContent = name;
        b.onclick = () => {
          this.eng.p.algorithm = name;
          Object.values(this._algoBtns).forEach(btn => btn.classList.remove('active'));
          b.classList.add('active');
        };
        this._algoBtns[name] = b;
        algoBtns.appendChild(b);
      });
      algoSect.append(algoLbl, algoBtns);
      ctrlRow.appendChild(algoSect);

      // Knobs
      const KNOB_DEFS = [
        { key: 'modIndex', lbl: 'FM Depth', min: 0,     max: 1,  val: 0.5,  log: false, cb: v => { this.eng.p.modIndex = v; } },
        { key: 'attack',   lbl: 'Attack',   min: 0.003, max: 2,  val: 0.01, log: true,  cb: v => { this.eng.p.attack   = v; } },
        { key: 'decay',    lbl: 'Decay',    min: 0.01,  max: 3,  val: 0.50, log: true,  cb: v => { this.eng.p.decay    = v; } },
        { key: 'sustain',  lbl: 'Sustain',  min: 0,     max: 1,  val: 0.30, log: false, cb: v => { this.eng.p.sustain  = v; } },
        { key: 'release',  lbl: 'Release',  min: 0.02,  max: 4,  val: 0.40, log: true,  cb: v => { this.eng.p.release  = v; } },
        { key: 'level',    lbl: 'Level',    min: 0,     max: 1,  val: 0.75, log: false, cb: v => { this.eng.p.level    = v; if (this.eng.gain) this.eng.gain.gain.value = v; } },
      ];
      KNOB_DEFS.forEach(kd => {
        const g = mk('div', 'knob-group');
        const k = mk('div', 'knob');
        const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        g.append(k, lbl);
        ctrlRow.appendChild(g);
        this._knobs[kd.key] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val, log: kd.log, onChange: kd.cb
        });
      });

      ctrlPanel.appendChild(ctrlRow);
      root.appendChild(ctrlPanel);

      // ── Step sequencer panel ──────────────────────────────────
      const seqPanel = mk('div', 'dx7-panel');
      seqPanel.innerHTML = '<div class="dx7-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'dx7-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'dx7-step');
        this._refreshStep(i, btn);
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Note entry ──────────────────────────────────────────
      const noteEntry = mk('div', 'dx7-note-entry');

      // Piano keyboard
      const pianoWrap = mk('div', 'dx7-piano-wrap');
      const pianoLbl = mk('div', 'dx7-lbl'); pianoLbl.textContent = 'Note';
      const piano = mk('div', 'dx7-piano');

      const PIANO_KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},  {note:'D',  white:1},
        {note:'D#', black:57},{note:'E',  white:2},   {note:'F',  white:3},
        {note:'F#', black:129},{note:'G', white:4},   {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200}, {note:'B',  white:6},
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'dx7-wkey' : 'dx7-bkey');
        if ('white' in k) {
          el.style.cssText = `left:${k.white * 36}px; width:35px`;
          el.innerHTML = `<span>${k.note}</span>`;
        } else {
          el.style.cssText = `left:${k.black}px`;
        }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._setNote(k.note); });
        piano.appendChild(el);
      });
      this._piano = piano;
      pianoWrap.append(pianoLbl, piano);
      noteEntry.appendChild(pianoWrap);

      // Step properties
      const stepProps = mk('div', 'dx7-step-props');

      const octRow = mk('div', 'dx7-prop-row');
      const bLow  = mk('button', 'dx7-prop-btn'); bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'dx7-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      this._bLow = bLow; this._bHigh = bHigh;
      octRow.append(bLow, bHigh);

      const restRow = mk('div', 'dx7-prop-row');
      const bRest = mk('button', 'dx7-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      this._bRest = bRest;
      restRow.appendChild(bRest);

      stepProps.append(octRow, restRow);
      noteEntry.appendChild(stepProps);
      seqPanel.appendChild(noteEntry);
      root.appendChild(seqPanel);

      // ── Transport panel ───────────────────────────────────────
      const transPanel = mk('div', 'dx7-panel');
      const transRow   = mk('div', 'dx7-transport');

      const btns = mk('div', 'dx7-btns');
      const playBtn = mk('button', 't-btn btn-play-dx7'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-dx7'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'pat-btns3');
      global.DX7_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-dx7'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const clrB = mk('button', 'pat-b-dx7'); clrB.textContent = 'Clear'; clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-dx7'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input'); impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-dx7'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(clrB, expB, impB, impI);

      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      this.seq.onStep = idx => {
        this._stepBtns.forEach((b, j) => b.classList.toggle('playing', j === idx));
      };

      this._loadPreset(0);
      return root;
    }

    // ── Step editor helpers ───────────────────────────────────
    _refreshStep(i, btn) {
      const el = btn || this._stepBtns[i];
      if (!el) return;
      const s = this.seq.steps[i];
      el.classList.toggle('has-note', !s.rest);
      el.classList.toggle('is-rest',   s.rest);
      if (s.rest) {
        el.innerHTML = '<span class="dx7-step-rest">–</span>';
      } else {
        el.innerHTML = `<span class="dx7-step-note">${s.note}</span><span class="dx7-step-oct">oct${s.octave}</span>`;
      }
    }

    _refreshAll() {
      this._stepBtns.forEach((btn, i) => this._refreshStep(i, btn));
    }

    _selectStep(i) {
      this._selStep = i;
      this._stepBtns.forEach((b, j) => b.classList.toggle('selected', j === i));
      const s = this.seq.steps[i];
      this._highlightPianoKey(s.note);
      this._bLow.classList.toggle('active',  s.octave === 0);
      this._bHigh.classList.toggle('active', s.octave === 1);
      this._bRest.classList.toggle('active', s.rest);
    }

    _highlightPianoKey(note) {
      this._piano.querySelectorAll('.dx7-wkey,.dx7-bkey').forEach(k =>
        k.classList.toggle('active', k.dataset.note === note)
      );
    }

    _setNote(note) {
      const s = this.seq.steps[this._selStep];
      s.note = note; s.rest = false;
      this._highlightPianoKey(note);
      this._bRest.classList.remove('active');
      this._refreshStep(this._selStep);
    }

    _setOct(oct) {
      this.seq.steps[this._selStep].octave = oct;
      this._refreshStep(this._selStep);
    }

    _toggleRest() {
      const s = this.seq.steps[this._selStep];
      s.rest = !s.rest;
      this._bRest.classList.toggle('active', s.rest);
      this._refreshStep(this._selStep);
    }

    _adjBPM(d, abs) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, abs !== undefined ? abs : global.Bus.clock.bpm + d));
      const hd = document.getElementById('masterBpm');
      if (hd) hd.textContent = global.Bus.clock.bpm;
    }

    // ── Plugin interface ──────────────────────────────────────
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
        version:   1,
        type:      'DX7',
        name:      this.name,
        bpm:       global.Bus.clock.bpm,
        algorithm: this.eng.p.algorithm,
        knobs: {
          modIndex: this._knobs['modIndex'].value,
          attack:   this._knobs['attack'].value,
          decay:    this._knobs['decay'].value,
          sustain:  this._knobs['sustain'].value,
          release:  this._knobs['release'].value,
          level:    this._knobs['level'].value,
        },
        steps: this.seq.steps.map(s => ({ ...s })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'DX7') { alert('Not a DX7 file'); return; }
      if (d.steps && d.steps.length === 16) this.seq.steps = d.steps.map(s => ({ ...s }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      if (d.algorithm && this._algoBtns[d.algorithm]) {
        this.eng.p.algorithm = d.algorithm;
        Object.values(this._algoBtns).forEach(b => b.classList.remove('active'));
        this._algoBtns[d.algorithm].classList.add('active');
      }
      const k = d.knobs || {};
      if (k.modIndex != null) this._knobs['modIndex'].setValue(k.modIndex);
      if (k.attack   != null) this._knobs['attack'].setValue(k.attack);
      if (k.decay    != null) this._knobs['decay'].setValue(k.decay);
      if (k.sustain  != null) this._knobs['sustain'].setValue(k.sustain);
      if (k.release  != null) this._knobs['release'].setValue(k.release);
      if (k.level    != null) this._knobs['level'].setValue(k.level);
      this._refreshAll();
      this._selectStep(0);
    }

    _loadPreset(i) {
      const p = global.DX7_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ ...s }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      if (p.algorithm && this._algoBtns[p.algorithm]) {
        this.eng.p.algorithm = p.algorithm;
        Object.values(this._algoBtns).forEach(b => b.classList.remove('active'));
        this._algoBtns[p.algorithm].classList.add('active');
      }
      const k = p.knobs || {};
      if (k.modIndex != null) this._knobs['modIndex'].setValue(k.modIndex);
      if (k.attack   != null) this._knobs['attack'].setValue(k.attack);
      if (k.decay    != null) this._knobs['decay'].setValue(k.decay);
      if (k.sustain  != null) this._knobs['sustain'].setValue(k.sustain);
      if (k.release  != null) this._knobs['release'].setValue(k.release);
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
      a.download = (this.name || 'dx7').replace(/[^a-z0-9_-]/gi, '_') + '.json';
      document.body?.appendChild(a);
      a.click();
      a.remove();
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
  global.StudioInstruments.DX7   = DX7Instrument;

})(window);
