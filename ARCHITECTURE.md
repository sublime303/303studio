# 303 Studio — Architecture

A multi-instrument web studio built with vanilla JS and the Web Audio API. No build tools, no bundler — runs directly from `file://` via IIFE + `window.*` globals (ES modules are blocked on `file://` by browser CORS policy).

## File layout

```
studio.html                     ← Shell: HTML skeleton + <link>/<script> tags only
index.html                      ← Standalone TB-303 emulator (independent)

css/
  studio.css                    ← Rack, header, card wrapper, shared knob styles
  tb303.css                     ← TB-303 card styles
  tr808.css                     ← TR-808 card styles

js/core/
  utils.js                      ← mk(), NOTES[], noteToMidi()
  knob.js                       ← Knob class (pointer + wheel, works on element refs)
  bus.js                        ← Bus singleton — shared AudioContext for all instruments
  studio.js                     ← Registry-driven Studio class + bootstrap

js/instruments/
  tb303/
    tb303-engine.js             ← TB-303 synthesis (VCO, VCF, VCA, slide, accent)
    tb303-seq.js                ← TB-303 16-step lookahead sequencer
    tb303-presets.js            ← TB303_PRESETS[]
    tb303.js                    ← TB303Instrument — plugin + self-registers
  tr808/
    tr808-engine.js             ← TR-808 drum synthesis (7 voices)
    tr808-seq.js                ← TR-808 16-step lookahead sequencer
    tr808-presets.js            ← TR808_PRESETS[]
    tr808.js                    ← TR808Instrument — plugin + self-registers
```

## Instrument plugin interface

Every instrument class must implement the following interface so the Studio can manage it generically:

```js
class MyInstrument {
  // Static descriptor — read by Studio to build the add-menu
  static get descriptor() {
    return {
      type:        'MY_TYPE',      // key in StudioInstruments registry
      label:       'My Instrument',
      badgeClass:  'badge-xxx',    // CSS class for the coloured badge
      badgeText:   'XXX',
      headerClass: 'xxx-header-bar',
    };
  }

  createDOM()           // returns a DOM element (the instrument body)
  play(playBtn)         // subscribe to Bus.clock, start clock if idle; add 'on' to playBtn
  stop(playBtn)         // unsubscribe from Bus.clock; remove 'on' from playBtn
  destroy()             // stop + release audio nodes
  getSongData()         // returns a plain object: { version, type, ...state }
  applySongData(d)      // restores state from getSongData() output
}
```

The instrument also self-registers at the bottom of its `.js` file:

```js
global.StudioInstruments        = global.StudioInstruments || {};
global.StudioInstruments.MY_TYPE = MyInstrument;
```

## Adding a new instrument

1. Create `css/<name>.css` for instrument-specific styles.
2. Create four files under `js/instruments/<name>/`:
   - `<name>-engine.js` — synthesis / audio logic
   - `<name>-seq.js` — sequencer (optional if not step-based)
   - `<name>-presets.js` — default patterns / presets
   - `<name>.js` — plugin class implementing the interface above
3. In `<name>.js`, self-register: `global.StudioInstruments.MY_TYPE = MyClass`.
4. In `studio.html`, add inside the marked slot:
   ```html
   <link rel="stylesheet" href="css/<name>.css">
   <script src="js/instruments/<name>/<name>-engine.js"></script>
   <script src="js/instruments/<name>/<name>-seq.js"></script>
   <script src="js/instruments/<name>/<name>-presets.js"></script>
   <script src="js/instruments/<name>/<name>.js"></script>
   ```
5. `studio.js` picks it up automatically — no other file needs to change.

## Multi-agent ownership

Each instrument lives in its own directory. Parallel agents can develop instruments simultaneously with zero file overlap:

| Agent | Owns |
|---|---|
| TB-303 agent | `css/tb303.css`, `js/instruments/tb303/*` |
| TR-808 agent | `css/tr808.css`, `js/instruments/tr808/*` |
| Core agent | `css/studio.css`, `js/core/*`, `studio.html` |
| New instrument agent | `css/<name>.css`, `js/instruments/<name>/*` |

The only shared touch-point is `studio.html` (add 5 lines to the marked slot) and the plugin interface contract above.

## TB-303 per-step knob automation

Each TB-303 step can store its own knob snapshot (`step.knobs`). This enables knob values to change automatically as the sequencer plays through the pattern.

**How it works:**
- When a knob is adjusted and released (`onInteractionEnd`), the current knob values are saved into the selected step via `_saveCurrentStepKnobs()`.
- When a note is assigned to a step, a snapshot is taken immediately.
- On each clock tick, if the incoming step has a `knobs` object, `_applyStepKnobs()` animates all knobs to the stored values over 80% of the step duration using `Knob.setValueAnimated()`.
- When navigating between steps manually, `_selectStep()` saves the leaving step's knobs and restores the arriving step's knobs (with a fixed 120 ms transition).
- Knob values are persisted in `getSongData()` / `applySongData()` as part of each step object.

**Step data shape (TB-303):**
```js
{
  note:   'A',    // note name
  octave: 0,      // 0 = lower, 1 = upper
  accent: false,
  slide:  false,
  rest:   false,
  knobs: {        // optional — present once a knob has been set for this step
    tune, cutoff, reso, envMod, decay, accent  // all 0–1 (tune: −7 to +7 semitones)
  }
}
```

## Audio architecture

- **`Bus`** — singleton `AudioContext` wrapper. All instruments call `Bus.init()` lazily on first play and connect their master gain node to `Bus.gain`. Keeps all instruments on one context for sync.
- **`Bus.clock`** — master clock (one `setTimeout` loop). Instruments call `Bus.clock.subscribe(fn)` and receive `fn(stepIndex, audioTime)` on every step. Because there is only **one** source of `nextT`, inter-instrument sync is structurally guaranteed — no drift, no phase offset, even for instruments added while playing. Unsubscribing automatically halts the clock when the last subscriber leaves.
- **Master BPM** — `Bus.clock.bpm` is the single tempo source. The studio header BPM display reads and writes it. Instrument presets call `_adjBPM()` which writes to `Bus.clock.bpm` and updates the header display.
- **Lookahead scheduler** — Chris Wilson pattern: 25 ms polling interval, 120 ms lookahead window using `AudioContext.currentTime`. Visual step callbacks are fired via a `setTimeout` offset matching the scheduled audio time.
- **IIFE + `window.*` globals** — chosen over ES modules because `import/export` is blocked on `file://` URLs. Each file exposes its export via `global.SomeName = ...` inside `(function(global){...})(window)`.
- **Multi-instance safety** — Knob constructors accept element references, not IDs. All DOM queries inside `createDOM()` are scoped to the local `root` element, so any number of the same instrument can coexist.
