/* ── TB-303 Presets ──
   Owner: TB-303 agent — safe to edit patterns here without touching engine or UI
   ─────────────────────────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  const TB303_PRESETS = [
    {
      name: 'Acid 1',
      bpm: 128,
      knobs: { cutoff: 0.38, reso: 0.55, envMod: 0.62, decay: 0.35, accent: 0.70, tune: 0 },
      steps: [
        { note:'A',  octave:0, accent:false, slide:true,  rest:false },
        { note:'A',  octave:0, accent:true,  slide:false, rest:false },
        { note:'A',  octave:1, accent:false, slide:false, rest:false },
        { note:'A',  octave:0, accent:false, slide:false, rest:true  },
        { note:'G',  octave:0, accent:false, slide:true,  rest:false },
        { note:'G',  octave:0, accent:true,  slide:false, rest:false },
        { note:'A',  octave:0, accent:false, slide:true,  rest:false },
        { note:'A',  octave:0, accent:false, slide:false, rest:false },
        { note:'A',  octave:0, accent:false, slide:true,  rest:false },
        { note:'A',  octave:0, accent:true,  slide:false, rest:false },
        { note:'C',  octave:1, accent:false, slide:false, rest:false },
        { note:'A',  octave:0, accent:false, slide:false, rest:true  },
        { note:'G#', octave:0, accent:false, slide:true,  rest:false },
        { note:'G#', octave:0, accent:true,  slide:false, rest:false },
        { note:'A',  octave:0, accent:false, slide:true,  rest:false },
        { note:'A',  octave:0, accent:false, slide:false, rest:false },
      ]
    },
    {
      name: 'Acid 2',
      bpm: 130,
      knobs: { cutoff: 0.32, reso: 0.60, envMod: 0.70, decay: 0.40, accent: 0.72, tune: 0 },
      steps: [
        { note:'D',  octave:0, accent:true,  slide:false, rest:false },
        { note:'D',  octave:0, accent:false, slide:true,  rest:false },
        { note:'D',  octave:1, accent:false, slide:false, rest:false },
        { note:'C',  octave:1, accent:false, slide:true,  rest:false },
        { note:'A#', octave:0, accent:true,  slide:false, rest:false },
        { note:'A',  octave:0, accent:false, slide:false, rest:true  },
        { note:'G',  octave:0, accent:false, slide:true,  rest:false },
        { note:'A',  octave:0, accent:true,  slide:false, rest:false },
        { note:'D',  octave:0, accent:false, slide:true,  rest:false },
        { note:'D#', octave:0, accent:false, slide:false, rest:false },
        { note:'D',  octave:0, accent:true,  slide:false, rest:false },
        { note:'C',  octave:0, accent:false, slide:true,  rest:false },
        { note:'A#', octave:0, accent:false, slide:false, rest:true  },
        { note:'G',  octave:0, accent:true,  slide:true,  rest:false },
        { note:'A',  octave:0, accent:false, slide:false, rest:false },
        { note:'D',  octave:0, accent:false, slide:false, rest:false },
      ]
    },
    {
      name: 'Puzzle ♦',
      // Little Jinder — placeholder in F minor, 128 BPM
      // TODO: replace with transcribed notes once source audio is available
      bpm: 128,
      knobs: { cutoff: 0.30, reso: 0.45, envMod: 0.55, decay: 0.45, accent: 0.55, tune: 0 },
      steps: [
        { note:'F',  octave:0, accent:false, slide:false, rest:false },
        { note:'F',  octave:0, accent:false, slide:true,  rest:false },
        { note:'G#', octave:0, accent:true,  slide:false, rest:false },
        { note:'G#', octave:0, accent:false, slide:false, rest:true  },
        { note:'G',  octave:0, accent:false, slide:true,  rest:false },
        { note:'F',  octave:0, accent:false, slide:false, rest:false },
        { note:'D#', octave:0, accent:true,  slide:false, rest:false },
        { note:'D#', octave:0, accent:false, slide:false, rest:true  },
        { note:'F',  octave:0, accent:false, slide:true,  rest:false },
        { note:'F',  octave:1, accent:false, slide:false, rest:false },
        { note:'G#', octave:0, accent:true,  slide:false, rest:false },
        { note:'G',  octave:0, accent:false, slide:true,  rest:false },
        { note:'F',  octave:0, accent:false, slide:false, rest:false },
        { note:'C',  octave:0, accent:false, slide:false, rest:true  },
        { note:'D#', octave:0, accent:false, slide:true,  rest:false },
        { note:'F',  octave:0, accent:true,  slide:false, rest:false },
      ]
    },
  ];

  global.TB303_PRESETS = TB303_PRESETS;

})(window);
