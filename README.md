# makeloops.online

A browser-based music loop creator for learning rhythm, experimenting with melodies, and combining repeating layers.

Live site: [makeloops.online](https://makeloops.online)

## Features

- A 16-step drum and melodic sequencer with scales and randomization
- Ten synthesized drum sounds and six melodic presets (Piano, Synth, Pluck, FM, AM, Membrane)
- A vertical piano-style pitch sidebar in Grid → Melodic, with Scale and scrollable Full piano (88 keys, A0–C8) ranges
- Computer keyboard and on-screen performance pads
- One-bar event recording, layered playback, mute, solo, duplication, and volume
- One-bar silence extensions before or after layer content
- Local session saving and compressed share links
- Real-time audio download through an Export WAV button. The code names the file `.wav` without converting the recorder output to PCM WAV; the actual format depends on the browser recorder. MP3 export is not implemented.

## Documentation

- [Application guide](docs/application-guide.md): controls, workflows, saving, sharing, export, and current limitations.
- [Music guide](docs/music-guide.md): musical concepts, instruments, scales, keyboard maps, and a first beat exercise.
- [Architecture](docs/architecture.md): source layout, audio flow, timing, and persistence.
- [Feature implementation plan](docs/future-implementations.md): an ongoing roadmap for the visual piano, full piano range, longer patterns, and sustained melodic notes.
- [Agent instructions](AGENTS.md): English language policy and contribution guidance.

## Tech Stack

- Vue 3 + TypeScript + Vite
- Tone.js (Web Audio API)
- Pinia
- Tailwind CSS v4

## Development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Use a Node.js and npm installation compatible with the locked dependencies, including Vite 7. Open the URL printed by Vite and click or tap the application to enable audio.

The build checks TypeScript with `vue-tsc -b` and bundles the application with Vite. There is no configured test or lint script. See the music guide for complete keyboard mappings.

Sessions live in browser storage for the current site and browser profile. Unsaved edits are not automatically preserved. The application has no project backend or account system.
