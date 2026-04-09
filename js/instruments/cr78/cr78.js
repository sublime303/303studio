/* ── Roland CR-78 CompuRhythm Instrument ──
   Implements the Studio instrument plugin interface.
   Owner: CR-78 agent
   ──────────────────────────────────────────────── */
(function(global) {
  'use strict';

  let _count = 0;

  class CR78Instrument {
    constructor() {
      this.type      = 'CR78';
      this.id        = 'icr78_' + (++_count);
      this.name      = 'CR-78 #' + _count;
      this.eng       = new global.CR78Engine();
      this.seq       = new global.CR78Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = {}; // voice → button[16]
      this._knobs    = {}; // voice → { level, decay }
    }

    // ── Plugin interface — static descriptor ──────────────────────
    static get descriptor() {
      return {
        type:        'CR78',
        label:       'Roland CR-78 CompuRhythm',
        badgeClass:  'badge-cr78',
        badgeText:   'CR-78',
        headerClass: 'cr78-header-bar',
      };
    }

    // ── createDOM ─────────────────────────────────────────────────
    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'cr78-card');

      // ── Step grid panel ──
      const gridPanel = mk('div', 'cr78-panel');
      const gridLbl   = mk('div', 'cr78-lbl'); gridLbl.textContent = 'Step Sequencer';
      gridPanel.appendChild(gridLbl);

      global.VOICES_CR78.forEach(v => {
        const row  = mk('div', 'cr78-voice-row');
        const name = mk('div', 'cr78-voice-name'); name.textContent = v;
        row.appendChild(name);

        const stepsWrap = mk('div', 'cr78-steps');
        this._stepBtns[v] = [];
        for (let i = 0; i < 16; i++) {
          if (i === 4 || i === 8 || i === 12) stepsWrap.appendChild(mk('div', 'cr78-step-gap'));
          const btn = mk('div', 'cr78-step');
          btn.dataset.voice = v;
          btn.dataset.step  = i;
          if (this.seq.patterns[v][i]) btn.classList.add('active');
          btn.addEventListener('click', () => {
            this.seq.patterns[v][i] = !this.seq.patterns[v][i];
            btn.classList.toggle('active', this.seq.patterns[v][i]);
          });
          stepsWrap.appendChild(btn);
          this._stepBtns[v].push(btn);
        }
        row.appendChild(stepsWrap);

        // Per-voice knobs: Level + Decay
        const kWrap = mk('div', 'cr78-voice-knobs');
        ['level', 'decay'].forEach(param => {
          const kg  = mk('div', 'v-knob-g');
          const k   = mk('div', 'knob-light');
          const ind = mk('div', 'knob-indicator');
          k.appendChild(ind);
          const lbl = mk('div', 'knob-light-label'); lbl.textContent = param;
          kg.append(k, lbl);
          kWrap.appendChild(kg);
          const initVal = this.eng.p[v][param];
          if (!this._knobs[v]) this._knobs[v] = {};
          this._knobs[v][param] = new global.Knob(k, ind, {
            min: 0, max: 1, val: initVal != null ? initVal : 0.5,
            onChange: val => { this.eng.p[v][param] = val; }
          });
        });
        row.appendChild(kWrap);
        gridPanel.appendChild(row);
      });
      root.appendChild(gridPanel);

      // ── Transport panel ──
      const transPanel = mk('div', 'cr78-panel');
      const transRow   = mk('div', 'cr78-transport');

      const btns    = mk('div', 'cr78-btns');
      const playBtn = mk('button', 't-btn cr78-btn-play'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn cr78-btn-stop'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      // Preset buttons
      const patBtns = mk('div', 'cr78-pat-btns');
      global.CR78_PRESETS.forEach((p, i) => {
        const b = mk('button', 'cr78-pat-b'); b.textContent = p.name;
        b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const clrB = mk('button', 'cr78-pat-b'); clrB.textContent = 'Clear';  clrB.onclick = () => this._clear();
      const rndB = mk('button', 'cr78-pat-b'); rndB.textContent = 'Rnd';    rndB.onclick = () => this._random();
      const expB = mk('button', 'cr78-pat-b'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'cr78-pat-b'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(clrB, rndB, expB, impB, impI);

      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      // Wire sequencer step callback — highlight playing step
      this.seq.onStep = idx => {
        global.VOICES_CR78.forEach(v => {
          this._stepBtns[v].forEach((b, j) => b.classList.toggle('playing', j === idx));
        });
      };

      this._loadPreset(0);
      return root;
    }

    // ── Internal helpers ─────────────────────────────────────────
    _adjBPM(d, abs) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, abs !== undefined ? abs : global.Bus.clock.bpm + d));
      const hd = document.getElementById('masterBpm');
      if (hd) hd.textContent = global.Bus.clock.bpm;
    }

    _refreshGrid() {
      global.VOICES_CR78.forEach(v => {
        for (let i = 0; i < 16; i++) {
          if (this._stepBtns[v]) {
            this._stepBtns[v][i].classList.toggle('active', !!this.seq.patterns[v][i]);
          }
        }
      });
    }

    // ── Plugin interface — instance methods ────────────────────────
    play(btn) {
      global.Bus.init();
      global.Bus.resume();
      this.seq.play(global.Bus.ctx, global.Bus.gain);
      if (btn) btn.classList.add('on');
    }

    stop(playBtn) {
      this.seq.stop();
      if (playBtn) playBtn.classList.remove('on');
      global.VOICES_CR78.forEach(v => {
        if (this._stepBtns[v]) this._stepBtns[v].forEach(b => b.classList.remove('playing'));
      });
    }

    destroy() {
      this.stop(this._playBtn);
      this.eng.destroy();
    }

    getSongData() {
      const patterns = {};
      global.VOICES_CR78.forEach(v => { patterns[v] = [...this.seq.patterns[v]]; });
      return {
        version:  1,
        type:     'CR78',
        name:     this.name,
        bpm:      global.Bus.clock.bpm,
        patterns,
        knobs:    {},
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'CR78') { alert('Not a CR-78 file'); return; }
      if (d.patterns) {
        global.VOICES_CR78.forEach(v => {
          if (d.patterns[v] && d.patterns[v].length === 16) {
            this.seq.patterns[v] = d.patterns[v].map(Boolean);
          }
        });
      }
      if (d.bpm) this._adjBPM(0, d.bpm);
      this._refreshGrid();
    }

    // ── Pattern helpers ──────────────────────────────────────────
    _loadPreset(i) {
      const p = global.CR78_PRESETS[i]; if (!p) return;
      global.VOICES_CR78.forEach(v => {
        this.seq.patterns[v] = p.patterns[v] ? p.patterns[v].map(Boolean) : Array(16).fill(false);
      });
      if (p.bpm) this._adjBPM(0, p.bpm);
      this._refreshGrid();
    }

    _random() {
      global.VOICES_CR78.forEach(v => {
        this.seq.patterns[v] = Array.from({ length: 16 }, () => Math.random() < 0.25);
      });
      this._refreshGrid();
    }

    _clear() {
      global.VOICES_CR78.forEach(v => { this.seq.patterns[v] = Array(16).fill(false); });
      this._refreshGrid();
    }

    _export() {
      const d = this.getSongData();
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.href = url;
      a.download = (this.name || 'cr78').replace(/[^a-z0-9_-]/gi, '_') + '.json';
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
        catch (err) { alert('Parse error: ' + err.message); }
      };
      reader.readAsText(file);
      evt.target.value = '';
    }
  }

  // Register in the global instrument registry
  global.StudioInstruments       = global.StudioInstruments || {};
  global.StudioInstruments.CR78  = CR78Instrument;

})(window);
