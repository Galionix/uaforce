# Charged punch and field medic — 2026-09-12

Owner feedback: Klitschko's normal punches killed too efficiently to justify charging; charging lacked noticeable presentation. Taira also felt like a strong melee fighter without useful visible support. This supersedes the balance numbers in KLYCHKO_REWORK_2026-09-12.md.

## Klitschko

Quick tap: 18 damage, 0.35 s recovery. Partial charge: 18 + 82 × charge². Full 0.9 s charge: 210 damage, 4.1 m reach, 0.65 s recovery, breaks a frontal shield and launches infantry. A full-health rifleman (96 HP) survives a quick tap; a full charge can finish a gunner (160 HP). Quick punches chip a frontal shield instead of bypassing it. Shield break, knockup and terrain collision remain host-authoritative. Walking while charging is 75% speed, previously 45%.

Thirty bounded pixel particles flow toward the glove. The full-charge hand flashes with a readiness star. Charged impacts use the existing short pixel atlas plus sparks, screen impulse and stronger physical impact audio. A lethal charged punch sends the existing capped gore fragments in the punch direction; fragments remain cosmetic and do not create extra gameplay damage. No character sprites were replaced.

Gather audio starts after 0.12 seconds, readiness plays once at full charge. Release/cast interruption cancels the gathering voice; snapshot reconciliation cancels it on hero change/death/mount entry. Existing global pause/audio behavior remains intact. Old Klitschko ability loops are disabled, as they belong to the previous block/time-slow kit.

## Taira

Melee: 22 damage, 2.6 m reach and knockback, interrupting infantry aim for 0.25 seconds. Existing 0.45 s attack cadence retained. A healthy rifleman survives the hit.

Special: place a 3-second aid station near a wounded friendly, otherwise at the caster. Radius 4 m, clear line between bodies required. It restores 20 HP immediately, then five 3 HP pulses to every living friendly in range (players and summoned followers). It can be placed before damage, cannot be stacked by the same caster, does not revive dead bodies or heal through solid walls, and cannot heal after the target leaves its radius. Two separate casters can provide support. Existing charges/cooldown retained.

The station uses the existing pixel medkit, a pulsing green boundary and rising crosses. Each actual healing tick emits brief recipient particles. Ultimate retains its revival/group protection logic and now emits recipient healing effects. Old special loop disabled; new air/equipment cue accompanies placement.

## Local sound

`CHARGE_MEDIC_SFX_CATALOG.json`: Stable Audio 3 Small SFX, local MLX, zero service cost. Installed `klychko-gather-v5`, `klychko-ready-v4`, `taira-field-v2`. First gather v4 rejected because CLAP classified its PCM as an explosion. v5 classified as air swoosh; readiness as glove impact; medical cue as air swoosh. These are automated semantic checks, not human artistic approval. No playback was performed. Source/edit hashes, exact bank offsets and screening are preserved in COMBAT_SFX_ASSETS.json; 548 existing offsets unchanged.

## Validation

441 tests pass; TypeScript and release build pass (123 files, 90.38 MiB). Added real infantry HP/shield tests, charge cue/cancel checks, directional gore/cap checks, group healing, walls/range/dead-body checks, pause and JSON snapshot tests. Updated current Ukrainian/English help and public release notes; co-op protocol 11 rejects stale clients.

Silent in-app browser fixture verified charge particles/readiness and aid station appearance. Health went 40/30 → 60/50 immediately → 75/65 by completion; field expired. Full visual/audio assets preserved in the public build. No real hardware gamepad or remote two-phone session was repeated, and audio was not auditioned by ear.
