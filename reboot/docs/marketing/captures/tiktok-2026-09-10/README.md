# UA Force vertical capture — 2026-09-10

Upload the three numbered MP4 files individually. Captions and publication steps are in `../../TIKTOK_PUBLICATION_2026-09-10.md`.

Source: `tools/capture-tiktok.html`, actual World/View/Sound and host-authoritative OnlineRoom/SnapshotWriter. Scripted actions, staged level-one arena and recording-only player invulnerability; no claim of organic player footage or balance testing. Enemy deaths, barrel physics, high-five and hero abilities are simulated by the game. Two genuine WebRTC peers run on the same Mac with a direct route, not two independent home networks. Final recording proof is in `capture-proof.json`.

Audio: existing game SFX bank, score and announcer only. WebAudio routes to MediaStreamAudioDestinationNode, never speakers. No new Google/Lyria generation. ffmpeg normalizes the file audio and encodes H.264/AAC; this is not subjective listening QA. All streams decoded without errors. Measured peaks: barrel -1.5 dBFS, high-five -2.3 dBFS, Shevchenko -3.7 dBFS. No missing/silent audio stream.

Picture: 360×640 design grid, integer nearest-neighbour output ×3. The action uses a 180×180 crop enlarged ×2 on that grid, with a brief barrel-tracking pan. The published game renderer is unchanged. Three 7.7-second 1080×1920, 30fps files; metadata in `media-check.json`. Covers sampled from those MP4 files. Hero/world resources preserve their existing pixel art.

Reproduce from `reboot`:

1. `npm run dev -- --port 5178`
2. `python3 tools/capture-receiver.py --output docs/marketing/captures/tiktok-2026-09-10/source.webm`
3. In Codex in-app Browser open `http://127.0.0.1:5178/tools/capture-tiktok.html`; wait for both peers; click recording. Audio is file-only even though this fixture does not use `?silent=1`.
4. After 24 seconds, check the proof shows barrelThrow/highFive/ultimate and >50 snapshots, then `python3 tools/build-tiktok.py`.

Do not change the main game's saved sound settings to make a recording. Capture fixtures are excluded from public release.
