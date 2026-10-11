# Web UI

The React app uses MUI 7 with a custom Material 3 theme. MUI itself defaults to
Material Design 2; the M3 colour roles, surfaces, shapes and typography are defined
in `src/theme`, rather than relying on an official M3 component implementation.

- `theme/tokens.js`: colours shared by MUI, Tailwind and charts.
- `theme/theme.js`: component defaults and theme overrides.
- `theme/DesignProvider.jsx`: theme, baseline and CSS layer ordering.
- `components/ui/controls.jsx`: shared fields, actions, status chips, skeletons,
  accessible dialogs and detail drawers. Number/date input constraints and
  existing change handlers are retained. Native colour, file and range inputs
  keep their browser interactions.
- `components/ui/SymbolIcon.jsx`: flat, single-colour Material icons. Existing
  domain-specific SVG shapes use the shared `FlatIcon` component; colours inherit
  from their context. Hazard colours continue to distinguish severity.

Navigation uses a permanent desktop drawer, a compact rail and a temporary mobile
drawer. Pages load lazily. Leaflet/Geoman and Recharts remain the map/chart engines.
Reference geography and illustrative demo notices retain their existing meaning.
API clients, authentication state and database schemas are unchanged.

## Local preview

```powershell
cd web
npm.cmd run dev
```

The existing `.env` controls the API URL. Override `VITE_API_URL` in the process
environment when intentionally testing another backend.

## Verification

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run preview -- --host 127.0.0.1
```

`scripts/check-material-ui.mjs` checks production pages through Chrome's local
debugging protocol using isolated API fixtures. It never sends API writes.
Start a separate Chrome profile with `--headless=new --remote-debugging-port=9223`
and `--user-data-dir=<temporary profile path>`, then run:

```powershell
node scripts/check-material-ui.mjs
```

Screenshots and results go into ignored `api/local-data/ui-checks`. The checks
cover all routes, representative creation/broadcast dialogs, labels, focus,
Escape dismissal, number input constraints, map tooling and mobile navigation.
They verify UI behaviour, not a live backend deployment.

Full lint currently includes existing unused-variable, empty-catch, hook and
Fast Refresh findings. The new shared UI/theme/layout modules pass their scoped
lint checks; compare existing-file findings against the original revision when
working on that separate cleanup.
