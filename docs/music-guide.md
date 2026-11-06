# Music guide

This guide connects musical concepts to makeloops. Start with a short pattern, listen repeatedly, and change one thing at a time.

## Rhythm and timing

| Term | Meaning |
| --- | --- |
| Beat | The steady pulse you count or tap along with. |
| BPM | Beats per minute. Higher BPM makes a pattern play faster. |
| Bar / measure | A group of four beats in this application's 4/4 workflow. |
| Step | One grid position lasting a sixteenth note. |
| Loop | A passage that repeats. |
| Layer | One repeating part combined with other parts. |
| Velocity | Note intensity, represented from 0 to 1, influencing sound response and loudness. |
| Quantization | Moving timing onto regular positions. Grid notes are aligned; live recording preserves timing. |
| Tick | The internal musical timing unit used to store event positions. |

Count a bar as `1 e & a 2 e & a 3 e & a 4 e & a`. Each syllable is one column:

| Beat | Grid steps |
| --- | --- |
| 1 | 1, 2, 3, 4 |
| 2 | 5, 6, 7, 8 |
| 3 | 9, 10, 11, 12 |
| 4 | 13, 14, 15, 16 |

Quarter notes fall on 1, 5, 9, and 13. Eighth notes fall on 1, 3, 5, 7, 9, 11, 13, and 15. Every column is a sixteenth note.

```text
beat duration = 60 / BPM seconds
bar duration  = 4 × 60 / BPM seconds
step duration = (60 / BPM) / 4 seconds
```

At 120 BPM, a beat lasts 0.5 seconds, a bar 2 seconds, and a step 0.125 seconds. Tempo changes time between notes without transposing their pitches.

## Drum sounds

The kit synthesizes sounds rather than loading acoustic drum recordings.

| Sound | Common musical role | Implementation |
| --- | --- | --- |
| Kick | Low thump anchoring the rhythm. | Sine-based membrane synthesis with falling pitch, triggered at C1. |
| Snare | Sharp accent, often on beats 2 and 4. | Short white-noise burst. |
| Closed hi-hat | Short bright subdivision pulse. | White noise through an 8 kHz high-pass filter with short decay. |
| Open hi-hat | Longer bright accent. | White noise through a 6 kHz high-pass filter with longer decay. |
| High / mid / low tom | Pitched percussion for movement and fills. | Membrane synths triggered at G3, D3, and A2. |
| Clap | Noisy handclap-like accent. | Pink-noise burst. |
| Rim | Short click-like accent. | Brief filtered noise at 10 kHz. |
| Crash | Long bright wash for accents. | Filtered noise at 4 kHz with long decay. |

Decay describes how a sound fades after its initial attack. Closed and open hi-hats are separate instruments; closing a hat does not automatically cut off an open hat in this implementation.

## Pitch, melody, and chords

Pitch describes how high or low a sound is. Notes use letters A–G, with `#` meaning one semitone higher. A semitone is one adjacent step in the chromatic pitch system used here: `C C# D D# E F F# G G# A A# B`.

An octave spans 12 semitones. C5 has twice the frequency of C4. Note identifiers combine pitch and octave, such as `C4`. Octave controls move notes into a higher or lower register.

A melody is a sequence of pitches. A chord combines pitches at the same time: enable several melodic cells in a column to play a chord. Polyphony means multiple notes sounding together; each melodic preset instance supports up to 16 voices.

A root sets the starting pitch for a scale, a selected collection of pitches. The melodic grid restricts its rows to that scale. It does not generate chord progressions or guarantee a particular musical result. Keyboard performance remains chromatic, independently of grid scale settings.

### Available scales

These intervals are semitones above the root, as implemented in `src/utils/scales.ts`. Most scales include the root at +12; Chromatic does not repeat it. Higher pitches appear at the top of the grid.

| Scale | Intervals | Notes with root C, octave 4 |
| --- | --- | --- |
| Major | 0, 2, 4, 5, 7, 9, 11, 12 | C4 D4 E4 F4 G4 A4 B4 C5 |
| Minor (natural minor) | 0, 2, 3, 5, 7, 8, 10, 12 | C4 D4 D#4 F4 G4 G#4 A#4 C5 |
| Pentatonic Major | 0, 2, 4, 7, 9, 12 | C4 D4 E4 G4 A4 C5 |
| Pentatonic Minor | 0, 3, 5, 7, 10, 12 | C4 D#4 F4 G4 A#4 C5 |
| Blues | 0, 3, 5, 6, 7, 10, 12 | C4 D#4 F4 F#4 G4 A#4 C5 |
| Dorian | 0, 2, 3, 5, 7, 9, 10, 12 | C4 D4 D#4 F4 G4 A4 A#4 C5 |
| Mixolydian | 0, 2, 4, 5, 7, 9, 10, 12 | C4 D4 E4 F4 G4 A4 A#4 C5 |
| Chromatic | 0 through 11 | C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 |

The app displays sharps throughout. For example, D# and Eb name the same pitch in its tuning system, but it displays D#. These spellings reflect the implementation rather than conventional notation for every key.

Changing root keeps cell positions and remaps pitches. Changing octave shifts register. Changing scale restores that scale's separately retained pattern or creates an empty one.

## Melodic instruments

Synthesis generates sound electronically. An oscillator produces a repeating waveform. An envelope shapes the sound over time: attack controls its beginning, decay moves toward the sustain level, sustain sets the held level, and release fades after note-off. These stages are often called ADSR.

| Preset | Sound generation |
| --- | --- |
| Piano | Triangle oscillator with fast attack and longer release; a synthesized approximation, not a sampled acoustic piano. |
| Synth | Sawtooth oscillator with a sustained envelope for a brighter sound. |
| Pluck | Triangle oscillator with very fast attack and decay to zero sustain. |
| FM | Frequency modulation: one oscillator modulates another's frequency. Uses harmonicity 3 and modulation index 10. |
| AM | Amplitude modulation: one oscillator modulates another's amplitude. Uses square-wave modulation and harmonicity 2. |
| Membrane | Sine oscillator with fast attack and decaying envelope. The melodic preset uses `Tone.Synth`, despite its name; the drum kit uses actual membrane synths. |

Presets are fixed; there are no UI controls for waveform, ADSR, or modulation depth. Changing presets changes timbre, the sound's character, rather than written pitches.

## Computer keyboard mappings

Mappings use `KeyboardEvent.key`, so key positions and punctuation depend on keyboard layout. Repeat keydowns are suppressed until release. Note triggering is ignored while typing in inputs or textareas. The listener remains active in Grid mode too.

The piano-style sidebar belongs to Grid → Melodic. White keys represent natural notes and dark keys represent sharps in the selected scale. Decorative black keys between natural rows suggest piano geometry without adding editable pitches. Keyboard mode uses the original button-style melodic pad.

| Key | Drum |
| --- | --- |
| 1 | Kick |
| 2 | Snare |
| 3 | Closed hi-hat |
| 4 | Open hi-hat |
| 5 | High tom |
| 6 | Mid tom |
| 7 | Low tom |
| 8 | Clap |
| 9 | Rim |
| 0 | Crash |

| Key | Note relative to selected base octave |
| --- | --- |
| A | C |
| W | C# |
| S | D |
| E | D# |
| D | E |
| F | F |
| T | F# |
| G | G |
| Y | G# |
| H | A |
| U | A# |
| J | B |
| K | C, next octave |
| O | C#, next octave |
| L | D, next octave |
| P | D#, next octave |
| ; | E, next octave |
| Z | Lower base octave |
| X | Raise base octave |

At base octave 4, A plays C4 and K plays C5. Although the play tooltip mentions Space, no Space transport shortcut is implemented in the keyboard handler.

## Create a first beat

1. Open Grid mode, select Drums, and clear the visible pattern.
2. Set BPM to 90 to hear the subdivisions more easily.
3. Add Kick at steps **1 and 9**.
4. Add Snare at steps **5 and 13**.
5. Add Closed hi-hat at **1, 3, 5, 7, 9, 11, 13, and 15**.
6. Preview and count four beats per repetition. Listen to kick and snare alternating.
7. Stop preview and Add to Looper.
8. Clear the drum grid to avoid doubling the saved drum layer during later preview.
9. Switch to Melodic, choose root C, Pentatonic Minor, octave 4, and Pluck.
10. Place C on step 1, D# on step 7, G on step 9, and A# on step 15, using row labels to find pitches.
11. Use With Loops to hear the melody against your drums. Stop and Add to Looper.
12. Play both saved layers using the Looper controls and save the session with a descriptive name.

Try adding a kick at step 11, then removing it. Change one element at a time. Try C, D#, and G together in one column to hear a chord. Grid chords are short; Keyboard recording allows longer held notes.

## Reproduce a beat by ear

Choose a short passage and identify its pulse. Adjust BPM until counting along feels steady. Listen for low hits first, then snare or clap, then hi-hats. Recreate each part separately before adding melody.

The result may sound different because the source uses samples, effects, swing, longer phrases, or unavailable timbres. Use the exercise to learn timing, instrument roles, and layering. Save versions under different names to compare your progress.
