# CLAUDE.md — Star Freight Tycoon

## Project

Sci-fi trading/tycoon game built with Phaser 3 + TypeScript, bundled with Vite 8, tested with Vitest 4, Node 22.

## Quick Reference

```bash
npm install          # install dependencies
npm run dev          # vite dev server
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest watch mode
npm run build        # tsc && vite build
npm run check        # typecheck && test && build (all CI gates)
npm run preview      # preview production build
```

## CI Gates

CI runs on every PR and push to main (Node 22, Ubuntu). The three gates are:

1. `npm run typecheck` — strict TypeScript (no unused locals/params, verbatimModuleSyntax, erasableSyntaxOnly)
2. `npm run test` — Vitest
3. `npm run build` — full production build

**Always run `npm run check` after changes. Fix all errors before finishing.**

## Repository Layout

- `src/` — game source: scenes, game logic, data layer, UI, audio, generation, utils
- `packages/spacebiz-ui/` — shared UI library (alias `@spacebiz/ui`)
- `styleguide/` — visual styleguide app (separate Vite entry point)
- `public/` — static assets
- `docs/plans/` — design docs

## TypeScript Rules

- Strict mode with `noUnusedLocals`, `noUnusedParameters`
- `verbatimModuleSyntax` — always use `import type` for type-only imports
- `erasableSyntaxOnly` — no enums, no namespaces; use union types and objects
- Target ES2023, module ESNext, bundler resolution
- Path alias: `@spacebiz/ui` → `packages/spacebiz-ui/src/index.ts`

## Testing

- Vitest 4, globals enabled, node environment
- Tests in `__tests__/` dirs alongside source, named `*.test.ts`

## Conventions

- Phaser scenes extend `Phaser.Scene`
- UI patterns in `src/ui/` and `packages/spacebiz-ui/src/`
- Game state via `src/data/GameStore.ts`
- Deterministic RNG via `src/utils/SeededRNG.ts`
- Keep solutions lightweight and browser-compatible
- No heavyweight dependencies without justification
