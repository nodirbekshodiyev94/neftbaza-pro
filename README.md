# NeftBaza Boshqaruv Tizimi

An oil-depot (neftbaza) management system for tracking fuel intake, dispatch, production, reservoir balances, and material reports across multiple depots. The user interface is in Uzbek.

The application began as a single-file, frontend-only prototype and is being incrementally refactored into a clean, modular structure — without changing any behavior — in preparation for a **Laravel** backend.

---

## Short description

NeftBaza is a client-side single-page application (SPA) for depot operators and administrators. It supports:

- **Documents** — intake/dispatch by truck (avto) and rail wagon (vagon), transfers to/from the installation (qurilma), surplus (izlishka) and write-offs (spisaniya).
- **Production** — multi-item production operations (proizvodstvo).
- **Material report (Moddiy hisobot)** — a 1C/Excel-style report derived from a central movement ledger, with Excel/PDF export.
- **Reference data** — depots, nomenclature, organizations, contractors, reservoirs and calibration tables, regions, vehicles, and more.
- **Reservoir gauges & dashboard** — live tank fill levels and balances per depot.
- **Roles & shifts** — admin / user / guest roles, shift open/close with edit-locking.

Data currently persists in the browser through an injected asynchronous key–value API (`window.storage`); this is the single seam that will be swapped for a Laravel REST API.

---

## Technologies used

- **HTML5** — semantic single-page shell (`neftbaza.html`).
- **CSS3** — hand-written, theming via CSS custom properties, light/dark modes, responsive layout. No framework.
- **Vanilla JavaScript (ES2020+)** — no framework, no build step. Plain `<script>` files sharing a single global scope.
- **Hash-based routing** — `location.hash` + `hashchange`.
- **Google Fonts** — Oswald, Inter, IBM Plex Mono.
- **Inline SVG icon set** — flat, `currentColor`, theme-safe.
- **`window.storage`** — host-injected async KV persistence (to be replaced by the Laravel API).

There is **no React, Vite, bundler, or Node build** involved in the running application. (An early, unrelated React port was removed from the repository; it remains recoverable in git history.)

---

## Current project structure

```
neftbaza.html                  # App shell: <head> + static markup + ordered <script> tags
                               # + the remaining inline "app-core" script
assets/
├── css/
│   ├── variables.css          # Theme tokens (:root dark, light theme, overrides)
│   ├── base.css               # Reset, base elements, scrollbars
│   ├── layout.css             # Shell, sidebar, nav, topbar, content
│   ├── components.css         # Cards, gauges, forms, buttons, tables, toast, auth, modals
│   └── pages.css              # Reference tabs, production, dashboard, print & responsive, icons
└── js/
    ├── core/
    │   ├── utils.js           # DOM helpers, uid/today/esc/num/fmt, toast
    │   └── icons.js           # ICON_* SVG constants + brandmark/favicon injection
    ├── data/
    │   ├── defaults.js        # DB store + default reference/document data
    │   ├── refs.js            # Reference helpers (REF_DEFS, refList, refOptionsHtml)
    │   ├── movements.js       # Movement ledger + material-report calculation
    │   └── db.js              # Persistence layer: loadDB(), persist(), migrations
    └── docs/
        └── doc-types.js       # Field DSL + DOC_TYPES / TYPE_LABELS configuration
```

**Script load order** (global scope; order matters for parse-time references):

```
utils → icons → defaults → refs → doc-types → movements → db → app-core
```

---

## Current modularization status

The refactor follows a safe, incremental strategy: extract cohesive sections into separate plain `<script>` files (preserving global scope, so no event handlers, IDs, classes, or business logic change), verifying byte-for-byte reconstruction and runtime behavior at each step.

**Extracted (✅ done):**

| Layer | Modules |
|-------|---------|
| Styles | `variables.css`, `base.css`, `layout.css`, `components.css`, `pages.css` |
| Core | `utils.js`, `icons.js` |
| Data | `defaults.js`, `refs.js`, `movements.js`, `db.js` |
| Config | `doc-types.js` |

The **entire data layer is now modular.**

**Still inline in `neftbaza.html` (`app-core` script) — pending extraction:**

confirmation dialog · auth · shift · auth-settings · users · doc-form · doc-table · proizvodstvo · inventarizatsiya · matotchet page · smena-harakat · realizatsiya · refs-page · reservoir-calib · nomenclature · dashboard · nav/router · clock · theme · bootstrap.

Extraction continues bottom-up, with the navigation/router and bootstrap extracted last (they reference every page at parse time).

---

## Laravel backend integration readiness

The application is deliberately structured so that backend integration touches a **single, well-contained seam**:

- **All persistence flows through two functions in [`assets/js/data/db.js`](assets/js/data/db.js):** `loadDB()` (reads) and `persist(part)` (writes). Every data-mutating module calls these rather than touching storage directly.
- **Storage keys today:** `refs`, `docs`, `openingBalances`, `shifts`, `movements` (via `db.js`), plus `authCredentials` (auth) and `theme` (theme).
- **The `movements` ledger is derived** from documents (`rebuildLedger()`), so it can be computed server-side rather than stored.
- **Client-side migrations** in `loadDB()` are idempotent data-shape upgrades that will move to Laravel migrations/seeders.

**Planned mapping to Laravel:**

| Today (browser) | Laravel replacement |
|-----------------|---------------------|
| `window.storage.get(...)` in `loadDB()` | `GET /api/...` (or a single bootstrap endpoint) |
| `persist(part)` → `window.storage.set(...)` | `POST`/`PUT /api/...` (likely per-record) |
| Whole-slice JSON blobs | Relational tables + serializers |
| Client migration flags | Server-side migrations/seeders |
| `try/catch → defaults` fallback | Real HTTP error handling (auth, validation, retries) |

Because every module talks to storage only through `db.js`, swapping the bodies of `loadDB()`/`persist()` for API calls is the primary integration task.

---

## How to run locally

No build step is required — the app is static files. Serve the folder over HTTP (opening `neftbaza.html` via `file://` can break relative asset paths on some browsers):

```bash
# from the project root
python -m http.server 8000
# then open http://localhost:8000/neftbaza.html
```

Any static server works (`npx serve`, `php -S localhost:8000`, VS Code Live Server, etc.).

**Demo login** (prototype defaults, defined in `assets/js/data/defaults.js`):

- Admin — `admin` / `admin123`
- User — `user` / `user123`
- Guest — read-only, no password

> **Note on persistence:** `window.storage` is provided by the original prototype host and is **not** present when serving the plain files locally. The app handles this gracefully — it falls back to the built-in default data, and you will see harmless `storage error` messages in the console when it tries to save. This is expected until the Laravel API replaces `window.storage`.

---

## Current repository structure

```
.
├── neftbaza.html
├── assets/
│   ├── css/   → variables.css · base.css · layout.css · components.css · pages.css
│   └── js/
│       ├── core/ → utils.js · icons.js
│       ├── data/ → defaults.js · refs.js · movements.js · db.js
│       └── docs/ → doc-types.js
├── README.md
└── .gitignore
```
