# Smooth mobile camera — 2026-09-12

Two presentation issues caused the turn jerk: mobile look-ahead jumped between ±64 pixels when facing changed, and the mobile thumb-space correction was applied after camera damping, effectively cancelling horizontal follow smoothing.

The thumb-space correction now adjusts the camera target before following it. Horizontal and vertical following use time-based exponential damping. Mobile facing look-ahead uses a critically damped spring with continuous velocity, so even the first reversal frame eases in. It reaches about 95% of a turn in 0.26 seconds. Zoom-in after co-op partners regroup is smooth; zoom-out and safety constraints immediately keep both players in view. Mission reset initializes framing without inheriting old direction. Paused presentation gets zero delta; authored story cameras remain authoritative. No input, player physics, damage or networking changes.

Verification:

- 376 tests pass; new regressions cover the original facing jump, quick monotonic settling, pause/reset, equivalent 30/60/120 FPS response, unchanged actors, and co-op containment.
- Silent real-renderer fixture `tools/verify-camera.html`: 270 fixed 60Hz frames at 135% zoom, repeated reversals. The old crop formula moved the hero 129.28 canvas pixels in the reversal frame; the new renderer moved 6.38 pixels. The hero stayed in the visible range x=233.6–362.88 of a 640-pixel frame. This compares the old framing formula against the current renderer; it is not a physical-phone latency measurement.
- Release build passes, 112 files, 87.07 MiB. Browser validation uses `?silent=1`, including 812×375 touch emulation; no live audio or physical iPhone test.

The release is recorded in the player-facing update log in Ukrainian and English.

Published to https://uaforce.thedimas.com: deployment `0b80f37b-f561-4190-afd1-7db5f5621318`, verified public bundle `game-DPQFYxwf.js`.
