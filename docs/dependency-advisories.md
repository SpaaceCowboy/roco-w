# Dependency advisories

Last reviewed: 2026-09-18.

`npm audit` reports six advisories (2 high, 4 moderate) in the development and
migration toolchain. None are in the production runtime path; they are recorded
here so they are tracked rather than rediscovered, and so a fix is an explicit
decision instead of a silent lockfile change.

## Classification

| Package | Severity | Introduced via | Reach | Action |
| --- | --- | --- | --- | --- |
| `browserslist` <= 4.28.6 | high | `eslint-config-next` -> `eslint-plugin-react-hooks` -> `@babel/core` | Build/lint only | Non-breaking fix available; apply in a dedicated dependency change |
| `js-yaml` 4.0.0 - 4.3.1 | high | `eslint` -> `@eslint/eslintrc` | Build/lint only | Non-breaking fix available; apply in a dedicated dependency change |
| `esbuild` <= 0.24.2 | moderate | `drizzle-kit` -> `@esbuild-kit/esm-loader` -> `@esbuild-kit/core-utils` | Migration CLI only | No non-breaking fix; the suggested fix downgrades `drizzle-kit` to 0.18.1 (breaking). Do not apply; monitor `drizzle-kit` |

The four moderate findings are the two `esbuild` copies reachable through
`drizzle-kit` and the optional peer edge described below.

## Why `--omit=dev` still surfaces `esbuild`

`better-auth` declares `drizzle-kit` as a **peerOptional** dependency. Because
the repository installs `drizzle-kit` as a root dev dependency, npm resolves the
optional peer against it and reports the `esbuild` advisory even under
`npm audit --omit=dev`. A production install does not auto-install an optional
peer, and `drizzle-kit`, `tsx`, and `eslint` are all declared under
`devDependencies`, so no advisory package is present in the deployed runtime
tree.

## Exploitability

- `browserslist` and `js-yaml` process the repository's own configuration and
  build inputs, not untrusted end-user input. The exposure is a malicious
  dependency or a poisoned build input, which the lockfile and review process
  already gate.
- The `esbuild` advisory is that a website can reach a running esbuild
  development server. `drizzle-kit` uses esbuild to load its CLI config; it does
  not start a development server that listens for requests.

## Recommended follow-up

1. In a separate, explicitly reviewed change, run `npm audit fix` (without
   `--force`) to bump `browserslist` and `js-yaml`, then re-run the full
   verification suite (`npm test`, `npm run typecheck`, `npm run lint`,
   `npm run build`).
2. Re-check `drizzle-kit` on each upgrade; adopt a release that drops
   `@esbuild-kit/esm-loader` before attempting the `esbuild` fix.
3. Re-run `npm audit` before each production release and update this file when
   the set changes.
