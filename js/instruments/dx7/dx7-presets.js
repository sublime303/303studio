(function(global) {
  'use strict';

  const DX7_PRESETS = [
    {
      name: 'E.Piano',
      bpm: 100,
      algorithm: 'E.Piano',
      knobs: { modIndex: 0.50, attack: 0.01, decay: 0.60, sustain: 0.25, release: 0.50 },
      steps: [
        {note:'C', octave:1, rest:false}, {note:'E', octave:1, rest:false},
        {note:'G', octave:1, rest:false}, {note:'C', octave:1, rest:true },
        {note:'F', octave:1, rest:false}, {note:'A', octave:1, rest:false},
        {note:'C', octave:1, rest:false}, {note:'F', octave:1, rest:true },
        {note:'G', octave:0, rest:false}, {note:'B', octave:0, rest:false},
        {note:'D', octave:1, rest:false}, {note:'G', octave:0, rest:true },
        {note:'E', octave:0, rest:false}, {note:'G', octave:0, rest:false},
        {note:'B', octave:0, rest:false}, {note:'E', octave:0, rest:true },
      ]
    },
    {
      name: 'Bells',
      bpm: 90,
      algorithm: 'Bells',
      knobs: { modIndex: 0.65, attack: 0.005, decay: 1.20, sustain: 0.05, release: 0.80 },
      steps: [
        {note:'C', octave:1, rest:false}, {note:'C', octave:1, rest:true },
        {note:'C', octave:1, rest:true }, {note:'E', octave:1, rest:false},
        {note:'E', octave:1, rest:true }, {note:'E', octave:1, rest:true },
        {note:'G', octave:1, rest:false}, {note:'G', octave:1, rest:true },
        {note:'A', octave:1, rest:false}, {note:'A', octave:1, rest:true },
        {note:'A', octave:1, rest:true }, {note:'G', octave:1, rest:false},
        {note:'G', octave:1, rest:true }, {note:'E', octave:1, rest:false},
        {note:'C', octave:1, rest:false}, {note:'C', octave:1, rest:true },
      ]
    },
    {
      name: 'Brass',
      bpm: 120,
      algorithm: 'Brass',
      knobs: { modIndex: 0.40, attack: 0.04, decay: 0.20, sustain: 0.70, release: 0.15 },
      steps: [
        {note:'G', octave:0, rest:false}, {note:'G', octave:0, rest:true },
        {note:'A', octave:0, rest:false}, {note:'A', octave:0, rest:true },
        {note:'A#',octave:0, rest:false}, {note:'A#',octave:0, rest:false},
        {note:'C', octave:1, rest:false}, {note:'C', octave:1, rest:true },
        {note:'C', octave:1, rest:false}, {note:'C', octave:1, rest:true },
        {note:'A#',octave:0, rest:false}, {note:'A#',octave:0, rest:true },
        {note:'G', octave:0, rest:false}, {note:'G', octave:0, rest:false},
        {note:'F', octave:0, rest:false}, {note:'F', octave:0, rest:true },
      ]
    },
  ];

  global.DX7_PRESETS = DX7_PRESETS;

})(window);
