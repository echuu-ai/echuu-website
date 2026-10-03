# Team: remove added decoration, use a React glass library

User reference: marked team screenshot (heading star, repeated card stars, external-link arrows). Scope is team content; shared home header/footer retained.

Audit: redundant stars, gradient/card chrome, pill links and hover lift were introduced without content purpose. Removed them. User explicitly requests glass, so this overrides de-ai-ui's default preference for plain surfaces. Existing homepage typography and blurred sky are retained; no extra ornaments or copy added.

Implementation: @liquidglassjs/react and @liquidglassjs/core 0.6.0, MIT, React >=18. The similarly named rdev/liquid-glass-react requires React >=19 in published peer dependencies; it was evaluated then removed, without upgrading the app's React 18.3.1. Library LiquidGlass owns the background/refraction/rim for eight profiles and the about panel. Its ps-glass__content layer keeps selectable text and normal links above the effect. No custom CSS glass filter, gradient, border or shadow on member cards.

Tokens: retained brand title + UI family; card radius 20px; inner padding 32px desktop/24px mobile; body and roles >=15px; silver-blue paper and navy ink. No card hover translation. Native library accessibility/fallback behavior retained; Safari is not claimed verified.

Verification: rendered 9 mounted library surfaces, 8 profiles, 0 removed star nodes; 1440px and 390px widths without horizontal overflow. 24 tests, 109 resource hashes, TypeScript and Vite build pass. Existing large-chunk warning remains. Screenshot /tmp/echuu-team-liquid-glass.png. Local only, no push/deployment.

Library documentation: https://github.com/amir-abushanab/liquid-glass-js/tree/main/packages/react
