(function(global) {
  'use strict';

  const JUNO106_PRESETS = [
    {
      name: 'Am Pad', bpm: 120,
      knobs: { cutoff: 0.55, reso: 0.15, attack: 0.08, release: 0.60 },
      steps: [
        { root:'A', octave:0, type:'min',  rest:false },
        { root:'A', octave:0, type:'min',  rest:true  },
        { root:'A', octave:0, type:'min',  rest:true  },
        { root:'A', octave:0, type:'min',  rest:true  },
        { root:'F', octave:0, type:'maj',  rest:false },
        { root:'F', octave:0, type:'maj',  rest:true  },
        { root:'F', octave:0, type:'maj',  rest:true  },
        { root:'F', octave:0, type:'maj',  rest:true  },
        { root:'C', octave:0, type:'maj',  rest:false },
        { root:'C', octave:0, type:'maj',  rest:true  },
        { root:'C', octave:0, type:'maj',  rest:true  },
        { root:'C', octave:0, type:'maj',  rest:true  },
        { root:'E', octave:0, type:'min',  rest:false },
        { root:'E', octave:0, type:'min',  rest:true  },
        { root:'E', octave:0, type:'min',  rest:true  },
        { root:'E', octave:0, type:'min',  rest:true  },
      ]
    },
    {
      name: 'Trance', bpm: 140,
      knobs: { cutoff: 0.65, reso: 0.35, attack: 0.01, release: 0.20 },
      steps: [
        { root:'A', octave:0, type:'min',  rest:false },
        { root:'A', octave:0, type:'min',  rest:false },
        { root:'F', octave:0, type:'maj',  rest:false },
        { root:'F', octave:0, type:'maj',  rest:false },
        { root:'C', octave:0, type:'maj',  rest:false },
        { root:'C', octave:0, type:'maj',  rest:false },
        { root:'G', octave:0, type:'maj',  rest:false },
        { root:'G', octave:0, type:'maj',  rest:false },
        { root:'A', octave:0, type:'min',  rest:false },
        { root:'A', octave:0, type:'min',  rest:true  },
        { root:'F', octave:0, type:'maj',  rest:false },
        { root:'F', octave:0, type:'maj',  rest:true  },
        { root:'E', octave:0, type:'min',  rest:false },
        { root:'E', octave:0, type:'min',  rest:false },
        { root:'E', octave:0, type:'m7',   rest:false },
        { root:'E', octave:0, type:'m7',   rest:true  },
      ]
    },
    {
      name: 'House Stab', bpm: 128,
      knobs: { cutoff: 0.70, reso: 0.45, attack: 0.005, release: 0.10 },
      steps: [
        { root:'C', octave:0, type:'min',  rest:false },
        { root:'C', octave:0, type:'min',  rest:true  },
        { root:'C', octave:0, type:'min',  rest:true  },
        { root:'A#',octave:0, type:'maj',  rest:false },
        { root:'A#',octave:0, type:'maj',  rest:true  },
        { root:'A#',octave:0, type:'maj',  rest:false },
        { root:'A#',octave:0, type:'maj',  rest:true  },
        { root:'A#',octave:0, type:'maj',  rest:true  },
        { root:'G', octave:0, type:'min',  rest:false },
        { root:'G', octave:0, type:'min',  rest:true  },
        { root:'G', octave:0, type:'min',  rest:false },
        { root:'G', octave:0, type:'min',  rest:true  },
        { root:'A#',octave:0, type:'maj',  rest:false },
        { root:'A#',octave:0, type:'maj',  rest:true  },
        { root:'C', octave:0, type:'min',  rest:false },
        { root:'C', octave:0, type:'min',  rest:true  },
      ]
    },
  ];

  global.JUNO106_PRESETS = JUNO106_PRESETS;

})(window);
