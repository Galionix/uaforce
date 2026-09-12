# Taira: independent combat kit — 2026-09-12

Owner feedback: two healing abilities and ineffective melee made Taira dull in solo play.
This supersedes the Taira portion of CHARGE_MEDIC_DELIVERY_2026-09-12.md; Klitschko is unchanged.

## Shipped kit

- **Бойовий дефібрилятор / Combat defibrillator**: one arc per press, 0.42-second cadence, three shots per battery and an automatic 1.8-second reload. First exposed forward target within 6 m receives 52 damage; up to two nearby targets receive 36/24. Hops require clear terrain and at most 2.8 m; secondary targets stay within 9 m of the caster. No repeated target. Electrical attacks chip shields and damage the body. Misses terminate on the first solid block and deal 52 terrain damage.
- **Медпункт / Aid station**: unchanged preventive support, two charges, 14-second charge recovery. Placed 3-second field, 4 m radius, restores 20 HP immediately and another 15 across five pulses to living friendly players/followers with clear cover. Does not stack for one caster.
- **Перевантаження / Overload**: replaces the living-party heal/protection ultimate. Detonates at the cast position after 0.35 seconds; 150 damage within 6.5 m. Arcs leave a 4-second ionization mark. Up to eight visible marked enemies within 9 m produce secondary 2.5 m blasts adding 100 damage, at most once per target (maximum total 250). Marks are consumed. Unmarked overload remains useful. Finite cover within the blast area takes 180 damage; enemy visibility is evaluated before cover breaks. Existing ammunition crates restore ultimate energy. In survival only, retains the fallen-partner rescue with 35 HP.

## Presentation and sound

Existing accepted lightning/blast atlases animate actual endpoints and marked detonation sites; no changes to hero sheets or new detailed artwork. Small ionization glyphs, inward preparation ring, expanding pixel rings, secondary blast sprites and the impact-timed screen flash/shake. New 32-pixel HUD icons distinguish attack, aid and overload. Ukrainian and English descriptions/release notes updated.

Five locally generated Stable Audio 3 Small SFX recordings, no runtime oscillators:
`taira-arc-v2`, `taira-prime-v1`, `taira-overload-v1`, `taira-cell-v1`, `taira-cell-ready-v2`.
Prompts/seeds: TAIRA_COMBAT_SFX_CATALOG.json. Exact edited PCM provenance, filters, master hashes and bank offsets: COMBAT_SFX_ASSETS.json. Hash-bound classifier screening: TAIRA_COMBAT_SFX_REVIEW.json. The previous 551 clip offsets and PCM are preserved. Combat bank now contains 556 clips.

Rejected: arc-v1 sounded like a transient by machine screening; ready-v1 matched glove impact; prime-v2 was less aligned with electrical material than prime-v1. Prime-v1 classification is ambiguous between equipment click and electrical spark; accepted as a short activation contact, not claimed as a verified rising tone. No human audition was performed. Final sound character needs owner listening; automated classification is not artistic approval.

## Verification

- 452 tests pass, including new damage/range/cover/chaining, magazine, pause/mark expiry, delayed one-shot ultimate, damage cap, no living-party heal, survival rescue and JSON co-op state tests.
- Mock audio checks activation, arc, overload and reload routing/cancellation. Exact PCM slices and SHA-256 match the shipped bank.
- Typecheck and release build pass: 123 files, 90.52 MiB.
- Codex in-app Browser, silent fixture `tools/verify-taira.html?silent=1`: visibly verified arc endpoints, three marks, secondary blast locations, reload 0→3 and existing pixel style. No audio output or saved-volume changes.
- Online protocol version 12 prevents mixing incompatible old/new renderers. Remote two-phone co-op was not run; simulation/snapshot coverage passed.
- Public URL/build identity recorded separately in TAIRA_COMBAT_DEPLOYMENT_RECEIPT.json after deployment.
