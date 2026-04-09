(function(global) {
  'use strict';

  const OBXA_PRESETS = [
    {
      name: 'Brass Stab', bpm: 128,
      knobs: {
        osc1Wave: 'sawtooth', osc2Wave: 'sawtooth',
        detune: 12, cutoff: 0.6, reso: 0.3,
        attack: 0.03, decay: 0.3, sustain: 0.5, release: 0.25,
      },
      steps: [
        { root: 'C',  octave: 1, type: 'maj', rest: false },
        { root: 'C',  octave: 1, type: 'maj', rest: true  },
        { root: 'C',  octave: 1, type: 'maj', rest: true  },
        { root: 'G',  octave: 1, type: 'maj', rest: false },
        { root: 'G',  octave: 1, type: 'maj', rest: true  },
        { root: 'G',  octave: 1, type: 'maj', rest: true  },
        { root: 'A',  octave: 1, type: 'min', rest: false },
        { root: 'A',  octave: 1, type: 'min', rest: true  },
        { root: 'A',  octave: 1, type: 'min', rest: true  },
        { root: 'F',  octave: 1, type: 'maj', rest: false },
        { root: 'F',  octave: 1, type: 'maj', rest: true  },
        { root: 'F',  octave: 1, type: 'maj', rest: true  },
        { root: 'E',  octave: 1, type: 'min', rest: false },
        { root: 'E',  octave: 1, type: 'min', rest: true  },
        { root: 'C',  octave: 1, type: 'maj', rest: false },
        { root: 'C',  octave: 1, type: 'maj', rest: true  },
      ]
    },
    {
      name: 'Lush Pad', bpm: 80,
      knobs: {
        osc1Wave: 'sawtooth', osc2Wave: 'sawtooth',
        detune: 8, cutoff: 0.45, reso: 0.15,
        attack: 0.4, decay: 0.8, sustain: 0.7, release: 0.9,
      },
      steps: [
        { root: 'D',  octave: 1, type: 'maj7', rest: false },
        { root: 'D',  octave: 1, type: 'maj7', rest: true  },
        { root: 'D',  octave: 1, type: 'maj7', rest: true  },
        { root: 'D',  octave: 1, type: 'maj7', rest: true  },
        { root: 'B',  octave: 1, type: 'm7',   rest: false },
        { root: 'B',  octave: 1, type: 'm7',   rest: true  },
        { root: 'B',  octave: 1, type: 'm7',   rest: true  },
        { root: 'B',  octave: 1, type: 'm7',   rest: true  },
        { root: 'G',  octave: 1, type: 'maj7', rest: false },
        { root: 'G',  octave: 1, type: 'maj7', rest: true  },
        { root: 'G',  octave: 1, type: 'maj7', rest: true  },
        { root: 'G',  octave: 1, type: 'maj7', rest: true  },
        { root: 'A',  octave: 1, type: 'm7',   rest: false },
        { root: 'A',  octave: 1, type: 'm7',   rest: true  },
        { root: 'A',  octave: 1, type: 'm7',   rest: true  },
        { root: 'A',  octave: 1, type: 'm7',   rest: true  },
      ]
    },
    {
      name: 'Pulse Chord', bpm: 120,
      knobs: {
        osc1Wave: 'square', osc2Wave: 'sawtooth',
        detune: 5, cutoff: 0.5, reso: 0.25,
        attack: 0.01, decay: 0.4, sustain: 0.4, release: 0.3,
      },
      steps: [
        { root: 'A',  octave: 1, type: 'min', rest: false },
        { root: 'A',  octave: 1, type: 'min', rest: true  },
        { root: 'A',  octave: 1, type: 'min', rest: false },
        { root: 'A',  octave: 1, type: 'min', rest: true  },
        { root: 'F',  octave: 1, type: 'maj', rest: false },
        { root: 'F',  octave: 1, type: 'maj', rest: false },
        { root: 'F',  octave: 1, type: 'maj', rest: true  },
        { root: 'F',  octave: 1, type: 'maj', rest: true  },
        { root: 'C',  octave: 1, type: 'maj', rest: false },
        { root: 'C',  octave: 1, type: 'maj', rest: true  },
        { root: 'C',  octave: 1, type: 'maj', rest: false },
        { root: 'G',  octave: 1, type: 'maj', rest: false },
        { root: 'G',  octave: 1, type: 'maj', rest: true  },
        { root: 'E',  octave: 1, type: 'min', rest: false },
        { root: 'E',  octave: 1, type: 'min', rest: false },
        { root: 'E',  octave: 1, type: 'min', rest: true  },
      ]
    },
  ];

  global.OBXA_PRESETS = OBXA_PRESETS;

})(window);
