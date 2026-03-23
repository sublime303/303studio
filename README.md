# 303 Studio

A multi-instrument web studio with Roland-style TB-303 bass synthesizer and TR-808 drum machine emulations. Built with vanilla JavaScript and the Web Audio API — no build tools, no bundler. Runs directly in the browser.

<p align="center">
  <img src="docs/images/303studio-main.png" alt="303 Studio main view" width="900">
</p>

## Features

- **TB-303 Bass Line** — 16-step sequencer, saw/square waveforms, accent & slide, per-step knob automation (cutoff, resonance, decay, etc.)
- **TR-808 Rhythm Composer** — 7 drum voices with independent patterns, per-voice level and tune knobs
- **Multi-instrument rack** — Add multiple TB-303s and TR-808s, all synced to a master clock
- **Zero dependencies** — Pure HTML, CSS, and JS; works from `file://` or any static host
- **Export & import** — Save patterns as JSON

<p align="center">
  <img src="docs/images/303studio-tb303.png" alt="TB-303 synthesizer interface" width="700">
</p>

## Quick Start

1. Clone the repo:
   ```bash
   git clone https://github.com/sublime303/303studio.git
   cd 303studio
   ```

2. Open in a browser:
   - **Studio** (multi-instrument): open `studio.html`
   - **Standalone TB-303**: open `index.html`

No server required. For best results, use a modern browser (Chrome, Firefox, Safari, Edge). User interaction may be required to start the audio context.

## Project Structure

```
303studio/
├── studio.html          # Multi-instrument studio
├── index.html           # Standalone TB-303 emulator
├── css/
│   ├── studio.css       # Rack, header, shared styles
│   ├── tb303.css        # TB-303 card styles
│   └── tr808.css        # TR-808 card styles
├── js/core/             # Bus, Knob, Studio bootstrap
└── js/instruments/      # TB-303 and TR-808 engines & sequencers
```

For architecture details, plugin interface, and how to add new instruments, see [ARCHITECTURE.md](ARCHITECTURE.md).

## License

MIT
