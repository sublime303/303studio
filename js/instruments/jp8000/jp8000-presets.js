const JP8000_PRESETS = [
  {
    name: 'Trance', bpm: 138,
    knobs: { cutoff: 0.72, reso: 0.25, detune: 0.45, attack: 0.02, release: 0.30 },
    chordType: 'min',
    steps: [
      {root:'A', octave:0, rest:false}, {root:'A', octave:0, rest:false},
      {root:'F', octave:0, rest:false}, {root:'F', octave:0, rest:false},
      {root:'C', octave:0, rest:false}, {root:'C', octave:0, rest:false},
      {root:'G', octave:0, rest:false}, {root:'G', octave:0, rest:false},
      {root:'A', octave:0, rest:false}, {root:'A', octave:0, rest:true },
      {root:'F', octave:0, rest:false}, {root:'F', octave:0, rest:true },
      {root:'E', octave:0, rest:false}, {root:'E', octave:0, rest:false},
      {root:'E', octave:0, rest:false}, {root:'E', octave:0, rest:true },
    ]
  },
  {
    name: 'Anthem', bpm: 130,
    knobs: { cutoff: 0.80, reso: 0.15, detune: 0.55, attack: 0.08, release: 0.50 },
    chordType: 'maj',
    steps: [
      {root:'C', octave:0, rest:false}, {root:'C', octave:0, rest:true },
      {root:'C', octave:0, rest:true }, {root:'C', octave:0, rest:true },
      {root:'G', octave:0, rest:false}, {root:'G', octave:0, rest:true },
      {root:'G', octave:0, rest:true }, {root:'G', octave:0, rest:true },
      {root:'A', octave:0, rest:false}, {root:'A', octave:0, rest:true },
      {root:'A', octave:0, rest:true }, {root:'A', octave:0, rest:true },
      {root:'F', octave:0, rest:false}, {root:'F', octave:0, rest:true },
      {root:'F', octave:0, rest:true }, {root:'F', octave:0, rest:true },
    ]
  },
  {
    name: 'Lead', bpm: 140,
    knobs: { cutoff: 0.60, reso: 0.45, detune: 0.20, attack: 0.005, release: 0.15 },
    chordType: 'unison',
    steps: [
      {root:'A', octave:1, rest:false}, {root:'A', octave:1, rest:true },
      {root:'G', octave:1, rest:false}, {root:'G', octave:1, rest:true },
      {root:'F', octave:1, rest:false}, {root:'F', octave:1, rest:false},
      {root:'E', octave:1, rest:false}, {root:'E', octave:1, rest:true },
      {root:'A', octave:1, rest:false}, {root:'A', octave:1, rest:true },
      {root:'G', octave:1, rest:false}, {root:'F', octave:1, rest:false},
      {root:'E', octave:1, rest:false}, {root:'E', octave:1, rest:false},
      {root:'D', octave:1, rest:false}, {root:'D', octave:1, rest:true },
    ]
  },
];
global.JP8000_PRESETS    = JP8000_PRESETS;
