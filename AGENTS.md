# Habitat public demo

This repository is the public GitHub Pages preview the user shares with others. It must remain clearly labeled as fictional, browser-local demo data. Never copy production databases, authentication secrets, Sites credentials, .wrangler state, or private resident records into it.

`src/demo-api.ts` implements local demo interactions. `src/habitat.tsx` and `src/globals.css` can be synchronized from the private server-backed sibling project using `npm run sync`. Preserve the demo labels and remove server-only sign-in/sign-out flows when syncing.

Publish user-requested UI updates by building, committing, and pushing `main`; the Pages workflow deploys automatically. Confirm the Pages deployment succeeds and the user-facing URL works. GitHub Pages cannot run the protected app's Worker or D1 endpoints.
