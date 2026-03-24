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
        { cls:'k-cutoff', key:'cutoff', lbl:'Cutoff',     min:0,  max:1, val:0.38, cb:v => this.eng.setCutoff(v) },
        { cls:'k-reso',   key:'reso',   lbl:'Resonance',  min:0,  max:1, val:0.32, cb:v => this.eng.setReso(v)   },
        { cls:'k-envmod', key:'envMod', lbl:'Env Mod',    min:0,  max:1, val:0.50, cb:v => this.eng.setEnvMod(v) },
        { cls:'k-decay',  key:'decay',  lbl:'Decay',      min:0,  max:1, val:0.28, cb:v => this.eng.setDecay(v)  },
        { cls:'k-accent', key:'accent', lbl:'Accent',     min:0,  max:1, val:0.60, cb:v => this.eng.setAccent(v) },
      ];
      const byCls = Object.fromEntries(KNOB_DEFS.map(k => [k.cls, k]));

      const mkKnob = kd => {
        const g = mk('div', 'knob-group ' + kd.cls);
        const k = mk('div', 'knob'); const ind = mk('div', 'knob-indicator');
        k.appendChild(ind);
        const lbl = mk('div', 'knob-label'); lbl.textContent = kd.lbl;
        const clrBtn = mk('button', 'knob-clr-btn');
        clrBtn.title = 'Clear saved ' + kd.lbl + ' for this step';
        clrBtn.onclick = () => this._clearOneKnob(kd.key);
        g.append(clrBtn, k, lbl);
        this._knobs[kd.cls] = new global.Knob(k, ind, {
          min: kd.min, max: kd.max, val: kd.val,
          onChange: v => {
            kd.cb(v);
            this._refreshEnvDiagram();
          },
          onInteractionEnd: () => this._saveOneKnobToStep(kd.key, this._knobs[kd.cls].value),
        });
        this._knobClearBtns[kd.key] = clrBtn;
        return g;
      };

      const knobStrip = mk('div', 'tb3-knob-strip');

      const gOsc = mk('div', 'tb303-knob-group');
      const oscLbl = mk('div', 'tb303-group-lbl'); oscLbl.textContent = 'OSC';
      const oscRow = mk('div', 'tb303-group-knobs');
      const waveSect = mk('div', 'wave-sect');
      waveSect.innerHTML = '<div class="wave-lbl">Wave</div>';
      const sawBtn = mk('button', 'wave-btn active'); sawBtn.textContent = 'SAW';
      const squBtn = mk('button', 'wave-btn');        squBtn.textContent = 'SQU';
      sawBtn.onclick = () => { this.eng.setWave('sawtooth'); sawBtn.classList.add('active'); squBtn.classList.remove('active'); };
      squBtn.onclick = () => { this.eng.setWave('square');   squBtn.classList.add('active'); sawBtn.classList.remove('active'); };
      waveSect.append(sawBtn, squBtn);
      oscRow.appendChild(waveSect);
      oscRow.appendChild(mk('div', 'tb303-mini-div'));
      oscRow.appendChild(mkKnob(byCls['k-tune']));
      gOsc.append(oscLbl, oscRow);

      const gVcf = mk('div', 'tb303-knob-group');
      const vcfLbl = mk('div', 'tb303-group-lbl'); vcfLbl.textContent = 'VCF';
      const vcfRow = mk('div', 'tb303-group-knobs');
      vcfRow.append(mkKnob(byCls['k-cutoff']), mkKnob(byCls['k-reso']));
      gVcf.append(vcfLbl, vcfRow);

      const gEnv = mk('div', 'tb303-knob-group');
      const envGLbl = mk('div', 'tb303-group-lbl'); envGLbl.textContent = 'ENV';
      const envRowKnobs = mk('div', 'tb303-group-knobs');
      envRowKnobs.append(mkKnob(byCls['k-envmod']), mkKnob(byCls['k-decay']), mkKnob(byCls['k-accent']));
      gEnv.append(envGLbl, envRowKnobs);

      knobStrip.append(gOsc, gVcf, gEnv);
      synthLayout.appendChild(knobStrip);
      synthLayout.appendChild(envRow);
      ctrlPanel.appendChild(synthLayout);
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

      // Famous songs dropdown
      const famWrap = mk('div', 'pat-fam-wrap');
      const famBtn  = mk('button', 'pat-b3 pat-fam-btn'); famBtn.textContent = 'Famous ▾';
      const famMenu = mk('div', 'pat-fam-menu');
      global.TB303_FAMOUS.forEach((p, i) => {
        const item = mk('div', 'pat-fam-item');
        const title  = mk('span', 'fam-title');  title.textContent  = p.name;
        const artist = mk('span', 'fam-artist'); artist.textContent = p.artist;
        item.append(title, artist);
        item.onclick = () => { this._loadFamous(i); famMenu.classList.remove('open'); };
        famMenu.appendChild(item);
      });
      famBtn.onclick = e => { e.stopPropagation(); famMenu.classList.toggle('open'); };
      root.addEventListener('click', () => famMenu.classList.remove('open'));
      famWrap.append(famBtn, famMenu);
      patBtns.appendChild(famWrap);

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
        if (idx >= 0) this._applyInterpolatedKnobs(idx);
      };

      this._loadPreset(0);
      this._refreshEnvDiagram();
      return root;
    }

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
        if (!strong) {
          return `M 0 ${yCut} L ${100 - rel} ${yCut} L 100 ${Math.min(88, yCut + 5)}`;
        }
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

    // Linearly interpolate a knob value at a given step position,
    // using the nearest saved values before and after as control points.
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
      if (prevIdx === nextIdx) return pv; // only one control point

      const span = (nextIdx - prevIdx + 16) % 16;
      const dist = (targetIdx - prevIdx + 16) % 16;
      return pv + (nv - pv) * (dist / span);
    }

    // Called on each step during playback — animates each knob linearly
    // toward its interpolated value at the next step position.
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

    // Used only for UI step selection (snaps with ease to exact saved values)
    _applyStepKnobs(knobs, ms = 120) {
      if (knobs.tune   != null) this._knobs['k-tune'].setValueAnimated(knobs.tune, ms, 'ease');
      if (knobs.cutoff != null) this._knobs['k-cutoff'].setValueAnimated(knobs.cutoff, ms, 'ease');
      if (knobs.reso   != null) this._knobs['k-reso'].setValueAnimated(knobs.reso, ms, 'ease');
      if (knobs.envMod != null) this._knobs['k-envmod'].setValueAnimated(knobs.envMod, ms, 'ease');
      if (knobs.decay  != null) this._knobs['k-decay'].setValueAnimated(knobs.decay, ms, 'ease');
      if (knobs.accent != null) this._knobs['k-accent'].setValueAnimated(knobs.accent, ms, 'ease');
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
    _loadFamous(i) {
      const p = global.TB303_FAMOUS[i]; if (!p) return;
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
