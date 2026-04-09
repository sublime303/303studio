/* ── TB-303 (Tie) Presets ──
   Dedicated patterns that benefit from real per-step tie/hold.
   ─────────────────────────────────────────────────────────────────────────────── */
(function(global) {
  'use strict';

  const TB303_TIE_PRESETS = [
    {
      name: 'Da Funk (Tie)',
      artist: 'Daft Punk',
      bpm: 100,
      knobs: { cutoff: 0.22, reso: 0.80, drive: 0.70, envMod: 0.62, decay: 0.38, accent: 0.80, tune: 0 },
      // Based on Acidvoice "Pattern 03" grid (notes + accent + slide).
      steps: [
        //  1  G
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
        //  2  A#
        { note:'A#', octave:0, accent:false, slide:true,  tie:false, rest:false },
        //  3  G
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
        //  4  F (accent + slide)
        { note:'F',  octave:0, accent:true,  slide:true,  tie:false, rest:false },
        //  5  D# (accent)
        { note:'D#', octave:0, accent:true,  slide:false, tie:false, rest:false },
        //  6  C' (accent + slide)
        { note:'C',  octave:1, accent:true,  slide:true,  tie:false, rest:false },
        //  7  C (accent)
        { note:'C',  octave:0, accent:true,  slide:false, tie:false, rest:false },
        //  8  C' (slide)
        { note:'C',  octave:1, accent:false, slide:true,  tie:false, rest:false },
        //  9  D#
        { note:'D#', octave:0, accent:false, slide:false, tie:false, rest:false },
        // 10  D# (slide)
        { note:'D#', octave:0, accent:false, slide:true,  tie:false, rest:false },
        // 11  F (accent + slide)
        { note:'F',  octave:0, accent:true,  slide:true,  tie:false, rest:false },
        // 12  G
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
        // 13  A# (slide)
        { note:'A#', octave:0, accent:false, slide:true,  tie:false, rest:false },
        // 14  G (slide)
        { note:'G',  octave:0, accent:false, slide:true,  tie:false, rest:false },
        // 15  C (slide)
        { note:'C',  octave:0, accent:false, slide:true,  tie:false, rest:false },
        // 16  G
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
      ],
    }
    ,
    {
      name: 'Pattern 03',
      artist: 'Acidvoice',
      bpm: 100,
      knobs: { cutoff: 0.22, reso: 0.80, drive: 0.70, envMod: 0.62, decay: 0.38, accent: 0.80, tune: 0 },
      steps: [
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
        { note:'A#', octave:0, accent:false, slide:true,  tie:false, rest:false },
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
        { note:'F',  octave:0, accent:true,  slide:true,  tie:false, rest:false },
        { note:'D#', octave:0, accent:true,  slide:false, tie:false, rest:false },
        { note:'C',  octave:1, accent:true,  slide:true,  tie:false, rest:false },
        { note:'C',  octave:0, accent:true,  slide:false, tie:false, rest:false },
        { note:'C',  octave:1, accent:false, slide:true,  tie:false, rest:false },
        { note:'D#', octave:0, accent:false, slide:false, tie:false, rest:false },
        { note:'D#', octave:0, accent:false, slide:true,  tie:false, rest:false },
        { note:'F',  octave:0, accent:true,  slide:true,  tie:false, rest:false },
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
        { note:'A#', octave:0, accent:false, slide:true,  tie:false, rest:false },
        { note:'G',  octave:0, accent:false, slide:true,  tie:false, rest:false },
        { note:'C',  octave:0, accent:false, slide:true,  tie:false, rest:false },
        { note:'G',  octave:0, accent:false, slide:false, tie:false, rest:false },
      ],
    }
  ];

  global.TB303_TIE_PRESETS = TB303_TIE_PRESETS;

})(window);

