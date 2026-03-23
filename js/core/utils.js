/* ── Shared utilities ── */
(function(global) {
  'use strict';

  /** DOM element factory */
  function mk(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  /** Note name → MIDI number. oct 0 = C2 (midi 36), oct 1 = C3 (midi 48) */
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function noteToMidi(name, oct) {
    return (oct === 0 ? 36 : 48) + NOTES.indexOf(name);
  }

  global.mk         = mk;
  global.NOTES      = NOTES;
  global.noteToMidi = noteToMidi;

})(window);
