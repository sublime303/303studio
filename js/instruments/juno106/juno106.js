(function(global) {
  'use strict';

  let _count = 0;

  class Juno106Instrument {
    constructor() {
      this.type      = 'JUNO106';
      this.id        = 'ijuno_' + (++_count);
      this.name      = 'Juno-106 #' + _count;
      this.eng       = new global.Juno106Engine();
      this.seq       = new global.Juno106Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
    }

    static get descriptor() {
      return {
        type:        'JUNO106',
        label:       'Roland Juno-106 Pad',
        badgeClass:  'badge-juno',
        badgeText:   'JUNO',
        headerClass: 'juno106-header-bar',
      };
    }

    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'juno106-card');

      // ── Synth controls panel ──────────────────────────────────
      const ctrlPanel = mk('div', 'j106-panel');
      ctrlPanel.innerHTML = '<div class="j106-lbl">Synthesizer</div>';
      const ctrlRow = mk('div', 'j106-controls');

      // Wave / Sub toggle section
      const waveSect = mk('div', 'j106-wave-sect');
      waveSect.innerHTML = '<div class="j106-sub-lbl">Sub Osc</div>';
      const subBtn = mk('button', 'j106-btn active'); subBtn.textContent = 'SUB';
      subBtn.onclick = () => {
        this.eng.p.sub = !this.eng.p.sub;
        subBtn.classList.toggle('active', this.eng.p.sub);
      };
      // Chorus toggle
      const chorusBtn = mk('button', 'j106-btn active'); chorusBtn.textContent = 'CHORUS';
      chorusBtn.onclick = () => {
        this.eng.p.chorus = !this.eng.p.chorus;
        chorusBtn.classList.toggle('active', this.eng.p.chorus);
        if (this.eng._chorus) {
          const v = this.eng.p.chorus ? 0.5 : 0;
          this.eng._chorus.chorusMix.gain.value = v;
          this.eng._chorus.dryGain.gain.value   = this.eng.p.chorus ? 0.5 : 1.0;
        }
      };
      waveSect.append(subBtn, chorusBtn);
      ctrlRow.appendChild(waveSect);
      ctrlRow.appendChild(mk('div', 'vdivider'));

      const KNOB_DEFS = [
        { cls:'j-cutoff',  lbl:'Cutoff',   min:0, max:1, val:0.55, cb: v => { this.eng.p.cutoff = v; this.eng.updateCutoff(); } },
        { cls:'j-reso',    lbl:'Resonance',min:0, max:1, val:0.20, cb: v => { this.eng.p.reso   = v; this.eng.updateCutoff(); } },
        { cls:'j-attack',  lbl:'Attack',   min:0.005, max:2, val:0.02, log:true, cb: v => { this.eng.p.attack  = v; } },
        { cls:'j-release', lbl:'Release',  min:0.02,  max:4, val:0.45, log:true, cb: v => { this.eng.p.release = v; } },
        { cls:'j-level',   lbl:'Level',    min:0, max:1, val:0.75, cb: v => { this.eng.p.level = v; if (this.eng.gain) this.eng.gain.gain.value = v; } },
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
      const seqPanel = mk('div', 'j106-panel');
      seqPanel.innerHTML = '<div class="j106-lbl">Chord Sequencer</div>';
      const stepsRow = mk('div', 'j106-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'j106-step');
        this._renderStepLabel(btn, this.seq.steps[i]);
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Chord editor ──────────────────────────────────────────
      const editorRow = mk('div', 'j106-editor-row');

      // Piano keyboard (root note selection)
      const pianoWrap = mk('div', 'j106-piano-wrap');
      pianoWrap.innerHTML = '<div class="j106-sub-lbl">Root Note</div>';
      const piano = mk('div', 'j106-piano');
      const PIANO_KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},  {note:'D',  white:1},
        {note:'D#', black:57},{note:'E',  white:2},   {note:'F',  white:3},
        {note:'F#', black:129},{note:'G', white:4},   {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200}, {note:'B',  white:6},
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'j106-wkey' : 'j106-bkey');
        if ('white' in k) { el.style.cssText = `left:${k.white*32}px;width:31px`; el.innerHTML = `<span>${k.note}</span>`; }
        else              { el.style.cssText = `left:${k.black}px`; }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._setRoot(k.note); });
        piano.appendChild(el);
      });
      this._piano = piano;
      pianoWrap.appendChild(piano);
      editorRow.appendChild(pianoWrap);

      // Chord type + octave + rest buttons
      const chordProps = mk('div', 'j106-chord-props');
      chordProps.innerHTML = '<div class="j106-sub-lbl">Chord Type</div>';

      const typeRow = mk('div', 'j106-type-row');
      const CHORD_TYPES = ['maj','min','7','maj7','m7','sus2','sus4','dim','aug'];
      this._typeBtns = {};
      CHORD_TYPES.forEach(t => {
        const b = mk('button', 'j106-type-btn'); b.textContent = t;
        b.onclick = () => this._setType(t);
        this._typeBtns[t] = b;
        typeRow.appendChild(b);
      });
      chordProps.appendChild(typeRow);

      const octRow = mk('div', 'j106-oct-row');
      const bLow  = mk('button', 'j106-prop-btn'); bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'j106-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      const bRest = mk('button', 'j106-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      this._bLow = bLow; this._bHigh = bHigh; this._bRest = bRest;
      octRow.append(bLow, bHigh, bRest);
      chordProps.appendChild(octRow);
      editorRow.appendChild(chordProps);

      seqPanel.appendChild(editorRow);
      root.appendChild(seqPanel);

      // ── Transport panel ───────────────────────────────────────
      const transPanel = mk('div', 'j106-panel');
      const transRow   = mk('div', 'j106-transport');

      const btns = mk('div', 'j106-btns');
      const playBtn = mk('button', 't-btn btn-play-juno'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-juno'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'pat-btns3');
      global.JUNO106_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-juno'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const clrB = mk('button', 'pat-b-juno'); clrB.textContent = 'Clear'; clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-juno'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input'); impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-juno'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
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
      this._piano.querySelectorAll('.j106-wkey,.j106-bkey').forEach(k =>
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
        btn.innerHTML = '<span class="j106-step-rest">–</span>';
      } else {
        btn.innerHTML = `<span class="j106-step-root">${s.root}</span><span class="j106-step-type">${s.type}</span>`;
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
        version: 1, type: 'JUNO106', name: this.name,
        bpm: global.Bus.clock.bpm,
        knobs: {
          cutoff:  this._knobs['j-cutoff'].value,
          reso:    this._knobs['j-reso'].value,
          attack:  this._knobs['j-attack'].value,
          release: this._knobs['j-release'].value,
          level:   this._knobs['j-level'].value,
        },
        steps: this.seq.steps.map(s => ({ ...s })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'JUNO106') { alert('Not a Juno-106 file'); return; }
      if (d.steps && d.steps.length === 16) this.seq.steps = d.steps.map(s => ({ ...s }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      const k = d.knobs || {};
      if (k.cutoff  != null) this._knobs['j-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['j-reso'].setValue(k.reso);
      if (k.attack  != null) this._knobs['j-attack'].setValue(k.attack);
      if (k.release != null) this._knobs['j-release'].setValue(k.release);
      if (k.level   != null) this._knobs['j-level'].setValue(k.level);
      this._stepBtns.forEach((btn, i) => this._renderStepLabel(btn, this.seq.steps[i]));
      this._selectStep(0);
    }

    _loadPreset(i) {
      const p = global.JUNO106_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ ...s }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      const k = p.knobs || {};
      if (k.cutoff  != null) this._knobs['j-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['j-reso'].setValue(k.reso);
      if (k.attack  != null) this._knobs['j-attack'].setValue(k.attack);
      if (k.release != null) this._knobs['j-release'].setValue(k.release);
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
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = (this.name || 'juno106').replace(/[^a-z0-9_-]/gi, '_') + '.json';
      a.click(); URL.revokeObjectURL(a.href);
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
  global.StudioInstruments.JUNO106 = Juno106Instrument;

})(window);
