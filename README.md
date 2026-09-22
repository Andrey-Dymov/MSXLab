# MSXLab

**English** | [Русский](README.ru.md)

A desktop workspace for running, debugging, and exploring MSX software. MSXLab combines an emulator, a Z80 disassembler, memory and graphics viewers, sound analysis, code annotations, and tools for investigating game logic.

**Multilingual interface:** English, Russian, Japanese, Portuguese, Dutch, Spanish, and Simplified Chinese. Language packs cover menus, panels, settings, tooltips, and application messages. See [translation coverage](docs/LANGUAGES.md).

Work with the live state of an emulated machine: pause a program, inspect its data, identify instructions that changed it, and save your findings in a project.

MSXLab is under active development. Some specialized tools support only specific verified data formats; they do not automatically recognize resources in arbitrary programs.

![MSXLab debugging an original Z80 counter demonstration](docs/images/msxlab-workspace.png)

*Live debugging workspace, paused in a small demonstration written for this screenshot. No game artwork or third-party program screens are shown.*

## Getting started

The tested environment is macOS with Node.js 23 and npm. Other platforms have not been verified.

**The public repository does not include the emulator distribution, DOS system files, or user projects.** To use the existing local setup:

1. Clone MSXLab and, if you have access, the private MSXProjects repository into sibling directories.
2. Separately place your local WebMSX distribution in `MSXProjects/engines/webmsx-6.0.8`. It is excluded from both repositories pending clarification of its license.
3. Run the following commands from MSXLab:

```sh
npm ci
node scripts/link-projects.mjs
npm run build
npm start
```

See [repository layout and local setup](docs/REPOSITORIES.md) and [third-party components](THIRD_PARTY.md) for details. Supporting documents are currently mostly in Russian.

On a configured Mac, you can also open `Start MSXLab.command`. Launching again brings the existing window to the front.

For development, use `npm run dev`. A browser-only preview does not replace Electron: local project operations require the desktop bridge.

1. Open a project in **Projects** and wait for it to load.
2. Click the emulator screen to send keyboard input to the MSX.
3. Use **Pause**, **Step Into**, **Step Over**, and **Run** to inspect execution.
4. Open tools through **Panels**.
5. Add names and descriptions in **Labels**; they are saved with the project.

Selecting an address in a viewer does not change the program counter. Reset and execution commands affect the emulated machine.

## Features

### Workspace

- Light and dark themes.
- English, Russian, Japanese, Portuguese, Dutch, Spanish, and Simplified Chinese language packs for menus, panels, settings, tooltips, and messages. See [translation coverage](docs/LANGUAGES.md).
- Movable panels, tabs, and additional viewer instances.
- Expanded panel views with restoration to their previous positions.
- Visual highlighting when reopening an existing panel.
- Named layouts and saved settings for major panels.

### Execution and debugging

- Pause at instruction boundaries, resume, and step through Z80 instructions.
- Step over calls and run to a selected address.
- Breakpoints, including simple register conditions.
- Memory and I/O access watchpoints; VRAM write watchpoints.
- Registers, flags, stack, watched values, and a bounded execution trace.
- Edit RAM, VRAM, and registers while paused; undo the last memory write with conflict checking.

### Memory, slots, and code

- Hexadecimal, text, and numeric memory views, with fixed addresses or tracking of selections and registers.
- CPU memory, video memory, and individual project files. CPU memory means the current processor address map, including mapped RAM and ROM.
- A compact slot and subslot map, A/B connector labels, and highlighting of memory currently mapped to the CPU.
- Read supported physical slots and RAM banks without changing the program’s memory mapping.
- A **Memory Slots** panel showing 16 KB windows and their current mappings.
- Z80 disassembly with code/data views, procedure views, named operands, and address navigation.
- File disassembly with configurable base address and file offset.
- Labels, comments, procedure and data ranges, and annotation import/export.

File offsets and CPU addresses are different. Check the base address for programs with loaders, headers, relocated code, or banked memory. Physical slot reading depends on the device type.

### Search and analysis

- Search for numbers, text, and masked byte patterns.
- **Memory Changes**: compare memory states, filter changed values, and narrow down candidates.
- Known variable names alongside addresses, and writer-instruction information when the corresponding tracking is enabled.
- Instruction execution counters, function trees, and call timelines.
- Address links, memory activity maps, value plots, and structure diagrams.

Static analysis and recorded execution provide different evidence. Static analysis may miss indirect calls. A zero execution count applies to the observation period; it does not prove a function is never called.

### Graphics, sound, and game resources

- Emulator screen, PNG captures, and hardware sprite inspection.
- Sprites, tiles, fonts, palettes, bitmaps, and character maps.
- An **Assets** catalog of resource descriptions.
- SCREEN 2 inspection: character codes, pixel masks, per-line colors, and source data details.
- Format-specific level editing for supported project data; this is not a universal level editor.
- PSG registers, sound recording, piano roll, and music data export.

Level editing and title-screen reconstruction depend on the specific game format. PSG recording captures observed sound rather than recovering an original score.

### Saving your work

- Automatic project annotation saving and research change history.
- ROM versions and build bundles, with warnings when annotations do not match the program.
- Launch profiles separate from panel layouts.
- Named emulator checkpoints with project, build, and environment compatibility checks.
- Experimental input recording and replay.

Machine state, ROM versions, annotations, and panel layouts are stored separately. Restoring a machine checkpoint does not roll back all project files.

## Project formats

| Type | Main files | Launch behavior |
| --- | --- | --- |
| ROM cartridge | `.rom`, `.mx1`, `.mx2` | Mounts the image as a cartridge. |
| MSX-DOS | `.com` | Creates a 720 KB FAT12 disk with MSX-DOS 1 and launches `APP.COM`. Companion files can be included. |
| MSX BASIC | `.bas` | Creates a program disk and runs the BASIC program automatically. |
| Loader-based program | Original BASIC loader, including tokenized BASIC, and companion files | Runs the loader under its original name; the loader controls loading order, relocation, and module placement. |
| Demo | Internal mock backend | Simulates the interface; it does not execute real MSX software. |

Creating a project from a file accepts `.rom`, `.mx1`, `.mx2`, `.com`, and `.bas`. Configure loader-based programs through the project type selector, specifying the loader, machine, and companion files.

`.OBJ`, `.BIN`, and other modules may be companion files. Their extensions do not determine where or how they should be loaded. Multiple modules may load at the same address and relocate themselves elsewhere.

- Disks use DOS 8.3 filenames. Loader companion files retain their names.
- Machine settings include MSX1E, MSX1J, MSX2E, and MSX2J. Programs still require a compatible BIOS, memory configuration, and peripherals.
- You can attach an additional ROM, select DOS files, and configure the launch command.
- Disk images are part of the environment. Arbitrary `.dsk` files are not a separate direct project import type.
- Direct import of `.cas`, `.zip`, or arbitrary third-party emulator states is not included in this list.

Each project has a `projects/<id>/project.json` file. Depending on the project, adjacent directories include `program`, `environment`, `builds`, `research`, `resources`, `captures`, and `sessions`. Original programs are copied into the project, and prepared launch bundles are stored with checksums.

## Optional AI assistance

Connect your own Chat Completions-compatible provider in **Workspace settings → AI**. Enter its API base URL, model ID and your own API key. AI is disabled by default; no author account or key is bundled. See the [quick setup and data-sharing details](docs/AI.md).

## Automation and assistant integration

MSXLab exposes a **local HTTP API** and includes a **stdio MCP bridge** for compatible clients. Both control an already running instance on the same computer; access from other computers is not configured.

### API capabilities

| Task | Commands |
| --- | --- |
| Inspect status and projects | `status`, `projects`, `apiCapabilities` |
| Load and configure programs | `loadProject`, `createProject`, `updateBuild`, `configureLaunch`, `launchProfile` |
| Restart | `reset`, `restartProject` |
| Mark and restore an initial state | `markInitialState`, `restoreInitialState` |
| Save full machine checkpoints | `saveCheckpoint`, `listCheckpoints`, `restoreCheckpoint` |
| Control execution | `run`, `pause`, `step`, `stepOver`, `until`, `runFor`, `runUntil` |
| Read memory, slots, and code | `readMemory`, `readSlots`, `readSlotMemory`, `registers`, `readDisassembly`, `readReferences` |
| Search and compare | `searchMemory`, `rememberState`, `compareState` |
| Inspect panels | `listPanels`, `readPanel` |
| Capture images | `capture` saves the screen; `captureImage` returns a screen or panel image as PNG |
| Edit research | `readLabels`, `upsertLabels`, `undoResearch`, `setBreakpoints`, `setWatchpoints` |
| Change state and collect traces | `writeMemory`, `setRegister`, `trace`, `readTrace` |

### HTTP connection

At startup, the application writes its local API address and token to `.msxlab-runtime.json`. Do not hard-code the port. Send the token in the `Authorization: Bearer …` header.

Example POST body:

```json
{
  "command": "readMemory",
  "args": { "space": "cpu", "address": 57536, "length": 8 }
}
```

This reads eight bytes at `$E0C0`. JSON numbers are decimal. Responses contain `result` on success or `error` on failure. Newer commands also provide context such as project, session, timestamp, and action type.

Do not publish the runtime token file. Read commands do not alter the program’s data; execution, write, and state restoration commands can.

### MCP connection

Start MSXLab, then configure your client to run:

```sh
node /absolute/path/to/MSXLab/scripts/mcp.mjs
```

The bridge forwards requests to the same local HTTP API. Its actual tool list is available through `tools/list`.

**HTTP and MCP coverage currently differ:** newer commands documented in `docs/automation-api.md` are available over HTTP but are not yet registered in `scripts/mcp.mjs`. Client configuration is not installed automatically.

### Limitations

- Mark the initial state explicitly after reaching the desired point; the application does not infer it.
- `readPanel` returns rendered panel content, not the complete underlying model. Unopened panels may be absent.
- `captureImage` exports a canvas/image or a region of it; it is not a general screenshot facility for every panel.
- `compareState` compares CPU-visible memory, VRAM, registers, and slot mappings. Unmapped RAM banks are not included.
- `runUntil` supports address, memory-write, and time conditions. Slot-switch and image-appearance conditions are not implemented.
- `undoResearch` reverts the last API label change and rejects conflicting subsequent edits. It is not a general project rollback.
- This README describes the source tree. An older running build may require an update before newer commands are available.

See the [automation API reference](docs/automation-api.md) for arguments, limitations, and examples.

### Analysis workspace in Japanese

![MSXLab light theme with Japanese menus, PSG playback, font inspection, and call analysis](docs/images/msxlab-analysis-light.png)

*Light theme with the panel selector open. The demonstration uses an original test-tone program and project-owned font samples; the PSG capture and call timeline contain recorded execution data.*

## Documentation

AI setup is available in English and Russian; the other supporting documents below are currently in Russian:

- [Graphics and assets](docs/ASSETS.md)
- [Music and PSG](docs/MUSIC.md)
- [Memory activity](docs/ACTIVITY.md)
- [Text encodings](docs/TEXT-CHARSETS.md)
- [AI integration](docs/AI.md)

## Development and validation

Built with Electron, React, TypeScript, and Dockview, with emulation accessed through a WebMSX adapter.

```sh
npm run typecheck
node tests/automation-api.mjs
npm run build
```

These commands check types, test the extended API against test data, and build the interface. They do not establish compatibility with every MSX program. Integration tests live in `tests` and `scripts`; check which projects and files they create before running them.

## Repositories

Laboratory source code and user projects are stored separately. See [connecting MSXProjects](docs/REPOSITORIES.md).

## Contributing and licensing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and [THIRD_PARTY.md](THIRD_PARTY.md) for third-party components. **Noncommercial use is permitted**, including copying, modification, and redistribution, provided that you retain attribution and a link to **https://github.com/Andrey-Dymov/MSXLab**. Commercial use requires separate permission from the author. See the [MSXLab Noncommercial Attribution License](LICENSE) for the full terms. This license does not cover third-party components.
