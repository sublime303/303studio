(function(global) {
  'use strict';

  let _count = 0;

  class JP8000Instrument {
    constructor() {
      this.type      = 'JP8000';
      this.id        = 'ijp_' + (++_count);
      this.name      = 'JP-8000 #' + _count;
      this.eng       = new global.JP8000Engine();
      this.seq       = new global.JP8000Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
      this._chordBtns = {};
    }

    static get descriptor() {
      return {
        type:        'JP8000',
        label:       'Roland JP-8000 Supersaw',
        badgeClass:  'badge-jp',
        badgeText:   'JP-8000',
        headerClass: 'jp8000-header-bar',
      };
    }

    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'jp8000-card');

      // ── Synth controls panel ──────────────────────────────────
      const ctrlPanel = mk('div', 'jp-panel');
      ctrlPanel.innerHTML = '<div class="jp-lbl">Synthesizer</div>';
      const ctrlRow = mk('div', 'jp-controls');

      // Chord type section
      const chordSect = mk('div', 'jp-chord-sect');
      chordSect.innerHTML = '<div class="jp-lbl" style="margin-bottom:3px">Chord Mode</div>';
      const chordTypes = mk('div', 'jp-chord-types');
      this._chordBtns = {};
      global.JP_CHORD_TYPES.forEach(t => {
        const b = mk('button', 'jp-chord-btn'); b.textContent = t;
        b.onclick = () => this._setChordType(t);
        this._chordBtns[t] = b;
        chordTypes.appendChild(b);
      });
      chordSect.appendChild(chordTypes);
      ctrlRow.appendChild(chordSect);
      ctrlRow.appendChild(mk('div', 'vdivider'));

      const KNOB_DEFS = [
        { cls:'jp-detune',  lbl:'Detune',    min:0,     max:1,  val:0.40, cb: v => { this.eng.p.detune  = v; } },
        { cls:'jp-cutoff',  lbl:'Cutoff',    min:0,     max:1,  val:0.65, cb: v => { this.eng.p.cutoff  = v; this.eng.updateFilter(); } },
        { cls:'jp-reso',    lbl:'Resonance', min:0,     max:1,  val:0.20, cb: v => { this.eng.p.reso    = v; this.eng.updateFilter(); } },
        { cls:'jp-attack',  lbl:'Attack',    min:0.005, max:2,  val:0.02, log:true, cb: v => { this.eng.p.attack  = v; } },
        { cls:'jp-release', lbl:'Release',   min:0.02,  max:4,  val:0.35, log:true, cb: v => { this.eng.p.release = v; } },
        { cls:'jp-level',   lbl:'Level',     min:0,     max:1,  val:0.70, cb: v => { this.eng.p.level = v; if (this.eng.gain) this.eng.gain.gain.value = v; } },
      ];
      KNOB_DEFS.forEach(kd => {
        const g = mk('div', 'knob-group ' + kd.cls);
        const k = mk('div', 'knob'); const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        g.append(k, lbl);
        ctrlRow.appendChild(g);
        this._knobs[kd.cls] = new global.Knob(k, ind, { min: kd.min, max: kd.max, val: kd.val, log: kd.log || false, onChange: kd.cb });
      });

      ctrlPanel.appendChild(ctrlRow);
      root.appendChild(ctrlPanel);

      // ── Step sequencer panel ──────────────────────────────────
      const seqPanel = mk('div', 'jp-panel');
      seqPanel.innerHTML = '<div class="jp-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'jp-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'jp-step');
        this._renderStepLabel(btn, this.seq.steps[i]);
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Step editor row ───────────────────────────────────────
      const editorRow = mk('div', 'jp-editor-row');

      // Piano keyboard (root note selection)
      const pianoWrap = mk('div', 'jp-piano-wrap');
      pianoWrap.innerHTML = '<div class="jp-lbl" style="margin-bottom:3px">Root Note</div>';
      const piano = mk('div', 'jp-piano');
      const PIANO_KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},  {note:'D',  white:1},
        {note:'D#', black:57},{note:'E',  white:2},   {note:'F',  white:3},
        {note:'F#', black:129},{note:'G', white:4},   {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200}, {note:'B',  white:6},
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'jp-wkey' : 'jp-bkey');
        if ('white' in k) { el.style.cssText = `left:${k.white*32}px;width:31px`; el.innerHTML = `<span>${k.note}</span>`; }
        else              { el.style.cssText = `left:${k.black}px`; }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._setRoot(k.note); });
        piano.appendChild(el);
      });
      this._piano = piano;
      pianoWrap.appendChild(piano);
      editorRow.appendChild(pianoWrap);

      // Step properties (octave + rest)
      const stepProps = mk('div', 'jp-step-props');
      stepProps.innerHTML = '<div class="jp-lbl" style="margin-bottom:3px">Step</div>';

      const propRow = mk('div', 'jp-prop-row');
      const bLow  = mk('button', 'jp-prop-btn'); bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'jp-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      const bRest = mk('button', 'jp-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      this._bLow = bLow; this._bHigh = bHigh; this._bRest = bRest;
      propRow.append(bLow, bHigh, bRest);
      stepProps.appendChild(propRow);
      editorRow.appendChild(stepProps);

      seqPanel.appendChild(editorRow);
      root.appendChild(seqPanel);

      // ── Transport panel ───────────────────────────────────────
      const transPanel = mk('div', 'jp-panel');
      const transRow   = mk('div', 'jp-transport');

      const btns = mk('div', 'jp-btns');
      const playBtn = mk('button', 't-btn btn-play-jp'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-jp'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'pat-btns3');
      global.JP8000_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-jp'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const clrB = mk('button', 'pat-b-jp'); clrB.textContent = 'Clear'; clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-jp'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input'); impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-jp'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
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
    _selectStep(i) {
      this._selStep = i;
      this._stepBtns.forEach((b, j) => b.classList.toggle('selected', j === i));
      const s = this.seq.steps[i];
      this._highlightPianoKey(s.root);
      this._bLow.classList.toggle('active',  s.octave === 0);
      this._bHigh.classList.toggle('active', s.octave === 1);
      this._bRest.classList.toggle('active', s.rest);
    }

    _highlightPianoKey(note) {
      this._piano.querySelectorAll('.jp-wkey,.jp-bkey').forEach(k =>
        k.classList.toggle('active', k.dataset.note === note)
      );
    }

    _setRoot(note) {
      const s = this.seq.steps[this._selStep];
      s.root = note; s.rest = false;
      this._highlightPianoKey(note);
      this._bRest.classList.remove('active');
      this._renderStepLabel(this._stepBtns[this._selStep], s);
    }

    _setOct(oct) {
      this.seq.steps[this._selStep].octave = oct;
      this._renderStepLabel(this._stepBtns[this._selStep], this.seq.steps[this._selStep]);
    }

    _toggleRest() {
      const s = this.seq.steps[this._selStep];
      s.rest = !s.rest;
      this._bRest.classList.toggle('active', s.rest);
      this._renderStepLabel(this._stepBtns[this._selStep], s);
    }

    _setChordType(type) {
      this.eng.p.chordType = type;
      Object.entries(this._chordBtns).forEach(([t, b]) => b.classList.toggle('active', t === type));
    }

    _renderStepLabel(btn, s) {
      btn.classList.toggle('has-note', !s.rest);
      btn.classList.toggle('is-rest',   s.rest);
      if (s.rest) {
        btn.innerHTML = '<span class="jp-step-rest">–</span>';
      } else {
        btn.innerHTML = `<span class="jp-step-root">${s.root}</span><span class="jp-step-oct">oct${s.octave}</span>`;
      }
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
        version: 1, type: 'JP8000', name: this.name,
        bpm: global.Bus.clock.bpm,
        knobs: {
          cutoff:  this._knobs['jp-cutoff'].value,
          reso:    this._knobs['jp-reso'].value,
          detune:  this._knobs['jp-detune'].value,
          attack:  this._knobs['jp-attack'].value,
          release: this._knobs['jp-release'].value,
          level:   this._knobs['jp-level'].value,
        },
        chordType: this.eng.p.chordType,
        steps: this.seq.steps.map(s => ({ ...s })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'JP8000') { alert('Not a JP-8000 file'); return; }
      if (d.steps && d.steps.length === 16) this.seq.steps = d.steps.map(s => ({ ...s }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      if (d.chordType) this._setChordType(d.chordType);
      const k = d.knobs || {};
      if (k.cutoff  != null) this._knobs['jp-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['jp-reso'].setValue(k.reso);
      if (k.detune  != null) this._knobs['jp-detune'].setValue(k.detune);
      if (k.attack  != null) this._knobs['jp-attack'].setValue(k.attack);
      if (k.release != null) this._knobs['jp-release'].setValue(k.release);
      if (k.level   != null) this._knobs['jp-level'].setValue(k.level);
      this._stepBtns.forEach((btn, i) => this._renderStepLabel(btn, this.seq.steps[i]));
      this._selectStep(0);
    }

    _loadPreset(i) {
      const p = global.JP8000_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ ...s }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      if (p.chordType) this._setChordType(p.chordType);
      const k = p.knobs || {};
      if (k.cutoff  != null) this._knobs['jp-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['jp-reso'].setValue(k.reso);
      if (k.detune  != null) this._knobs['jp-detune'].setValue(k.detune);
      if (k.attack  != null) this._knobs['jp-attack'].setValue(k.attack);
      if (k.release != null) this._knobs['jp-release'].setValue(k.release);
      this._stepBtns.forEach((btn, i) => this._renderStepLabel(btn, this.seq.steps[i]));
      this._selectStep(0);
    }

    _clear() {
      this.seq.steps = this.seq._blank();
      this._stepBtns.forEach((btn, i) => this._renderStepLabel(btn, this.seq.steps[i]));
      this._selectStep(0);
    }

    _export() {
      const d = this.getSongData();
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.href = url;
      a.download = (this.name || 'jp8000').replace(/[^a-z0-9_-]/gi, '_') + '.json';
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

  global.StudioInstruments         = global.StudioInstruments || {};
  global.StudioInstruments.JP8000  = JP8000Instrument;

})(window);
