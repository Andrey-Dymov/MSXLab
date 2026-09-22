# README screenshot

`msxlab-workspace.png` is a real capture of MSXLab in an isolated Electron session, using the English interface. It shows an original Z80 demonstration paused after displaying plain text and entering a byte-counter loop.

The demonstration uses `LD DE,message`, MSX-DOS output function 9, and a loop incrementing memory at C000. Its text was written specifically for this capture. The emulator screen was cleared before printing it.

Visual review: no game artwork, title screens, commercial program interfaces, personal paths, credentials, or desktop windows are visible. The WebMSX attribution remains visible in the status bar. This screenshot does not bundle the emulator, ROMs, DOS files, or game assets, and does not establish licensing rights for those components. See ../../THIRD_PARTY.md.

The user's active project and emulator session were not used for the capture.

## Japanese analysis workspace

`msxlab-analysis-light.png` shows the light theme with Japanese localization, PSG playback controls and a captured tone sweep, a font atlas, a function tree, a recorded call timeline, and the expanded panel selector. The tone-sweep COM program was written specifically for the capture. Glyph patterns come from the project's own experimental font fixtures, not a game character set. Capture used a separate temporary project and Electron profile; the user's active session was preserved.

## Architecture illustration

`msxlab-architecture.png` is an AI-generated illustration, not an application screenshot. It shows the WebMSX emulation foundation, MSXLab inspection panels, and user/API access. The English, pixel-art design was generated with the built-in image-generation tool and selected by the project owner. Panel contents are illustrative; no game screenshots or extracted game artwork were used.
