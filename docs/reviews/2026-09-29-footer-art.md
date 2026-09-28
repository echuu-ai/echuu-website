# Footer artwork alignment

Reference: user attachment codex-clipboard-74770b81-0e14-4e40-8f07-27be11a04518.png (1064 × 982). Standard visual alignment, not pixel replica. Scope: independent website footer and creators art; no service changes.

The 1000 × 1499 wings source has approximately 484px transparent space above the head. Corrected positioning with an explicit width-linked offset rather than a percentage of the variable footer height. Capped desktop image width at 1000px, moved the figure behind the beta heading, preserved full natural content flow and two-column narrow-screen links.

Applied an sRGB color matrix that lifts green/blue more than red, with restrained saturation. Creators silhouettes now read cool white instead of cream; footer wings use the same cool grade and soft blur. Footer gradient ends in deep blue-black instead of pure black. Root clips decorative sky overflow so its blur does not extend below the footer; background retains overscan to avoid dark blurred side borders.

Checked in-app browser at 1440×1000, 1064×1100, and 390×844; no horizontal overflow at checked wide/narrow sizes. Screenshots /tmp/echuu-footer-cool-desktop.png and /tmp/echuu-creators-cool-mobile.png. Browser viewport restored. System Chrome and real Safari/iOS not verified. Existing 1pt text strokes, invitation modal flows, and scroll reveals retained. Original raster assets unchanged.

12 tests, 107-asset validation, TypeScript/Vite build and diff whitespace checks passed. Preview artifacts published as 0820698942eee3693a59939c0eb63aad0ab17067; Actions 36452431640 succeeded and live HTML serves index-C_g0k78w.js. Source work remains uncommitted.

## Follow-up: intro charm shadow
User supplied Figma panel: X8/Y16/Blur5/Spread0, opaque pale blue (hex truncated to BBD… in screenshot). Replaced old drop-shadow(0 24px 40px rgba(10,60,120,.28)) with drop-shadow(8px 16px 5px #bbd9e9). Color is a visual approximation of the provided swatch, not an extracted full hex. Browser computed filter verified, screenshot /tmp/echuu-intro-shadow.png; TypeScript/Vite build passed. No raster asset changed.

## Follow-up: crosswalk screen blending
Changed road and its reveal group to mix-blend-mode:screen. Removed hv-body's isolated stacking context so the group can blend with the shared root sky; otherwise screen would still composite against transparent black. Browser confirms computed screen and black backdrop disappearance; screenshot /tmp/echuu-crosswalk-screen.png. Production build passed.
