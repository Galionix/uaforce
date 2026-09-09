# UA Force

Fast Ukrainian arcade action with destructible levels, historical heroes, dark humor and exaggerated cartoon chaos.

**Play the free prototype: https://uaforce.thedimas.com**

By **Dimasss / Galionix and the UA Force team**. Early public development, September 2026.

The playable single-player includes eleven fighters and six operations. Game UI is Ukrainian. Keyboard and gamepad; no mouse aiming. Progress stays in the browser. A separate experimental two-player online mode uses host-authoritative WebRTC with PeerJS; Cloudflare TURN supplies a fallback for networks that cannot connect directly.

## Run

```sh
cd reboot
npm ci
npm run dev -- --port 5179
```

Space / gamepad cross = jump. F / square = interact, including entering and leaving a tank. Controls can be rebound in settings.

All automated checks must be silent: open `?silent=1`. Do not change the owner's saved volume.

```sh
npm test
npm run build
npm run build:release
```

Release preparation additionally needs Python 3, FFmpeg and `cwebp`. Upload `.release/uaforce.zip` to the existing Cloudflare Pages project. The release excludes the old materials viewer and raw research. Source media remain local and in the source repository; do not deploy the entire workspace.

Single-player simulation is `src/game/world.ts`, rendering `view.ts`, input `input.ts`. Online transport is lazily loaded from `online.ts`; `coop-state.ts` contains its wire adapter. Public support is configured in `support.ts` only after checkout verification; the game stays free.


Online deployment needs production Pages bindings `TURN_KEY_ID` (text) and `TURN_API_TOKEN` (encrypted secret). The advanced-mode worker exposes `/api/ice`; `_routes.json` keeps static game assets outside function execution. Never place the master token in Vite environment variables or client assets. Local online checks use the production credential endpoint with an explicitly allowed localhost origin. `tools/verify-online.html?relay=1` verifies a forced relay route without audio. See `docs/ONLINE_VERIFICATION.md` for evidence and limitations.
