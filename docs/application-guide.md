# Application guide

This guide describes the behavior implemented in this repository. Read the [music guide](music-guide.md) for musical concepts and a first exercise, or [architecture](architecture.md) for implementation details.

## Workspace and tempo

The application opens in **Grid** mode. Switch to **Keyboard** for live performance with drum and melodic pads. Both workflows can create repeating layers in the **Looper**.

BPM sets the tempo, initially 120, with an input range of 40–300. The application assumes four beats per bar (4/4). Position uses bars:beats:sixteenths, starting at `0:0:0`. Grid-only preview starts the audio transport without marking the audio store as playing, so this display may not update during that preview.

Click or tap the application to enable audio. Browser audio policies may require another interaction after opening a shared project or resuming the browser.

## Grid sequencer

Each column is one sixteenth note. The 16 columns form one bar. Rows represent drum sounds or pitches. Click a cell to toggle it; enabling a cell also auditions its sound. Multiple cells in the same column play together.

In Grid → Melodic, the left pitch labels are styled as a vertical piano with white natural keys and dark sharp keys. Higher pitches remain at the top. In Scale range, decorative black keys appear between adjacent natural rows separated by a sharp; they do not add notes outside the selected scale. Full piano range instead provides an editable row for each of the 88 chromatic pitches from A0 to C8. The sidebar is visual only: use the grid cells to place and audition notes. Keyboard mode retains its original performance pads.

| Control | Function |
| --- | --- |
| Drums / Melodic | Switch the pattern being edited, retaining patterns when switching. |
| Range | Choose Scale (the original scale-filtered view) or Full piano (88 keys, A0–C8). Each range keeps a separate pattern. |
| Root | In Scale range, set the melodic scale's starting pitch. Existing cells keep their row positions and map to the new pitches. |
| Scale | In Scale range, select available melodic pitches. Each scale retains a separate pattern. |
| Octave | In Scale range, set the melodic grid register from 2 to 6. |
| Synth | Choose the melodic preset independently of Keyboard mode. |
| Randomization slider | Set each cell's activation probability from 10% to 80%, initially 30%. |
| Shuffle icon | Replace the current pattern with random cells and velocities between 0.6 and 1.0. |
| Preview | Repeat grid patterns while temporarily muting looper layers. |
| With Loops | Preview alongside existing layers; appears when layers exist. |
| Clear | Erase the pattern currently being edited. |
| Add to Looper | Copy the visible mode's pattern into a new one-bar layer. |

Preview plays both the drum pattern and the melodic pattern for the selected range (and selected scale in Scale range), including the other mode's retained pattern. Add to Looper copies only the visible mode. Add drums and melody separately to transfer both.

### Full piano navigation

In Grid → Melodic, set Range to **Full piano (88 keys)**. The view starts around **C4 (middle C)**. Scroll inside the grid, use **Go to** to jump to an octave or an endpoint, or click **Middle C** to return. The step-number header stays visible, and every row displays its octave, for example C3 or C4. Keyboard users can focus the scroll region and use the browser's scrolling keys.

The piano keeps readable 32 px rows in a bounded viewport rather than squeezing 88 pitches onto the page. Use the grid cells to audition and sequence any pitch, including A0 and C8. Root, Scale, and Octave controls are shown only in Scale range; switching those settings does not transpose the fixed full-piano pitches.

Scale and Full piano have separate patterns, retained when switching ranges or switching to Drums. Clear and Randomization act on the visible pattern only. Preview uses the selected melodic range even while Drums is visible. Returning to Scale restores its previous root, scale, octave, and pattern.

This feature increases pitch choices, not loop length: there are still 16 steps at the same BPM. The six existing synthesized presets and their 16-voice limit remain unchanged; playing or randomizing more simultaneous pitches can exceed that limit. A larger range is not a new sampled piano sound library.

New cells have velocity 0.8. The model stores individual cell velocities, but the UI does not expose manual velocity editing. Melodic cells have a fixed duration of approximately one sixteenth note. The UI has no adjustable step count, note-length editor, ties, or swing.

## Keyboard performance and recording

Use the on-screen pads or the [keyboard mappings](music-guide.md#computer-keyboard-mappings). Holding a melodic key sustains it according to the preset envelope; releasing sends note-off. Drums use their own triggered envelopes.

The melodic preset defaults to Piano at base octave 4. Keyboard base octave supports 1–7, independently of the grid setting. Keys assigned to the next octave can play above the selected base octave.

1. Select Keyboard mode and choose a melodic preset before recording.
2. Click Record and play immediately; there is no count-in or metronome.
3. Recording automatically stops after one bar. Click Record again to finish earlier.
4. The result still has a one-bar duration when stopped early, leaving silence after your performance.
5. Use Looper playback to hear the result.

The main record action temporarily mutes existing layers. Its dropdown offers recording with loops audible. Normal recording completion restores temporary mute states, stops playback, and resets the transport.

A take containing drums and melody creates separate layers. Recording stores note events, not microphone audio. Melodic events use the preset selected when the take begins. Live timing is retained without automatic note snapping.

## Looper

Layers contain events and instrument identifiers. Their displayed blocks visualize events rather than recorded waveforms. Each layer repeats at its own effective duration. The timeline spans the longest layer; shorter layers continue repeating independently.

| Control | Function |
| --- | --- |
| Play | Start playback. Clicking while playing stops and resets, despite the pause icon. |
| Stop | Stop playback and reset position. |
| M | Toggle mute. |
| S | Toggle solo. Multiple solo layers may play together; explicitly muted layers remain muted. |
| Volume | Set −20 to +6 dB, implemented through playback velocity scaling. |
| Copy | Duplicate events and settings into another layer. |
| Pencil | Load the layer into the grid for editing. |
| Trash | Remove the layer. |
| Left / right plus | Add one bar of silence before / after the content. |
| Left / right minus | Remove a bar of previously added silence on that side. |
| Clear All | Remove all looper layers. Grid patterns and saved sessions are separate. |

Adding silence changes repetition length; it does not repeat the existing notes into that space. A one-bar beat with one bar appended plays sound for a bar, then silence for a bar. Minus controls only remove added padding. Arbitrary trimming and draggable crop handles are not exposed in the current UI.

The volume slider scales event velocity and clamps it to 0–1; it is not an independent track gain node. Melodic layers using the same preset share a synth instance. Stop/mute cleanup releases notes across melodic instruments, so tracks are not fully isolated.

### Editing a layer in the grid

The pencil action replaces visible grid content, requesting confirmation if it contains notes. Select Grid mode to see the loaded pattern if you were in Keyboard mode.

- Note starts are rounded to sixteenth-note steps.
- Only starts that fit the 16 columns and available pitch rows are retained.
- Melodic conversion selects Full piano, preserving pitches across octaves from A0 through C8. Notes outside that traditional piano range are omitted. It does not change the saved Scale-range settings.
- Held-note durations are not reconstructed; the grid uses short fixed notes.
- Add to Looper creates another layer. The original layer remains until removed.

Save or duplicate the original before conversion when preserving timing and note lengths matters.

## Sessions

Save stores BPM, layers, and grid state, including the selected melodic range and its retained full-piano pattern, in browser `localStorage`. Existing sessions without range metadata load in Scale range. The first save asks for a name; later saves overwrite the active session. Save As creates a separate session when given a different name; keeping the active name overwrites it.

Load lists saved sessions and allows restoration or deletion. Reloading restores the last saved active session, not unsaved edits. On small screens, session actions appear in the header menu.

Storage belongs to the current site origin and browser profile. Development and deployed sites have separate storage. Clearing site data removes local sessions. There is no automatic saving, cloud account, or project-file import/export. Storage errors are logged; the UI's saved feedback does not guarantee persistence succeeded.

## Sharing

Share copies a URL carrying compressed JSON after `#s=`. It contains BPM, layers, and grid state without uploading a project to a backend. New links use format version 2, including melodic range and full-piano data; version-1 links still load in their original Scale range. The link is a snapshot; later changes require a new link.

Opening a valid link restores its data, clears the active local session association, and removes the fragment from the displayed URL. Save the loaded project if you want it stored locally. Larger projects produce longer links. Parsing handles decompression and JSON errors, but does not perform comprehensive runtime schema validation.

## Audio export

Export WAV records the master output in real time using `Tone.Recorder`. It resets playback, starts recording, schedules playback after about 150 ms, waits for the longest layer duration plus a buffer, stops, and downloads the recording.

The filename ends in `.wav`, but there is no PCM WAV encoding or conversion of the recorder blob. The actual encoding depends on browser recorder support; inspect the format before using the file elsewhere. MP3 export and a `lamejs` dependency are absent from this version.

Export captures the master signal and current playback state. Stop grid preview before exporting to avoid including preview notes. The start delay and buffer mean the output is not precisely trimmed for seamless looping; another repetition can begin during the buffer. Export errors are logged to the browser console.

## Current scope

The application has no song arrangement timeline, audio sample import, microphone recording, MIDI device integration, MIDI file import/export, effects rack, track pan, automation, undo/redo, metronome, count-in, swing, or time-signature selector. Layer count has no explicit code limit, but browser resource and storage limits apply.

These are source observations. Planned improvements are tracked separately in the [feature implementation plan](future-implementations.md); they are not available until implemented and verified.
