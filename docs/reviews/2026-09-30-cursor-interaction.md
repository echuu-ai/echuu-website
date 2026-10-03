# Cursor interaction correction — 2026-09-30

Local independent website only; no backend/environment changes, no publication.

Removed the velocity-driven cursor-motion module: it armed a 1150ms glide after fast movement, separate from deliberate long-press flights. Normal pointer positioning now remains exactly at the pointer hotspot without offsets, steering inertia, bank/pitch easing or motion blur. Explicit background hold flights remain available; reduced-motion still disables them.

Control hits cancel active gestures and reset flight pose immediately. The animation frame rechecks the visible hit surface, including newly opened dialogs beneath a stationary pointer. Launch filtering includes the event composed path, focusable custom controls, media controls and embedded frames alongside existing buttons, links, inputs and dialog surfaces.

Validation: 24 tests passed including control/descendant suppression and background eligibility; 109 assets unchanged; TypeScript and Vite production build passed with the existing chunk-size warning. Local team page signup dialog inspected in the browser, no form submitted. Screenshot /tmp/echuu-cursor-ui-check.png. No claim of exhaustive physical mouse/touch cross-browser testing.
