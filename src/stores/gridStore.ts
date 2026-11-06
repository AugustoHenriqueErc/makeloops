import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as Tone from 'tone'
import type {
  GridMode,
  MelodicRange,
  GridPattern,
  RootNote,
  ScaleName,
  InstrumentType,
  MidiEvent,
  LoopLayer,
  DrumSound,
} from '@/types'
import { getScaleNotesForGrid, PIANO_NOTES } from '@/utils/scales'
import { instrumentFactory } from '@/audio/instruments/InstrumentFactory'
import { useLooperStore } from './looperStore'
import type { GridState } from './sessionStore'

// Drum row configuration (bottom to top for grid display)
const DRUM_ROWS: { sound: DrumSound; label: string }[] = [
  { sound: 'kick', label: 'Kick' },
  { sound: 'snare', label: 'Snare' },
  { sound: 'hihat-closed', label: 'HH Cls' },
  { sound: 'hihat-open', label: 'HH Opn' },
  { sound: 'clap', label: 'Clap' },
  { sound: 'rim', label: 'Rim' },
  { sound: 'tom-low', label: 'Tom L' },
  { sound: 'tom-mid', label: 'Tom M' },
  { sound: 'tom-high', label: 'Tom H' },
  { sound: 'crash', label: 'Crash' },
]

let gridLayerCounter = 0

function generateGridLayerId(): string {
  return `grid-${++gridLayerCounter}`
}

export const useGridStore = defineStore('grid', () => {
  // State
  const mode = ref<GridMode>('drums')
  const rootNote = ref<RootNote>('C')
  const scaleName = ref<ScaleName>('major')
  const octave = ref(4)
  const stepCount = ref(16)
  const pattern = ref<GridPattern>(createEmptyPattern(DRUM_ROWS.length, 16))
  const currentStep = ref(-1)
  const isPlaying = ref(false)
  const noteDensity = ref(0.3)
  const melodicInstrument = ref<Exclude<InstrumentType, 'drums'>>('piano')
  const melodicRange = ref<MelodicRange>('scale')

  // Separate pattern storage for each mode (preserved when switching)
  let drumsPattern: GridPattern = createEmptyPattern(DRUM_ROWS.length, 16)
  // Key: scaleName, stores pattern for each scale
  const melodicPatterns: Map<ScaleName, GridPattern> = new Map()
  let pianoPattern: GridPattern = createEmptyPattern(PIANO_NOTES.length, 16)

  // Tone.js sequence for preview
  let sequence: Tone.Sequence | null = null

  // Computed
  const melodicNotes = computed(() => melodicRange.value === 'piano'
    ? PIANO_NOTES
    : getScaleNotesForGrid(rootNote.value, scaleName.value, octave.value))

  const rowCount = computed(() => {
    if (mode.value === 'drums') {
      return DRUM_ROWS.length
    }
    return melodicNotes.value.length
  })

  const rowLabels = computed(() => {
    if (mode.value === 'drums') {
      return DRUM_ROWS.map((d) => d.label)
    }
    const notes = melodicNotes.value
    if (melodicRange.value === 'piano') return [...notes]
    return notes.map((n) => n.replace(/\d+$/, '')) // Remove octave for display
  })

  const rowNotes = computed(() => {
    if (mode.value === 'drums') {
      return DRUM_ROWS.map((d) => d.sound)
    }
    return melodicNotes.value
  })

  const hasContent = computed(() => {
    return pattern.value.some((row) => row.some((cell) => cell.active))
  })

  // Functions
  function createEmptyPattern(rows: number, steps: number): GridPattern {
    return Array.from({ length: rows }, () =>
      Array.from({ length: steps }, () => ({ active: false, velocity: 0.8 }))
    )
  }

  function saveCurrentPattern() {
    const snapshot: GridPattern = JSON.parse(JSON.stringify(pattern.value))
    if (mode.value === 'drums') drumsPattern = snapshot
    else if (melodicRange.value === 'piano') pianoPattern = snapshot
    else melodicPatterns.set(scaleName.value, snapshot)
  }

  function restoreCurrentPattern() {
    const saved = mode.value === 'drums' ? drumsPattern
      : melodicRange.value === 'piano' ? pianoPattern
      : melodicPatterns.get(scaleName.value)
    pattern.value = saved ? JSON.parse(JSON.stringify(saved))
      : createEmptyPattern(rowCount.value, stepCount.value)
  }

  function toggleCell(row: number, step: number) {
    if (pattern.value[row] && pattern.value[row][step]) {
      const wasActive = pattern.value[row][step].active
      pattern.value[row][step].active = !wasActive

      // Play the note immediately when activating a cell
      if (!wasActive) {
        const velocity = pattern.value[row][step].velocity
        if (mode.value === 'drums') {
          const note = DRUM_ROWS[row]?.sound
          if (note) {
            const drumKit = instrumentFactory.getDrumKit()
            drumKit.trigger(note, Tone.now(), velocity)
          }
        } else {
          const note = melodicNotes.value[row]
          if (note) {
            const synth = instrumentFactory.getMelodicInstrument(melodicInstrument.value)
            synth.triggerAttackRelease(note, '16n', Tone.now(), velocity)
          }
        }
      }
    }
  }

  function setCellVelocity(row: number, step: number, velocity: number) {
    if (pattern.value[row] && pattern.value[row][step]) {
      pattern.value[row][step].velocity = Math.max(0, Math.min(1, velocity))
    }
  }

  function clearPattern() {
    pattern.value = createEmptyPattern(rowCount.value, stepCount.value)
    saveCurrentPattern()
  }

  function randomizePattern() {
    const newPattern = createEmptyPattern(rowCount.value, stepCount.value)
    for (let row = 0; row < rowCount.value; row++) {
      for (let step = 0; step < stepCount.value; step++) {
        if (Math.random() < noteDensity.value) {
          const cell = newPattern[row]?.[step]
          if (cell) {
            cell.active = true
            cell.velocity = 0.6 + Math.random() * 0.4 // 0.6-1.0
          }
        }
      }
    }
    pattern.value = newPattern
  }

  function setMode(newMode: GridMode) {
    if (newMode === mode.value) return
    saveCurrentPattern()
    mode.value = newMode
    restoreCurrentPattern()
    // Playback continues uninterrupted - playStep handles both patterns
  }

  function setScale(newScale: ScaleName) {
    if (newScale === scaleName.value) return
    if (mode.value === 'melodic' && melodicRange.value === 'scale') saveCurrentPattern()
    scaleName.value = newScale
    if (mode.value === 'melodic' && melodicRange.value === 'scale') restoreCurrentPattern()
    // Playback continues uninterrupted
  }

  function setMelodicRange(range: MelodicRange) {
    if (range === melodicRange.value) return
    if (mode.value === 'melodic') saveCurrentPattern()
    melodicRange.value = range
    if (mode.value === 'melodic') restoreCurrentPattern()
  }

  function setRootNote(note: RootNote) {
    rootNote.value = note
  }

  function setOctave(oct: number) {
    octave.value = Math.max(2, Math.min(6, oct))
  }

  function setMelodicInstrument(inst: Exclude<InstrumentType, 'drums'>) {
    melodicInstrument.value = inst
  }

  function setNoteDensity(density: number) {
    noteDensity.value = Math.max(0.1, Math.min(0.8, density))
  }

  // Playback - plays BOTH drums and melodic patterns simultaneously
  function playStep(step: number, time: number) {
    // Get the active patterns - use pattern.value for current mode, saved pattern for the other
    const activeDrumsPattern = mode.value === 'drums' ? pattern.value : drumsPattern
    const activeMelodicPattern = mode.value === 'melodic' ? pattern.value
      : melodicRange.value === 'piano' ? pianoPattern : melodicPatterns.get(scaleName.value)

    // Play drums pattern
    const drumNotes = DRUM_ROWS.map((d) => d.sound)
    for (let row = 0; row < activeDrumsPattern.length; row++) {
      const cell = activeDrumsPattern[row]?.[step]
      const note = drumNotes[row]
      if (cell?.active && note) {
        const drumKit = instrumentFactory.getDrumKit()
        drumKit.trigger(note as DrumSound, time, cell.velocity)
      }
    }

    // Play melodic pattern (for current scale)
    if (activeMelodicPattern) {
      for (let row = 0; row < activeMelodicPattern.length; row++) {
        const cell = activeMelodicPattern[row]?.[step]
        const note = melodicNotes.value[row]
        if (cell?.active && note) {
          const synth = instrumentFactory.getMelodicInstrument(melodicInstrument.value)
          synth.triggerAttackRelease(note, '16n', time, cell.velocity)
        }
      }
    }
  }

  // Track whether loops were muted for this preview session
  let loopsMutedForPreview = false

  function startPreview(withLoops: boolean = false) {
    if (isPlaying.value) return

    const looperStore = useLooperStore()

    isPlaying.value = true
    currentStep.value = 0

    // Mute looper layers if previewing without loops
    if (!withLoops && looperStore.layers.length > 0) {
      looperStore.muteAllLayers()
      loopsMutedForPreview = true
    } else {
      loopsMutedForPreview = false
    }

    const steps = Array.from({ length: stepCount.value }, (_, i) => i)

    sequence = new Tone.Sequence(
      (time, step) => {
        currentStep.value = step
        playStep(step, time)
      },
      steps,
      '16n'
    )

    sequence.loop = true

    // Start transport if not already running, then start sequence
    if (Tone.getTransport().state !== 'started') {
      // Reset position to 0 and start sequence before transport
      // This ensures the first beat at time 0 is not missed
      Tone.getTransport().position = 0
      sequence.start(0)
      Tone.getTransport().start()
    } else {
      // Transport already running - start sequence immediately at current position
      sequence.start()
    }
  }

  function stopPreview() {
    if (!isPlaying.value) return

    const looperStore = useLooperStore()

    isPlaying.value = false
    currentStep.value = -1

    if (sequence) {
      sequence.stop()
      sequence.dispose()
      sequence = null
    }

    // Silence any hanging notes
    instrumentFactory.panicAllNotes()

    // Restore looper mute states if we muted them
    if (loopsMutedForPreview) {
      looperStore.restoreLayerMuteStates()
      loopsMutedForPreview = false
    }
  }

  // Convert grid to MidiEvents for looper integration
  function convertToMidiEvents(): MidiEvent[] {
    const events: MidiEvent[] = []
    const stepTicks = Tone.Time('16n').toTicks()
    const notes = rowNotes.value

    for (let step = 0; step < stepCount.value; step++) {
      for (let row = 0; row < pattern.value.length; row++) {
        const cell = pattern.value[row]?.[step]
        const note = notes[row]
        if (cell?.active && note) {
          const time = step * stepTicks

          events.push({
            type: 'noteOn',
            note,
            velocity: cell.velocity,
            time,
          })

          // Add noteOff for melodic instruments
          if (mode.value !== 'drums') {
            events.push({
              type: 'noteOff',
              note,
              velocity: 0,
              time: time + stepTicks - 1, // Just before next step
            })
          }
        }
      }
    }

    return events.sort((a, b) => a.time - b.time)
  }

  function getLoopDuration(): number {
    return Tone.Time('1m').toTicks() // 1 bar = 16 sixteenth notes at 4/4
  }

  function createLoopLayer(): LoopLayer | null {
    const events = convertToMidiEvents()
    if (events.length === 0) return null

    const instrumentType = mode.value === 'drums' ? 'drums' : melodicInstrument.value
    const instrumentName = instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)
    const duration = getLoopDuration()

    return {
      id: generateGridLayerId(),
      name: `${instrumentName} (Grid)`,
      events,
      duration,
      cropStart: 0,
      cropEnd: duration,
      startPadding: 0,
      endPadding: 0,
      instrumentId: instrumentType,
      volume: 0,
      muted: false,
      solo: false,
    }
  }

  // Get full state for sharing (includes saved patterns)
  function getStateForSharing() {
    saveCurrentPattern()

    return {
      mode: mode.value,
      pattern: pattern.value,
      drumsPattern: drumsPattern,
      melodicPatterns: Object.fromEntries(melodicPatterns) as Record<ScaleName, GridPattern>,
      scaleName: scaleName.value,
      rootNote: rootNote.value,
      octave: octave.value,
      melodicInstrument: melodicInstrument.value,
      melodicRange: melodicRange.value,
      pianoPattern,
    }
  }

  // Hydrate from shared state
  function hydrateFromState(state: GridState) {
    // Stop any preview first
    stopPreview()

    // Missing range metadata identifies an existing scale-based project.
    melodicRange.value = state.melodicRange === 'piano' ? 'piano' : 'scale'
    pianoPattern = state.pianoPattern
      ? JSON.parse(JSON.stringify(state.pianoPattern))
      : createEmptyPattern(PIANO_NOTES.length, stepCount.value)

    // Restore saved patterns (deep clone to ensure reactivity)
    drumsPattern = JSON.parse(JSON.stringify(state.drumsPattern))
    melodicPatterns.clear()
    for (const [scale, pat] of Object.entries(state.melodicPatterns)) {
      melodicPatterns.set(scale as ScaleName, JSON.parse(JSON.stringify(pat)))
    }

    // Restore settings
    scaleName.value = state.scaleName
    rootNote.value = state.rootNote
    octave.value = state.octave
    melodicInstrument.value = state.melodicInstrument
    mode.value = state.mode
    // Deep clone pattern to trigger Vue reactivity
    pattern.value = JSON.parse(JSON.stringify(state.pattern))
  }

  // Update grid layer counter (used when loading shared state)
  function setGridLayerCounter(value: number) {
    if (value > gridLayerCounter) {
      gridLayerCounter = value
    }
  }

  // Load events from a loop layer back into the grid for editing
  function loadFromMidiEvents(
    events: MidiEvent[],
    instrumentId: InstrumentType,
    _loopDurationTicks: number
  ) {
    // Stop any preview first
    stopPreview()

    const isDrums = instrumentId === 'drums'
    const stepTicks = Tone.Time('16n').toTicks()

    // Clear the grid first
    if (isDrums) {
      mode.value = 'drums'
      pattern.value = createEmptyPattern(DRUM_ROWS.length, stepCount.value)
      drumsPattern = createEmptyPattern(DRUM_ROWS.length, stepCount.value)

      // Build drum sound to row index map
      const drumSoundToRow: Record<string, number> = {}
      DRUM_ROWS.forEach((row, index) => {
        drumSoundToRow[row.sound] = index
      })

      // Process only noteOn events (drums don't use noteOff)
      events
        .filter((e) => e.type === 'noteOn')
        .forEach((event) => {
          const rowIndex = drumSoundToRow[event.note]
          if (rowIndex !== undefined) {
            const stepIndex = Math.round(event.time / stepTicks)
            if (stepIndex >= 0 && stepIndex < stepCount.value) {
              const cell = pattern.value[rowIndex]?.[stepIndex]
              if (cell) {
                cell.active = true
                cell.velocity = event.velocity
              }
            }
          }
        })

      // Save to drums pattern
      drumsPattern = JSON.parse(JSON.stringify(pattern.value))
    } else {
      // Melodic mode
      mode.value = 'melodic'
      melodicInstrument.value = instrumentId as Exclude<InstrumentType, 'drums'>

      // Preserve pitches spanning several octaves when editing a melodic layer.
      melodicRange.value = 'piano'
      const scaleNotes = PIANO_NOTES
      const noteToRow: Record<string, number> = {}
      scaleNotes.forEach((note, index) => {
        noteToRow[note] = index
      })

      // Create empty pattern
      pattern.value = createEmptyPattern(scaleNotes.length, stepCount.value)

      // Process noteOn events
      events
        .filter((e) => e.type === 'noteOn')
        .forEach((event) => {
          const rowIndex = noteToRow[event.note]
          if (rowIndex !== undefined) {
            const stepIndex = Math.round(event.time / stepTicks)
            if (stepIndex >= 0 && stepIndex < stepCount.value) {
              const cell = pattern.value[rowIndex]?.[stepIndex]
              if (cell) {
                cell.active = true
                cell.velocity = event.velocity
              }
            }
          }
        })

      pianoPattern = JSON.parse(JSON.stringify(pattern.value))
    }
  }

  // Note: mode/scale changes are handled directly in setMode/setScale
  // which preserve playback state

  return {
    // State
    mode,
    rootNote,
    scaleName,
    octave,
    stepCount,
    pattern,
    currentStep,
    isPlaying,
    noteDensity,
    melodicInstrument,
    melodicRange,
    // Computed
    rowCount,
    rowLabels,
    rowNotes,
    hasContent,
    // Actions
    toggleCell,
    setCellVelocity,
    clearPattern,
    randomizePattern,
    setMode,
    setMelodicRange,
    setScale,
    setRootNote,
    setOctave,
    setMelodicInstrument,
    setNoteDensity,
    startPreview,
    stopPreview,
    convertToMidiEvents,
    getLoopDuration,
    createLoopLayer,
    getStateForSharing,
    hydrateFromState,
    setGridLayerCounter,
    loadFromMidiEvents,
  }
})
