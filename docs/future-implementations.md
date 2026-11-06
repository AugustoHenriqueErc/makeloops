# Feature implementation plan

This is a living plan for incremental improvements to makeloops. The status table distinguishes implemented features from planned work. Add future features using stable IDs and preserve completed entries so decisions remain traceable.

The goal is to support learning music through small experiments: play a recognizable piano keyboard, explore its full range, write longer patterns, and control how long notes sound.

## Status and scope

| ID | Feature | Status | Dependency |
| --- | --- | --- | --- |
| F-001 | Piano-style sidebar in Grid → Melodic | Implemented; visual validation recorded below | None |
| F-002 | Full piano range | Planned; range needs confirmation | F-001 |
| F-003 | Longer grid patterns and loops | Planned | None; scheduled after F-002 |
| F-004 | Sustained melodic notes in the grid | Planned; interaction needs confirmation | F-003 timing and persistence foundations |

Suggested order: F-001 → F-002 → F-003 → F-004. Deliver each feature in a working increment, update its documentation, and verify that existing projects still load before moving to the next.

## Terms used in this plan

- **Pitch:** how high or low a note is, for example C4 versus C5.
- **Duration:** how long a note is held before release.
- **Attack:** the beginning of a note. Pressing the same key again produces another attack.
- **Sustain:** keeping a note held. Some presets naturally fade even while held, just as a piano does.
- **Bar:** four beats in the application's current 4/4 workflow.
- **Step:** one sixteenth note; currently there are 16 steps per bar.
- **Range:** the available pitches. More pitches add vertical choices; more steps add time horizontally.

## Decisions and open questions

Resolved decisions are recorded below alongside open questions for later features. Resolve open questions before implementing the affected interaction; provisional assumptions are not final requirements.

| Topic | Working interpretation | Open decision |
| --- | --- | --- |
| Piano placement | Vertical piano-style sidebar replacing the pitch labels in Grid → Melodic, high pitches at the top. | Confirmed by the user; Keyboard mode keeps its original pads. |
| Piano extent | A traditional 88-key piano, A0 through C8 inclusive, reached through scrolling. | Confirm 88 keys or specify another range. “All notes” does not imply an unlimited pitch range. |
| Joining notes | Extend a note across consecutive steps of the same pitch, with one attack and one release. | Confirm this is held-note duration, rather than connecting different pitches or using a sustain pedal. |
| Grid pitch range | The piano belongs to the melodic grid; F-001 preserves the selected scale and current rows. | Confirm how F-002 should combine a full pitch range with scale filtering. |

## F-001 — Piano-style sidebar in Grid → Melodic

### Goal and confirmed scope

Replace the melodic grid's left-hand note-label boxes with a vertical piano appearance, inspired by [the supplied reference](../references/piano_reference.png). This is a visual change to **Grid → Melodic**, not a replacement of the Keyboard mode performance pad.

### Implementation

- Keep each selected pitch aligned with its existing row of 16 cells.
- Render natural notes as white keys and sharps as shorter dark keys.
- Add decorative overlapping black keys between neighboring natural rows when a sharp lies between them. These decorations do not introduce selectable notes outside the scale.
- Preserve scale, root, octave, tempo, pattern data, audio, and session formats.
- Keep drum row labels and Keyboard mode's original pad unchanged.
- The sidebar has no new playing interaction; existing grid cells still place and audition notes.

### Acceptance criteria

- The piano appears only on the left of Grid → Melodic, with higher pitches at the top.
- Row labels and step columns stay aligned across supported scales, roots, and octaves.
- Natural and sharp rows have appropriate white/black styling, with no decorative black key between adjacent E–F or B–C pitches.
- Pattern editing, preview, and Add to Looper retain existing behavior.
- Keyboard mode's components and input handling match the original repository version.
- The layout fits desktop and narrow mobile viewports.

### Implementation areas

`src/components/GridSequencer.vue` only. The earlier changes to `src/App.vue`, `src/components/MelodicPad.vue`, and `src/composables/useKeyboard.ts` were removed after the user clarified the intended placement.

### Delivery record — 2026-11-06

The initial Keyboard-mode implementation was superseded by the user's clarification. The current change is limited to the melodic grid's pitch-sidebar appearance.

- `npm run build` passed, with Vite's bundle-size advisory.
- Headless Chrome checks passed for sidebar placement, natural/sharp key styling, row alignment, grid cell toggling, preview progression, and unchanged drum labels.
- Major, Chromatic, and Pentatonic Minor were checked, including root and octave changes. Decorations do not add pattern rows or edit pattern data.
- Desktop and mobile screenshots were inspected. Viewports of 320 px and 375 px had no horizontal page overflow.
- The three Keyboard-related source files were restored exactly to their original repository versions; the original melodic pad was also checked in the browser.
- No audio behavior or persistence format was changed by this correction.

## F-002 — Full piano range

### Goal

Make the full confirmed piano range available to play. The proposed baseline is 88 chromatic pitches from A0 to C8, including all white and black keys. This expands available pitches, not the number of simultaneous synth voices or the sound library.

### Implementation steps

1. Generate the pitch list from explicit lowest/highest bounds rather than manually adding keys. Use one canonical pitch identity for rendering, audio, highlights, and recording.
2. Introduce a scrollable viewport with usable key sizes instead of squeezing 88 keys into one screen. Start around middle C (C4), with octave markers and a way to return there.
3. Adapt octave/navigation controls to the full-range view. Keep computer shortcuts mapped to a limited playable window and clamp that window to the confirmed bounds.
4. Keep drum shortcuts available. Keys outside the shortcut window remain playable through the on-screen piano.
5. Preserve the pitch captured when pressing, so scrolling or changing octaves cannot cause release to target a different note.
6. Verify extreme pitches, viewport navigation, recording, and interaction cleanup. Explicitly document the 16-voice synth limit as separate from the 88-key range.

### Acceptance criteria

- With the proposed range, exactly 88 unique pitches are available, including A0 and C8.
- Every pitch can be reached and played without unreadably small keys.
- Labels and note events agree across octave boundaries.
- Scrolling does not accidentally play notes; active touches and note releases remain reliable.
- Existing sessions and recordings retain their original pitches.

F-002 needs a scope update before implementation: the piano is now confirmed to belong to the melodic grid, so confirm how full-range rows interact with scale filtering and scrolling. The earlier playable-Keyboard assumptions below are provisional and must not change Keyboard mode without a separate request. New sampled piano sounds, weighted-key velocity, and external MIDI support remain separate features.

## F-003 — Longer patterns without changing BPM

### Goal

Allow more time positions in the grid so a phrase can continue for several bars at the same tempo. Appending empty space to a looper layer already exists, but it does not provide editable steps for a longer phrase.

At 120 BPM, 16 steps last 2 seconds; 32 steps last 4 seconds; 64 steps last 8 seconds. All use the same sixteenth-note spacing. Lowering BPM is not part of this feature.

### Implementation steps

1. Add an explicit pattern-length control in bars. A proposed first increment supports 1, 2, 4, and 8 bars, subject to a practical UI limit; these values are a proposal, not a requested fixed maximum.
2. Derive step count and loop duration from that setting: `steps = bars × 16`, `durationTicks = steps × sixteenthTicks`. Remove one-bar assumptions in grid-to-layer conversion.
3. Preserve existing cells when growing a pattern and append empty cells. Apply the selected length consistently to retained drum and melodic scale patterns, including patterns that are not visible.
4. Before shortening, detect notes that would be removed or cut and ask for explicit confirmation. Avoid silently dropping existing work.
5. Make longer grids navigable through scrolling or bar pages, with bar/beat labels, a clear playback cursor, and a way to follow playback.
6. Rebuild preview scheduling safely after a length change. Preserve Preview / With Loops behavior and independent layer repeat lengths.
7. Use actual pattern duration when adding layers or converting layers back into the grid. Preserve longer content instead of limiting import to the first 16 steps.
8. Save and share length metadata. Default older projects without it to their original 16-step behavior. Version share data and validate supported lengths without making old version-1 links unusable.
9. Verify tempo alignment, longest-layer export duration, padding, duplicate, save/load, and sharing with mixed-length layers.

### Acceptance criteria

- A two-bar grid has 32 editable steps; a four-bar grid has 64.
- BPM remains unchanged when length changes, and notes retain their pitch and step spacing.
- Notes can be placed after step 16 and play before the loop repeats.
- Growing preserves content; destructive shortening requires confirmation.
- Preview, looper playback, save/load, share restoration, and layer-to-grid conversion agree on duration.
- Old one-bar projects load and play as before.

### Scope boundary

This feature extends composed grid patterns. Live Keyboard recording currently auto-stops after one bar and has a separate recorder length assumption. Configurable live recording length can be added as a later entry; do not assume grid length automatically changes that workflow.

### Likely implementation areas

`src/stores/gridStore.ts`, `src/components/GridControls.vue`, `src/components/GridSequencer.vue`, `src/components/LooperPanel.vue`, `src/audio/looper/LoopPlayer.ts`, `src/stores/sessionStore.ts`, and `src/composables/useShareableLink.ts`.

## F-004 — Sustained melodic notes

### Goal

Let a melodic note last across multiple steps, like holding a piano key. The proposed interaction is to place a note and drag its end to change duration. This is often called note-length editing in a piano roll.

For example, one C4 starting at step 1 and lasting four steps should produce one C4 attack, remain held for one beat, and then release. Four separate C4 notes on steps 1–4 should still produce four attacks. Users must be able to choose either behavior.

### Implementation steps

1. Define note starts and lengths explicitly, for example `startStep` and `lengthSteps`, with pitch and velocity. A continuation must not become another note-on.
2. Design migration from active grid cells: every old active melodic cell becomes an independent one-step note. Adjacent old cells must not automatically merge, because that changes the music.
3. Add a visible duration block and an end-resize interaction that snaps to steps. Support shortening and extending; provide a touch and keyboard-accessible way to change duration.
4. Define same-pitch collision rules. Proposed first behavior: stop extension before another independent note of the same pitch. Do not silently consume repeated notes; joining existing notes can be a later explicit action.
5. Generate one note-on at the start and one note-off at the end in both preview and looper conversion. Keep chords independent and preserve attack velocity.
6. For the first increment, constrain notes to the pattern end and release before the loop wraps. Notes tied across loop boundaries require a separate design.
7. Preserve note durations when saving, sharing, duplicating, loading a layer into the grid, and extending the pattern. Retain drum hit behavior unchanged.
8. Document preset behavior: holding Pluck or Piano may still produce a fading sound because of their envelopes. Duration control holds the note gate; it does not guarantee constant volume or emulate a sustain pedal.

### Acceptance criteria

- A four-step note generates one attack and one release, without attacks on continuation steps.
- Separate adjacent notes still retrigger independently.
- Chords can contain notes with different durations.
- Preview and the added looper layer sound consistent, including releases near loop end.
- Stop, mute, resize, focus loss, and view changes do not leave held notes sounding indefinitely.
- Save/load and sharing preserve lengths; old patterns retain their repeated-note behavior.
- Round-tripping a supported melodic layer through the grid preserves note lengths, subject to documented step snapping and pitch-range limits.

### Likely implementation areas

`src/types/index.ts`, `src/stores/gridStore.ts`, `src/components/GridCell.vue`, `src/components/GridSequencer.vue`, `src/audio/looper/LoopPlayer.ts`, `src/components/LooperPanel.vue`, and session/share serialization.

## Delivery checks

For each implementation increment:

1. Review the feature's pending decisions and record the agreed behavior here.
2. Implement only the increment's scope and update the application, music, and architecture guides as behavior changes.
3. Run `npm run build` and perform targeted browser checks for audio, mouse, touch, and keyboard interactions.
4. Verify an old project and a new project through save/load and share restoration when data structures change.
5. Record checks actually performed, known limitations, and the resulting status. Source inspection alone is not audio verification.

## Adding future features

Append the next stable ID, starting at F-005. Add a short entry to the status table and describe its goal, user interaction, dependencies, implementation increments, acceptance criteria, compatibility needs, and open questions. Split independently useful work into separate entries rather than silently expanding an existing feature.

Status vocabulary: **Planned**, **Ready**, **In progress**, **Implemented**, **Deferred**. Mark a feature Ready only after its required decisions are resolved, and Implemented only after its acceptance criteria have been verified.
