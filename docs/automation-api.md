# Local automation API (version 2)

POST JSON `{ "command": "...", "args": { ... } }` to the local URL in
`.msxlab-runtime.json`, with `Authorization: Bearer <token>`. Never publish this file.
Existing commands retain their response format. New read/research commands normally
return `{project, session, observedAt, effect, data}`. `observedAt` is response time,
not an atomic timestamp across all panels. Use `apiCapabilities` for the supported list.

## Loading and restart

- `loadProject {id}` runs the project's configured loader and files.
- `configureLaunch` / `launchProfile` remain the configuration interfaces. This update
  does not change their schemas or make arbitrary sequential files safe to load.
- `restartProject {}` reloads the current saved project configuration.
- `reset {}` is the existing machine reset.
- `markInitialState {replace?:boolean}` creates checkpoint `api-initial` at the state
  YOU choose. It does not guess when the loader has finished. Existing checkpoint
  is protected unless replace=true.
- `restoreInitialState {}` restores that checkpoint; it does not reset research labels.
- `saveCheckpoint`, `listCheckpoints`, `restoreCheckpoint` continue to use complete
  emulator machine states and existing build/launch compatibility checks.

## Panels and images

- `listPanels {}`: mounted panel IDs, title, visibility, focus and saved preferences.
- `readPanel {id,limit?:100}`: rendered text (max 50k characters), first up to 500
  table rows, input/select values and canvas/image indices. This is DOM content,
  not a complete data model or a guarantee that every returned row is in the viewport.
  Inactive/unmounted panels may be absent. Password fields are omitted.
- `captureImage {}`: game-screen PNG as a data URL, without writing a capture file.
- `captureImage {panelId,index?:0,x?,y?,width?,height?}`: PNG from a panel's canvas
  or image; optional crop in source pixels. For example a sprite/tile atlas can be
  cropped to one item. SVG/CSS-only panels and entire panel chrome are not supported.
  Use readPanel to enumerate available image sources; export does not move selection.

## Memory and comparisons

- `readSlots {}`: live slot topology and current mappings.
- `readSlotMemory {primary,secondary,page,bank?,offset?,length?}`: existing safe,
  read-only physical memory reader; no slot switching. Unsupported devices reject.
- `readMemory`, `readDisassembly`, `readReferences`, `registers`: existing interfaces.
- `rememberState {name}`: read-only comparison baseline, up to 8 names in renderer RAM.
  Reusing a name replaces it. Baselines do not survive application restart.
- `compareState {name,limit?:1000}`: changes in CPU-visible memory, VRAM, registers,
  before/after slot mappings; max 10k returned changes and total count. Requires same
  project AND launch session. This is not a comparison of disconnected RAM banks,
  not a full-machine checkpoint and does not attribute changes to writers.

## Execution

- `runFor {milliseconds}`: start, wait 1–5000 real milliseconds, pause. The reported
  elapsed time includes engine delays. It does not resume past an intervening breakpoint.
- `runUntil {event:"address",address}`: existing instruction-boundary run-to.
- `runUntil {event:"time",milliseconds}`: alias for runFor.
- `runUntil {event:"write",space:"cpu"|"vram",address,timeoutMs?:3000}`: requires
  paused machine; adds a temporary engine write watchpoint, runs and stops at a write,
  another breakpoint, or timeout. Restores the current project's watchpoint list in
  finally. Range 1–5000 real ms. Returned reason identifies the actual stop.
- Slot-switch and image-appearance events are not implemented. Scope-aware stops
  depend on the existing breakpoint implementation; address alone does not imply bank.

## Research

- `upsertLabels {labels:[{id?,name,comment,space,type,address,end,memoryScope?}]}`:
  validates all entries before saving; existing ID updates, absent ID creates UUID.
  Optional scope is `{primary,secondary:null|0..3,bank?:0..255}` and requires cpu.
  Accepted types: PROC, DATA, COMMENT, AREA, LABEL, DATA DB, DATA DW.
  CPU limits 64K, other spaces use current snapshot sizes. Up to 500 entries.
- `undoResearch {}`: one-level undo of the last successful label operation, in the
  same project/session; refuses if labels changed since (including manual edits).
- `setBreakpoints` / `setWatchpoints`: existing validated replacements. They are not
  included in label undo. Structure schemas and general research undo are not added.

## Verification and activation

`npm run typecheck` and `node tests/automation-api.mjs` validate this addition without
loading any project. Restart/rebuild through the main task when convenient; this side
conversation intentionally does not restart the user's application or change the game.
