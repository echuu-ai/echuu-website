# Team visual alignment — 2026-09-30

Scope: local /website/{locale}/team. Standard fidelity to the current homepage, not a replica or an awards certification. Content and outbound URLs unchanged. Reference: current local HomeV2, HOME_ASSETS.skyBg and home.css; homepage cloud background reused with 22px blur. No new asset, API, dependency or account action.

Changes: route-scoped sky and navigation/footer treatment; existing brand typography for heading; remove placeholder initial avatars; pale silver-blue cards, founder wider on desktop, single-column mobile; pill links, restrained star accents; existing Reveal and reduced-motion behavior retained. Fixed legacy layout.css overriding team card geometry by scoping page selectors.

Verification: in-app browser at 1440×960 and390×844, eight profiles preserved, no horizontal overflow; mobile menu open/close; English and Japanese mobile overflow checked. 109 asset hashes,14 tests,TypeScript and production build passed (existing large chunk warning remains). Not a system Chrome/iOS/Safari or exhaustive accessibility audit. Not pushed or deployed.

Evidence: /tmp/echuu-team-desktop.png and /tmp/echuu-team-mobile.png.

## Shared homepage header/footer follow-up

Replaced the team route's legacy SiteHeader/SiteFooter with HomeHeader (extracted unchanged from OpeningHero) and the existing HomeFooter. TeamChrome supplies the accessible menu and existing signup AccessDialog. Home section menu links and footer demo link include the localized homepage path so they work from team. Kept the blurred homepage sky behind the team content and footer transition. Removed obsolete legacy chrome color overrides.

Verified: menu opens, Escape closes and restores trigger focus; beta CTA opens the existing signup dialog; homepage destination hashes inspected. Desktop 1440px and mobile 390px have no horizontal overflow. Asset verification (109), tests (14), and production build passed; existing chunk-size warning remains. Local only, no commit/push/deployment. Footer evidence: /tmp/echuu-team-shared-footer.png.
