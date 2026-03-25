/* ── TR-808 Instrument ──
   Implements the Studio instrument plugin interface.
   Owner: TR-808 agent
   ─────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  let _count = 0;

  class TR808Instrument {
    constructor() {
      this.type     = 'TR808';
      this.id       = 'i808_' + (++_count);
      this.name     = 'TR-808 #' + _count;
      this.eng      = new global.TR808Engine();
      this.seq      = new global.TR808Seq(this.eng);
      this.root     = null;
      this._playBtn = null;
      this._stepBtns = {}; // voice → button[16]
      this._knobs   = {}; // voice → {level, decay}
      this._bpmD    = null;
    }

    // ── Plugin interface — static descriptor ──────────────────────
    static get descriptor() {
      return {
        type:        'TR808',
        label:       'TR-808 Drum Machine',
        badgeClass:  'badge-808',
        badgeText:   '808',
        headerClass: 'tr808-header-bar',
      };
    }

    // ── createDOM ─────────────────────────────────────────────────
    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'tr808-card');

      // ── Step grid panel ──
      const gridPanel = mk('div', 't8-panel');
      const gridLbl = mk('div', 't8-lbl'); gridLbl.textContent = 'Step Sequencer';
      gridPanel.appendChild(gridLbl);

      global.VOICES_808.forEach(v => {
        const row = mk('div', 'voice-row');
        const name = mk('div', 'voice-name'); name.textContent = v;
        row.appendChild(name);

        const stepsWrap = mk('div', 'steps-808');
        this._stepBtns[v] = [];
        for (let i = 0; i < 16; i++) {
          if (i === 4 || i === 8 || i === 12) stepsWrap.appendChild(mk('div', 'step-gap'));
          const btn = mk('div', 'drum-step');
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

        // Per-voice knobs: Level + Decay
        const kWrap = mk('div', 'voice-knobs');
        ['level', 'decay'].forEach(param => {
          const kg = mk('div', 'v-knob-g');
          const k  = mk('div', 'knob-light');
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
      const transPanel = mk('div', 't8-panel');
      const transRow   = mk('div', 't8-transport');

      const btns = mk('div', 't8-btns');
      const playBtn = mk('button', 't-btn btn-play8'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop8'); stopBtn.textContent = '■ Stop';
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      btns.append(playBtn, stopBtn);
      this._playBtn = playBtn;

      // Pattern buttons
      const patBtns = mk('div', 'pat-btns3');
      global.TR808_PRESETS.forEach((p, i) => {
        const b = mk('button', 'pat-b8'); b.textContent = p.name; b.onclick = () => this._loadPreset(i);
        patBtns.appendChild(b);
      });
      const rndB = mk('button', 'pat-b8'); rndB.textContent = 'Rnd';   rndB.onclick = () => this._random();
      const clrB = mk('button', 'pat-b8'); clrB.textContent = 'Clear'; clrB.onclick = () => this._clear();
      const expB = mk('button', 'pat-b8'); expB.textContent = '↓ Export'; expB.onclick = () => this._export();
      const impI = document.createElement('input');
      impI.type = 'file'; impI.accept = '.json'; impI.style.display = 'none';
      impI.addEventListener('change', e => this._import(e));
      const impB = mk('button', 'pat-b8'); impB.textContent = '↑ Import'; impB.onclick = () => impI.click();
      patBtns.append(rndB, clrB, expB, impB, impI);

      transRow.append(btns, patBtns);
      transPanel.appendChild(transRow);
      root.appendChild(transPanel);

      this.root = root;

      // Wire sequencer step callback
      this.seq.onStep = idx => {
        global.VOICES_808.forEach(v => {
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
      global.VOICES_808.forEach(v => {
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
      global.VOICES_808.forEach(v => {
        if (this._stepBtns[v]) this._stepBtns[v].forEach(b => b.classList.remove('playing'));
      });
    }

    destroy() {
      this.stop(this._playBtn);
      this.eng.destroy();
    }

    getSongData() {
      const pattern = {};
      global.VOICES_808.forEach(v => { pattern[v] = [...this.seq.pattern[v]]; });
      return {
        version: 1,
        type:    'TR808',
        name:    this.name,
        bpm:     global.Bus.clock.bpm,
        pattern,
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'TR808') { alert('Not a TR-808 file'); return; }
      if (d.pattern) {
        global.VOICES_808.forEach(v => {
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
      const p = global.TR808_PRESETS[i]; if (!p) return;
      global.VOICES_808.forEach(v => {
        this.seq.pattern[v] = p.pattern[v] ? p.pattern[v].map(Boolean) : Array(16).fill(false);
      });
      if (p.bpm) this._adjBPM(0, p.bpm);
      this._refreshGrid();
    }

    _random() {
      global.VOICES_808.forEach(v => {
        this.seq.pattern[v] = Array.from({ length: 16 }, () => Math.random() < 0.25);
      });
      this._refreshGrid();
    }

    _clear() {
      global.VOICES_808.forEach(v => { this.seq.pattern[v] = Array(16).fill(false); });
      this._refreshGrid();
    }

    _export() {
      const d = this.getSongData();
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.href = url;
      a.download = (this.name || 'tr808').replace(/[^a-z0-9_-]/gi, '_') + '.json';
      document.body?.appendChild(a);
      a.click();
      a.remove();
      // Intentionally do not revoke the object URL.
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
  global.StudioInstruments.TR808  = TR808Instrument;

})(window);
