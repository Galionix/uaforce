# Player feedback and flag transitions — 2026-09-09

Owner requested the trailer's flag transitions in the game and a bug button with screenshots delivered to the developer.

## Shipped

- Small pixel bug button in the game header; additional entries in main menu, pause and About.
- Ukrainian Tally form embedded on demand. Description required; screenshots and reply email optional. No player account required.
- Up to three PNG/JPEG/WebP screenshots, 10 MB each. The game can save its canvas as a PNG; the player then attaches that saved file or an existing screenshot to the form.
- Diagnostic context: build, mission, hero, game mode, single-player/co-op role, controller name, viewport and browser. No room invitation, current URL parameters, local storage or credentials are forwarded.
- Opening the form during gameplay pauses the game. Closing it returns to the pause menu, with explicit resume. The external form link is a fallback if embedding is unavailable.
- Submission notifications enabled in the owner's Tally account. A real test with a screenshot and no reply email reached the owner's mailbox; the notification includes the report, context and screenshot download link. This is not an email MIME attachment.
- Blue/yellow diagonal canvas wipes with streaks and pixel particles on operation/practice starts, co-op starts, return to menu and hero/boss reveals. Existing reveal motion/audio retained; wipe waits for art decoding. The in-game reduced-motion setting uses a brief fade.

Public form: https://tally.so/r/b5pMz7

Owner inbox: https://tally.so/forms/b5pMz7/submissions (owner login required).

Free Tally service used; no paid plan or new billing. Provider documentation: https://tally.so/help/file-uploads and https://tally.so/help/email-notifications . The service hosts submitted reports; players are told this before submitting. Owner contact details and private attachment links are intentionally not stored in the public repository.

## Release and verification

- Cloudflare Pages production: `f17f3081-eb0f-4c75-bea3-e6ec15513efa`.
- Public URL: https://uaforce.thedimas.com/ . Immutable deployment: https://f17f3081.uaforce.pages.dev .
- `npm test`: 268 passed. Focused feedback context/URL test rerun after final embed URL adjustment: passed.
- `npm run build:release`: TypeScript, Vite and release validation passed; 101 files, 62 MiB. Existing Pages worker and TURN bindings preserved.
- In-app Browser, `?silent=1`: flag wipe visually inspected; public main menu and pause report buttons open the actual Ukrainian form; close returns to pause; gameplay starts; no console errors.
- Public DOM loads `game-CmYFK7cV.js` and `game-DtJe5zus.css`, matching the new release filenames. Cloudflare dashboard confirms this production deployment. A separate plain urllib content-hash request returned 403, so no byte-for-byte HTTP verification is claimed.
- Screenshot submission and owner email delivery verified against the live Tally service. No audio was played during QA.

## Operational limits

Reports require internet access and Tally availability. There is no offline queue or automatic attachment upload. Screenshot saving captures only the game canvas, not the user's desktop. Reply email is optional, so some reports cannot be answered directly. The physical gamepad was not operated in this task; the existing gamepad menu navigation includes the new dialog's native buttons.
