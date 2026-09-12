# Ability style, finite tank ammo and structural collapse

Owner correction: the first replacement generation was too detailed. It was rejected and never installed. New ability sprites use a 24×24 logical cell, the existing game palette and nearest-neighbor rendering. Generation prompt and provenance: `ABILITY_STYLE_REVISION_2026-09-12.json`.

- Hero character sheets and portraits are unchanged.
- Removed huge glove icons and false distant explosions. Punch contact flashes now occur at real enemy/cover contacts. Usyk has brief dash dust and compact quick contacts; Klitschko has a heavier contact and restrained guard/time-field effect.
- Taira uses a small medical satchel and healing particles. Almaziv grenades retain real arcs, bounces and collision explosions.
- Prytula uses the existing walking robot and the same pixel tank body as campaign tanks. Parachute/dust are separate transient elements; no trails baked into vehicle bodies. Delivery preview hands over to the actual vehicle exactly once.
- Campaign/summoned tanks: 8 shells. Wave reward tank: 5. Reload interval retained between shots; entering/exiting never refills shells. HUD shows the remaining number and disables the empty cannon. Prytula can replace an exhausted summon after obtaining another ultimate crate.
- Breakable stone, walls and crates formerly connected to an anchor can collapse when support is severed. A 0.3 second cracking warning precedes gravity; fallen material damages enemies (80) / players (18, existing invulnerability applies), shatters at contact and uses existing sampled debris SFX. Permanent floors prevent crush damage through cover.
- Structural connectivity uses a spatial grid and only recalculates after destruction. Guest receives host position, warning and falling state; no guest simulation. Protocol updated to co-op 9 so mixed builds ask players to refresh.

## Limits and next step
Bedrock, permanent route platforms and objective assets remain protected. Preexisting authored floating scenery is not automatically demolished. This is not a rigid-body simulation of every background building. A broader destruction pass needs mission-by-mission replacement of protected paths with redundant routes, debris landing zones and recoverable objectives; otherwise a collapsed ladder route can make completion impossible.

## Verification
427 automated tests passed, including structural support/severance, second-pillar stability, crushing, floor shielding, pause/reveal freezing, serialized host snapshots, finite shells and no refill on reentry. Campaign completion regressions remain passing. In-app browser fixtures checked silently: `tools/verify-roster.html?silent=1` and `tools/verify-collapse.html?silent=1`.

Local Node stress measurement (not phone FPS): 2,200 boxes, 1,800 falling construction tiles; initial support capture 7.38 ms, physics p50 0.18 ms, p95 1.24 ms, max 4.55 ms across 100 steps. Render load still uses existing bounded particle pools.
