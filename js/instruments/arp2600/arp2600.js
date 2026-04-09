(function(global) {
  'use strict';

  let _count = 0;

  class ARP2600Instrument {
    constructor() {
      this.type      = 'ARP2600';
      this.id        = 'iarp_' + (++_count);
      this.name      = 'ARP 2600 #' + _count;
      this.eng       = new global.ARP2600Engine();
      this.seq       = new global.ARP2600Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs    = {};
      this._selStep  = 0;
      this._piano    = null;

      // VCO wave buttons
      this._vco1Btns = {};
      this._vco2Btns = {};

      // VCO2 detune state
      this._detuneDisplay = null;

      // Ring mod button
      this._ringModBtn = null;

      // Step property buttons
      this._bOctLow  = null;
      this._bOctHigh = null;
      this._bRest    = null;
    }

    // ── Static descriptor ──────────────────────────────────────────
    static get descriptor() {
      return {
        type:        'ARP2600',
        label:       'ARP 2600 Semi-Modular',
        badgeClass:  'badge-arp',
        badgeText:   'ARP',
        headerClass: 'arp2600-header-bar',
      };
    }

    // ── createDOM ──────────────────────────────────────────────────
    createDOM() {
      const mk   = global.mk;
      const root = mk('div', 'arp2600-card');

      // ── Panel 1: VCO + VCF ──────────────────────────────────────
      const synthPanel = mk('div', 'arp2600-panel');
      synthPanel.innerHTML = '<div class="arp2600-lbl">Synthesizer Controls</div>';
      const ctrlRow = mk('div', 'arp2600-controls');

      // ── VCO section ─────────────────────────────────────────────
      const vcoSect = mk('div', 'arp2600-vco-sect');
      vcoSect.innerHTML = '<div class="arp2600-lbl">VCO</div>';

      // VCO1 row
      const vco1Row = mk('div', 'arp2600-wave-row');
      const vco1Lbl = mk('div', 'arp2600-wave-row-lbl'); vco1Lbl.textContent = 'VCO1';
      const vco1Saw = mk('button', 'arp2600-wave-btn active'); vco1Saw.textContent = 'SAW';
      const vco1Squ = mk('button', 'arp2600-wave-btn');       vco1Squ.textContent = 'SQU';
      const vco1Tri = mk('button', 'arp2600-wave-btn');       vco1Tri.textContent = 'TRI';

      const setVco1Wave = (wave) => {
        this.eng.p.vco1Wave = wave;
        vco1Saw.classList.toggle('active', wave === 'sawtooth');
        vco1Squ.classList.toggle('active', wave === 'square');
        vco1Tri.classList.toggle('active', wave === 'triangle');
      };
      vco1Saw.onclick = () => setVco1Wave('sawtooth');
      vco1Squ.onclick = () => setVco1Wave('square');
      vco1Tri.onclick = () => setVco1Wave('triangle');
      this._vco1Btns = { saw: vco1Saw, squ: vco1Squ, tri: vco1Tri, set: setVco1Wave };
      vco1Row.append(vco1Lbl, vco1Saw, vco1Squ, vco1Tri);

      // VCO2 row
      const vco2Row = mk('div', 'arp2600-wave-row');
      const vco2Lbl = mk('div', 'arp2600-wave-row-lbl'); vco2Lbl.textContent = 'VCO2';
      const vco2Saw = mk('button', 'arp2600-wave-btn active'); vco2Saw.textContent = 'SAW';
      const vco2Squ = mk('button', 'arp2600-wave-btn');       vco2Squ.textContent = 'SQU';
      const vco2Tri = mk('button', 'arp2600-wave-btn');       vco2Tri.textContent = 'TRI';

      const setVco2Wave = (wave) => {
        this.eng.p.vco2Wave = wave;
        vco2Saw.classList.toggle('active', wave === 'sawtooth');
        vco2Squ.classList.toggle('active', wave === 'square');
        vco2Tri.classList.toggle('active', wave === 'triangle');
      };
      vco2Saw.onclick = () => setVco2Wave('sawtooth');
      vco2Squ.onclick = () => setVco2Wave('square');
      vco2Tri.onclick = () => setVco2Wave('triangle');
      this._vco2Btns = { saw: vco2Saw, squ: vco2Squ, tri: vco2Tri, set: setVco2Wave };
      vco2Row.append(vco2Lbl, vco2Saw, vco2Squ, vco2Tri);

      // VCO2 Detune row
      const detuneRow  = mk('div', 'arp2600-detune-row');
      const detuneLbl  = mk('div', 'arp2600-wave-row-lbl'); detuneLbl.textContent = 'DET';
      const detuneDown = mk('button', 'arp2600-det-btn'); detuneDown.textContent = '▼';
      const detuneDisp = mk('div', 'arp2600-det-display'); detuneDisp.textContent = '0';
      const detuneUp   = mk('button', 'arp2600-det-btn'); detuneUp.textContent = '▲';
      this._detuneDisplay = detuneDisp;

      const updateDetune = (delta) => {
        this.eng.p.vco2Detune = Math.max(-12, Math.min(12, this.eng.p.vco2Detune + delta));
        detuneDisp.textContent = (this.eng.p.vco2Detune >= 0 ? '+' : '') + this.eng.p.vco2Detune;
      };
      detuneDown.onclick = () => updateDetune(-1);
      detuneUp.onclick   = () => updateDetune(+1);
      detuneRow.append(detuneLbl, detuneDown, detuneDisp, detuneUp);

      // Ring Mod toggle
      const ringRow = mk('div', 'arp2600-ring-row');
      const ringBtn = mk('button', 'arp2600-ring-btn'); ringBtn.textContent = 'Ring Mod';
      ringBtn.onclick = () => {
        this.eng.p.ringMod = !this.eng.p.ringMod;
        ringBtn.classList.toggle('active', this.eng.p.ringMod);
      };
      this._ringModBtn = ringBtn;
      ringRow.appendChild(ringBtn);

      vcoSect.append(vco1Row, vco2Row, detuneRow, ringRow);
      ctrlRow.appendChild(vcoSect);

      // ── VCF + ENV knobs ─────────────────────────────────────────
      const KNOB_DEFS = [
        { cls: 'ak-cutoff',    lbl: 'Cutoff',     min: 0,     max: 1,   val: 0.55, cb: v => { this.eng.p.cutoff  = v; } },
        { cls: 'ak-reso',      lbl: 'Resonance',  min: 0,     max: 1,   val: 0.35, cb: v => { this.eng.p.reso    = v; } },
        { cls: 'ak-envmod',    lbl: 'Env Mod',    min: 0,     max: 1,   val: 0.5,  cb: v => { this.eng.p.envMod  = v; } },
        { cls: 'ak-attack',    lbl: 'Attack',     min: 0.003, max: 2,   val: 0.01, log: true, cb: v => { this.eng.p.attack  = v; } },
        { cls: 'ak-decay',     lbl: 'Decay',      min: 0.01,  max: 2,   val: 0.4,  log: true, cb: v => { this.eng.p.decay   = v; } },
        { cls: 'ak-sustain',   lbl: 'Sustain',    min: 0,     max: 1,   val: 0.35, cb: v => { this.eng.p.sustain = v; } },
        { cls: 'ak-release',   lbl: 'Release',    min: 0.02,  max: 3,   val: 0.3,  log: true, cb: v => { this.eng.p.release = v; } },
        { cls: 'ak-reverbmix', lbl: 'Reverb',     min: 0,     max: 1,   val: 0.25, cb: v => { this.eng.setReverbMix(v); } },
      ];

      KNOB_DEFS.forEach(kd => {
        const g   = mk('div', 'knob-group ' + kd.cls);
        const k   = mk('div', 'knob');
        const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        g.append(k, lbl);
        ctrlRow.appendChild(g);
        this._knobs[kd.cls] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val, log: kd.log || false, onChange: kd.cb,
        });
      });

      synthPanel.appendChild(ctrlRow);
      root.appendChild(synthPanel);

      // ── Panel 2: Step Sequencer ──────────────────────────────────
      const seqPanel = mk('div', 'arp2600-panel');
      seqPanel.innerHTML = '<div class="arp2600-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'arp2600-steps-row');

      for (let i = 0; i < 16; i++) {
        const btn = mk('div', 'arp2600-step');
        btn.innerHTML = `<div class="arp2600-step-note">–</div><div class="arp2600-step-oct"></div>`;
        btn.addEventListener('click', () => this._selectStep(i));
        stepsRow.appendChild(btn);
        this._stepBtns.push(btn);
      }
      seqPanel.appendChild(stepsRow);

      // ── Note entry ───────────────────────────────────────────────
      const noteEntry = mk('div', 'arp2600-note-entry');

      // Piano
      const pianoWrap = mk('div', 'arp2600-piano-wrap');
      pianoWrap.innerHTML = '<div class="arp2600-lbl">Note Input</div>';
      const piano = mk('div', 'arp2600-piano');

      const PIANO_KEYS = [
        { note: 'C',  white: 0 }, { note: 'C#', black: 22  },
        { note: 'D',  white: 1 }, { note: 'D#', black: 57  },
        { note: 'E',  white: 2 }, { note: 'F',  white: 3   },
        { note: 'F#', black: 129}, { note: 'G',  white: 4  },
        { note: 'G#', black: 165}, { note: 'A',  white: 5  },
        { note: 'A#', black: 200}, { note: 'B',  white: 6  },
      ];
      PIANO_KEYS.forEach(k => {
        const el = mk('div', 'white' in k ? 'a-wkey' : 'a-bkey');
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
      const sprops = mk('div', 'arp2600-step-props');
      sprops.innerHTML = '<div class="arp2600-lbl" style="text-align:left">Step Properties</div>';

      const r1 = mk('div', 'arp2600-prop-row');
      const bLow  = mk('button', 'arp2600-prop-btn');        bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'arp2600-prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      r1.append(bLow, bHigh);

      const r2 = mk('div', 'arp2600-prop-row');
      const bRest = mk('button', 'arp2600-prop-btn'); bRest.textContent = 'Rest';
      bRest.onclick = () => this._toggleRest();
      r2.append(bRest);

      sprops.append(r1, r2);
      this._bOctLow  = bLow;
      this._bOctHigh = bHigh;
      this._bRest    = bRest;
      noteEntry.appendChild(sprops);
      seqPanel.appendChild(noteEntry);
      root.appendChild(seqPanel);

      // ── Panel 3: Transport ───────────────────────────────────────
      const transPanel = mk('div', 'arp2600-panel');
      const transRow   = mk('div', 'arp2600-transport');

      const btns    = mk('div', 'arp2600-btns');
      const playBtn = mk('button', 't-btn btn-play-arp'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop-arp'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      const patBtns = mk('div', 'pat-btns3');
      global.ARP2600_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b-arp'); b.textContent = p.name;
        b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });

      const clrB = mk('button', 'pat-b-arp'); clrB.textContent = 'Clear';    clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b-arp'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b-arp'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
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
      this._piano.querySelectorAll('.a-wkey,.a-bkey').forEach(k =>
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
      const noteEl = btn.querySelector('.arp2600-step-note');
      const octEl  = btn.querySelector('.arp2600-step-oct');
      if (s.rest) {
        noteEl.textContent = '–';
        noteEl.className   = 'arp2600-step-rest';
        octEl.textContent  = '';
      } else {
        noteEl.textContent = s.note;
        noteEl.className   = 'arp2600-step-note';
        octEl.textContent  = s.octave === 1 ? '3' : '2';
      }
      btn.classList.toggle('has-note', !s.rest);
      btn.classList.toggle('is-rest',   s.rest);
    }

    _refreshAll() { for (let i = 0; i < 16; i++) this._refreshStep(i); }

    // ── BPM helper ────────────────────────────────────────────────
    _adjBPM(d, abs) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, abs !== undefined ? abs : global.Bus.clock.bpm + d));
      const hd = document.getElementById('masterBpm');
      if (hd) hd.textContent = global.Bus.clock.bpm;
    }

    // ── Apply VCO state from preset / song data ───────────────────
    _applyVcoState(vco1Wave, vco2Wave, vco2Detune, ringMod) {
      if (vco1Wave) this._vco1Btns.set(vco1Wave);
      if (vco2Wave) this._vco2Btns.set(vco2Wave);

      if (vco2Detune != null) {
        this.eng.p.vco2Detune = vco2Detune;
        if (this._detuneDisplay) {
          this._detuneDisplay.textContent = (vco2Detune >= 0 ? '+' : '') + vco2Detune;
        }
      }

      if (ringMod != null) {
        this.eng.p.ringMod = ringMod;
        if (this._ringModBtn) this._ringModBtn.classList.toggle('active', ringMod);
      }
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
        type:       'ARP2600',
        name:       this.name,
        bpm:        global.Bus.clock.bpm,
        vco1Wave:   this.eng.p.vco1Wave,
        vco2Wave:   this.eng.p.vco2Wave,
        vco2Detune: this.eng.p.vco2Detune,
        ringMod:    this.eng.p.ringMod,
        knobs: {
          cutoff:    this._knobs['ak-cutoff'].value,
          reso:      this._knobs['ak-reso'].value,
          envMod:    this._knobs['ak-envmod'].value,
          attack:    this._knobs['ak-attack'].value,
          decay:     this._knobs['ak-decay'].value,
          sustain:   this._knobs['ak-sustain'].value,
          release:   this._knobs['ak-release'].value,
          reverbMix: this._knobs['ak-reverbmix'].value,
        },
        steps: this.seq.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest })),
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'ARP2600') { alert('Not an ARP 2600 file'); return; }
      if (!d.steps || d.steps.length !== 16) { alert('Invalid pattern data'); return; }
      this.seq.steps = d.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest }));
      if (d.bpm) this._adjBPM(0, d.bpm);
      this._applyVcoState(d.vco1Wave, d.vco2Wave, d.vco2Detune, d.ringMod);
      const k = d.knobs || {};
      if (k.cutoff    != null) this._knobs['ak-cutoff'].setValue(k.cutoff);
      if (k.reso      != null) this._knobs['ak-reso'].setValue(k.reso);
      if (k.envMod    != null) this._knobs['ak-envmod'].setValue(k.envMod);
      if (k.attack    != null) this._knobs['ak-attack'].setValue(k.attack);
      if (k.decay     != null) this._knobs['ak-decay'].setValue(k.decay);
      if (k.sustain   != null) this._knobs['ak-sustain'].setValue(k.sustain);
      if (k.release   != null) this._knobs['ak-release'].setValue(k.release);
      if (k.reverbMix != null) this._knobs['ak-reverbmix'].setValue(k.reverbMix);
      this._refreshAll();
      this._selectStep(0);
    }

    // ── Pattern helpers ────────────────────────────────────────────
    _loadPreset(i) {
      const p = global.ARP2600_PRESETS[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ note: s.note, octave: s.octave, rest: s.rest }));
      if (p.bpm) this._adjBPM(0, p.bpm);
      this._applyVcoState(p.vco1Wave, p.vco2Wave, p.vco2Detune, p.ringMod);
      const k = p.knobs || {};
      if (k.cutoff    != null) this._knobs['ak-cutoff'].setValue(k.cutoff);
      if (k.reso      != null) this._knobs['ak-reso'].setValue(k.reso);
      if (k.envMod    != null) this._knobs['ak-envmod'].setValue(k.envMod);
      if (k.attack    != null) this._knobs['ak-attack'].setValue(k.attack);
      if (k.decay     != null) this._knobs['ak-decay'].setValue(k.decay);
      if (k.sustain   != null) this._knobs['ak-sustain'].setValue(k.sustain);
      if (k.release   != null) this._knobs['ak-release'].setValue(k.release);
      if (k.reverbMix != null) this._knobs['ak-reverbmix'].setValue(k.reverbMix);
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
      a.download = (this.name || 'arp2600').replace(/[^a-z0-9_-]/gi, '_') + '.json';
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

  global.StudioInstruments         = global.StudioInstruments || {};
  global.StudioInstruments.ARP2600 = ARP2600Instrument;

})(window);
