(function(global) {
  'use strict';

  const MINIMOOG_PRESETS = [
    {
      name: 'Lead',
      bpm: 120,
      waveform: 'sawtooth',
      knobs: { cutoff: 0.55, reso: 0.35, envMod: 0.60, attack: 0.01, decay: 0.20, sustain: 0.50, release: 0.15 },
      steps: [
        { note:'C',  octave:1, rest:false },
        { note:'C',  octave:1, rest:true  },
        { note:'D#', octave:1, rest:false },
        { note:'D#', octave:1, rest:true  },
        { note:'G',  octave:1, rest:false },
        { note:'G',  octave:1, rest:false },
        { note:'A#', octave:1, rest:true  },
        { note:'A#', octave:1, rest:false },
        { note:'C',  octave:1, rest:false },
        { note:'C',  octave:1, rest:true  },
        { note:'A#', octave:0, rest:false },
        { note:'G',  octave:0, rest:false },
        { note:'F',  octave:0, rest:false },
        { note:'F',  octave:0, rest:true  },
        { note:'G',  octave:0, rest:false },
        { note:'G',  octave:0, rest:true  },
      ]
    },
    {
      name: 'Bass',
      bpm: 110,
      waveform: 'sawtooth',
      knobs: { cutoff: 0.30, reso: 0.55, envMod: 0.70, attack: 0.005, decay: 0.30, sustain: 0.20, release: 0.10 },
      steps: [
        { note:'E',  octave:0, rest:false },
        { note:'E',  octave:0, rest:true  },
        { note:'E',  octave:0, rest:false },
        { note:'G',  octave:0, rest:false },
        { note:'A',  octave:0, rest:false },
        { note:'A',  octave:0, rest:true  },
        { note:'G',  octave:0, rest:false },
        { note:'G',  octave:0, rest:true  },
        { note:'E',  octave:0, rest:false },
        { note:'E',  octave:0, rest:false },
        { note:'D',  octave:0, rest:false },
        { note:'D',  octave:0, rest:true  },
        { note:'C',  octave:0, rest:false },
        { note:'D',  octave:0, rest:false },
        { note:'E',  octave:0, rest:false },
        { note:'E',  octave:0, rest:true  },
      ]
    },
    {
      name: 'Funk',
      bpm: 105,
      waveform: 'square',
      knobs: { cutoff: 0.40, reso: 0.65, envMod: 0.80, attack: 0.005, decay: 0.15, sustain: 0.10, release: 0.08 },
      steps: [
        { note:'A',  octave:0, rest:false },
        { note:'A',  octave:0, rest:true  },
        { note:'A',  octave:0, rest:false },
        { note:'A',  octave:0, rest:true  },
        { note:'C',  octave:1, rest:false },
        { note:'C',  octave:1, rest:true  },
        { note:'A',  octave:0, rest:false },
        { note:'G',  octave:0, rest:false },
        { note:'A',  octave:0, rest:false },
        { note:'A',  octave:0, rest:true  },
        { note:'G',  octave:0, rest:false },
        { note:'G',  octave:0, rest:true  },
        { note:'F',  octave:0, rest:false },
        { note:'G',  octave:0, rest:false },
        { note:'A',  octave:0, rest:false },
        { note:'A',  octave:0, rest:true  },
      ]
    },
  ];

  global.MINIMOOG_PRESETS = MINIMOOG_PRESETS;

})(window);
