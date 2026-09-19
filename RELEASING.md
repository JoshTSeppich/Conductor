# Releasing

Release-process and migration notes for Conductor.

## Installing fd globally

`fd` is shipped as a workspace package, not a published npm package.
Install it from the local workspace:

    pnpm install -g packages/dispatch-cli

This generates `~/Library/pnpm/fd` (macOS) or equivalent shim
pointing at `packages/dispatch-cli/dist/bin/fd.js`. Subsequent
rebuilds of dispatch-cli are picked up automatically via the
workspace symlink — no re-install needed.

### Upgrading from a pre-v2 fd link

If you ran `pnpm install -g foxworks-dispatch` (or `pnpm link
--global` from the repo root) before v2.0.0, your shim points at
the pre-monorepo CLI location (`<repo>/dist/bin/fd.js`) which no
longer exists post-C4 refactor. Refresh:

    pnpm -g remove foxworks-dispatch
    pnpm install -g packages/dispatch-cli

## Known issues

### v2.0.1 — bug #2 latent: built CLI imports source-tree paths

After upgrading from v2.0.0, `fd init` and other CLI invocations
may fail with:

    Error [ERR_MODULE_NOT_FOUND]: Cannot find module
      '~/<repo>/packages/dispatch-cli/node_modules/dispatch-core/src/registry/read.js'
      imported from ~/<repo>/packages/dispatch-cli/dist/commands/init.js

This is distinct from the v2.0.0 dogfood incident closed by
v2.0.1 (bug #1: stale global shim path post-monorepo-refactor;
closed by green-1 root devDep wire-up at 40dd092). The built
CLI's compiled JavaScript uses source-tree reach-in imports
against dispatch-core (`dispatch-core/src/<x>.js`); these
resolve only under tsx (test/dev context), not under plain node
(production binary invocation). Bug #2 is latent at v2.0.0 and
earlier; v2.0.1 surfaces it via the new on-PATH smoke (49d78e6)
but does not close it.

**Workaround for v2.0.1:** invoke the CLI under tsx via

    pnpm --filter dispatch-cli exec tsx src/bin/fd.ts <args>

rather than via the global shim or workspace bin. Verified at
the v2.0.1 revert commit (28902ca).

**Closure:** tracked in `CORE-EXPORTS-MIGRATION` ticket (to be
filed post-v2.0.1) for v2.0.2 / v2.1. Migration scope is well-
defined (88 reach-in imports across 68 files in 3 workspaces,
surveyed at the v2.0.1 attempt) and will be pre-registered with
portfolio-wide consumer rewrite. See `docs/cairn-findings.md`
findings #52, #53, #54 for evidence chain.
