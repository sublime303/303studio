/* ── TB-303 Instrument  ──
   Implements the Studio instrument plugin interface.
   Owner: TB-303 agent
   ─────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  let _count = 0;

  class TB303Instrument {
    constructor() {
      this.type     = 'TB303';
      this.id       = 'i' + (++_count);
      this.name     = 'TB-303 #' + _count;
      this.eng      = new global.TB303Engine();
      this.seq      = new global.TB303Seq(this.eng);
      this.root     = null;
      this._playBtn = null;
      this._stepBtns = [];
      this._knobs         = {};
      this._knobClearBtns = {};
      this._piano         = null;
      this._selStep       = 0;
      this._rec     = false;
      // button refs set in createDOM
      this._bOctLow = null; this._bOctHigh = null;
      this._bAcc    = null; this._bSli     = null; this._bRest = null;
      this._bpmD    = null;
    }

    // ── Plugin interface — static descriptor ──────────────────────
    static get descriptor() {
      return {
        type:        'TB303',
        label:       'TB-303 Bass Line',
        badgeClass:  'badge-303',
        badgeText:   '303',
        headerClass: 'tb303-header-bar',
      };
    }

    // ── createDOM ─────────────────────────────────────────────────
    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'tb303-card');

      // ── Controls panel ──
      const ctrlPanel = mk('div', 'tb3-dark');
      ctrlPanel.innerHTML = '<div class="panel-lbl">Synthesizer Controls</div>';
      const ctrlRow = mk('div', 'tb3-controls');

      const waveSect = mk('div', 'wave-sect');
      waveSect.innerHTML = '<div class="wave-lbl">Wave</div>';
      const sawBtn = mk('button', 'wave-btn active'); sawBtn.textContent = 'SAW';
      const squBtn = mk('button', 'wave-btn');        squBtn.textContent = 'SQU';
      sawBtn.onclick = () => { this.eng.setWave('sawtooth'); sawBtn.classList.add('active'); squBtn.classList.remove('active'); };
      squBtn.onclick = () => { this.eng.setWave('square');   squBtn.classList.add('active'); sawBtn.classList.remove('active'); };
      waveSect.append(sawBtn, squBtn);
      ctrlRow.appendChild(waveSect);
      ctrlRow.appendChild(mk('div', 'vdivider'));

      const KNOB_DEFS = [
        { cls:'k-tune',   key:'tune',   lbl:'Tune',       min:-7, max:7, val:0,    cb:v => this.eng.setTune(Math.round(v)) },
        { cls:'k-cutoff', key:'cutoff', lbl:'Cutoff Freq',min:0,  max:1, val:0.38, cb:v => this.eng.setCutoff(v) },
        { cls:'k-reso',   key:'reso',   lbl:'Resonance',  min:0,  max:1, val:0.32, cb:v => this.eng.setReso(v)   },
        { cls:'k-envmod', key:'envMod', lbl:'Env Mod',    min:0,  max:1, val:0.50, cb:v => this.eng.setEnvMod(v) },
        { cls:'k-decay',  key:'decay',  lbl:'Decay',      min:0,  max:1, val:0.28, cb:v => this.eng.setDecay(v)  },
        { cls:'k-accent', key:'accent', lbl:'Accent',     min:0,  max:1, val:0.60, cb:v => this.eng.setAccent(v) },
      ];
      KNOB_DEFS.forEach(kd => {
        const g = mk('div', 'knob-group ' + kd.cls);
        const k = mk('div', 'knob'); const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        const clrBtn = mk('button', 'knob-clr-btn');
        clrBtn.title = 'Clear saved ' + kd.lbl + ' for this step';
        clrBtn.onclick = () => this._clearOneKnob(kd.key);
        g.append(clrBtn, k, lbl);
        ctrlRow.appendChild(g);
        this._knobs[kd.cls] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val, onChange: kd.cb,
          onInteractionEnd: () => this._saveOneKnobToStep(kd.key, this._knobs[kd.cls].value),
        });
        this._knobClearBtns[kd.key] = clrBtn;
      });
      ctrlPanel.appendChild(ctrlRow);
      root.appendChild(ctrlPanel);

      // ── Sequencer panel ──
      const seqPanel = mk('div', 'tb3-dark');
      seqPanel.innerHTML = '<div class="panel-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'steps-row');
      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'step-btn');
        btn.innerHTML = `<span class="step-a">A</span><span class="step-s">S</span><div class="step-num">${i+1}</div><div class="step-led"></div><div class="step-note-d">-</div>`;
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Note entry ──
      const noteEntry = mk('div', 'note-entry');
      const pianoWrap = mk('div', 'piano-wrap');
      pianoWrap.innerHTML = '<div class="panel-lbl">Note Input</div>';
      const piano = mk('div', 'piano');
      const PIANO_KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},  {note:'D',  white:1},
        {note:'D#', black:57},{note:'E',  white:2},   {note:'F',  white:3},
        {note:'F#', black:129},{note:'G', white:4},   {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200}, {note:'B',  white:6},
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'white-key' : 'black-key');
        if ('white' in k) { el.style.cssText = `left:${k.white*36}px;width:35px`; el.innerHTML = `<span>${k.note}</span>`; }
        else              { el.style.cssText = `left:${k.black}px`; }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._assignNote(k.note); });
        piano.appendChild(el);
      });
      this._piano = piano;
      pianoWrap.appendChild(piano);
      noteEntry.appendChild(pianoWrap);

      const sprops = mk('div', 'step-props');
      sprops.innerHTML = '<div class="panel-lbl" style="text-align:left">Step Properties</div>';
      const r1 = mk('div', 'prop-row');
      const bLow  = mk('button', 'prop-btn');        bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      r1.append(bLow, bHigh);
      const r2   = mk('div', 'prop-row');
      const bAcc = mk('button', 'prop-btn'); bAcc.textContent  = 'Accent';
      const bSli = mk('button', 'prop-btn'); bSli.textContent  = 'Slide';
      const bRest= mk('button', 'prop-btn'); bRest.textContent = 'Rest';
      bAcc.onclick  = () => this._toggleProp('accent', bAcc);
      bSli.onclick  = () => this._toggleProp('slide',  bSli, true);
      bRest.onclick = () => this._toggleProp('rest',   bRest);
      r2.append(bAcc, bSli, bRest);
      sprops.append(r1, r2);
      this._bOctLow = bLow; this._bOctHigh = bHigh;
      this._bAcc = bAcc; this._bSli = bSli; this._bRest = bRest;
      noteEntry.appendChild(sprops);
      seqPanel.appendChild(noteEntry);
      root.appendChild(seqPanel);

      // ── Transport panel ──
      const transPanel = mk('div', 'tb3-dark');
      const transRow   = mk('div', 'tb3-transport');
      const btns       = mk('div', 'tb3-btns');
      const playBtn = mk('button', 't-btn btn-play3'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop3'); stopBtn.textContent = '■ Stop';
      const recBtn  = mk('button', 't-btn btn-rec3');  recBtn.textContent  = '● Rec';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn, recBtn);
      recBtn.onclick  = () => { this._rec = !this._rec; recBtn.classList.toggle('on', this._rec); if (this._rec) this._selectStep(0); };
      btns.append(playBtn, stopBtn, recBtn);
      this._playBtn = playBtn;

      // Pattern buttons
      const patBtns = mk('div', 'pat-btns3');
      global.TB303_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b3'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const rndB = mk('button', 'pat-b3'); rndB.textContent = 'Rnd';   rndB.onclick = () => this._random();
      const clrB = mk('button', 'pat-b3'); clrB.textContent = 'Clear'; clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b3'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b3'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(rndB, clrB, expB, impB, impI);

      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      // Wire sequencer step callback
      this.seq.onStep = idx => {
        this._stepBtns.forEach((b, j) => b.classList.toggle('playing', j === idx));
        if (idx >= 0 && this.seq.steps[idx].knobs) {
          this._applyStepKnobs(this.seq.steps[idx].knobs);
        }
      };

      this._loadPreset(0);
      return root;
    }

    // ── Internal UI helpers ─────────────────────────────────────────
    _saveOneKnobToStep(dataKey, value) {
      const step = this.seq.steps[this._selStep];
      if (!step.rest) {
        if (!step.knobs) step.knobs = {};
        step.knobs[dataKey] = value;
        this._knobClearBtns[dataKey].classList.add('active');
      }
    }

    _clearOneKnob(dataKey) {
      const step = this.seq.steps[this._selStep];
      if (step.knobs) {
        delete step.knobs[dataKey];
        if (Object.keys(step.knobs).length === 0) delete step.knobs;
      }
      this._knobClearBtns[dataKey].classList.remove('active');
    }

    _applyStepKnobs(knobs, ms) {
      const dur = ms ?? global.Bus.clock.stepDur() * 1000 * 0.8;
      if (knobs.tune   != null) this._knobs['k-tune'].setValueAnimated(knobs.tune, dur);
      if (knobs.cutoff != null) this._knobs['k-cutoff'].setValueAnimated(knobs.cutoff, dur);
      if (knobs.reso   != null) this._knobs['k-reso'].setValueAnimated(knobs.reso, dur);
      if (knobs.envMod != null) this._knobs['k-envmod'].setValueAnimated(knobs.envMod, dur);
      if (knobs.decay  != null) this._knobs['k-decay'].setValueAnimated(knobs.decay, dur);
      if (knobs.accent != null) this._knobs['k-accent'].setValueAnimated(knobs.accent, dur);
    }

    _selectStep(i) {
      this._selStep = i;
      this._stepBtns.forEach((b, j) => b.classList.toggle('selected', j === i));
      const s = this.seq.steps[i];
      if (s.knobs) this._applyStepKnobs(s.knobs, 120);
      this._bOctLow.classList.toggle('active',  s.octave === 0);
      this._bOctHigh.classList.toggle('active', s.octave === 1);
      this._bAcc.classList.toggle('active',  s.accent);
      this._bSli.classList.toggle('active',  s.slide);
      this._bSli.classList.toggle('slide-on', s.slide);
      this._bRest.classList.toggle('active', s.rest);
      const kb = s.knobs || {};
      Object.entries(this._knobClearBtns).forEach(([key, btn]) => btn.classList.toggle('active', kb[key] != null));
      this._hlKey(s.note);
    }

    _hlKey(note) {
      this._piano.querySelectorAll('.white-key,.black-key').forEach(k =>
        k.classList.toggle('active', k.dataset.note === note)
      );
    }

    _assignNote(note) {
      const s = this.seq.steps[this._selStep];
      s.note = note; s.rest = false;
      this._refreshStep(this._selStep);
      this._hlKey(note);
      this._bRest.classList.remove('active');
      if (this._rec) this._selectStep((this._selStep + 1) % 16);
      else           this._selectStep(this._selStep);
    }

    _setOct(oct) {
      this.seq.steps[this._selStep].octave = oct;
      this._refreshStep(this._selStep);
      this._selectStep(this._selStep);
    }

    _toggleProp(prop, btn) {
      const s = this.seq.steps[this._selStep];
      s[prop] = !s[prop];
      if (prop === 'rest' && s.rest) { s.accent = false; s.slide = false; }
      this._refreshStep(this._selStep);
      this._selectStep(this._selStep);
    }

    _refreshStep(i) {
      const s = this.seq.steps[i], btn = this._stepBtns[i];
      if (!btn) return;
      btn.querySelector('.step-note-d').textContent = s.rest ? '–' : s.note + (s.octave ? '3' : '2');
      btn.classList.toggle('has-note',  !s.rest);
      btn.classList.toggle('is-rest',    s.rest);
      btn.classList.toggle('has-accent', s.accent && !s.rest);
      btn.classList.toggle('has-slide',  s.slide  && !s.rest);
    }

    _refreshAll() { for (let i = 0; i < 16; i++) this._refreshStep(i); }

    _adjBPM(d, abs) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, abs !== undefined ? abs : global.Bus.clock.bpm + d));
      // Notify studio header BPM display if present
      const hd = document.getElementById('masterBpm');
      if (hd) hd.textContent = global.Bus.clock.bpm;
    }

    // ── Plugin interface — instance methods ────────────────────────
    play(btn) {
      global.Bus.init();
      global.Bus.resume();
      this.seq.play(global.Bus.ctx, global.Bus.gain);
      if (btn) btn.classList.add('on');
    }

    stop(playBtn, recBtn) {
      this.seq.stop();
      if (playBtn) playBtn.classList.remove('on');
      if (recBtn)  { this._rec = false; recBtn.classList.remove('on'); }
      this._stepBtns.forEach(b => b.classList.remove('playing'));
    }

    destroy() {
      this.stop(this._playBtn);
      this.eng.destroy();
    }

    getSongData() {
      return {
        version:  1,
        type:     'TB303',
        name:     this.name,
        bpm:      global.Bus.clock.bpm,
        waveform: this.eng.waveform,
        knobs: {
          tune:   this._knobs['k-tune'].value,
          cutoff: this._knobs['k-cutoff'].value,
          reso:   this._knobs['k-reso'].value,
          envMod: this._knobs['k-envmod'].value,
          decay:  this._knobs['k-decay'].value,
          accent: this._knobs['k-accent'].value,
        },
        steps: this.seq.steps.map(s => ({ ...s })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'TB303') { alert('Not a TB-303 file'); return; }
      if (!d.steps || d.steps.length !== 16) { alert('Invalid pattern data'); return; }
      this.seq.steps = d.steps.map(s => ({ ...s }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      const k = d.knobs || {};
      if (k.cutoff != null) this._knobs['k-cutoff'].setValue(k.cutoff);
      if (k.reso   != null) this._knobs['k-reso'].setValue(k.reso);
      if (k.envMod != null) this._knobs['k-envmod'].setValue(k.envMod);
      if (k.decay  != null) this._knobs['k-decay'].setValue(k.decay);
      if (k.accent != null) this._knobs['k-accent'].setValue(k.accent);
      if (k.tune   != null) this._knobs['k-tune'].setValue(k.tune);
      this._refreshAll();
      this._selectStep(0);
    }

    // ── Pattern helpers ─────────────────────────────────────────────
    _loadPreset(i) {
      const p = global.TB303_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ ...s }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      const k = p.knobs || {};
      if (k.cutoff != null) this._knobs['k-cutoff'].setValue(k.cutoff);
      if (k.reso   != null) this._knobs['k-reso'].setValue(k.reso);
      if (k.envMod != null) this._knobs['k-envmod'].setValue(k.envMod);
      if (k.decay  != null) this._knobs['k-decay'].setValue(k.decay);
      if (k.accent != null) this._knobs['k-accent'].setValue(k.accent);
      if (k.tune   != null) this._knobs['k-tune'].setValue(k.tune);
      this._refreshAll();
      this._selectStep(0);
    }

    _random() {
      this.seq.steps = Array.from({ length: 16 }, () => {
        const rest = Math.random() < 0.18;
        return {
          note:   global.NOTES[Math.floor(Math.random() * 12)],
          octave: Math.random() < 0.3 ? 1 : 0,
          accent: !rest && Math.random() < 0.25,
          slide:  !rest && Math.random() < 0.30,
          rest,
        };
      });
      this._refreshAll(); this._selectStep(0);
    }

    _clear() {
      this.seq.steps = this.seq._blank();
      this._refreshAll(); this._selectStep(0);
    }

    _export() {
      const d = this.getSongData();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = (this.name || 'tb303').replace(/[^a-z0-9_-]/gi, '_') + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    _import(evt) {
      const file = evt.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { try { this.applySongData(JSON.parse(e.target.result)); } catch (err) { alert('Parse error: ' + err.message); } };
      reader.readAsText(file);
      evt.target.value = '';
    }
  }

  // Register in the global instrument registry
  global.StudioInstruments        = global.StudioInstruments || {};
  global.StudioInstruments.TB303  = TB303Instrument;

})(window);
