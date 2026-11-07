# Workflow

## Development

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev` (cold start ~5s after watcher optimisation)
3. Typecheck before committing: `npm run typecheck`
4. Build to verify: `npm run build`

## Adding a new page

1. Create `app/pages/<name>.vue`
2. Add navigation entry in `app/components/app/AppSidebar.vue` and `app/components/app/MobileNav.vue`
3. Add title mapping in `app/components/app/AppHeader.vue`

## Adding a new component

Place in `app/components/<group>/`. Nuxt auto-imports by filename (pathPrefix disabled), so use the filename as the tag.

## Data flow

- Components never call storage directly. They use `app/services/api/client.ts`.
- To swap the backend, replace the mock implementation in `client.ts` with HTTP calls; interfaces in `types.ts` stay.
- Mock data lives in `app/services/api/mockData.ts`.

## Theming

- Tokens in `app/assets/css/tokens.css` (CSS variables, dark default + `[data-theme="light"]`).
- Toggle via `useTheme` composable; persisted to `localStorage`.

## Deployment

- `npm run build` produces `.output/`. Deploy with `node .output/server/index.mjs` or any Node-compatible host.
- Static generation: `npm run generate`.
