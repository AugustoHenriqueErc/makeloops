# Feature implementation plan

This is a living plan for incremental improvements to makeloops. The status table distinguishes implemented features from planned work. Add future features using stable IDs and preserve completed entries so decisions remain traceable.

The goal is to support learning music through small experiments: play a recognizable piano keyboard, explore its full range, write longer patterns, and control how long notes sound.

## Status and scope

| ID | Feature | Status | Dependency |
| --- | --- | --- | --- |
| F-001 | Piano-style sidebar in Grid → Melodic | Implemented; visual validation recorded below | None |
| F-002 | Full piano range in the melodic grid | Implemented; verified in headless Chrome on 2026-11-06 | F-001 |
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
| Piano extent | A traditional 88-key piano, A0 through C8 inclusive, reached through scrolling. | F-002 follows this baseline; the synth still supports 16 simultaneous voices per preset. |
| Joining notes | Extend a note across consecutive steps of the same pitch, with one attack and one release. | Confirm this is held-note duration, rather than connecting different pitches or using a sustain pedal. |
| Grid pitch range | Range selects Scale or Full piano in Grid → Melodic. | F-002 keeps separate patterns, with Scale as the backward-compatible default. Keyboard mode is unchanged. |

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

## F-002 — Full piano range in Grid → Melodic

### Goal and implementation decisions

Provide 88 chromatic pitch rows, A0 through C8 inclusive, in the melodic grid. A new Range selector offers **Scale** (the original view and default for old projects) and **Full piano (88 keys)**. Each range retains its own pattern. Keyboard mode keeps its original performance pad and shortcuts.

The full piano uses fixed pitches without scale filtering or transposition. Root, Scale, and Octave controls remain available in Scale range. The range expansion changes available pitches, not tempo, loop length, note duration, presets, or polyphony.

### Implementation

1. Generate an immutable descending pitch list from MIDI note 108 (C8) through 21 (A0).
2. Add a bounded vertical viewport with 32 px rows and a sticky step header. Center middle C (C4) on entry, label each octave, and provide octave/endpoint jumps and a Middle C return button.
3. Use the selected pitch list consistently for cell audition, preview, event conversion, and layers. Preview from Drums uses the retained pattern for the selected melodic range.
4. Preserve drum, per-scale, and full-piano patterns independently when switching views. Clear and randomization affect only the current pattern.
5. Include optional range and piano-pattern fields in the session schema. Missing fields default to the original Scale view; new share links use version 2 while version 1 remains readable.
6. Convert melodic layers back into the full-range grid so pitches across octaves within A0–C8 survive editing. Existing step snapping and short fixed durations remain; longer patterns and sustained notes belong to F-003/F-004.

### Acceptance criteria

- Exactly 88 unique pitches are available, including A0 and C8: 52 natural and 36 sharp keys.
- Every pitch is reachable without shrinking row heights; scrolling does not edit notes.
- Audition, preview, generated events, and layer playback use the same pitch identities.
- Switching ranges or modes preserves each retained pattern, without transposing full-piano pitches.
- Save/load and sharing retain range and pattern data. Older sessions and version-1 links retain their original Scale behavior.
- Keyboard mode is unchanged; grid length remains 16 steps and BPM is unchanged.

### Delivery record — 2026-11-06

- `npm run build` passed, with Vite's bundle-size advisory.
- Headless Chrome checks passed for pitch count/order, white/black key counts, endpoint scrolling, middle-C positioning, sticky step labels, cell audition, range/mode switching, and scale-pattern preservation.
- A0, C4, and C8 were verified through cell audition, both preview modes, event conversion, looper playback, and melodic layer-to-grid conversion.
- Audio generation was checked through a master waveform analyser; this is not a physical-device listening test.
- Full-range sessions and version-2 links restored the same patterns; legacy sessions and version-1 links loaded without the new fields.
- Desktop screenshots and mobile layouts were checked at 320 px and 375 px without horizontal page overflow. Full-range rows retain their height.
- Emulated touch scrolling moved the viewport without changing cells; keyboard scrolling, endpoint jumps, and isolation of clear/randomization actions were also checked.

### Remaining limits

The presets still have 16-voice polyphony. Randomizing many rows or placing more simultaneous pitches can exceed that limit. Notes outside A0–C8 are omitted on layer-to-grid conversion. There is no new sampled piano, MIDI integration, sustain pedal, note-length editor, or longer loop in this feature.

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
