# MSXLab main screen v1

Generated with the built-in image_gen tool. Visual concept based on ТЗ.md; not an application screenshot. Instruction text and register values are illustrative.

## Generation prompt

Use case: ui-mockup
Create a polished high-resolution landscape screenshot of the main desktop window of MSXLab, a retro MSX reverse engineering debugger. Flat direct front-on full application screenshot, wide 16:10 or 16:9, no device frame, no perspective, no marketing captions. Faithful Visual Studio Code dark modern IDE aesthetic: charcoal #1e1e1e editors, #252526 sidebars, fine #383838 docking dividers, compact crisp typography, monospaced code, muted icons, blue active tab underline and bottom status bar. Dense but readable and disciplined professional tool, no rounded dashboard cards.
Top macOS title bar with traffic lights, title 'MSXLab — Demo Quest', centered command field 'Go to address or symbol…'. Slim toolbar with 'Run', 'Pause', 'Step Into', 'Step Over', 'Reset', and amber 'PAUSED' status. Far left narrow activity icon rail.
Main dock layout: left 17 percent width Projects tree above Labels tabbed with Patterns. Tree 'DEMO QUEST' contains game.rom, labels.json, memory.json, notes.md. Labels small table Addr / Name with 8000 MAIN, 8100 UPDATE_PLAYER, 8120 DRAW_PLAYER (blue selected), 8200 READ_INPUT, C000 PLAYER_X, C001 PLAYER_Y. Patterns sibling visible tab.
Central 53 percent width dominant Disassembler dock. Title tab 'Disassembler · game.rom', small badge 'Follow selection'. Columns breakpoint gutter, Address, Bytes, Z80 Instruction, Comment. Crisp realistic colored syntax, addresses muted, opcode bytes gray, mnemonics purple, registers pale blue, comments green. Visible rows:
8000 31 00 F0 LD SP,$F000 ; initialize stack
8003 CD 00 81 CALL UPDATE_PLAYER
8006 CD 20 81 CALL DRAW_PLAYER
8009 C3 03 80 JP $8003
blank label heading UPDATE_PLAYER:
8100 3A 00 C0 LD A,($C000)
8103 3C INC A
8104 32 00 C0 LD ($C000),A
8107 C9 RET
blank label heading DRAW_PLAYER:
8120 21 00 C0 LD HL,$C000 ; player position
8123 7E LD A,(HL)
8124 D3 98 OUT ($98),A
8126 23 INC HL
8127 7E LD A,(HL)
8128 D3 98 OUT ($98),A
812A C9 RET
Row 8120 visibly blue selected and yellow PC arrow and red breakpoint dot. Small code minimap on right edge of central dock.
Right 30 percent width stacked docks: Screen above Registers. Screen shows colorful authentic low resolution 256x192 retro MSX platform game, black backdrop, blue brick platforms, green vines, tiny explorer, yellow collectible gems, restrained 16 color pixel art, integer pixel sharpness. Screen header 'Screen' and '256 × 192 · Demo'. Registers below neat aligned pairs AF 0044 BC 0010 DE 1800 HL C000 IX C100 IY F380 PC 8120 SP EFFE. Highlight recently changed HL in amber. Small flags S Z H P/V N C with Z on. Secondary register row AF' BC' DE' HL'.
Bottom across central and right region, height about 25 percent: Memory dock on left two thirds, Trace / Breakpoints dock on right third. Memory header tabs 'Memory', 'ASCII', 'Bitmap', toolbar 'CPU' '$8120' 'Follow selection'. Hex rows start 8120 and show consistent bytes 21 00 C0 7E D3 98 23 7E D3 98 C9 00 00 00 00 00 plus ASCII dots. Next rows 8130,8140,8150. Trace active tab shows chronological rows '#0041 8103 INC A', '#0042 8104 LD ($C000),A', '#0043 8107 RET', '#0044 8006 CALL $8120'; Breakpoints inactive adjacent tab has red dot and count 1.
All nine named panel titles Projects Disassembler Registers Memory Screen Labels Patterns Breakpoints Trace must appear exactly once as panel headers or tabs. Dock headers with understated split and close icons, draggable tab look, practical scrollbars, carefully aligned separators. Bottom blue status bar 'Demo / Mock backend' on left, 'Z80 · Paused' and 'CPU $8120' and 'Layout: Default' on right. Clear visual hierarchy, comfortable readable high-resolution text, realistic production UI. No VS Code branding, no terminal, no web browser chrome, no irrelevant charts.
