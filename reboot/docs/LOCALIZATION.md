# UA Force localization

Owner request, 2026-09-11: add English in settings alongside Ukrainian. This supersedes the earlier Ukrainian-only UI rule; Ukrainian remains the default and all existing voice audio remains Ukrainian.

## Behavior

- Settings → «Мова інтерфейсу» / Interface language → Українська / English.
- The choice is saved locally as `uaforce.language`. Switching updates the current interface and canvas captions without reloading, resetting the mission or changing save data.
- Menus, settings, touch accessibility labels, HUD, hero and weapon descriptions, operations, district names, boss announcements, story captions, enemy quips and connection messages are translated.
- Each co-op peer keeps its own language. Hero IDs, event payloads, simulation text, room codes and save records remain canonical; translation is a presentation boundary.
- Ukrainian audio/music and existing art are preserved. The external Tally form is still Ukrainian; the English UI explains that reports may be written in English. Raw diagnostic details and user-entered text are deliberately not rewritten.

## Maintenance

`src/game/en.ts` maps canonical Ukrainian phrases to reviewed English text. Longer phrases take precedence over fragments used in dynamic counters. Translation runs once on the source text; translated values are not recursively translated. The final antagonist remains Khuylo (Хуйло), not a new name.

`src/game/i18n.ts` owns locale preference, translation and change notifications. No browser API is required for pure translation tests. The bounded translation cache is shared by display surfaces.

`src/game/localized-dom.ts` retains source text in weak references and updates text nodes and accessibility attributes when the UI changes or a language is selected. It ignores scripts, styles, user inputs, diagnostics and explicitly untranslated content. It never replaces elements, event handlers or select values. Canvas captions call `translate()` before measuring and rendering.

When adding UI text, add its English phrase to the catalog. Keep structured data and game logic independent of display language. Run:

```
node --experimental-strip-types tools/audit-localization.mjs
npm test
npm run build:release
```

Audit coverage: 523 source occurrences. Local pure translation tests cover all catalog entries and all hero/weapon/mission/boss content, dynamic counters and locale isolation from world state. `tools/verify-localization.html` adds 12 silent real-DOM checks for updates, source restoration, attributes and protected inputs. It is not included in the release.

Browser verification: silent single-player start in English, live English → Ukrainian switch at mission time 00:11 with health/lives retained, saved language after reload, roster labels, dynamic HUD and accessible touch labels. Existing Ukrainian audio was not played.

## Publication, 2026-09-11

Cloudflare Pages Production: `72bf6eb9-f1d6-45bd-9a6e-5772bf6aa431`.
Public URL: https://uaforce.thedimas.com
Previous production for rollback: `e779d53d-3564-4456-8e02-077e8b1f92a7`.
Public script verified: `game-Ctkk0eEu.js`.

Final validation: 327/327 tests, 12/12 browser DOM checks, TypeScript and release verification passed (110 files, 71.32 MiB). On the public domain, selected English, verified translated menus and document language, reloaded to confirm persistence, then started single-player silently.

