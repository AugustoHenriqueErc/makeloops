<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useGridStore } from '@/stores/gridStore'
import { useLooperStore } from '@/stores/looperStore'
import { useAudioStore } from '@/stores/audioStore'
import { useAudioContext } from '@/composables/useAudioContext'
import GridCell from './GridCell.vue'
import GridControls from './GridControls.vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Play, Square, Trash2, Plus, Check } from 'lucide-vue-next'

const gridStore = useGridStore()
const looperStore = useLooperStore()
const audioStore = useAudioStore()
const { initAudio } = useAudioContext()

const addStatus = ref<'idle' | 'success'>('idle')
const addStatusTimeout = ref<number | null>(null)
const previewMode = ref<'grid' | 'withLoops' | null>(null)

function showAddSuccess() {
  addStatus.value = 'success'
  if (addStatusTimeout.value) {
    clearTimeout(addStatusTimeout.value)
  }
  addStatusTimeout.value = window.setTimeout(() => {
    addStatus.value = 'idle'
  }, 2000)
}

function handleAddToLooper() {
  const layer = gridStore.createLoopLayer()
  if (layer) {
    looperStore.addLayer(layer)
    showAddSuccess()
  }
}

function stopPreview() {
  gridStore.stopPreview()
  audioStore.stop()
  previewMode.value = null
}

async function handlePreviewOnly() {
  // If already playing in this mode, stop
  if (previewMode.value === 'grid') {
    stopPreview()
    return
  }
  // If playing in other mode, stop first
  if (gridStore.isPlaying) {
    stopPreview()
  }
  await initAudio()
  await audioStore.init()
  previewMode.value = 'grid'
  gridStore.startPreview(false)
}

async function handlePreviewWithLoops() {
  // If already playing in this mode, stop
  if (previewMode.value === 'withLoops') {
    stopPreview()
    return
  }
  // If playing in other mode, stop first
  if (gridStore.isPlaying) {
    stopPreview()
  }
  await initAudio()
  await audioStore.init()
  previewMode.value = 'withLoops'
  gridStore.startPreview(true)
  audioStore.play() // Update audioStore state so loop track cursors show
}

// Generate step numbers for header
const stepNumbers = computed(() =>
  Array.from({ length: gridStore.stepCount }, (_, i) => i + 1)
)

// Check if pattern has any active cells
const hasActiveCells = computed(() =>
  gridStore.pattern.some((row) => row.some((cell) => cell.active))
)

// Check if there are loops to play with
const hasLoops = computed(() => looperStore.layers.length > 0)
const fullPiano = computed(() => gridStore.mode === 'melodic' && gridStore.melodicRange === 'piano')
const pianoViewport = ref<HTMLElement | null>(null)
const jumpNote = ref('C4')
const octaveTargets = ['C8', 'C7', 'C6', 'C5', 'C4', 'C3', 'C2', 'C1', 'A0']

function scrollToNote(note: string) {
  const viewport = pianoViewport.value
  const key = viewport?.querySelector<HTMLElement>(`[data-piano-note="${note}"]`)
  if (!viewport || !key) return
  const offset = key.getBoundingClientRect().top - viewport.getBoundingClientRect().top
  viewport.scrollTop += offset - viewport.clientHeight / 2 + key.clientHeight / 2
}

watch(fullPiano, async enabled => {
  if (!enabled) return
  await nextTick()
  jumpNote.value = 'C4'
  scrollToNote('C4')
}, { immediate: true })

const pianoRows = computed(() => gridStore.rowNotes.map((note, index, notes) => {
  const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  function pitchNumber(value: string) {
    const match = value.match(/^([A-G]#?)(\d+)$/)
    return match ? Number(match[2]) * 12 + pitchClasses.indexOf(match[1]!) : 0
  }
  const below = notes[index + 1]
  return {
    black: note.includes('#'),
    // In scales that omit sharps, show the intervening black key as decoration.
    blackKeyBelow: !!below && !note.includes('#') && !below.includes('#')
      && pitchNumber(note) - pitchNumber(below) === 2,
  }
}))
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Controls Bar -->
    <GridControls />

    <div v-if="gridStore.mode === 'melodic'" class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <template v-if="fullPiano">
        <span>88 keys · A0–C8 · Scroll to explore</span>
        <label for="piano-octave-jump">Go to</label>
        <select
          id="piano-octave-jump"
          v-model="jumpNote"
          class="h-8 px-2 rounded-md border border-border bg-secondary/50 text-foreground"
          @change="scrollToNote(jumpNote)"
        >
          <option v-for="note in octaveTargets" :key="note" :value="note">{{ note }}</option>
        </select>
        <Button variant="secondary" size="sm" @click="jumpNote = 'C4'; scrollToNote('C4')">Middle C</Button>
      </template>
      <span>Scale and Full piano keep separate patterns.</span>
    </div>

    <!-- Grid Container -->
    <div
      ref="pianoViewport"
      class="overflow-x-hidden"
      :class="{ 'piano-viewport': fullPiano }"
      :tabindex="fullPiano ? 0 : undefined"
      :role="fullPiano ? 'region' : undefined"
      :aria-label="fullPiano ? 'Full piano grid, A0 to C8. Scroll vertically to explore pitches.' : undefined"
    >
      <div class="min-w-0">
        <!-- Step Numbers Header -->
        <div class="flex" :class="{ 'piano-step-header': fullPiano }">
          <!-- Spacer for row labels -->
          <div :class="gridStore.mode === 'melodic' ? 'w-16 sm:w-20 flex-shrink-0' : 'w-12 sm:w-16 flex-shrink-0'" />
          <!-- Step numbers -->
          <div
            class="flex-1 grid"
            :style="{ gridTemplateColumns: `repeat(${gridStore.stepCount}, minmax(0, 1fr))` }"
          >
            <div
              v-for="step in stepNumbers"
              :key="step"
              :class="
                cn(
                  'text-center text-[9px] sm:text-[10px] text-muted-foreground py-1',
                  gridStore.currentStep === step - 1 && 'text-primary font-bold'
                )
              "
            >
              {{ step }}
            </div>
          </div>
        </div>

        <!-- Grid Rows -->
        <div class="border border-border rounded-lg overflow-hidden">
          <div
            v-for="(row, rowIndex) in gridStore.pattern"
            :key="rowIndex"
            :class="
              cn(
                'flex',
                fullPiano && 'piano-grid-row',
                fullPiano && gridStore.rowNotes[rowIndex] === 'C4' && 'middle-c-row',
                rowIndex !== gridStore.pattern.length - 1 && 'border-b border-border/50'
              )
            "
          >
            <!-- The melodic pitch rail is a visual piano; drum labels are unchanged. -->
            <div
              v-if="gridStore.mode === 'melodic'"
              class="grid-piano-key w-16 sm:w-20 flex-shrink-0"
              :class="{ 'grid-piano-key-black': pianoRows[rowIndex]?.black }"
              :title="gridStore.rowNotes[rowIndex]"
              :data-piano-note="gridStore.rowNotes[rowIndex]"
            >
              <span class="grid-piano-key-face">
                <span class="grid-piano-key-label">{{ gridStore.rowLabels[rowIndex] }}</span>
              </span>
              <span v-if="pianoRows[rowIndex]?.blackKeyBelow" class="grid-piano-accidental" aria-hidden="true" />
            </div>
            <div
              v-else
              class="w-12 sm:w-16 flex-shrink-0 px-2 py-1 bg-card/50 border-r border-border/50 flex items-center"
            >
              <span class="text-[10px] sm:text-xs text-muted-foreground truncate">
                {{ gridStore.rowLabels[rowIndex] }}
              </span>
            </div>

            <!-- Grid Cells -->
            <div
              class="flex-1 grid"
              :style="{ gridTemplateColumns: `repeat(${gridStore.stepCount}, minmax(0, 1fr))` }"
            >
              <GridCell
                v-for="(cell, stepIndex) in row"
                :key="stepIndex"
                :active="cell.active"
                :velocity="cell.velocity"
                :is-current-step="gridStore.currentStep === stepIndex"
                :is-beat="stepIndex % 4 === 0"
                :class="{ 'piano-grid-cell': fullPiano }"
                :aria-label="`${gridStore.rowNotes[rowIndex]}, step ${stepIndex + 1}`"
                :aria-pressed="cell.active"
                @toggle="gridStore.toggleCell(rowIndex, stepIndex)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Preview Button (shows Stop if this mode is playing) -->
      <Button
        :variant="previewMode === 'grid' ? 'default' : 'secondary'"
        size="sm"
        @click="handlePreviewOnly"
      >
        <Square v-if="previewMode === 'grid'" class="h-4 w-4 mr-2 fill-current" />
        <Play v-else class="h-4 w-4 mr-2" />
        {{ previewMode === 'grid' ? 'Stop' : 'Preview' }}
      </Button>

      <!-- With Loops Button (shows Stop if this mode is playing) -->
      <Button
        v-if="hasLoops"
        :variant="previewMode === 'withLoops' ? 'default' : 'secondary'"
        size="sm"
        @click="handlePreviewWithLoops"
      >
        <Square v-if="previewMode === 'withLoops'" class="h-4 w-4 mr-2 fill-current" />
        <Play v-else class="h-4 w-4 mr-2" />
        {{ previewMode === 'withLoops' ? 'Stop' : 'With Loops' }}
      </Button>

      <Button variant="secondary" size="sm" @click="gridStore.clearPattern">
        <Trash2 class="h-4 w-4 mr-2" />
        Clear
      </Button>

      <Button
        :variant="addStatus === 'success' ? 'outline' : 'default'"
        size="sm"
        :disabled="!hasActiveCells"
        :class="cn(
          'transition-all ml-auto',
          addStatus === 'success' && 'text-green-500 border-green-500/50'
        )"
        @click="handleAddToLooper"
      >
        <Check v-if="addStatus === 'success'" class="h-4 w-4 mr-2" />
        <Plus v-else class="h-4 w-4 mr-2" />
        {{ addStatus === 'success' ? 'Added!' : 'Add to Looper' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.piano-viewport {
  max-height: min(60vh, 480px);
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
}
.piano-viewport:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.piano-step-header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--color-background);
}
.piano-grid-row {
  height: 32px;
}
.piano-grid-cell {
  aspect-ratio: auto;
  height: 31px;
}
.middle-c-row .grid-piano-key-face {
  box-shadow: inset -3px 0 0 var(--color-primary);
}
.grid-piano-key {
  position: relative;
  border-right: 2px solid #26262e;
  background: #d5d4d1;
}
.grid-piano-key-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  border-bottom: 1px solid #9b9b9b;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(to right, #deddd9, #fffefa);
  color: #363640;
  box-shadow: inset -2px 0 0 #0001;
}
.grid-piano-key-label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.grid-piano-key-black .grid-piano-key-face,
.grid-piano-accidental {
  z-index: 2;
  width: 68%;
  border: 1px solid #111116;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(#404049, #16161e 65%, #292932);
  color: #f5f5f5;
  box-shadow: 2px 2px 3px #0006, inset -2px 0 0 #ffffff10;
}
.grid-piano-key-black .grid-piano-key-face {
  top: 10%;
  bottom: 10%;
  padding-right: 5px;
}
.grid-piano-accidental {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 48%;
  transform: translateY(50%);
  pointer-events: none;
}
</style>
