# Complete Fenrir announcer replacement — 2026-09-12

**LATEST OWNER OVERRIDE:** Publish only the six good Gemini 3.1 Fenrir names now. Keep all other existing production voices. Every new Gemini 2.5 Fenrir recording is rejected; do not install it, including previously provisionally checked takes. This overrides the historical full-pack gate and 2.5 trial approval below. Current partial-release receipt: `FENRIR_PARTIAL_RELEASE.json`.

Owner selected the **deep Fenrir** audition. Normal energetic speaking speed; lower timbre and full chest resonance, not slowed audio. Replace every shipped announcer: heroic entrances, restrained routine messages, urgent warnings, sinister boss introductions, congratulatory victories. The exact 28 transcripts and mood instructions are in `tools/generate-fenrir-pack.py`. Existing `sirko.wav` is unused and excluded from the release, as previously requested. Combat SFX and Flow music remain unchanged.

Historical status before the latest owner override: **28 Gemini 2.5 drafts staged; none installed. These drafts are now rejected.** See “Latest owner correction and outcome” below and `FENRIR_STAGED_REVIEW.json`. Owner approved the 2.5 voice and requested stronger differences in acting.

## Initial 3.1 attempt (historical)

Six finished clips: Shevchenko, Lesya, Franko, Bandera, Bander-Bro, Mamai. Raw WAVs, normalized/edge-trimmed WAVs, prompts, model, hashes, durations and backups are under `tools/audio-source/fenrir-2026-09-12/`. Independent blind Gemini 2.5 Flash transcription recognized all six correctly, with no reported unclear consonants. No speaker playback. This is automated pronunciation QA, not a human timbre review.

The next generation returned HTTP 429. The provider explicitly identifies `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit **10** for `gemini-3.1-flash-tts`. Repeated spacing did not help because it is a daily quota, not a concurrency failure. The API does not provide a breakdown of the earlier requests that consumed the remaining allowance. No paid plan was enabled. Do not keep retrying a daily quota or silently substitute a different model/voice. The generator now stops immediately on this quota type and resumes by skipping validated completed clips.

22 clips remain. Public game still has its complete earlier pack. Installation waits for all 28, transcript review and timing checks. Owner authorized trying another Google model. A Fenrir audition from `gemini-2.5-flash-preview-tts` succeeded and is saved under `docs/voice-auditions-2026-09-12/deep/gemini-2.5/` (12.371 seconds, victory / hero entrance / warning / sinister boss). The sample is presented for owner listening; full-pack timbre approval is pending. Do not claim this replacement is shipped yet.

## Resume

Use the Python environment and locally configured key already used for auditions:

```sh
/Users/dmitry/Documents/projects/personal/utils/codex-voice-read/.venv/bin/python tools/generate-fenrir-pack.py --env-file /Users/dmitry/Documents/projects/personal/utils/codex-voice-read/.env
```

One generation at a time. Raw audio is preserved before edge-silence trimming, 60Hz high-pass and -16 LUFS normalization. No pitch shifting, playback-rate changes or time stretching. Each generated WAV has a checkpoint JSON; existing files are hash-verified before skipping. A completed clip can be regenerated deliberately by archiving its staged WAV and JSON first.

Blind transcription batches (pass only completed IDs):

```sh
/Users/dmitry/Documents/projects/personal/utils/codex-voice-read/.venv/bin/python tools/check-fenrir-transcripts.py --env-file /Users/dmitry/Documents/projects/personal/utils/codex-voice-read/.env victory defeat respawn
```

Review the returned transcript against the canonical lines; regenerate incorrect readings. After every clip is reviewed, run `tools/install-fenrir-pack.py` with the same Python environment. It refuses an incomplete pack, mismatched hashes, missing transcription coverage or insufficient unlock-music tail. It updates announcer/threat/boss provenance while preserving boss music records. Old recordings remain locally backed up.

The pending asset coverage test patch is in `tools/audio-source/fenrir-2026-09-12/pending-tests.patch`; apply from the repository root after installation. Add the shipped update to `src/game/updates.ts` and its English translation only at release. Run full tests and release build, silent browser checks, then deploy to Cloudflare Pages and verify the public bundle and all 28 content-hashed voice URLs.

## Playback correction prepared

The microphone voice (`zelensky-shout`) previously had a hard two-second playback cap. It now schedules the full decoded recording at normal rate. A mocked test verifies the complete length. Hero unlock timing retains the existing 8.4-second Flow riff, clear lead, speech ducking and restored musical tail; installation checks at least 1.5 seconds remain after every complete name.

## Latest owner correction and outcome

Owner approved the **Gemini 2.5 Fenrir voice**, but rejected the lack of emotional contrast in the mixed audition. This supersedes the pending approval noted above. Produced separate same-mood batches with distinct acting directions: hero / routine / victory / warning / boss / shout. The 28 draft clips are staged under `tools/audio-source/fenrir25-2026-09-12/`. All use `gemini-2.5-flash-preview-tts`, no mixed production voices. `tools/generate-fenrir-batches.py` retains full takes and split points. Separate auditions now visibly differ in blind audio review: energetic hero, matter-of-fact routine, ominous boss, triumphant victory. Final taste remains the owner's judgment.

**Still not installed or deployed.** Six recordings need pronunciation or mood revisions: `ghost`, `respawn`, `plane-alert`, `putin-defeated`, `bayraktar`, `new-hero`. See `FENRIR_STAGED_REVIEW.json` for per-clip hashes and exact findings. The routine retake returned only its first line; that complete, correctly transcribed checkpoint line was salvaged. Other failed/incorrect takes remain in the staging `rejected` folder.

Gemini 2.5 then also reached its confirmed daily free limit of 10 requests (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, model `gemini-2.5-flash-tts`). Both model quotas are exhausted, no billing change. Stop generation until reset; do not silently downgrade voice quality or ship a partly replaced pack. A diagnostic request initially still targeted 3.1 due to a bound Python default; explicit model forwarding was corrected before the real 2.5 attempt. One 2.5 attempt returned no audio, then the next returned daily quota exhaustion.

The four separately performed moods are assembled without pitch/speed changes in `voice-auditions-2026-09-12/deep/gemini-2.5/four-separate-moods.wav`: Shevchenko → evacuation → Gerasimov → victory, with one-second gaps. Original sources and hashes are recorded beside it. No speaker playback.

Resume corrections using the single-line generator's `--model gemini-2.5-flash-preview-tts --out tools/audio-source/fenrir25-corrections-2026-09-12 --only ID`, then replace only staged files after review. Same-mood retake batches are available as explicit `--group retakes`, `retakes-routine`, `retakes-victory`; archive prior batch files before requesting a genuinely new take. Do not blindly split a batch that omits lines.

Pass `--folder tools/audio-source/fenrir25-2026-09-12` to transcript checking. New checks bind results to exact file hashes. Review every current final file and set its `review.json` status to `pass` only when wording, timbre and mood are correct. The installer now refuses unreviewed or rejected files, even if a transcription exists. Install with `--folder tools/audio-source/fenrir25-2026-09-12 --model gemini-2.5-flash-preview-tts`. The updated pending test patch is in this same 2.5 staging folder. Then update release notes, run tests/build and deploy.

Current working single-player remains unchanged apart from the prepared complete-length microphone scheduling fix; all 377 tests passed before final documentation/tool updates. No public voice replacement has been claimed or deployed.

## Published partial replacement

Latest owner instruction delivered: six Gemini 3.1 Fenrir names installed (Shevchenko, Lesya, Franko, Bandera, Bander-Bro, Mamai). Other 22 production speech files retain their exact previous hashes. Rejected Gemini 2.5 drafts remain local only; their review status is revoked and the full-pack installer no longer accepts that model. 381 tests and release build passed. Deployment `522e0540-3e84-4591-a138-0bfda4b9801e`, public bundle `game-Cg3DJ7T-.js`; all six public MP3 downloads returned 200 and matched the local release hashes. No audio playback during checks. `FENRIR_PARTIAL_RELEASE.json` is the current receipt.
