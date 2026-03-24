/* ── TR-909 Instrument ──
   Implements the Studio instrument plugin interface.
   Owner: TR-909 agent
   ─────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  let _count = 0;

  class TR909Instrument {
    constructor() {
      this.type      = 'TR909';
      this.id        = 'i909_' + (++_count);
      this.name      = 'TR-909 #' + _count;
      this.eng       = new global.TR909Engine();
      this.seq       = new global.TR909Seq(this.eng);
      this.root      = null;
      this._playBtn  = null;
      this._stepBtns = {}; // voice → button[16]
      this._knobs    = {}; // voice → {param → Knob}
      this._bpmD     = null;
    }

    // ── Plugin interface — static descriptor ──────────────────────
    static get descriptor() {
      return {
        type:        'TR909',
        label:       'TR-909 Drum Machine',
        badgeClass:  'badge-909',
        badgeText:   '909',
        headerClass: 'tr909-header-bar',
      };
    }

    // ── createDOM ─────────────────────────────────────────────────
    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'tr909-card');

      // ── Step grid panel ──
      const gridPanel = mk('div', 't9-panel');
      const gridLbl   = mk('div', 't9-lbl'); gridLbl.textContent = 'Step Sequencer';
      gridPanel.appendChild(gridLbl);

      global.VOICES_909.forEach(v => {
        const row  = mk('div', 'voice-row');
        const name = mk('div', 'voice-name'); name.textContent = v;
        row.appendChild(name);

        const stepsWrap = mk('div', 'steps-909');
        this._stepBtns[v] = [];
        for (let i = 0; i < 16; i++) {
          if (i === 4 || i === 8 || i === 12) stepsWrap.appendChild(mk('div', 'step-gap'));
          const btn = mk('div', 'drum-step-9');
          btn.dataset.voice = v;
          btn.dataset.step  = i;
          if (this.seq.pattern[v][i]) btn.classList.add('on');
          btn.addEventListener('click', () => {
            this.seq.pattern[v][i] = !this.seq.pattern[v][i];
            btn.classList.toggle('on', this.seq.pattern[v][i]);
          });
          stepsWrap.appendChild(btn);
          this._stepBtns[v].push(btn);
        }
        row.appendChild(stepsWrap);

        // Per-voice knobs: BD → level/decay/attack, SD → level/decay/snappy, others → level/decay
        const kWrap  = mk('div', 'voice-knobs');
        const params = Object.keys(this.eng.p[v]);
        params.forEach(param => {
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
      const transPanel = mk('div', 't9-panel');
      const transRow   = mk('div', 't9-transport');

      const btns    = mk('div', 't9-btns');
      const playBtn = mk('button', 't-btn btn-play9'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop9'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      // Pattern buttons
      const patBtns = mk('div', 'pat-btns3');
      global.TR909_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b9'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const rndB = mk('button', 'pat-b9'); rndB.textContent = 'Rnd';      rndB.onclick = () => this._random();
      const clrB = mk('button', 'pat-b9'); clrB.textContent = 'Clear';    clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b9'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b9'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(rndB, clrB, expB, impB, impI);

      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      // Wire sequencer step callback
      this.seq.onStep = idx => {
        global.VOICES_909.forEach(v => {
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
      global.VOICES_909.forEach(v => {
        for (let i = 0; i < 16; i++) {
          if (this._stepBtns[v]) {
            this._stepBtns[v][i].classList.toggle('on', !!this.seq.pattern[v][i]);
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
      global.VOICES_909.forEach(v => {
        if (this._stepBtns[v]) this._stepBtns[v].forEach(b => b.classList.remove('playing'));
      });
    }

    destroy() {
      this.stop(this._playBtn);
      this.eng.destroy();
    }

    getSongData() {
      const pattern = {};
      global.VOICES_909.forEach(v => { pattern[v] = [...this.seq.pattern[v]]; });
      return {
        version: 1,
        type:    'TR909',
        name:    this.name,
        bpm:     global.Bus.clock.bpm,
        pattern,
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'TR909') { alert('Not a TR-909 file'); return; }
      if (d.pattern) {
        global.VOICES_909.forEach(v => {
          if (d.pattern[v] && d.pattern[v].length === 16) {
            this.seq.pattern[v] = d.pattern[v].map(Boolean);
          }
        });
      }
      if (d.bpm) this._adjBPM(0, d.bpm);
      this._refreshGrid();
    }

    // ── Pattern helpers ──────────────────────────────────────────
    _loadPreset(i) {
      const p = global.TR909_PRESETS[i]; if (!p) return;
      global.VOICES_909.forEach(v => {
        this.seq.pattern[v] = p.pattern[v] ? p.pattern[v].map(Boolean) : Array(16).fill(false);
      });
      if (p.bpm) this._adjBPM(0, p.bpm);
      this._refreshGrid();
    }

    _random() {
      global.VOICES_909.forEach(v => {
        this.seq.pattern[v] = Array.from({ length: 16 }, () => Math.random() < 0.25);
      });
      this._refreshGrid();
    }

    _clear() {
      global.VOICES_909.forEach(v => { this.seq.pattern[v] = Array(16).fill(false); });
      this._refreshGrid();
    }

    _export() {
      const d = this.getSongData();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = (this.name || 'tr909').replace(/[^a-z0-9_-]/gi, '_') + '.json';
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
  global.StudioInstruments.TR909  = TR909Instrument;

})(window);
