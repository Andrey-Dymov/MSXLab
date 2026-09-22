# MSXLab wide workspace concept

Generated using built-in image_gen, referencing main-screen-v1.png. Concept illustration; generated addresses, map sizes and instruction details are not a validated debugger state.

## Prompt

Use case: ui-mockup. Create a second, expanded main-screen concept for MSXLab based on the supplied earlier screenshot. Preserve its exact visual design language: VS Code dark charcoal UI, square dock panels, thin separators, blue active headers and status bar, crisp monospaced code and small clean UI typography. This is a screenshot on a VERY LARGE ULTRAWIDE DESKTOP MONITOR, target 3840x1600 composition (2.4:1 aspect), maximum available resolution, direct flat full-screen capture, no monitor bezel, no perspective. It should look like the same application rearranged for an expert with MANY PANELS VISIBLE SIMULTANEOUSLY. Use the extra WIDTH for more panels, do not merely shrink the previous screenshot. Legible professionally aligned compact data. 16 separate visible dock panels, not hidden behind tabs. All panels have their own title bars, close/split controls and thin resize boundaries. Dense useful information, no blank unused areas.

Top 32 px title bar MSXLab — Demo Quest. Next compact toolbar Run Pause Step Into Step Over Reset, amber PAUSED, centered Go to address or symbol field. Narrow activity rail on far left. Blue status bar bottom: Demo / Mock backend | Z80 · Paused | CPU $8120 | Layout: Wide workspace.

Layout below toolbar: FIVE columns of widths approximately 13%, 30%, 21%, 20%, 16% excluding activity rail. Each column independently divided into vertically stacked docks. Ensure every listed panel is OPEN, its content visible, no overlap.

COLUMN 1, left sidebar: Projects top 23% height with DEMO QUEST expanded, game.rom, labels.json, memory.json, notes.md, assets folder. Labels middle 42% with columns Address / Name / Type, 10 rows such as 8000 MAIN PROC, 8100 UPDATE_PLAYER PROC, 8120 DRAW_PLAYER PROC selected, 8200 READ_INPUT PROC, 8300 CHECK_COLLISION PROC, C000 PLAYER_X BYTE, C001 PLAYER_Y BYTE, C010 ENEMIES STRUCT, C100 LEVEL_MAP DATA, C400 SCORE WORD. Patterns bottom 35% as a separate panel, not a tab next to Labels: 6 recognized patterns with address ranges and short type: 8100–8107 Position update, 8120–812A VDP transfer, 8200–8212 Input polling, 8300–8320 Collision check, C010–C08F Actor records, C100–C2FF Tile map. Highlight one row, several visible rows.

COLUMN 2, dominant code: Disassembler upper 68% height, same syntax highlighting as reference, columns Address / Bytes / Instruction / Comment. Show realistic code at 8000 MAIN, 8100 UPDATE_PLAYER and 8120 DRAW_PLAYER. Selected row 8120 21 00 C0 LD HL,$C000 ; player position with yellow PC arrow and red breakpoint dot. 8123 7E LD A,(HL), 8124 D3 98 OUT ($98),A, 8126 23 INC HL, 8127 7E LD A,(HL), 8128 D3 98 OUT ($98),A, 812A C9 RET. Include extra realistic rows and labels. Lower 32% Trace separate full-width dock with columns # / PC / Instruction / Cycles, 9 visible chronological instruction rows.

COLUMN 3, data inspection, FOUR separate equally tall docks:
Memory · HEX — toolbar CPU $C000 Fixed; 6 rows of 12 hex bytes and narrow ASCII, selected bytes blue.
Data · Numbers — toolbar CPU $C000 Unsigned 8-bit; aligned Address / +0 / +1 / +2 / +3 / +4 / +5 / +6 / +7 columns, 5 rows of decimal numbers, first values 32 64 3 1 128 16 0 255. A small selector 8-bit / 16-bit visible.
Data · Text — CPU $9000 ASCII; addresses alongside readable decoded strings 'DEMO QUEST', 'PLAYER 1', 'SCORE 000100', 'PRESS SPACE TO START', 'GAME OVER', nonprintable bytes represented with dots.
Data · Bitmap — VRAM $1800 1 bpp / 8×8; show a grid of 12 distinct monochrome 8x8 pixel tiles: explorer, ladder, brick, key, gem, vine, skull, door, heart, platform, arrow, coin; tiny address under each. Black and pale mint pixels, no smooth vector icons, a selected tile blue framed.

COLUMN 4, visual emulation: Screen upper 48%: colorful 256x192 pixel-art MSX platform game from the reference, blue brick platforms, green vines, explorer, yellow gems on black, score at top. Preserve correct 4:3 screen ratio centered within panel without stretching. Header 256×192 · Demo.
Memory Map middle 26%: a precise vertical or horizontal segmented 64 KB address-space map with axis $0000 $4000 $8000 $C000 $FFFF. Colored blocks BIOS ROM, Cartridge ROM, Code, RAM. Yellow PC at $8120, SP at $EFFE, blue selection band. Legend code/data/free. This is a debugger ADDRESS MAP not a geographic map.
VRAM Map lower 26%: address map $0000–$3FFF with colored contiguous segments Pattern table, Name table, Color table, Sprite patterns and Sprite attributes; smaller legend and selection $1800. Visually different segments yet same compact technical design.

COLUMN 5, rightmost: Registers upper 35% all key values with changed values amber, AF 0044 BC 0010 DE 1800 HL C000 IX C100 IY F380 PC 8120 SP EFFE plus AF' BC' DE' HL', flag checkboxes S Z H P/V N C. Stack middle 22% table Addr / Value / Symbol, 6 rows EFFE 8009 MAIN+9 etc. Breakpoints next 23% 4 enabled checkbox rows 8120 DRAW_PLAYER, 8200 READ_INPUT, 8300 CHECK_COLLISION, 8400 GAME_OVER with red dot icons and address. Watches bottom 20% columns Symbol / Value; PLAYER_X 32, PLAYER_Y 64, SCORE 100, LIVES 3, LEVEL 1.

Visual priority: Disassembler remains main focus; all 16 docks are simultaneously visible and populated, separate Labels and Patterns, four separate data renderers, two address maps. Compact but readable, generous ultrawide pixel canvas, clean alignment, no large wasted margins, no dashboard cards or shadows, no browser chrome, no code editor unrelated to Z80, no promotional text. English UI labels as in reference. This is an expanded layout concept, not an actual emulation claim.
