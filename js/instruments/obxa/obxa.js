(function(global) {
  'use strict';

  let _count = 0;

  class OBXaInstrument {
    constructor() {
      this.type      = 'OBXA';
      this.id        = 'iobxa_' + (++_count);
      this.name      = 'OB-Xa #' + _count;
      this.eng       = new global.OBXaEngine();
      this.seq       = new global.OBXaSeq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
      this._typeBtns = {};
      this._piano    = null;
      this._bLow     = null;
      this._bHigh    = null;
      this._bRest    = null;
      this._osc1Btns = {};
      this._osc2Btns = {};
      this._chorusBtn = null;
    }

    static get descriptor() {
      return {
        type:        'OBXA',
        label:       'Oberheim OB-Xa Polysynth',
        badgeClass:  'badge-obxa',
        badgeText:   'OB-Xa',
        headerClass: 'obxa-header-bar',
      };
    }

    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'obxa-card');

      // ── Synth controls panel ──────────────────────────────────
      const ctrlPanel = mk('div', 'obxa-panel');
      ctrlPanel.innerHTML = '<div class="obxa-lbl">Synthesizer</div>';
      const ctrlRow = mk('div', 'obxa-controls');

      // OSC section
      const oscSect = mk('div', 'obxa-osc-sect');
      oscSect.innerHTML = '<div class="obxa-sub-lbl">OSC 1</div>';

      const osc1Row = mk('div', 'obxa-wave-row');
      ['sawtooth', 'square'].forEach(w => {
        const b = mk('button', 'obxa-wave-btn' + (this.eng.p.osc1Wave === w ? ' active' : ''));
        b.textContent = w === 'sawtooth' ? 'SAW' : 'SQU';
        b.onclick = () => {
          this.eng.p.osc1Wave = w;
          Object.entries(this._osc1Btns).forEach(([ww, btn]) => btn.classList.toggle('active', ww === w));
        };
        this._osc1Btns[w] = b;
        osc1Row.appendChild(b);
      });
      oscSect.appendChild(osc1Row);

      const osc2Lbl = mk('div', 'obxa-sub-lbl');
      osc2Lbl.textContent = 'OSC 2';
      osc2Lbl.style.marginTop = '5px';
      oscSect.appendChild(osc2Lbl);

      const osc2Row = mk('div', 'obxa-wave-row');
      ['sawtooth', 'square'].forEach(w => {
        const b = mk('button', 'obxa-wave-btn' + (this.eng.p.osc2Wave === w ? ' active' : ''));
        b.textContent = w === 'sawtooth' ? 'SAW' : 'SQU';
        b.onclick = () => {
          this.eng.p.osc2Wave = w;
          Object.entries(this._osc2Btns).forEach(([ww, btn]) => btn.classList.toggle('active', ww === w));
        };
        this._osc2Btns[w] = b;
        osc2Row.appendChild(b);
      });
      oscSect.appendChild(osc2Row);

      ctrlRow.appendChild(oscSect);
      ctrlRow.appendChild(mk('div', 'vdivider'));

      // Detune knob
      const detuneGroup = mk('div', 'knob-group obxa-detune');
      const detuneKnob = mk('div', 'knob'); const detuneInd = mk('div', 'knob-indicator');
      detuneKnob.appendChild(detuneInd);
      const detuneLbl = mk('div', 'knob-label'); detuneLbl.textContent = 'Detune';
      detuneGroup.append(detuneKnob, detuneLbl);
      ctrlRow.appendChild(detuneGroup);
      this._knobs['obxa-detune'] = new global.Knob(detuneKnob, detuneInd, {
        min: 0, max: 30, val: this.eng.p.detune, log: false,
        onChange: v => { this.eng.p.detune = v; }
      });

      ctrlRow.appendChild(mk('div', 'vdivider'));

      // Filter + Envelope knobs
      const KNOB_DEFS = [
        { cls: 'obxa-cutoff',  lbl: 'Cutoff',    min: 0,     max: 1,   val: 0.55, log: false, cb: v => { this.eng.p.cutoff  = v; this.eng.updateCutoff(); } },
        { cls: 'obxa-reso',    lbl: 'Resonance',  min: 0,     max: 1,   val: 0.2,  log: false, cb: v => { this.eng.p.reso    = v; this.eng.updateCutoff(); } },
        { cls: 'obxa-attack',  lbl: 'Attack',     min: 0.005, max: 4,   val: 0.08, log: true,  cb: v => { this.eng.p.attack  = v; } },
        { cls: 'obxa-decay',   lbl: 'Decay',      min: 0.01,  max: 4,   val: 0.5,  log: true,  cb: v => { this.eng.p.decay   = v; } },
        { cls: 'obxa-sustain', lbl: 'Sustain',    min: 0,     max: 1,   val: 0.6,  log: false, cb: v => { this.eng.p.sustain = v; } },
        { cls: 'obxa-release', lbl: 'Release',    min: 0.02,  max: 6,   val: 0.6,  log: true,  cb: v => { this.eng.p.release = v; } },
        { cls: 'obxa-level',   lbl: 'Level',      min: 0,     max: 1,   val: 0.7,  log: false, cb: v => { this.eng.p.level   = v; if (this.eng.gain) this.eng.gain.gain.value = v; } },
      ];

      KNOB_DEFS.forEach(kd => {
        const g = mk('div', 'knob-group ' + kd.cls);
        const k = mk('div', 'knob'); const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        g.append(k, lbl);
        ctrlRow.appendChild(g);
        this._knobs[kd.cls] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val, log: kd.log || false,
          onChange: kd.cb
        });
      });

      ctrlRow.appendChild(mk('div', 'vdivider'));

      // Chorus toggle
      const chorusSect = mk('div', 'obxa-chorus-sect');
      chorusSect.innerHTML = '<div class="obxa-sub-lbl">FX</div>';
      const chorusBtn = mk('button', 'obxa-btn active'); chorusBtn.textContent = 'CHORUS';
      chorusBtn.onclick = () => {
        this.eng.p.chorus = !this.eng.p.chorus;
        chorusBtn.classList.toggle('active', this.eng.p.chorus);
        if (this.eng._chorus) {
          this.eng._chorus.chorusMix.gain.value = this.eng.p.chorus ? 0.5 : 0;
          this.eng._chorus.dryGain.gain.value   = this.eng.p.chorus ? 0.5 : 1.0;
        }
      };
      this._chorusBtn = chorusBtn;
      chorusSect.appendChild(chorusBtn);
      ctrlRow.appendChild(chorusSect);

      ctrlPanel.appendChild(ctrlRow);
      root.appendChild(ctrlPanel);

      // ── Step sequencer panel ──────────────────────────────────
      const seqPanel = mk('div', 'obxa-panel');
      seqPanel.innerHTML = '<div class="obxa-lbl">Chord Sequencer</div>';
      const stepsRow = mk('div', 'obxa-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'obxa-step');
        this._renderStepLabel(btn, this.seq.steps[i]);
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Chord editor ──────────────────────────────────────────
      const editorRow = mk('div', 'obxa-editor-row');

      // Piano keyboard (root note selection)
      const pianoWrap = mk('div', 'obxa-piano-wrap');
      pianoWrap.innerHTML = '<div class="obxa-sub-lbl">Root Note</div>';
      const piano = mk('div', 'obxa-piano');
      const PIANO_KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},  {note:'D',  white:1},
        {note:'D#', black:57},{note:'E',  white:2},   {note:'F',  white:3},
        {note:'F#', black:129},{note:'G', white:4},   {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200}, {note:'B',  white:6},
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'obxa-wkey' : 'obxa-bkey');
        if ('white' in k) {
          el.style.cssText = `left:${k.white * 32}px;width:31px`;
          el.innerHTML = `<span>${k.note}</span>`;
        } else {
          el.style.cssText = `left:${k.black}px`;
        }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._setRoot(k.note); });
        piano.appendChild(el);
      });
      this._piano = piano;
      pianoWrap.appendChild(piano);
      editorRow.appendChild(pianoWrap);

      // Chord type + octave + rest buttons
      const chordProps = mk('div', 'obxa-chord-props');
      chordProps.innerHTML = '<div class="obxa-sub-lbl">Chord Type</div>';

      const typeRow = mk('div', 'obxa-type-row');
      const CHORD_TYPES = ['maj', 'min', '7', 'maj7', 'm7', 'sus4', 'dim', 'aug'];
      CHORD_TYPES.forEach(t => {
        const b = mk('button', 'obxa-type-btn'); b.textContent = t;
        b.onclick = () => this._setType(t);
        this._typeBtns[t] = b;
        typeRow.appendChild(b);
      });
      chordProps.appendChild(typeRow);

      const octRow = mk('div', 'obxa-oct-row');
      const bLow  = mk('button', 'obxa-prop-btn'); bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'obxa-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      const bRest = mk('button', 'obxa-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      this._bLow = bLow; this._bHigh = bHigh; this._bRest = bRest;
      octRow.append(bLow, bHigh, bRest);
      chordProps.appendChild(octRow);
      editorRow.appendChild(chordProps);

      seqPanel.appendChild(editorRow);
      root.appendChild(seqPanel);

      // ── Transport panel ───────────────────────────────────────
      const transPanel = mk('div', 'obxa-panel');
      const transRow   = mk('div', 'obxa-transport');

      const btns = mk('div', 'obxa-btns');
      const playBtn = mk('button', 't-btn btn-play-obxa'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-obxa'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'obxa-pat-btns');
      global.OBXA_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-obxa'); b.textContent = p.name;
        b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const clrB = mk('button', 'pat-b-obxa'); clrB.textContent = 'Clear'; clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-obxa'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input'); impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-obxa'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
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
      Object.entries(this._typeBtns).forEach(([t, b]) => b.classList.toggle('active', t === s.type && !s.rest));
    }

    _highlightPianoKey(note) {
      this._piano.querySelectorAll('.obxa-wkey,.obxa-bkey').forEach(k =>
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

    _setType(type) {
      const s = this.seq.steps[this._selStep];
      s.type = type; s.rest = false;
      this._bRest.classList.remove('active');
      Object.entries(this._typeBtns).forEach(([t, b]) => b.classList.toggle('active', t === type));
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
      if (s.rest) Object.values(this._typeBtns).forEach(b => b.classList.remove('active'));
      this._renderStepLabel(this._stepBtns[this._selStep], s);
    }

    _renderStepLabel(btn, s) {
      btn.classList.toggle('has-chord', !s.rest);
      btn.classList.toggle('is-rest',    s.rest);
      if (s.rest) {
        btn.innerHTML = '<span class="obxa-step-rest">–</span>';
      } else {
        btn.innerHTML = `<span class="obxa-step-root">${s.root}</span><span class="obxa-step-type">${s.type}</span>`;
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
        version: 1, type: 'OBXA', name: this.name,
        bpm: global.Bus.clock.bpm,
        knobs: {
          osc1Wave: this.eng.p.osc1Wave,
          osc2Wave: this.eng.p.osc2Wave,
          detune:   this._knobs['obxa-detune'].value,
          cutoff:   this._knobs['obxa-cutoff'].value,
          reso:     this._knobs['obxa-reso'].value,
          attack:   this._knobs['obxa-attack'].value,
          decay:    this._knobs['obxa-decay'].value,
          sustain:  this._knobs['obxa-sustain'].value,
          release:  this._knobs['obxa-release'].value,
          level:    this._knobs['obxa-level'].value,
          chorus:   this.eng.p.chorus,
        },
        steps: this.seq.steps.map(s => ({ ...s })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'OBXA') { alert('Not an OB-Xa file'); return; }
      if (d.steps && d.steps.length === 16) this.seq.steps = d.steps.map(s => ({ ...s }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      const k = d.knobs || {};
      if (k.osc1Wave != null) {
        this.eng.p.osc1Wave = k.osc1Wave;
        Object.entries(this._osc1Btns).forEach(([w, b]) => b.classList.toggle('active', w === k.osc1Wave));
      }
      if (k.osc2Wave != null) {
        this.eng.p.osc2Wave = k.osc2Wave;
        Object.entries(this._osc2Btns).forEach(([w, b]) => b.classList.toggle('active', w === k.osc2Wave));
      }
      if (k.detune  != null) this._knobs['obxa-detune'].setValue(k.detune);
      if (k.cutoff  != null) this._knobs['obxa-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['obxa-reso'].setValue(k.reso);
      if (k.attack  != null) this._knobs['obxa-attack'].setValue(k.attack);
      if (k.decay   != null) this._knobs['obxa-decay'].setValue(k.decay);
      if (k.sustain != null) this._knobs['obxa-sustain'].setValue(k.sustain);
      if (k.release != null) this._knobs['obxa-release'].setValue(k.release);
      if (k.level   != null) this._knobs['obxa-level'].setValue(k.level);
      if (k.chorus  != null) {
        this.eng.p.chorus = k.chorus;
        if (this._chorusBtn) this._chorusBtn.classList.toggle('active', k.chorus);
        if (this.eng._chorus) {
          this.eng._chorus.chorusMix.gain.value = k.chorus ? 0.5 : 0;
          this.eng._chorus.dryGain.gain.value   = k.chorus ? 0.5 : 1.0;
        }
      }
      this._stepBtns.forEach((btn, i) => this._renderStepLabel(btn, this.seq.steps[i]));
      this._selectStep(0);
    }

    _loadPreset(i) {
      const p = global.OBXA_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ ...s }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      const k = p.knobs || {};
      if (k.osc1Wave != null) {
        this.eng.p.osc1Wave = k.osc1Wave;
        Object.entries(this._osc1Btns).forEach(([w, b]) => b.classList.toggle('active', w === k.osc1Wave));
      }
      if (k.osc2Wave != null) {
        this.eng.p.osc2Wave = k.osc2Wave;
        Object.entries(this._osc2Btns).forEach(([w, b]) => b.classList.toggle('active', w === k.osc2Wave));
      }
      if (k.detune  != null) this._knobs['obxa-detune'].setValue(k.detune);
      if (k.cutoff  != null) this._knobs['obxa-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['obxa-reso'].setValue(k.reso);
      if (k.attack  != null) this._knobs['obxa-attack'].setValue(k.attack);
      if (k.decay   != null) this._knobs['obxa-decay'].setValue(k.decay);
      if (k.sustain != null) this._knobs['obxa-sustain'].setValue(k.sustain);
      if (k.release != null) this._knobs['obxa-release'].setValue(k.release);
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
      a.download = (this.name || 'obxa').replace(/[^a-z0-9_-]/gi, '_') + '.json';
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
      reader.onload = e => {
        try { this.applySongData(JSON.parse(e.target.result)); }
        catch(err) { alert('Parse error: ' + err.message); }
      };
      reader.readAsText(file);
      evt.target.value = '';
    }
  }

  global.StudioInstruments       = global.StudioInstruments || {};
  global.StudioInstruments.OBXA  = OBXaInstrument;

})(window);
