# 🛠️ Development

## Requirements

- **Node 24** (`engines` is `>=24`)
- npm

## Setup

```bash
npm ci
npm run dev          # http://localhost:5173
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest, one run |
| `npm run validate:bank` | Validate `data/questions/**` |
| `npm run build` | `tsc --noEmit` and production build in `dist/` |
| `npm run preview` | Serve `dist/` |

## Tests

`tests/` covers the pure core:

| File | Covers |
|---|---|
| `scoring.test.ts` | All-or-nothing multi-select, scaled score border at 720, unscored items, domain grouping |
| `sampler.test.ts` | Domain allocation (both exams), no duplicates, determinism, failed/unseen priority, scenario grouping |
| `engine.test.ts` | Selection caps, flags, timer expiry, 130-minute full mode |
| `store.test.ts` | Persistence, de-duplication, latest-appearance stats, blocked storage, corrupt JSON |

## CI/CD

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | Pull request | `npm ci` → validate bank → test → build |
| `deploy.yml` | Push to `main` | Same checks, then build and publish to **GitHub Pages** |

```mermaid
flowchart LR
    PR([Pull request]) --> CI[ci.yml<br/>validate · test · build]
    CI -->|merge| M([main])
    M --> D[deploy.yml<br/>validate · test · build]
    D --> P[(GitHub Pages)]
```

- Actions run on **Node 24** and are **pinned by full commit SHA** with the version in a comment.
- Pages is configured with the *GitHub Actions* source.
- Vite uses `base: './'`, so the site works under the repository sub-path.

## Adding a new exam

1. Add the id to `ExamId` in `src/types.ts`.
2. Add an `ExamDef` to `EXAMS` in `src/exams.ts` (domains and weights, timings, pass mark, date, scenarios if any, `bilingual`).
3. Create `data/questions/<id>/` with at least one JSON file ([schema](QUESTION-BANK.md)).
4. Add its plan and resources to `src/plans.ts`.
5. `npm run validate:bank && npm test && npm run build`.

The home tabs, sampler, scoring, PDF and validator pick the exam up automatically.

## Conventions

- Commit messages in English, conventional style (`feat:`, `fix:`, `ci:`, `docs:`).
- Keep `src/exam/*` free of DOM code.
- Wrap every `localStorage` access in `try/catch`.
