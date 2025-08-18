# Roll‑et PWA (React + Vite)

Summary:
- React + Vite + TypeScript.
- PWA via `vite-plugin-pwa` (autoUpdate).
- GitHub Pages base path `/roll-et/`.
- Install button using `beforeinstallprompt`.

## Local dev
```bash
npm i
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages
1. Create repo `roll-et` under `dbailey1564`.
2. Push code.
3. In the repo settings → Pages, set: Build and deployment = GitHub Actions.
4. The included workflow publishes `/dist` to `gh-pages` branch.
5. Site URL: https://dbailey1564.github.io/roll-et/

## Notes
- Start URL and scope are `/roll-et/`.
- Service worker and manifest are generated at build time by the PWA plugin.
