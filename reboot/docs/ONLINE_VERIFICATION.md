# UA Force online test record — 2026-09-09

All tests silent. No AudioContext playback or changes to saved volume.

- 262/262 automated tests passed, including all 253 previous single-player checks and 9 new two-actor/wire-state checks.
- Actual PeerServer Cloud signaling issued an eight-character room code.
- `tools/verify-online.html`: two real PeerJS/WebRTC peers exchanged 34 snapshots; observed guest movement, projectiles, HP damage, shared pause and host leaving. Largest test snapshot: 30,427 characters. Passed; no console errors/warnings.
- Initial JSON transport failed on oversized snapshots. PeerJS 1.5.5 JSON channel does not chunk above its MTU; switched to binary serialization with built-in chunking and retested an oversized dynamic-world packet.
- Two separate Codex embedded tabs were background-suspended and timed out. This is not evidence of WAN/NAT success or failure. The active two-frame UI fixture tests menu integration without that embedded-tab suspension.
- Remote resume must not steal host focus; otherwise focus changes can immediately re-pause the shared session. Addressed in `resume(false)` for remote commands.

Still requires real players: two separate computers, separate networks (including mobile/corporate), macOS/Windows, physical gamepads and subjective latency. No TURN relay provisioned; no claim that every NAT pair connects. No host migration or automatic reconnect; create a new room after disconnect.

Final two-frame UI result: connected=true, hostHero=Тарас Шевченко, guestHero=Леся Українка, sharedPause=true, guestResume=true, hostLeaving=true, singlePlayerRestored=true; no console errors/warnings.
