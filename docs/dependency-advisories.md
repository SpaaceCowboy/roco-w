# Dependency advisories

Last reviewed: 2026-09-18.

`npm audit` now reports **four moderate** advisories, all one `esbuild` finding
reachable only through the migration CLI. The two high-severity build-tool
findings were fixed with a non-breaking `npm audit fix` on 2026-09-18.

## Resolved

| Package | Severity | Introduced via | Fix |
| --- | --- | --- | --- |
| `browserslist` <= 4.28.6 | high | `eslint-config-next` -> `eslint-plugin-react-hooks` -> `@babel/core` | Fixed: now `4.29.0` |
| `js-yaml` 4.0.0 - 4.3.1 | high | `eslint` -> `@eslint/eslintrc` | Fixed: now `4.3.2` |

## Outstanding

| Package | Severity | Introduced via | Reach | Action |
| --- | --- | --- | --- | --- |
| `esbuild` <= 0.24.2 | moderate | `drizzle-kit` -> `@esbuild-kit/esm-loader` -> `@esbuild-kit/core-utils` | Migration CLI only | No non-breaking fix; the suggested fix downgrades `drizzle-kit` to 0.18.1 (breaking). Do not apply; monitor `drizzle-kit` |

The four moderate findings are the multiple `esbuild` copies reachable through
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

- The `esbuild` advisory is that a website can reach a running esbuild
  development server. `drizzle-kit` uses esbuild to load its CLI config; it does
  not start a development server that listens for requests.

## Recommended follow-up

1. Re-check `drizzle-kit` on each upgrade; adopt a release that drops
   `@esbuild-kit/esm-loader` before attempting the `esbuild` fix.
2. Re-run `npm audit` before each production release and update this file when
   the set changes.
