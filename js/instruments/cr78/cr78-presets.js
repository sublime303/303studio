/* ── CR-78 Presets ──
   Owner: CR-78 agent — safe to add/edit patterns here
   ───────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  // Helper: convert 0/1 array to boolean array
  const b = arr => arr.map(Boolean);

  const CR78_PRESETS = [
    {
      name: 'Disco',
      bpm:  120,
      patterns: {
        // 4-on-the-floor bass drum
        BD: b([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
        // Snare on beats 2 and 4 (steps 4 and 12)
        SD: b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
        // Steady closed hi-hat on all 16th notes
        CH: b([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
        // Open hi-hat on offbeats
        OH: b([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]),
        // Cymbal crash accent at top of loop
        CY: b([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
        // Conga fill — syncopated
        CG: b([0,0,0,1, 0,0,1,0, 0,0,0,1, 0,1,0,0]),
        // Cowbell accent — on 2 and 4
        CB: b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
        // Maracas driving eighth notes
        MA: b([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
      }
    },
    {
      name: 'Bossa Nova',
      bpm:  110,
      patterns: {
        // Sparse BD — Latin feel
        BD: b([1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0]),
        // Syncopated snare
        SD: b([0,0,0,1, 0,0,0,0, 0,1,0,0, 0,0,1,0]),
        // CH on light offbeats
        CH: b([0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1]),
        // OH sparse accent
        OH: b([0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0]),
        // No cymbal in bossa — leave silent
        CY: b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
        // Conga — classic bossa pattern
        CG: b([1,0,1,0, 0,1,0,1, 1,0,1,0, 0,0,1,0]),
        // Cowbell accent every bar
        CB: b([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
        // Maracas on every 16th — characteristic of bossa
        MA: b([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
      }
    },
    {
      name: 'Rock',
      bpm:  125,
      patterns: {
        // Driving rock BD
        BD: b([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0]),
        // Snare on 2 and 4 — solid backbeat
        SD: b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
        // CH on eighth notes
        CH: b([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
        // OH on offbeats
        OH: b([0,1,0,0, 0,1,0,0, 0,1,0,0, 0,1,0,0]),
        // Cymbal crash at bar start
        CY: b([1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
        // Conga fill at end of pattern
        CG: b([0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,1,0]),
        // Cowbell eighth-note accent — classic rock cowbell
        CB: b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]),
        // Maracas sparse
        MA: b([1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,0,0]),
      }
    },
  ];

  global.CR78_PRESETS = CR78_PRESETS;

})(window);
