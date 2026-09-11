# UaForce browser reboot

- Announcer authority (owner, 2026-09-12): replace every shipped announcer with Google
  Fenrir, using the approved deep-timbre audition at normal speaking speed. Hero names
  are powerful, routine callouts restrained, boss introductions sinister, victories
  congratulatory. Latest owner correction: publish only the six reviewed Gemini 3.1 Fenrir names
  (Shevchenko, Lesya, Franko, Bandera, Bander-Bro, Mamai), preserving other existing
  voices. Gemini 2.5 Fenrir generations were rejected and MUST NOT be installed.
  This supersedes the complete-pack-only gate. Receipt: `docs/FENRIR_PARTIAL_RELEASE.json`.
  Generation history: `docs/FENRIR_REPLACEMENT.md`.
  This supersedes earlier instructions to preserve Algenib or macOS Lesya announcements.
  Use `tools/generate-fenrir-pack.py` for staged, sequential, resumable generation.
  Preserve music and combat SFX; never run legacy announcer generators over this pack.

- Public release notes: maintain `src/game/updates.ts` newest-first with actual release
  dates and concise player-facing shipped changes, plus English phrases in `en.ts`.
  Main menu shows only the latest summary; full history stays in its dialog. Sound
  controls belong in Settings; do not restore the one-way main-menu music button.

- Music replacement authority (owner, 2026-09-12): `docs/FLOW_MUSIC_REPLACEMENT.json`
  and `docs/FLOW_MUSIC_WORKFLOW.md`. Generate through Google Flow Music in the
  Codex in-app browser, one UAForce project/session, one request at a time. Wait
  for actual audio completion, download and decode before the next generation.
  New Flow background tracks and musical cues supersede the old Lyria music
  assets once installed; keep spoken voices and combat SFX unchanged. Preserve
  the separate menu melody, pause semantics, remembered positions and ducking.
  Never restore legacy music with separate-menu-score.py over the new score.

- All game UI is Ukrainian; use the existing pixel style and keyboard/gamepad controls.
- User instruction, 2026-09-09: all agent tests must be silent because playback is distracting.
  For gameplay browser checks use `?silent=1`; this prevents AudioContext creation, including the announcer.
  Both `tools/verify-roster.html` and `tools/verify-scene.html` are silent fixtures.
  Test audio scheduling with mocks or inspect files without playback. Do not change the user's saved volume.
- Use only the Codex in-app Browser for browser checks.

- Presentation update authority: `docs/PRESENTATION_UPDATE.md` and `docs/LEITMOTIF.json`.
  Owner correction: the title melody must NEVER be inserted into gameplay background tracks.
  Menu and pause are separate; pause does not play title music. Use tools/separate-menu-score.py.
  `tools/audio-source/score-before-leitmotif` preserves original masters; do not replace the
  current score with legacy synthesizers or run tools/arrange-leitmotif.py over it.
- The hostile faction is the Russian armed forces; Putin is the final boss. Current boss art
  provenance is in `docs/REAL_BOSS_ART.json` and `docs/REAL_BOSS_SPRITES.json`.
  Current named antagonists: Valerii Gerasimov, Sergei Surovikin, Vladimir Putin.
  `docs/REAL_BOSSES.md` supersedes the earlier anonymous commanders and code-drawn Putin art.
  Do not run legacy boss-art scripts over current generated assets. Per-character movement/contact sounds are implemented; authority is `docs/HERO_FOLEY.md`.
  Keep contact sounds distance-triggered, quiet under combat, silent during announcements, and
  cancel them on pause. Readiness cues follow actual charge recovery, never individual shots.

- Owner naming override: the Putin-inspired final antagonist is named «Хуйло» everywhere
  in the visible Ukrainian game and announcer audio. Keep internal resource key `putin`.

- Latest music/pause/reveal authority: `docs/MUSIC_AND_MOTION_REVISION.md`.
  Full reveal motion is explicitly requested by owner even when OS reduced-motion is enabled;
  keep the separate in-game reduced-motion option. Never start a reveal before art decoding.

- Infantry authority: `docs/ENEMY_ROLES_AND_AI.md`. Preserve line-of-sight detection,
  local alert cue, finite projectile ranges, real magazines, chase/search and fuse telegraphs.
  `navigateGround` is shared with followers; verify both when changing navigation.

- Barrel/death presentation authority: `docs/BARRELS_AND_ENEMY_DEATH.md`. Keep interaction
  on square/F and jump on cross/Space. Enemy gore is cosmetic, not extra area damage.
  Enemy quips now follow `docs/ENEMY_HUMOR.md` and the saved owner brief.
  Preserve Ukrainian text, actual cause/role matching and readable, limited captions.

- SFX regeneration backlog: `docs/SFX_REGENERATION_AUDIT.md` and `.json`, AUDIO-05 in `docs/BACKLOG.md`. Historical audit is complete; replacements are now delivered in `docs/COMBAT_SFX_DELIVERY.md` and `docs/COMBAT_SFX_ASSETS.json`. `tools/build-combat-sfx.py` produces sample-based SFX and the single PCM bank; preserve exact offsets in release. Do not reintroduce runtime oscillator/PCM placeholders. Preserve approved music/announcer and keep all checks silent.

- Future hero expansion: `docs/HERO_EXPANSION.md`, HERO-01. Owner requested Klitschko and Usyk; Vitali identity is an assumption. They are designed, not implemented; Prytula/Khlyvnyuk are proposals. Current playable roster remains eleven.

- Public-demo/co-op authority: `docs/PUBLIC_DEMO_AND_COOP.md` (owner, 2026-09-09).
  Public name UA Force; keep internal references out of public positioning. Preserve independent
  single-player, silent tests, Cloudflare Pages URL and optional support. Online is two-player
  host-authoritative; no guest simulation, no progression writes from co-op. Payment provider
  credentials and raw mailbox/Knowledge evidence must never enter this public repository.
