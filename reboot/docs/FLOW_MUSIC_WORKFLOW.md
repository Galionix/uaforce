# UA Force · Flow Music

Owner request, 2026-09-12: replace the complete musical score through Google Flow
Music in the Codex in-app browser, inside one UAForce project and one session.
Project and session URLs, original hashes and source-to-game mappings live in
`FLOW_MUSIC_REPLACEMENT.json`.

## Wait for the audio, not the chat reply

1. Submit one composition request. Never submit a batch while another is active.
2. A producer reply saying “generated” or a card with a title is insufficient.
   Check the actual Creating/Generating indicator and the player state.
3. Do other local preparation while the service works. Check again after tens of
   seconds, not in a rapid retry loop. Do not reload a working generation.
4. Download the completed M4A using the song's player menu. A download menu on an
   inactive song sometimes produces no file; selecting that song in the muted
   player and using its own menu works. Loading the player can take several seconds.
5. Verify the complete file exists, has a reasonable duration, and fully decodes.
   Only then request the next composition.
6. On an error, inspect persisted cards and status before retrying. A failed chat
   request is not proof that the audio job failed. Never create a duplicate simply
   because the chat response or a short UI selector timeout failed.

The site player was already at volume zero and remains there. No audible playback
is used during this work, and the game's saved volume is not changed. Actual
listening approval is distinct from decode, waveform and scheduling checks.

## Musical direction

- Ukrainian bandura, tsymbaly, sopilka, dry hurdy-gurdy and trembita with live drums,
  bass and controlled gritty guitar; original instrumental action music.
- Shared D Dorian/minor color; each region has an exploration/combat pair with its
  own melodic identity and requested pulse. Requested BPM is not a measured value.
- The calm menu melody is exclusive to the menu. Gameplay never splices it in.
- Leave space for existing voices and effects. No sung words or synthetic beeps.
- Keep native sources untouched. Game loops and cue edits are prepared separately.

## Local processing

`tools/prepare-flow-score.py` uses numpy and ffmpeg, never a generator or playback.
It ingests UI-downloaded files from Downloads and records their hashes/durations.
`--prepare` stages edited WAVs under the ignored source directory. It does not
overwrite the live game. Background tracks use a circular overlap and constant
gain, retaining dynamics. Event cues retain an immediate generated opening phrase
with short attack/release fades. If the generator puts an isolated transient and
silence before the actual phrase, the edit selects the first sustained passage
and records its exact offset instead of shipping a mostly empty cue.
Existing three-second mood crossfades, remembered
play positions, voice ducking and silent-test mode remain in the runtime.

Original masters and UI evidence stay in
`tools/audio-source/flowmusic-2026-09-12/` (not publicly shipped).
Publish only the processed game assets and non-sensitive provenance documentation.
