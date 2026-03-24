(function(global) {
  'use strict';

  let _count = 0;

  class MiniMoogInstrument {
    constructor() {
      this.type      = 'MINIMOOG';
      this.id        = 'imoog_' + (++_count);
      this.name      = 'Minimoog #' + _count;
      this.eng       = new global.MiniMoogEngine();
      this.seq       = new global.MiniMoogSeq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
      this._piano    = null;
      // wave buttons
      this._waveBtns = {};
      // step property buttons
      this._bOctLow  = null;
      this._bOctHigh = null;
      this._bRest    = null;
    }

    // ── Static descriptor ─────────────────────────────────────────
    static get descriptor() {
      return {
        type:        'MINIMOOG',
        label:       'Moog Minimoog Lead',
        badgeClass:  'badge-moog',
        badgeText:   'MOOG',
        headerClass: 'minimoog-header-bar',
      };
    }

    // ── createDOM ─────────────────────────────────────────────────
    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'minimoog-card');

      // ── Synth controls panel ──────────────────────────────────
      const ctrlPanel = mk('div', 'moog-panel');
      ctrlPanel.innerHTML = '<div class="moog-lbl">Synthesizer Controls</div>';
      const ctrlRow = mk('div', 'moog-controls');

      // Wave selector
      const waveSect = mk('div', 'moog-wave-sect');
      waveSect.innerHTML = '<div class="moog-lbl">Oscillators</div>';
      const sawBtn = mk('button', 'moog-wave-btn active'); sawBtn.textContent = 'SAW';
      const squBtn = mk('button', 'moog-wave-btn');        squBtn.textContent = 'SQU';
      const triBtn = mk('button', 'moog-wave-btn');        triBtn.textContent = 'TRI';

      const setWave = (wave) => {
        this.eng.p.osc1Wave = wave;
        this.eng.p.osc2Wave = wave;
        this.eng.p.osc3Wave = wave;
        sawBtn.classList.toggle('active', wave === 'sawtooth');
        squBtn.classList.toggle('active', wave === 'square');
        triBtn.classList.toggle('active', wave === 'triangle');
      };
      sawBtn.onclick = () => setWave('sawtooth');
      squBtn.onclick = () => setWave('square');
      triBtn.onclick = () => setWave('triangle');
      this._waveBtns = { sawBtn, squBtn, triBtn };
      waveSect.append(sawBtn, squBtn, triBtn);
      ctrlRow.appendChild(waveSect);

      // Knobs
      const KNOB_DEFS = [
        { cls:'mk-cutoff',  lbl:'Cutoff',     min:0,     max:1,    val:0.45, cb: v => { this.eng.p.cutoff  = v; } },
        { cls:'mk-reso',    lbl:'Resonance',  min:0,     max:1,    val:0.30, cb: v => { this.eng.p.reso    = v; } },
        { cls:'mk-envmod',  lbl:'Env Mod',    min:0,     max:1,    val:0.50, cb: v => { this.eng.p.envMod  = v; } },
        { cls:'mk-attack',  lbl:'Attack',     min:0.003, max:2,    val:0.01, log:true, cb: v => { this.eng.p.attack  = v; } },
        { cls:'mk-decay',   lbl:'Decay',      min:0.01,  max:2,    val:0.25, log:true, cb: v => { this.eng.p.decay   = v; } },
        { cls:'mk-sustain', lbl:'Sustain',    min:0,     max:1,    val:0.60, cb: v => { this.eng.p.sustain = v; } },
        { cls:'mk-release', lbl:'Release',    min:0.02,  max:3,    val:0.25, log:true, cb: v => { this.eng.p.release = v; } },
      ];

      KNOB_DEFS.forEach(kd => {
        const g = mk('div', 'knob-group ' + kd.cls);
        const k = mk('div', 'knob');
        const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        g.append(k, lbl);
        ctrlRow.appendChild(g);
        this._knobs[kd.cls] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val, log: kd.log || false, onChange: kd.cb,
        });
      });

      ctrlPanel.appendChild(ctrlRow);
      root.appendChild(ctrlPanel);

      // ── Step sequencer panel ──────────────────────────────────
      const seqPanel = mk('div', 'moog-panel');
      seqPanel.innerHTML = '<div class="moog-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'moog-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'moog-step');
        btn.innerHTML = `<div class="moog-step-note">–</div><div class="moog-step-oct"></div>`;
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Note entry ────────────────────────────────────────────
      const noteEntry = mk('div', 'moog-note-entry');

      // Piano
      const pianoWrap = mk('div', 'moog-piano-wrap');
      pianoWrap.innerHTML = '<div class="moog-lbl">Note Input</div>';
      const piano = mk('div', 'moog-piano');

      const PIANO_KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},  {note:'D',  white:1},
        {note:'D#', black:57},{note:'E',  white:2},   {note:'F',  white:3},
        {note:'F#', black:129},{note:'G', white:4},   {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200}, {note:'B',  white:6},
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'm-wkey' : 'm-bkey');
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
      const sprops = mk('div', 'moog-step-props');
      sprops.innerHTML = '<div class="moog-lbl" style="text-align:left">Step Properties</div>';

      const r1 = mk('div', 'moog-prop-row');
      const bLow  = mk('button', 'moog-prop-btn');        bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'moog-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      r1.append(bLow, bHigh);

      const r2 = mk('div', 'moog-prop-row');
      const bRest = mk('button', 'moog-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      r2.append(bRest);

      sprops.append(r1, r2);
      this._bOctLow  = bLow;
      this._bOctHigh = bHigh;
      this._bRest    = bRest;
      noteEntry.appendChild(sprops);
      seqPanel.appendChild(noteEntry);
      root.appendChild(seqPanel);

      // ── Transport panel ───────────────────────────────────────
      const transPanel = mk('div', 'moog-panel');
      const transRow   = mk('div', 'moog-transport');

      const btns = mk('div', 'moog-btns');
      const playBtn = mk('button', 't-btn btn-play-moog'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-moog'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'pat-btns3');
      global.MINIMOOG_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-moog'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const rndB = mk('button', 'pat-b-moog'); rndB.textContent = 'Rnd';      rndB.onclick = () => this._random();
      const clrB = mk('button', 'pat-b-moog'); clrB.textContent = 'Clear';    clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-moog'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-moog'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(rndB, clrB, expB, impB, impI);

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

    // ── Step editor helpers ───────────────────────────────────────
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
      this._piano.querySelectorAll('.m-wkey,.m-bkey').forEach(k =>
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
      const noteEl = btn.querySelector('.moog-step-note');
      const octEl  = btn.querySelector('.moog-step-oct');
      if (s.rest) {
        noteEl.textContent = '–';
        noteEl.className = 'moog-step-rest';
        octEl.textContent  = '';
      } else {
        noteEl.textContent = s.note;
        noteEl.className = 'moog-step-note';
        octEl.textContent  = s.octave === 1 ? '3' : '2';
      }
      btn.classList.toggle('has-note', !s.rest);
      btn.classList.toggle('is-rest',   s.rest);
    }

    _refreshAll() { for (let i = 0; i < 16; i++) this._refreshStep(i); }

    // ── BPM helper (exact copy as specified) ─────────────────────
    _adjBPM(d, abs) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, abs !== undefined ? abs : global.Bus.clock.bpm + d));
      const hd = document.getElementById('masterBpm');
      if (hd) hd.textContent = global.Bus.clock.bpm;
    }

    // ── Plugin interface ──────────────────────────────────────────
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
        version:  1,
        type:     'MINIMOOG',
        name:     this.name,
        bpm:      global.Bus.clock.bpm,
        waveform: this.eng.p.osc1Wave,
        knobs: {
          cutoff:  this._knobs['mk-cutoff'].value,
          reso:    this._knobs['mk-reso'].value,
          envMod:  this._knobs['mk-envmod'].value,
          attack:  this._knobs['mk-attack'].value,
          decay:   this._knobs['mk-decay'].value,
          sustain: this._knobs['mk-sustain'].value,
          release: this._knobs['mk-release'].value,
        },
        steps: this.seq.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'MINIMOOG') { alert('Not a Minimoog file'); return; }
      if (!d.steps || d.steps.length !== 16) { alert('Invalid pattern data'); return; }
      this.seq.steps = d.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      if (d.waveform) {
        const { sawBtn, squBtn, triBtn } = this._waveBtns;
        this.eng.p.osc1Wave = d.waveform;
        this.eng.p.osc2Wave = d.waveform;
        this.eng.p.osc3Wave = d.waveform;
        sawBtn.classList.toggle('active', d.waveform === 'sawtooth');
        squBtn.classList.toggle('active', d.waveform === 'square');
        triBtn.classList.toggle('active', d.waveform === 'triangle');
      }
      const k = d.knobs || {};
      if (k.cutoff  != null) this._knobs['mk-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['mk-reso'].setValue(k.reso);
      if (k.envMod  != null) this._knobs['mk-envmod'].setValue(k.envMod);
      if (k.attack  != null) this._knobs['mk-attack'].setValue(k.attack);
      if (k.decay   != null) this._knobs['mk-decay'].setValue(k.decay);
      if (k.sustain != null) this._knobs['mk-sustain'].setValue(k.sustain);
      if (k.release != null) this._knobs['mk-release'].setValue(k.release);
      this._refreshAll();
      this._selectStep(0);
    }

    // ── Pattern helpers ───────────────────────────────────────────
    _loadPreset(i) {
      const p = global.MINIMOOG_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      if (p.waveform) {
        const { sawBtn, squBtn, triBtn } = this._waveBtns;
        this.eng.p.osc1Wave = p.waveform;
        this.eng.p.osc2Wave = p.waveform;
        this.eng.p.osc3Wave = p.waveform;
        sawBtn.classList.toggle('active', p.waveform === 'sawtooth');
        squBtn.classList.toggle('active', p.waveform === 'square');
        triBtn.classList.toggle('active', p.waveform === 'triangle');
      }
      const k = p.knobs || {};
      if (k.cutoff  != null) this._knobs['mk-cutoff'].setValue(k.cutoff);
      if (k.reso    != null) this._knobs['mk-reso'].setValue(k.reso);
      if (k.envMod  != null) this._knobs['mk-envmod'].setValue(k.envMod);
      if (k.attack  != null) this._knobs['mk-attack'].setValue(k.attack);
      if (k.decay   != null) this._knobs['mk-decay'].setValue(k.decay);
      if (k.sustain != null) this._knobs['mk-sustain'].setValue(k.sustain);
      if (k.release != null) this._knobs['mk-release'].setValue(k.release);
      this._refreshAll();
      this._selectStep(0);
    }

    _random() {
      this.seq.steps = Array.from({ length: 16 }, () => {
        const rest = Math.random() < 0.20;
        return {
          note:   global.NOTES[Math.floor(Math.random() * 12)],
          octave: Math.random() < 0.35 ? 1 : 0,
          rest,
        };
      });
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
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = (this.name || 'minimoog').replace(/[^a-z0-9_-]/gi, '_') + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    _import(evt) {
      const file = evt.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { try { this.applySongData(JSON.parse(e.target.result)); } catch(err) { alert('Parse error: ' + err.message); } };
      reader.readAsText(file);
      evt.target.value = '';
    }
  }

  global.StudioInstruments          = global.StudioInstruments || {};
  global.StudioInstruments.MINIMOOG = MiniMoogInstrument;

})(window);
