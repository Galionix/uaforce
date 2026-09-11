# Mission atmosphere and combat effects — 2026-09-12

All 12 operations now select an explicit pixel-art atmosphere. River: sunlight and drifting motes; urban operations: drizzle; coast and airfield: storms; mountain operations: snow; rail: industrial dust; marsh: night and fireflies; depot: ash; finale: firestorm. Existing scenery, sprite sheets, score and sound effects remain in use.

Explosions add outward debris, embers, expanding pixel smoke and stepped shock rings. Weapon fire leaves small smoke puffs; ordnance leaves trails. Weather has different speeds and depths, rain stops at surviving roofs, fog drifts and checkpoint flags ripple. Storms briefly illuminate the scene with branching pixel lightning and slight camera movement. The existing reduced-presentation preference disables storm flashes and shaking.

`src/game/scene-fx.ts` owns presentation only: independent RNG, 900-particle limit, 18-ring limit, offscreen culling, cached smoke/vignette canvases and no blur or pixel readback. Legacy particle queues are also capped. Simulation, damage, AI, networking and gameplay RNG are unchanged. Pause freezes weather, smoke and lightning; mission reset clears them.

## Performance evidence

`ATMOSPHERE_PERFORMANCE.json` contains the actual recorded runs. The silent fixture uses the same deterministic world/assets and a 640×360 canvas in a 788×988 InApp Chromium viewport. Each of three scenes runs 225 frames, excluding the first 45 as warmup. The explosion stress scene emits six explosions every 12 frames. Compare the previous renderer from commit `1f3b52d` with the new renderer. Rendering runs against a fixed world: these are render-cost measurements, not a full simulation or multiplayer benchmark.

| CPU4 scene | Before render p95 | After render p95 | After FPS | Frames >25ms |
|---|---:|---:|---:|---:|
| River | 1.8ms | 2.1ms | 60.00 | 0 |
| Storm | 2.1ms | 1.7ms | 59.98 | 0 |
| Chain explosions | 2.1ms | 2.8ms | 59.96 | 0 |

Native runs likewise stayed near 60 FPS; enhanced render p95 was 1.6–1.8ms. Small improvements in some rows are measurement noise, not a claimed optimization. Fourfold CPU throttling is a stress check on this Mac, **not a physical iPhone/GPU/thermal test**. Canvas submission timing does not measure GPU completion separately; RAF intervals capture observed delivery cadence.

No effects slider was added: measured FPS did not materially change. Revisit this decision if real phones show sustained slowdown. Do not infer universal 60 FPS from these samples.

Reproduce: run `python3 tools/prepare-atmosphere-baseline.py`, start Vite, open `/tools/verify-atmosphere.html?silent=1` and the same URL with `&baseline=1`, then select «Заміряти». Keep the tab foreground. For CPU4, use Chromium's CPU throttling and restore rate 1 afterward. Preview buttons show storm, night, snow, explosions and the peak lightning frame. No audio engine is created.

## Validation

- 373 tests passed, including cosmetic state isolation, bounded allocation, expiry, mission coverage, lightning envelope and pause freeze.
- `npm run build:release` passed: 112 files, 87.06 MiB.
- Silent release-browser check: main menu → single player → pause; no browser errors.

## Publication

Published to https://uaforce.thedimas.com on 2026-09-12 through Cloudflare Pages. Deployment `06b6f5d9-4e99-4001-838b-6534d2555d65`; public bundle `game-Cpd4JyQT.js` verified in the browser, with no console errors.
