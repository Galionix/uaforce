# UA Force online test record — 2026-09-09

All tests silent. No AudioContext playback or changes to saved volume.

- 262/262 automated tests passed, including all 253 previous single-player checks and 9 new two-actor/wire-state checks.
- Actual PeerServer Cloud signaling issued an eight-character room code.
- `tools/verify-online.html`: two real PeerJS/WebRTC peers exchanged 34 snapshots; observed guest movement, projectiles, HP damage, shared pause and host leaving. Largest test snapshot: 30,427 characters. Passed; no console errors/warnings.
- Initial JSON transport failed on oversized snapshots. PeerJS 1.5.5 JSON channel does not chunk above its MTU; switched to binary serialization with built-in chunking and retested an oversized dynamic-world packet.
- Two separate Codex embedded tabs were background-suspended and timed out. This is not evidence of WAN/NAT success or failure. The active two-frame UI fixture tests menu integration without that embedded-tab suspension.
- Remote resume must not steal host focus; otherwise focus changes can immediately re-pause the shared session. Addressed in `resume(false)` for remote commands.

Still requires real players: two separate computers, separate networks (including mobile/corporate), macOS/Windows, physical gamepads and subjective latency. Initial release had no separately configured TURN relay; see the repair below. No claim that every NAT pair connects. No host migration or automatic reconnect; create a new room after disconnect.

Final two-frame UI result: connected=true, hostHero=Тарас Шевченко, guestHero=Леся Українка, sharedPause=true, guestResume=true, hostLeaving=true, singlePlayerRestored=true; no console errors/warnings.


## Public release

Cloudflare Pages production deployment `a5aaeef2-94ad-4e13-b9ca-15d50a4ea8d5` published on 2026-09-09 at https://uaforce.thedimas.com (fallback https://uaforce.pages.dev). 98 files, 61.99 MiB. Exact HTML, game JS, CSS and lazy online chunk bytes compared with the release artifact. Public single-player advanced to 00:05, paused, and emitted no console warnings/errors. Public online successfully acquired a real room code, then the room was closed. No real cross-network pair was tested.

Both source commits `bb1632c` (baseline) and `df8e29c` (co-op/demo) were pushed to the existing public repository branch `codex/uaforce-browser-release`. The repository default branch was not changed or merged.


## Cross-network connection repair

The owner reported repeated timeouts after entering a valid room code, with both players on the public domain. PeerJS 1.5.5 includes default TURN endpoints `eu-0.turn.peerjs.com` and `us-0.turn.peerjs.com`; both failed DNS resolution on 2026-09-09. Thus the initial documentation's shorthand “no TURN” was inaccurate about the bundled configuration, while the relay had not been operationally verified. A successful direct local pair was insufficient evidence for restrictive networks.

Replaced the implicit defaults with explicit Cloudflare STUN/TURN, including UDP, TCP and TLS/443. The master TURN API token stays in an encrypted Pages binding. `/api/ice` issues temporary credentials; no key enters the public JS bundle. Static files bypass the function, preserving independent single-player. Handshake and loss errors now distinguish setup from an unresponsive established peer; timeout is 45 seconds. Closing the online menu cancels pending connection preparation.

267/267 automated checks passed. `tools/verify-online.html?relay=1` forced BOTH peers to use relay; actual RTC stats reported `route=relay`. Exchanged 35 snapshots including the 30,427-character packet, movement, shots, damage, common pause and host leave. No console errors or warnings. The public room menu acquired a new code; public single-player started and paused without console errors. All tests silent.

Production deployment `43bd20b1-e12a-4b8c-90f5-95882d72a591`, 101 files / 62.00 MiB. HTML/CSS/game/online/ICE files byte-matched against the release. Real owner/friend retest requested after both refresh and create a new room; result pending.
