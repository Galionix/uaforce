# Main-menu update log and sound settings — 2026-09-12

The title screen shows the latest dated update in a compact panel. “All updates” opens the full history, newest first. Initial entries summarize shipped changes on September 12 and 11, verified against Git history. The panel is hidden on victory, defeat and practice screens. Both Ukrainian and English use the existing live localization system.

Maintain `src/game/updates.ts` when shipping future changes, and add matching English phrases to `src/game/en.ts`. Keep entries short and factual; do not announce planned features as available.

The old menu music button only forced background music on. It is removed, including its per-frame label update and styles. Settings now starts with a Sound group containing master, effects, music/riffs and announcer volume plus a background music checkbox explicitly covering menu and gameplay. Master volume is now persisted alongside existing channel/background preferences. Browser audio unlock still happens on a user gesture and respects the stored background preference; pause never starts menu music.

Validation: release build and all 373 existing tests passed. Silent browser checks covered opening/closing history, both locales, settings values surviving reload (master 0.2 and background off), restoring test defaults, responsive desktop and 812×375 touch layout, and no console errors. Mobile menu can scroll on short screens. Audio scheduling remains covered by mocked tests, including background disabled/menu/focus and silent mode; no live sound was played. No physical iPhone test was performed.

Published to https://uaforce.thedimas.com: Cloudflare Pages deployment `89c08edb-e235-4790-8714-167e68818f7b`, verified public bundle `game-BRonpv5z.js`.
