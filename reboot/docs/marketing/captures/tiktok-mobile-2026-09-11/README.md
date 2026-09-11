# TikTok mobile update — 2026-09-11

Fresh 36-second capture of the current World/View/Sound, cut into three short (6.7 / 7.7 / 7.7 seconds) H.264/AAC 1080×1920 clips at 30 fps. Long inactive tails were cut from the source. Pixel flag sweeps and captions are drawn on a 360×640 design canvas, then enlarged with nearest-neighbour sampling. A control explanation graphic appears in clip 1. This is staged desktop capture, not physical phone footage or an independent network playtest.

Reproduce from reboot directory:

1. `npm run dev -- --port 5178`
2. `python3 tools/capture-receiver.py --output docs/marketing/captures/tiktok-mobile-2026-09-11/source.webm`
3. In Codex in-app Browser, open `http://127.0.0.1:5178/tools/capture-tiktok-mobile.html?silent=1` and press the recording button after the two WebRTC clients connect.
4. Audio routes only to MediaStreamDestination, never to speakers. Existing music/SFX/announcer are reused. No Google generation or payment.
5. Save visible completion evidence as capture-proof.json; reject capture unless throw/high-five/ultimate and network snapshot counts pass the fixture gate.
6. Run `python3 tools/build-tiktok-mobile.py`.

media-check.json records ffprobe metadata and full decode passed for each output. audio-check.json contains non-silent file levels; speakers were not used. Covers reviewed visually. Original source.webm remains local; deliverable ZIP contains only MP4/JPG/caption TXT/instructions.

Public landing source: tiktok.html, src/landing.ts. New gameplay still: public/assets/marketing/mobile-gameplay.png, extracted from the new Shevchenko clip and compressed losslessly to WebP in release. No new generated art.

Release verification: TypeScript and release validation passed (110 files, 71.27 MiB). Local landing checked at 390×844: 390px document width, launch button inside the first viewport, gameplay image decoded, copy action succeeded, mobile heading selected with coarse pointer. Production landing shows the new content and the compressed gameplay still decodes at 720px; launch preserves utm_source=tiktok. Production deployment: be2a2502-d4b2-4838-aec2-537c1b428e6d. Previous deployment for rollback: 23ce9cb4-e504-49d0-a4de-e805d8e21fb4.
