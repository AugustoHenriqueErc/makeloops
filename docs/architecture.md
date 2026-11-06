# Architecture

## Stack and entry points

This is a client-side Vue 3 and TypeScript application. Vite builds and serves it, Pinia holds state, Tone.js provides audio synthesis and scheduling, and Tailwind CSS v4 supplies styling. Radix Vue supports UI primitives; `lz-string` compresses shared projects.

`src/main.ts` mounts the app and installs Pinia. `src/App.vue` assembles the workspace, initializes audio on interaction, routes performance input, and restores sessions or share snapshots. There is no project backend.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/audio/AudioEngine.ts` | Singleton audio initialization, master gain, recorder, transport, and tick/second conversions. |
| `src/audio/instruments/InstrumentFactory.ts` | Cached drum kit and one melodic instance per preset; release/panic cleanup. |
| `src/audio/instruments/DrumKit.ts` | Ten synthesized percussion sounds. |
| `src/audio/instruments/SynthInstrument.ts` | Six melodic presets, each allowing 16 voices. |
| `src/audio/looper/LoopRecorder.ts` | Event capture, drum/melody separation, time normalization, and one-bar sessions. |
| `src/audio/looper/LoopPlayer.ts` | Independently repeating `Tone.Part` layers, crop filtering, and velocity scaling. |
| `src/audio/looper/LoopQuantizer.ts` | Quantization helpers, not integrated into the current recording flow. |
| `src/stores/audioStore.ts` | BPM, initialization, transport UI state, and position. |
| `src/stores/instrumentStore.ts` | Keyboard preset and base octave. |
| `src/stores/gridStore.ts` | Cells, retained patterns, preview, event conversion, sharing, and grid import. |
| `src/stores/looperStore.ts` | Layer lifecycle, recording coordination, padding, mute, solo, and scheduling. |
| `src/stores/sessionStore.ts` | Browser session snapshots and active session identity. |
| `src/composables/useKeyboard.ts` | Global computer keyboard mappings and pressed-key state. |
| `src/components/GridSequencer.vue` | Sequencer layout and visual piano-style pitch labels in Melodic mode. |
| `src/composables/useAudioContext.ts` | Vue-facing audio initialization. |
| `src/composables/usePlaybackCursor.ts` | Layer cursor positioning. |
| `src/composables/useShareableLink.ts` | Share compression, parsing, and clipboard access. |
| `src/utils/scales.ts` | Root names, scale intervals, and grid pitches. |
| `src/types/index.ts` | Event, layer, instrument, scale, and grid types. |
| `src/components/` | Pads, grid, transport, recording, looper, and session controls. |
| `src/components/ui/` | Shared UI primitives. |

## Audio and event flow

```text
Keyboard / on-screen pads -> InstrumentFactory -> drum kit or melodic synth
           |
           +-> while recording -> LoopRecorder -> looperStore.layers

Grid cells -> preview / Tone.Sequence -> InstrumentFactory
     +-> Add to Looper -> note events -> looperStore.layers

looperStore.layers -> LoopPlayer / Tone.Part -> InstrumentFactory

Instrument audio -> master gain (initially 0.8) -> audio destination
                              +---------------> Tone.Recorder
```

Performance recording stores events. Export captures master audio in real time. Layers do not contain audio buffers or independent mixer channels.

### Melodic grid piano sidebar

`GridSequencer.vue` styles the existing melodic row labels as piano keys. `rowNotes` determines whether a row is a natural or sharp pitch. When two neighboring natural rows are two semitones apart, a decorative black key is drawn across their boundary. The decoration has no input handler and does not add a row, event, or pitch to the selected scale.

The sidebar and step-number spacer share the same width, keeping cells aligned. Drum labels retain their original styling. The full-piano viewport uses fixed 32 px rows, a sticky step header, and a scroll container capped at 480 px or 60vh. A watcher centers C4 when entering the full range; octave jumps change only viewport scroll position. The sidebar has no note-triggering handlers.

`PIANO_NOTES` in `src/utils/scales.ts` is an immutable descending list generated from MIDI indices 108 (C8) through 21 (A0). `gridStore.melodicRange` selects `scale` or `piano`, and one computed melodic pitch list drives labels, auditions, preview, and event conversion. The audio engine and Keyboard mode's original melodic pad are unchanged.

## Timing

Events, durations, crop bounds, and padding use transport-relative ticks. Tone.js converts them to seconds for scheduling and display. `16n` means a sixteenth note; `1m` means a measure. The interface assumes 4/4.

Grid conversion creates one bar from 16 steps. Melodic cells create note-ons with note-offs one tick before the next step. Drum cells create note-ons only.

RecordControls schedules an automatic stop after one bar. LoopRecorder also forces returned session length to one bar regardless of stop time. Events are normalized relative to recording start without quantization. A held-note map exists, but starting recording does not inject previously held notes.

Each layer repeats with its own `Tone.Part` duration, `cropEnd - cropStart`. Global transport looping is disabled by LoopPlayer. Timeline duration is the longest effective layer duration, rather than a shared repeat boundary.

Scheduling converts ticks and loop lengths to seconds. The BPM input updates the transport without explicitly rescheduling layers. Verify playback and export timing after tempo changes before relying on alignment.

## Data models

`MidiEvent` is an internal MIDI-like structure, not a MIDI file or device connection:

| Field | Meaning |
| --- | --- |
| `type` | `noteOn` or `noteOff`. |
| `note` | A pitch such as `C4` or drum name such as `kick`. |
| `velocity` | Intensity, normally 0–1; note-offs use 0. |
| `time` | Tick position relative to the stored layer origin. |

`LoopLayer` wraps events with playback metadata:

| Fields | Meaning |
| --- | --- |
| `id`, `name` | Identity and display label; generated IDs use `layer-N` or `grid-N`. |
| `events` | Captured or generated note events. |
| `instrumentId` | Drum kit or melodic preset identifier. |
| `duration` | Stored total duration in ticks. |
| `cropStart`, `cropEnd` | Playback boundaries; event filtering excludes the end. |
| `startPadding`, `endPadding` | Added silence that minus controls may remove. |
| `volume` | dB value converted to velocity multiplier `10 ** (volume / 20)`, then clamped. |
| `muted`, `solo` | Playback flags. |

LoopPlayer filters events to the crop range and shifts their times to zero. Melodic notes started inside that range without a release get note-offs one tick before loop end. Notes started before the crop boundary are not reconstructed.

Start extension shifts events and increases duration, crop end, and start padding. Start shrinking advances crop start and consumes padding. End extension/shrinking changes the end boundary and end padding. UI operations use one-bar increments.

A `GridPattern` is a row-major array of `{ active, velocity }` cells. Drum rows map to ten sound names; melodic rows come from a scale or the full 88-key pitch list in descending pitch order. A separate drum pattern, melodic patterns keyed by scale, and one full-piano pattern are retained. Shared save/restore helpers isolate them during mode, scale, and range changes. Root and octave reinterpret Scale-range rows rather than creating independent patterns. They do not alter the fixed full-piano pitches. Melodic layer-to-grid conversion uses Full piano to retain all note starts within A0–C8; the existing one-bar step snapping and fixed note duration still apply.

## Persistence and restoration

`SavedSession` contains `id`, `name`, `savedAt`, `bpm`, `layers`, and nullable `grid`. Snapshots are deep-cloned through JSON serialization. Sessions use the `makeloops_sessions` localStorage key; current identity uses `makeloops_current_session`.

Share version 2 contains `{ v, bpm, layers, grid? }`; version-1 links are still accepted. The shared `GridState` type includes the visible and retained patterns, mode, root, scale, octave, and melodic preset, plus optional `melodicRange` and `pianoPattern` fields. Missing range metadata defaults to Scale and an empty 88-row piano pattern, preventing state from another project from leaking into old sessions. New save/share snapshots always include both fields. It omits preview state, randomization density, and Keyboard preset/octave. `lz-string` encodes JSON into the `#s=` fragment. Unknown versions warn rather than reject; parsed data uses a TypeScript assertion rather than schema validation.

On startup, share data takes precedence over a remembered local session. Local session restoration may defer scheduling until audio initialization. Shared restoration attempts audio initialization during mount, which browser audio policies may restrict.

`hasUnsavedChanges` always returns true; it does not compare snapshots. Storage failures are logged, but save still returns a session object, allowing the UI to show success after a persistence error.

## Development checks

See the [README](../README.md) for commands. Vite maps `@` to `src`; `VITE_BASE` overrides the default `/` base. Deployment configuration lives in `.github/workflows/deploy.yml`.

For documentation changes, check descriptions against source and verify links. For code changes, run `npm run build`; no test or lint script is configured. For audio changes, verify the affected browser flow, including note release, recording duration, layer alignment, and actual exported file format when relevant. Build success alone cannot validate sound or browser recorder behavior.

See the [application guide](application-guide.md) for user-visible limitations and the [feature implementation plan](future-implementations.md) for proposed changes. Keep planned architecture and implemented behavior clearly distinguished.
