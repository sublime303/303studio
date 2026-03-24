/* ── Studio Core ──
   Registry-driven multi-instrument studio.
   Owner: core — do not add instrument-specific code here.
   ────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  const mk = global.mk;

  class Studio {
    constructor() {
      this.instances = [];
    }

    init() {
      this._buildAddMenu();
      this._wireHeader();
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
    new global.Knob(kEl, iEl, { min: 0, max: 1, val: 0.85, onChange: v => {
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
