# Announcer auditions and unlock timing — 2026-09-12

Owner reports that the current “Перемога!” sounds like “Перемола”. The existing victory clip is 0.833s, Gemini 2.5 Flash TTS with Algenib; original hero names used Gemini 3.1 Flash TTS. Do not assume switching provider is necessary: the current provider is already Google.

Three alternative Google Gemini 3.1 Flash TTS auditions are saved in `docs/voice-auditions-2026-09-12/`: Kore (confident female arena delivery), Orus (commanding male delivery), and Fenrir (exuberant male delivery). Each reads the same Ukrainian lines: “Перемога! Новий боєць! Тарас Шевченко! Леся Українка! До бою!” Prompts emphasize articulation and Ukrainian stress; processing is limited to a 60Hz high-pass and equal loudness, with no pitch shifting, distortion or echo. Raw WAV, normalized WAV and per-file model/prompt/hash metadata are retained.

Independent Gemini 2.5 Flash transcription, without the intended transcript in the request, recognized “Перемога” and all intended words in all three samples. This is an automatic intelligibility check, **not human approval of accent, delivery or timbre**. No speaker playback occurred. Owner should choose the preferred voice before producing and replacing the full announcer pack. Auditions are not included in the public game bundle.

Google documents Ukrainian TTS and these preset voices at https://ai.google.dev/gemini-api/docs/speech-generation (checked 2026-09-12). `tools/audition-announcers.py` uses the existing locally configured Google key through `--env-file`, never embeds it in the game or metadata. Generate one sample at a time.

## Delivered timing correction

The old hero sting lasted only 3.15 seconds, while “Новий боєць” + Shevchenko already took 3.97 seconds plus lead/gaps. The riff envelope also dropped to 22% and never recovered. Re-edited the same approved Flow Music master into an 8.4-second phrase starting at 0.17s, with no looping, new generation or time/pitch alteration. The source is unchanged and preserved. `tools/extend-hero-sting.py` records the edit and updates the score manifests. The general preparation tool also retains the longer hero duration.

Hero music has a 1.1s clear lead, lowers to 32% under the spoken lines, then returns to full gain over 0.2s after the complete name. Even the longest current hero name leaves over 2.5s of musical tail. The announcer stays busy through that tail, so the existing reveal confirmation waits for the full cue. Other event riffs also regain their normal level after speech. Names, victory voice and SFX remain unchanged pending the voice selection.

Validation: mocked scheduling test covers the longest hero name, serial speech, restored gain and busy lifetime through the tail. No audio is played during tests.

All 377 tests and the release build passed. Timing/music correction published to https://uaforce.thedimas.com: deployment `925b5c1e-73d9-4429-a2a5-403614a62cb4`, public bundle `game-Dk_6KZKp.js`. Voice auditions remain local until owner selection.
