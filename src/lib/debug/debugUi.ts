/**
 * Debug panels, lab routes, and editor hotkeys are local-dev only.
 * Vite replaces this with `false` in production so dead-code elimination can drop labs.
 */
export const DEBUG_UI_ENABLED = import.meta.env.DEV;
