# Helicopter boarding — 2026-09-12

Owner reported extraction while standing on the floor, before the arrival announcement finished. The old trigger accepted a 14-unit-wide rectangle around the exit flag and any feet height within four units of the ground. After the 2.6-second approach it automatically collected a stationary fighter.

Boarding now checks the airborne fighter's chest against the visible cabin: x offset -0.8…+1.6 units and chest height within ±0.5 units of the helicopter center. At normal hover height this requires the fighter's feet to rise 1.6…2.6 units; the ordinary jump reaches it. Grounded, ladder-attached, dead and mounted actors cannot trigger extraction. Arrival animation still finishes before contact can board. The misleading floor-reaching rope and downward arrow are replaced by a jump instruction and upward arrow, localized in Ukrainian and English.

Co-op keeps its existing team extraction rule: either fighter's valid cabin contact initiates departure for the party. Candidate selection checks both fighters, rather than only the one nearest the ground flag. Mounts are released at team departure. No networking protocol or audio timing changes are needed.

Validation: 380 tests passed, including ten seconds idle below the helicopter without boarding, real jump contact, excluded heights/distances/ladder/tank, guest initiation with a grounded host, snapshots, ordinary-action campaign runs, boss endings and vertical/raid routes. Existing extraction tests now explicitly jump. Release build passed. `tools/verify-scene.html` has a silent manual cabin-jump control for visual verification.

Published to https://uaforce.thedimas.com on 2026-09-12. Cloudflare deployment `0f8a01dd-6cc3-43b6-85b4-6661e7e2f90f`; verified public bundle `game-BicG6ufV.js`, no browser errors. Silent scene check stayed at `boarding / playing / y=0` while idle, then reached `done / won` after a single cabin-jump click. Existing production voice assets remain unchanged.
