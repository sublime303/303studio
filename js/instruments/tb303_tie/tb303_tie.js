/* ── TB-303 (Tie) Instrument  ──
   Clone of TB-303 that adds per-step Tie (hold) separate from Slide.
   ─────────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  const mk = global.mk;
  let _count = 0;

  class TB303TieInstrument {
    constructor() {
      this.type      = 'TB303_TIE';
      this.id        = 'i' + (++_count);
      this.name      = 'TB-303 (Tie) #' + _count;
      this.eng       = new global.TB303TieEngine();
      this.seq       = new global.TB303TieSeq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = [];
      this._knobs         = {};
      this._knobClearBtns = {};
      this._piano         = null;
      this._selStep       = 0;
      this._rec           = false;
      // button refs set in createDOM
      this._bOctLow = null; this._bOctHigh = null;
      this._bAcc    = null; this._bSli     = null; this._bTie = null; this._bRest = null;
      this._bpmD    = null;
    }

    static get descriptor() {
      return {
        type:        'TB303_TIE',
        label:       'TB-303 (Tie)',
        badgeClass:  'badge-303',
        badgeText:   '303 TIE',
        headerClass: 'tb303-header-bar',
      };
    }

    createDOM() {
      const root = mk('div', 'tb303-card');

      // ── Controls panel ──
      const ctrlPanel = mk('div', 'tb3-dark');
      ctrlPanel.innerHTML = '<div class="panel-lbl">Synthesizer Controls</div>';

      const synthLayout = mk('div', 'tb3-synth-layout');

      const envRow = mk('div', 'tb303-env-lcd');
      const svgNs = 'http://www.w3.org/2000/svg';
      const envSvg = document.createElementNS(svgNs, 'svg');
      envSvg.setAttribute('class', 'tb303-env-svg');
      envSvg.setAttribute('viewBox', '0 0 100 100');
      envSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      envSvg.setAttribute('aria-hidden', 'true');
      const envBg = document.createElementNS(svgNs, 'rect');
      envBg.setAttribute('class', 'tb303-env-bg');
      envBg.setAttribute('x', '0'); envBg.setAttribute('y', '0');
      envBg.setAttribute('width', '100'); envBg.setAttribute('height', '100'); envBg.setAttribute('rx', '3');
      const envLbl = document.createElementNS(svgNs, 'text');
      envLbl.setAttribute('class', 'tb303-env-lbl');
      envLbl.setAttribute('x', '50'); envLbl.setAttribute('y', '95');
      envLbl.setAttribute('text-anchor', 'middle');
      envLbl.textContent = 'FILTER ENV';
      const pathAcc = document.createElementNS(svgNs, 'path');
      pathAcc.setAttribute('class', 'tb303-env-path tb303-env-path-accent');
      pathAcc.setAttribute('fill', 'none');
      const pathMain = document.createElementNS(svgNs, 'path');
      pathMain.setAttribute('class', 'tb303-env-path tb303-env-path-main');
      pathMain.setAttribute('fill', 'none');
      envSvg.append(envBg, pathAcc, pathMain, envLbl);
      envRow.appendChild(envSvg);
      this._envPathMain = pathMain;
      this._envPathAccent = pathAcc;

      const KNOB_DEFS = [
        { cls:'k-tune',   key:'tune',   lbl:'Tune',       min:-7, max:7, val:0,    cb:v => this.eng.setTune(Math.round(v)) },
        { cls:'k-cutoff', key:'cutoff', lbl:'Cutoff',     min:0,  max:1, val:0.38, cb:v => { this.eng.setCutoff(v); this._refreshEnvDiagram(); } },
        { cls:'k-reso',   key:'reso',   lbl:'Resonance',  min:0,  max:1, val:0.32, cb:v => { this.eng.setReso(v); this._refreshEnvDiagram(); } },
        { cls:'k-drive',  key:'drive',  lbl:'Drive',      min:0,  max:1, val:0.45, cb:v => this.eng.setDrive(v) },
        { cls:'k-envmod', key:'envMod', lbl:'Env Mod',    min:0,  max:1, val:0.50, cb:v => { this.eng.setEnvMod(v); this._refreshEnvDiagram(); } },
        { cls:'k-decay',  key:'decay',  lbl:'Decay',      min:0,  max:1, val:0.28, cb:v => { this.eng.setDecay(v); this._refreshEnvDiagram(); } },
        { cls:'k-accent', key:'accent', lbl:'Accent',     min:0,  max:1, val:0.60, cb:v => { this.eng.setAccent(v); this._refreshEnvDiagram(); } },
      ];

      function mkKnob(def) {
        const wrap = mk('div', 'knob-group');
        const k = mk('div', 'knob'); k.classList.add(def.cls);
        const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = def.lbl;
        wrap.append(k, lbl);
        return { wrap, k, ind };
      }

      const strip = mk('div', 'tb3-knob-strip');
      const byCls = {};
      KNOB_DEFS.forEach(d => { byCls[d.cls] = mkKnob(d); });

      const grpMain = mk('div', 'tb303-knob-group');
      grpMain.innerHTML = '<div class="tb303-group-lbl">Main</div>';
      const gk = mk('div', 'tb303-group-knobs');
      gk.append(byCls['k-tune'].wrap, byCls['k-cutoff'].wrap, byCls['k-reso'].wrap, byCls['k-drive'].wrap);
      grpMain.appendChild(gk);

      const grpEnv = mk('div', 'tb303-knob-group');
      grpEnv.innerHTML = '<div class="tb303-group-lbl">Envelope</div>';
      const gk2 = mk('div', 'tb303-group-knobs');
      gk2.append(byCls['k-envmod'].wrap, byCls['k-decay'].wrap, byCls['k-accent'].wrap);
      grpEnv.appendChild(gk2);

      strip.append(grpMain, mk('div', 'tb303-mini-div'), grpEnv);
      synthLayout.append(envRow, strip);
      ctrlPanel.appendChild(synthLayout);
      root.appendChild(ctrlPanel);

      // Knob wiring (shared Knob class)
      KNOB_DEFS.forEach(def => {
        const el = byCls[def.cls].k;
        const ind = byCls[def.cls].ind;
        this._knobs[def.cls] = new global.Knob(el, ind, { min: def.min, max: def.max, val: def.val, onChange: v => {
          def.cb(v);
          this._saveOneKnobToStep(def.key, v);
        }});
      });

      // ── Step sequencer panel ──
      const seqPanel = mk('div', 'tb3-dark');
      seqPanel.innerHTML = '<div class="panel-lbl">Step Sequencer</div>';
      const stepsRow = mk('div', 'steps-row');
      this._stepBtns = [];
      for (let i = 0; i < 16; i++) {
        const b = mk('div', 'step-btn');
        b.innerHTML = `<span class="step-a">A</span><span class="step-s">S</span><span class="step-t">T</span>
          <div class="step-num">${i + 1}</div><div class="step-led"></div><div class="step-note-d" id="sn${this.id}_${i}">–</div>`;
        b.onclick = () => this._selectStep(i);
        stepsRow.appendChild(b);
        this._stepBtns.push(b);
      }
      seqPanel.appendChild(stepsRow);

      // Note entry row
      const noteEntry = mk('div', 'note-entry');
      const pianoWrap = mk('div', 'piano-wrap');
      pianoWrap.innerHTML = '<div class="panel-lbl">Note Input</div>';
      const piano = mk('div', 'piano');
      pianoWrap.appendChild(piano);
      this._piano = piano;
      noteEntry.appendChild(pianoWrap);

      // Step properties
      const sprops = mk('div', 'step-props');
      sprops.innerHTML = '<div class="panel-lbl" style="text-align:left">Step Properties</div>';
      const r1 = mk('div', 'prop-row');
      const bLow  = mk('button', 'prop-btn');        bLow.textContent  = 'Oct ▼';
      const bHigh = mk('button', 'prop-btn active'); bHigh.textContent = 'Oct ▲';
      bLow.onclick  = () => { this._setOct(0); bLow.classList.add('active');  bHigh.classList.remove('active'); };
      bHigh.onclick = () => { this._setOct(1); bHigh.classList.add('active'); bLow.classList.remove('active');  };
      r1.append(bLow, bHigh);
      const r2    = mk('div', 'prop-row');
      const bAcc  = mk('button', 'prop-btn'); bAcc.textContent  = 'Accent';
      const bSli  = mk('button', 'prop-btn'); bSli.textContent  = 'Slide';
      const bTie  = mk('button', 'prop-btn'); bTie.textContent  = 'Tie';
      const bRest = mk('button', 'prop-btn'); bRest.textContent = 'Rest';
      bAcc.onclick  = () => this._toggleProp('accent', bAcc);
      bSli.onclick  = () => this._toggleProp('slide',  bSli, true);
      bTie.onclick  = () => this._toggleProp('tie',    bTie);
      bRest.onclick = () => this._toggleProp('rest',   bRest);
      r2.append(bAcc, bSli, bTie, bRest);
      sprops.append(r1, r2);
      this._bOctLow = bLow; this._bOctHigh = bHigh;
      this._bAcc = bAcc; this._bSli = bSli; this._bTie = bTie; this._bRest = bRest;
      noteEntry.appendChild(sprops);
      seqPanel.appendChild(noteEntry);
      root.appendChild(seqPanel);

      // Transport panel
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

      const patBtns = mk('div', 'pat-btns3');
      (global.TB303_TIE_PRESETS || []).forEach((p, i) => {
        const b = mk('button', 'pat-b3'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      this.seq.onStep = idx => {
        this._stepBtns.forEach((b, j) => b.classList.toggle('playing', j === idx));
        if (idx >= 0) this._applyInterpolatedKnobs(idx);
      };

      this._buildPiano();
      this._loadPreset(0);
      this._refreshEnvDiagram();
      return root;
    }

    // ── Playback ─────────────────────────────────────────────
    play(btn) {
      global.Bus.init();
      global.Bus.resume();
      btn?.classList.add('on');
      this.seq.play(global.Bus.ctx, global.Bus.gain);
    }
    stop(playBtn, recBtn) {
      playBtn?.classList.remove('on');
      recBtn?.classList.remove('on');
      this._rec = false;
      this.seq.stop();
      this._stepBtns.forEach(b => b.classList.remove('playing'));
    }

    destroy() { this.seq.stop(); this.eng.destroy(); }

    // ── UI helpers ────────────────────────────────────────────
    _refreshEnvDiagram() {
      if (!this._envPathMain || !this.eng) return;
      const yHz = hz => {
        const lo = Math.log(22);
        const hi = Math.log(18000);
        const h = Math.max(22, Math.min(18000, hz));
        const t = (Math.log(h) - lo) / (hi - lo);
        return 18 + (1 - t) * 62;
      };
      const pathFrom = shape => {
        const { cutHz, peakHz, decaySec } = shape;
        const yCut = yHz(cutHz);
        const atk = 2.5;
        const rel = 6.5;
        const decayW = Math.min(46, 8 + decaySec * 22);
        const susW = Math.max(5, 100 - atk - decayW - rel);
        const strong = peakHz > cutHz + 5;
        if (!strong) return `M 0 ${yCut} L ${100 - rel} ${yCut} L 100 ${Math.min(88, yCut + 5)}`;
        const yPeak = yHz(peakHz);
        const parts = [`M 0 ${yPeak}`, `L ${atk} ${yPeak}`];
        const n = 26;
        for (let i = 1; i <= n; i++) {
          const u = i / n;
          const hz = peakHz * Math.pow(cutHz / peakHz, u);
          const x = atk + u * decayW;
          parts.push(`L ${x.toFixed(2)} ${yHz(hz).toFixed(2)}`);
        }
        const xSus = atk + decayW;
        const xRel = xSus + susW;
        parts.push(`L ${xSus.toFixed(2)} ${yCut}`, `L ${xRel.toFixed(2)} ${yCut}`, `L 100 ${Math.min(88, yCut + 5)}`);
        return parts.join(' ');
      };
      this._envPathMain.setAttribute('d', pathFrom(this.eng.envelopeDiagram(false)));
      this._envPathAccent.setAttribute('d', pathFrom(this.eng.envelopeDiagram(true)));
    }

    _saveOneKnobToStep(dataKey, value) {
      const step = this.seq.steps[this._selStep];
      if (!step.rest) {
        if (!step.knobs) step.knobs = {};
        step.knobs[dataKey] = value;
      }
    }

    _interpKnobAt(targetIdx, key) {
      const steps = this.seq.steps;
      let prevIdx = -1, nextIdx = -1;
      for (let d = 0; d < 16; d++) {
        const i = ((targetIdx - d) + 16) % 16;
        if (steps[i].knobs?.[key] != null) { prevIdx = i; break; }
      }
      for (let d = 1; d <= 16; d++) {
        const i = (targetIdx + d) % 16;
        if (steps[i].knobs?.[key] != null) { nextIdx = i; break; }
      }
      if (prevIdx === -1 && nextIdx === -1) return null;
      if (prevIdx === -1) return steps[nextIdx].knobs[key];
      if (nextIdx === -1) return steps[prevIdx].knobs[key];
      const pv = steps[prevIdx].knobs[key];
      const nv = steps[nextIdx].knobs[key];
      if (prevIdx === nextIdx) return pv;
      const span = (nextIdx - prevIdx + 16) % 16;
      const dist = (targetIdx - prevIdx + 16) % 16;
      return pv + (nv - pv) * (dist / span);
    }

    _applyInterpolatedKnobs(idx) {
      const dur     = global.Bus.clock.stepDur() * 1000;
      const nextIdx = (idx + 1) % 16;
      const KNOB_KEYS = [
        ['tune',   'k-tune'],
        ['cutoff', 'k-cutoff'],
        ['reso',   'k-reso'],
        ['envMod', 'k-envmod'],
        ['decay',  'k-decay'],
        ['accent', 'k-accent'],
      ];
      KNOB_KEYS.forEach(([key, cls]) => {
        const target = this._interpKnobAt(nextIdx, key);
        if (target != null) this._knobs[cls].setValueAnimated(target, dur, 'linear');
      });
    }

    _selectStep(i) {
      this._selStep = i;
      this._stepBtns.forEach((b, j) => b.classList.toggle('selected', j === i));
      const s = this.seq.steps[i];
      this._bOctLow?.classList.toggle('active', s.octave === 0);
      this._bOctHigh?.classList.toggle('active', s.octave === 1);
      this._bAcc?.classList.toggle('active', !!s.accent);
      this._bSli?.classList.toggle('active', !!s.slide);
      this._bTie?.classList.toggle('active', !!s.tie);
      this._bRest?.classList.toggle('active', !!s.rest);
    }

    _refreshAll() {
      this.seq.steps.forEach((_, i) => this._refreshStep(i));
    }

    _refreshStep(i) {
      const s = this.seq.steps[i];
      const btn = this._stepBtns[i];
      const noteEl = this.root?.querySelector(`#sn${this.id}_${i}`);
      if (noteEl) noteEl.textContent = s.rest ? '–' : s.note + (s.octave ? '3' : '2');
      btn.classList.toggle('has-note',  !s.rest);
      btn.classList.toggle('is-rest',    s.rest);
      btn.classList.toggle('has-accent', !!s.accent && !s.rest);
      btn.classList.toggle('has-slide',  !!s.slide  && !s.rest);
      btn.classList.toggle('has-tie',    !!s.tie    && !s.rest);
    }

    _toggleProp(prop, btn, slideBlue = false) {
      const s = this.seq.steps[this._selStep];
      s[prop] = !s[prop];
      if (prop === 'rest' && s.rest) { s.accent = false; s.slide = false; s.tie = false; }
      if (prop === 'tie' && s.tie) { s.rest = false; s.slide = false; }
      if (prop === 'slide' && s.slide) { s.rest = false; }
      btn?.classList.toggle('active', !!s[prop]);
      if (slideBlue && btn) btn.classList.toggle('slide-on', !!s[prop]);
      this._refreshStep(this._selStep);
    }

    _setOct(oct) {
      const s = this.seq.steps[this._selStep];
      s.octave = oct;
      s.rest = false;
      this._refreshStep(this._selStep);
    }

    _buildPiano() {
      const KEYS = [
        {note:'C',  white:0}, {note:'C#', black:22},
        {note:'D',  white:1}, {note:'D#', black:57},
        {note:'E',  white:2},
        {note:'F',  white:3}, {note:'F#', black:129},
        {note:'G',  white:4}, {note:'G#', black:165},
        {note:'A',  white:5}, {note:'A#', black:200},
        {note:'B',  white:6},
      ];
      this._piano.innerHTML = '';
      KEYS.forEach(k => {
        const el = mk('div', ('white' in k) ? 'white-key' : 'black-key');
        if ('white' in k) {
          el.style.left  = (k.white * 36) + 'px';
          el.style.width = '35px';
          el.innerHTML = `<span>${k.note}</span>`;
        } else {
          el.style.left = k.black + 'px';
        }
        el.dataset.note = k.note;
        el.addEventListener('click', e => { e.stopPropagation(); this._assignNote(k.note); });
        this._piano.appendChild(el);
      });
    }

    _assignNote(note) {
      const s = this.seq.steps[this._selStep];
      s.note = note;
      s.rest = false;
      this._refreshStep(this._selStep);
      if (this._rec) this._selectStep((this._selStep + 1) % 16);
    }

    _loadPreset(i) {
      const p = (global.TB303_TIE_PRESETS || [])[i]; if (!p) return;
      this.seq.steps = p.steps.map(s => ({ ...s }));
      if (p.bpm) global.Bus.clock.bpm = p.bpm;
      const k = p.knobs || {};
      if (k.cutoff != null) this._knobs['k-cutoff'].setValue(k.cutoff);
      if (k.reso   != null) this._knobs['k-reso'].setValue(k.reso);
      if (k.drive  != null) this._knobs['k-drive'].setValue(k.drive);
      if (k.envMod != null) this._knobs['k-envmod'].setValue(k.envMod);
      if (k.decay  != null) this._knobs['k-decay'].setValue(k.decay);
      if (k.accent != null) this._knobs['k-accent'].setValue(k.accent);
      if (k.tune   != null) this._knobs['k-tune'].setValue(k.tune);
      this._refreshAll();
      this._selectStep(0);
      this._refreshEnvDiagram();
    }
  }

  global.StudioInstruments            = global.StudioInstruments || {};
  global.StudioInstruments.TB303_TIE  = TB303TieInstrument;

})(window);

