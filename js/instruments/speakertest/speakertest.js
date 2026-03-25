/* ── Speaker Test Instrument ──
   Test tone: frequency, level, stereo pan, waveform.
   ─────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  let _count = 0;

  const WAVES = [
    { id: 'sine',     label: 'Sine' },
    { id: 'square',   label: 'Square' },
    { id: 'sawtooth', label: 'Saw' },
    { id: 'triangle', label: 'Tri' },
  ];

  function fmtHz(h) {
    if (h < 1000) return Math.round(h) + ' Hz';
    const k = h / 1000;
    const s = k < 10 ? k.toFixed(2) : k.toFixed(1);
    return s.replace(/\.?0+$/, '') + ' kHz';
  }

  class SpeakerTestInstrument {
    constructor() {
      this.type = 'SPEAKERTEST';
      this.id = 'i' + (++_count);
      this.name = 'Speaker Test #' + _count;
      this.eng = new global.SpeakerTestEngine();
      this.root = null;
      this._playBtn = null;
      this._tick = this._onTick.bind(this);
      this._knobs = {};
      this._freqReadout = null;
      this._waveBtns = [];
    }

    static get descriptor() {
      return {
        type:        'SPEAKERTEST',
        label:       'Speaker Test',
        badgeClass:  'badge-spk',
        badgeText:   'SPK',
        headerClass: 'spk-header-bar',
      };
    }

    _onTick(step) {
      // Global Stop All: clock notifies -1 then clears subscribers — do not unsubscribe here.
      if (step === -1) {
        this.eng.silence();
        if (this._playBtn) this._playBtn.classList.remove('on');
      }
    }

    _setWaveUI(waveId) {
      this._waveBtns.forEach(b => b.classList.toggle('active', b.dataset.wave === waveId));
    }

    createDOM() {
      const mk = global.mk;
      const root = mk('div', 'spk-card');

      const panel = mk('div', 'spk-panel');
      panel.innerHTML = '<div class="spk-panel-lbl">Test tone</div>';

      const waveRow = mk('div', 'spk-wave-row');
      const waveLbl = mk('div', 'spk-wave-lbl'); waveLbl.textContent = 'Wave';
      const waveBtns = mk('div', 'spk-wave-btns');
      WAVES.forEach(w => {
        const b = mk('button', 'spk-wave-btn' + (w.id === 'sine' ? ' active' : ''));
        b.type = 'button';
        b.dataset.wave = w.id;
        b.textContent = w.label;
        b.onclick = () => {
          this.eng.setWaveform(w.id);
          this._setWaveUI(w.id);
        };
        waveBtns.appendChild(b);
        this._waveBtns.push(b);
      });
      waveRow.append(waveLbl, waveBtns);

      const knobsRow = mk('div', 'spk-knobs-row');

      const gFreq = mk('div', 'knob-group');
      const kFreq = mk('div', 'knob'); const indF = mk('div', 'knob-indicator');
      kFreq.appendChild(indF);
      const lblF = mk('div', 'knob-label'); lblF.textContent = 'Frequency';
      const freqRead = mk('div', 'spk-freq-read'); freqRead.textContent = fmtHz(80);
      this._freqReadout = freqRead;
      gFreq.append(freqRead, kFreq, lblF);
      this._knobs.freq = new global.Knob(kFreq, indF, {
        min: 20, max: 20000, val: 80, log: true,
        onChange: v => {
          this.eng.setFrequencyHz(v);
          freqRead.textContent = fmtHz(v);
        },
      });

      const gLvl = mk('div', 'knob-group');
      const kLvl = mk('div', 'knob'); const indL = mk('div', 'knob-indicator');
      kLvl.appendChild(indL);
      const lblL = mk('div', 'knob-label'); lblL.textContent = 'Level';
      gLvl.append(kLvl, lblL);
      this._knobs.level = new global.Knob(kLvl, indL, {
        min: 0, max: 1, val: 0.16,
        onChange: v => this.eng.setLevel(v),
      });

      const gPan = mk('div', 'knob-group');
      const kPan = mk('div', 'knob'); const indP = mk('div', 'knob-indicator');
      kPan.appendChild(indP);
      const lblP = mk('div', 'knob-label'); lblP.textContent = 'L — R';
      gPan.append(kPan, lblP);
      this._knobs.pan = new global.Knob(kPan, indP, {
        min: -1, max: 1, val: 0,
        onChange: v => this.eng.setPan(v),
      });

      knobsRow.append(gFreq, gLvl, gPan);

      const transRow = mk('div', 'spk-trans');
      const playBtn = mk('button', 't-btn btn-play3'); playBtn.textContent = '▶ Play';
      const stopBtn = mk('button', 't-btn btn-stop3'); stopBtn.textContent = '■ Stop';
      this._playBtn = playBtn;
      playBtn.onclick = () => this.play(playBtn);
      stopBtn.onclick = () => this.stop(playBtn);
      transRow.append(playBtn, stopBtn);

      panel.append(waveRow, knobsRow, transRow);
      root.appendChild(panel);
      this.root = root;
      return root;
    }

    play(btn) {
      global.Bus.init();
      global.Bus.resume();
      this.eng.init(global.Bus.ctx, global.Bus.gain);
      this.eng.setFrequencyHz(this._knobs.freq.value);
      this.eng.setLevel(this._knobs.level.value);
      this.eng.setPan(this._knobs.pan.value);
      const activeWave = this._waveBtns.find(b => b.classList.contains('active'));
      this.eng.setWaveform(activeWave ? activeWave.dataset.wave : 'sine');
      this.eng.startAudible();
      global.Bus.clock.subscribe(this._tick);
      if (btn) btn.classList.add('on');
    }

    stop(playBtn) {
      global.Bus.clock.unsubscribe(this._tick);
      this.eng.silence();
      if (this._playBtn) this._playBtn.classList.remove('on');
    }

    destroy() {
      this.stop(this._playBtn);
      this.eng.destroy();
    }

    getSongData() {
      const w = this._waveBtns.find(b => b.classList.contains('active'));
      return {
        version:   1,
        type:      'SPEAKERTEST',
        name:      this.name,
        frequency: this._knobs.freq.value,
        level:     this._knobs.level.value,
        pan:       this._knobs.pan.value,
        waveform:  w ? w.dataset.wave : 'sine',
      };
    }

    applySongData(d) {
      if (!d || d.type !== 'SPEAKERTEST') { alert('Not a Speaker Test file'); return; }
      if (typeof d.frequency === 'number') this._knobs.freq.setValue(d.frequency);
      if (typeof d.level === 'number') this._knobs.level.setValue(d.level);
      if (typeof d.pan === 'number') this._knobs.pan.setValue(d.pan);
      if (d.waveform && WAVES.some(w => w.id === d.waveform)) {
        this.eng.setWaveform(d.waveform);
        this._setWaveUI(d.waveform);
      }
      if (this._freqReadout) this._freqReadout.textContent = fmtHz(this._knobs.freq.value);
    }
  }

  global.StudioInstruments = global.StudioInstruments || {};
  global.StudioInstruments.SPEAKERTEST = SpeakerTestInstrument;

})(window);
