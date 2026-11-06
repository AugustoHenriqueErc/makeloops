# Repository instructions

These instructions apply to this repository and its subdirectories.

## Language

- Keep all new or updated project content in English: documentation, UI text, code comments, identifiers, commit messages, and pull request descriptions.
- Preserve external names and existing public data identifiers when compatibility requires them.
- Explain musical terms in plain English. Assume readers may be new to music production.

## Contribution guidance

- This is a Vue 3 and TypeScript browser application using Pinia and Tone.js.
- Read the relevant guides in `docs` before changing the corresponding behavior.
- Describe implemented behavior accurately. Distinguish UI labels, actual capabilities, limitations, and proposed features.
- Update documentation when changing musical controls, timing, instruments, persistence, or export.
- Prefer focused, incremental changes that preserve the beginner-friendly workflow.
- Maintain `docs/future-implementations.md` as the continuing feature plan. Preserve stable feature IDs, distinguish planned work from implemented behavior, and append future requests without discarding earlier decisions.

## Verification

- For code changes, run `npm run build` when dependencies are available and report checks that could not run.
- For audio changes, also verify the relevant playback, recording, or export behavior in a browser when available. Build success does not establish audio correctness.
- For documentation-only changes, verify source accuracy, relative links, and file structure. Dependency installation is unnecessary.
- Do not claim runtime testing when only source inspection was performed.
