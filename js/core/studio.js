/* ── Studio Core ──
   Registry-driven multi-instrument studio.
   Owner: core — do not add instrument-specific code here.
   ────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  const mk = global.mk;
  const STUDIO_SONG_LS_KEY = '303studio_whole_song_v1';

  class Studio {
    constructor() {
      this.instances = [];
      /** Master volume knob instance (after DOM init) */
      this.masterKnob = null;
    }

    init() {
      this._buildAddMenu();
      this._wireHeader();
      this._wireSongActions();
    }

    // ── Whole-song JSON (all instruments) ─────────────────────────
    getStudioSongData() {
      return {
        format:      '303studio-song',
        version:     1,
        bpm:         global.Bus.clock.bpm,
        masterGain:  global.Bus && global.Bus.gain ? global.Bus.gain.gain.value : 0.85,
        instruments: this.instances.map(inst =>
          typeof inst.getSongData === 'function' ? inst.getSongData() : null
        ).filter(Boolean),
      };
    }

    applyStudioSongData(data) {
      if (!data || data.format !== '303studio-song' || !Array.isArray(data.instruments)) {
        alert('Not a valid 303 Studio song file. For a single instrument, use Import on that instrument\'s panel.');
        return;
      }
      this.stopAll();
      [...this.instances].forEach(inst => this.remove(inst));

      for (const entry of data.instruments) {
        if (!entry || !entry.type) continue;
        const InstrClass = (global.StudioInstruments || {})[entry.type];
        if (!InstrClass) {
          console.warn('Skipping unknown instrument type:', entry.type);
          continue;
        }
        this.add(entry.type);
        const inst = this.instances[this.instances.length - 1];
        if (typeof inst.applySongData === 'function') inst.applySongData(entry);
        if (entry.name) {
          inst.name = entry.name;
          const titleEl = document.querySelector('#card-' + inst.id + ' .inst-title');
          if (titleEl) titleEl.textContent = entry.name;
        }
      }

      if (typeof data.bpm === 'number') {
        global.Bus.clock.bpm = Math.max(40, Math.min(280, data.bpm));
        const disp = document.getElementById('masterBpm');
        if (disp) disp.textContent = global.Bus.clock.bpm;
      }
      if (typeof data.masterGain === 'number' && global.Bus.gain) {
        const g = Math.max(0, Math.min(1, data.masterGain));
        global.Bus.gain.gain.value = g;
        if (this.masterKnob) this.masterKnob.setValue(g);
      }
    }

    exportStudioSong() {
      const nameInp = document.getElementById('studioSongName');
      const raw = (nameInp && nameInp.value.trim()) || '303studio-song';
      const data = this.getStudioSongData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = raw.replace(/[^a-z0-9_-]/gi, '_') + '.json';
      // Some browsers (and KDE/portal download handlers) can fail if the object URL
      // is revoked too quickly. Also keep the anchor in the DOM for reliability.
      document.body?.appendChild(a);
      a.click();
      a.remove();
      // Intentionally do not revoke the object URL immediately; some KDE/portal
      // handlers can try to read it asynchronously.
    }

    importStudioSongFromText(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        alert('Could not parse file: ' + err.message);
        return;
      }
      this.applyStudioSongData(data);
    }

    saveStudioSongLocal() {
      try {
        localStorage.setItem(STUDIO_SONG_LS_KEY, JSON.stringify(this.getStudioSongData()));
      } catch (e) {
        alert('Could not save to browser storage.');
      }
    }

    loadStudioSongLocal() {
      try {
        const text = localStorage.getItem(STUDIO_SONG_LS_KEY);
        if (!text) {
          alert('No song saved in browser yet.');
          return;
        }
        this.importStudioSongFromText(text);
      } catch (e) {
        alert('Could not load from browser storage.');
      }
    }

    _wireSongActions() {
      document.getElementById('btnExportSong')?.addEventListener('click', () => this.exportStudioSong());
      document.getElementById('btnSaveSongBrowser')?.addEventListener('click', () => this.saveStudioSongLocal());
      document.getElementById('btnLoadSongBrowser')?.addEventListener('click', () => this.loadStudioSongLocal());
      document.getElementById('btnImportSong')?.addEventListener('click', () => {
        document.getElementById('studioSongFileImport')?.click();
      });
      const fileInp = document.getElementById('studioSongFileImport');
      fileInp?.addEventListener('change', evt => {
        const file = evt.target.files && evt.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          this.importStudioSongFromText(e.target.result);
        };
        reader.readAsText(file);
        evt.target.value = '';
      });
    }

    // ── Registry-driven add menu ──────────────────────────────────
    _buildAddMenu() {
      const menu = document.getElementById('addMenu');
      if (!menu) return;
      menu.innerHTML = '';
      Object.values(global.StudioInstruments || {}).forEach(InstrClass => {
        const d = InstrClass.descriptor;
        const item = mk('div', 'add-menu-item');
        const badge = mk('span', 'inst-badge ' + d.badgeClass);
        badge.textContent = d.badgeText;
        item.append(badge, document.createTextNode(' ' + d.label));
        item.onclick = () => { this.add(d.type); _closeMenu(); };
        menu.appendChild(item);
      });
    }

    add(type) {
      const InstrClass = (global.StudioInstruments || {})[type];
      if (!InstrClass) { console.warn('Unknown instrument type:', type); return; }
      const inst = new InstrClass();
      this.instances.push(inst);
      this._renderCard(inst);
      document.getElementById('emptyMsg')?.remove();
      return inst;
    }

    remove(inst) {
      inst.stop(inst._playBtn);
      inst.destroy();
      document.getElementById('card-' + inst.id)?.remove();
      this.instances = this.instances.filter(i => i !== inst);
      if (this.instances.length === 0) {
        const msg = mk('div', 'empty-rack');
        msg.id = 'emptyMsg';
        msg.textContent = 'No instruments — click ＋ Add Instrument to begin';
        document.getElementById('rack').appendChild(msg);
      }
    }

    _renderCard(inst) {
      const rack = document.getElementById('rack');
      const d = inst.constructor.descriptor;

      const card = mk('div', 'inst-card');
      card.id = 'card-' + inst.id;

      // Header
      const hdr = mk('div', 'inst-card-header ' + d.headerClass);
      const led = mk('div', 'inst-led'); led.id = 'led-' + inst.id;
      const title = mk('span', 'inst-title'); title.textContent = inst.name;
      const tag = mk('span', 'inst-type-tag ' + d.badgeClass); tag.textContent = d.badgeText;

      const hBtns = mk('div', 'inst-header-btns');
      const colBtn = mk('button', 'inst-hbtn collapse-btn'); colBtn.textContent = '—';
      const remBtn = mk('button', 'inst-hbtn remove-btn');   remBtn.textContent = '×';
      colBtn.title = 'Collapse/expand';
      remBtn.title = 'Remove instrument';
      colBtn.onclick = () => {
        const body = document.getElementById('body-' + inst.id);
        const collapsed = body.classList.toggle('collapsed');
        colBtn.textContent = collapsed ? '□' : '—';
      };
      remBtn.onclick = () => this.remove(inst);
      hBtns.append(colBtn, remBtn);
      hdr.append(led, title, tag, hBtns);

      // Body
      const body = mk('div', 'inst-body');
      body.id = 'body-' + inst.id;
      body.appendChild(inst.createDOM());

      card.append(hdr, body);
      rack.appendChild(card);

      // Wire LED to play/stop
      if (inst._playBtn) {
        const origPlay = inst.play.bind(inst);
        inst.play = (...args) => { origPlay(...args); led.classList.add('on'); };
        const origStop = inst.stop.bind(inst);
        inst.stop = (...args) => { origStop(...args); led.classList.remove('on'); };
      }
    }

    // ── Global transport ─────────────────────────────────────────
    playAll() {
      global.Bus.init();
      global.Bus.resume();
      // Start master clock first, then subscribe all instruments.
      // All share the same nextT — perfect sync guaranteed.
      global.Bus.clock.start();
      document.getElementById('btnPlayAll')?.classList.add('on');
      this.instances.forEach(inst => {
        inst.play(inst._playBtn);
        document.getElementById('led-' + inst.id)?.classList.add('on');
      });
    }

    stopAll() {
      // Stop clock first (sends -1 to all subscribers), then clean up LEDs.
      global.Bus.clock.stop();
      document.getElementById('btnPlayAll')?.classList.remove('on');
      this.instances.forEach(inst => {
        // seq is already unsubscribed by clock.stop(); just update UI
        if (inst._playBtn) inst._playBtn.classList.remove('on');
        document.getElementById('led-' + inst.id)?.classList.remove('on');
      });
    }

    _wireHeader() {
      document.getElementById('btnPlayAll')?.addEventListener('click', () => this.playAll());
      document.getElementById('btnStopAll')?.addEventListener('click', () => this.stopAll());
    }
  }

  // ── Add-menu toggle helpers ───────────────────────────────────
  function _closeMenu() { document.getElementById('addMenu')?.classList.remove('open'); }

  global.toggleAddMenu = function() { document.getElementById('addMenu')?.classList.toggle('open'); };
  global.closeAddMenu  = _closeMenu;

  document.addEventListener('click', e => {
    if (!e.target.closest('.add-wrap')) _closeMenu();
  });

  // ── Master volume knob ────────────────────────────────────────
  function _initMasterKnob() {
    const kEl  = document.getElementById('masterKnob');
    const iEl  = document.getElementById('masterInd');
    if (!kEl || !iEl) return;
    global.studio.masterKnob = new global.Knob(kEl, iEl, { min: 0, max: 1, val: 0.85, onChange: v => {
      if (global.Bus && global.Bus.gain) global.Bus.gain.gain.value = v;
    }});
  }

  // ── Master BPM control ────────────────────────────────────────
  function _initMasterBpm() {
    const disp = document.getElementById('masterBpm');
    const upBtn = document.getElementById('masterBpmUp');
    const dnBtn = document.getElementById('masterBpmDn');
    if (!disp) return;

    function set(v) {
      global.Bus.clock.bpm = Math.max(40, Math.min(280, v));
      disp.textContent = global.Bus.clock.bpm;
    }

    disp.textContent = global.Bus.clock.bpm;
    upBtn?.addEventListener('click', () => set(global.Bus.clock.bpm + 1));
    dnBtn?.addEventListener('click', () => set(global.Bus.clock.bpm - 1));

    let _dy = null, _v0 = null;
    disp.addEventListener('pointerdown', e => { _dy = e.clientY; _v0 = global.Bus.clock.bpm; disp.setPointerCapture(e.pointerId); });
    disp.addEventListener('pointermove', e => { if (_dy === null) return; set(Math.round(_v0 + (_dy - e.clientY) * 0.5)); });
    disp.addEventListener('pointerup',   () => { _dy = null; });
    disp.addEventListener('wheel', e => { e.preventDefault(); set(global.Bus.clock.bpm - Math.sign(e.deltaY)); }, { passive: false });
  }

  // ── Bootstrap ────────────────────────────────────────────────
  global.studio = new Studio();

  document.addEventListener('DOMContentLoaded', () => {
    _initMasterKnob();
    _initMasterBpm();
    global.studio.init();
    // Default instruments on startup — users add more via ＋ Add Instrument
    ['TB303', 'TR808'].forEach(type => global.studio.add(type));
  });

})(window);
