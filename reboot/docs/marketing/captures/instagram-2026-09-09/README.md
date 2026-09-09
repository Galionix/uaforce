# Instagram Reel — 2026-09-09

48.2-second vertical adaptation of the approved 89-second Kore trailer. Final: `UA-Force-Instagram-Reel-uk.mp4` (1080×1920, 30 fps, H.264/AAC 48 kHz stereo, 28.6 MB).

Cuts from the original master: 6–18 (Shevchenko), 18–36 (Lesya), 50–59.2 (two-player co-op), 80–89 (free prototype CTA). The existing narration and game audio are retained; no music/voice generation, paid service or new gameplay capture was needed.

The full-width gameplay preserves both co-op players. Animated blue/yellow bands, original typography treatment, large Ukrainian phrase captions and a persistent PC/browser CTA fill the mobile frame. No gameplay is stretched. `cover.jpg` is the uploaded cover; preview JPEGs are silent visual QA frames. Caption copy is in `caption.uk.txt`.

Rebuild using a Python environment with Pillow:

```sh
python3 tools/build-instagram-reel.py
```

The script uses ffmpeg from the existing Homebrew installation and existing macOS fonts. Rendering and validation are file-only and never play audio. ffprobe verified resolution, duration, rate and audio stream; full ffmpeg decode completed with no errors. No game code or public deployment was changed in this task.

Instagram was explicitly set to 9:16 (the website initially crops to square). Publication sound stays on; the edit preview stayed paused. AI label enabled; Ukrainian captions are burned in, so duplicate auto-generated captions are off. Facebook cross-posting and scheduling left off. Owner authorized Instagram and Threads publication from the signed-in account.
