# Melee elevation, Klitschko and warehouse collapse — 2026-09-12

Owner report: Usyk could not damage enemies/tanks one tile below an indestructible floor. Klitschko felt too similar to Usyk. Continue the approved hero/destruction plan without replacing character sheets.

## Delivered behavior

- Melee tests actual exposed hurtbox points, including the front hull of tanks rather than only their center. Visible heads/turrets one tile below can be struck. A solid wall or a fully covering floor still blocks damage. This fixes hit detection; legitimate craters remain part of terrain destruction.
- Usyk retains rapid three-hit combinations and dash.
- Klitschko holds attack up to 0.9 seconds and strikes on release: 45–190 damage, 2.6–4.1 reach, 0.45–0.85 second recovery. Charging slows walking to 45%; a short bar and existing pose show readiness. Charge is cleared on hero change, death, mount entry and cast interruption.
- Uppercut deals 110 damage and launches infantry and the fighter. Knockup runs gravity while suppressing infantry attack/ladder AI. Vehicles and bosses are not launched.
- Knockout leaps, then plunges after 0.35 seconds. Damage (220), support damage (240), screen impulse and the dedicated slam sound happen only on actual landing, once. No global enemy time slow. Ground effects last 0.65 seconds. Charge, knockup and impact phase are host-owned and serialized; co-op version 10 rejects stale peers.
- Planned Ignition now has an intermediate deck above the second arsenal with two breakable columns, guards and ladders. Breaking both columns makes the deck fall onto explosive supplies. Upper ladder pads and the bypass remain accessible. Narrow columns break as whole objects so a muzzle-height slit cannot trap a wall-climbing fighter.
- Falling debris can ignite barrels and sabotage targets on direct impact. Existing permanent route protection is retained.
- Existing 24-pixel ability atlas, native tank renderer, character sheets, score and approved announcers preserved. No new detailed artwork.

## Sound provenance

Three new keys: `klychko-charge-v3` (leather/equipment tension), `klychko-uppercut-v2` (glove impact), `klychko-slam-v2` (concrete slam). Generated locally with Stable Audio 3 Small SFX via the existing MLX environment, zero paid requests. Prompts/seeds: `KLYCHKO_REWORK_SFX_CATALOG.json`; PCM hashes, edits, offsets and CLAP screening: `COMBAT_SFX_ASSETS.json`.

The first charge candidate v2 sounded semantically like a punch/block according to screening and was rejected before installation. v3 screens as equipment/leather foley. Screening is not artistic approval; no human audition was performed because all agent checks must be silent. Existing 545 clip offsets were preserved while appending three clips. Old Klitschko time-effect cues no longer trigger.

## Verification

- Reproduced the exposed-head failure in a regression test before changing melee collision.
- 435 automated tests pass, including cover occlusion, tap/charge behavior, uppercut gravity, actual-landing-only slam, pause, snapshots, and intact/destroyed solo/co-op mission routes.
- English catalog checked again after adding release notes: 4 tests pass.
- TypeScript and release build pass: 123 files, 90.28 MiB.
- In-app silent fixture `tools/verify-klychko.html?silent=1`: charge produced no shot; release dealt 190; uppercut launched both bodies; slam damaged only after landing; lower tank HP 320→282; both column cuts queued 16 deck pieces and the arsenal reached 0 HP after the fuse. Screenshots inspected for consistent pixel scale and retained upper route.
- Real remote two-phone co-op and subjective audio listening have not been repeated for this patch.

## Still later

Human listening and owner gameplay feedback on this Klitschko direction; deeper distinctive abilities for the remaining roster; further authored destruction encounters. These are not claimed complete by this patch.
