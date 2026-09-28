# Figma alignment — 2026-09-28

Surface: independent website repository, `/website/{zh,en,ja,ko}`, local port 5180.
Reference: Figma file `SbqimktgOKSM7cnvWGs8hk`, node `2038:1044` (1440px desktop design). Fresh MCP design context and screenshot retrieved this turn; logo node `2038:1070` inspected separately. Standard fidelity, not a pixel-identical claim. Mobile reflow is an implementation adaptation because this reference is a desktop frame.

## Changes tied to source evidence

- Logo: replaced the older square image with extensive transparent margins with the unaltered MCP image fill `e5db6.png` from node 2038:1070. The image now uses the source 344:155 display ratio. Manifest includes provenance and checksum. Original image retained.
- Background: removed repeated vertical sky tiling, softened the continuous sky layer and introduced a shared terminal sky color between content and footer. Footer sits outside the sky body so sky cannot leak below its ending. Footer transitions through source blue hues into black.
- Intro: restored white body copy, desktop 1066px card with 42px horizontal and 32px vertical inset, and an overhanging 433px brooch.
- Steps and modes: restored larger step numerals, source-like desktop spacing, girl placement to the right of heading, and large key halves framing the mode heading.
- Creators: restored compact 235px actions, desktop manifesto placement and overlapping circle artwork. Mobile buttons remain compact rather than stretching across the viewport.
- Removed artificial white text strokes and the footer divider absent from the reference. Preserved existing navigation, responsive reflow, reduced-motion handling and opening animation fixes.

## Verification

- `npm run build`: passed (TypeScript and Vite); existing >500KB bundle warning remains.
- `npm test`: 9 tests passed in 3 files.
- `npm run check:assets`: 107 assets checked, zero missing or changed.
- `git diff --check`: passed.
- Local `/website/zh`: HTTP 200.
- System Chrome visual verification attempted through CUA; opening the local page timed out and reset the kernel. Consequently no actual-page screenshot comparison, mobile viewport acceptance, or interactive browser acceptance is claimed. Desktop 1440px and mobile 390px/768px remain to be visually reviewed when the browser bridge responds.

No deployment or Git push performed. Before-change source backup: `/tmp/echuu-before-figma-20260928` (local, temporary).
