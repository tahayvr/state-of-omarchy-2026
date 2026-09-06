default:
    @just --list

alias c := check
alias d := dev
alias b := build
alias p := preview
alias f := fix
alias sl := survey-lint
alias i := install

# Type-check, auto-format, then lint (format runs before lint so a dirty
# formatting pass never fails the check on its own).
check:
    pnpm check
    pnpm format
    pnpm lint

# Auto-fix what can be auto-fixed: formatting + eslint --fix.
fix:
    pnpm format
    pnpm exec eslint . --fix

dev:
    pnpm dev

build:
    pnpm build

preview:
    pnpm preview

install:
    pnpm install

# Validates survey.yml referential integrity (ids, showIf targets, option refs).
# Run after any edit to src/lib/surveys/<year>/survey.yml.
survey-lint:
    pnpm survey:lint

# svelte-check in watch mode, for keeping a terminal open during a coding session.
typecheck-watch:
    pnpm check:watch

# Database (Turso/libsql via Drizzle). Schema lives in src/lib/server/db/schema.ts,
# reading DATABASE_URL + DATABASE_AUTH_TOKEN from the environment (see drizzle.config.ts).
#
# Local/dev loop: `just db-push` after editing schema.ts — fast, no migration files,
# but not tracked or reversible, so don't use it against a shared/prod database.
# Shared/prod loop: `just db-generate` to write a migration file, commit it, then
# `just db-migrate` (locally and in deploy) to apply it in a tracked, repeatable way.

# Push the current schema straight to the database — no migration file generated.
db-push:
    pnpm db:push

# Generate a new SQL migration file from the diff between schema.ts and the last migration.
db-generate:
    pnpm db:generate

# Apply any pending generated migration files (in ./drizzle) to the database.
db-migrate:
    pnpm db:migrate

# Open Drizzle Studio — a local web GUI for browsing/editing the database.
db-studio:
    pnpm db:studio

# Regenerates the better-auth Drizzle schema from src/lib/server/auth.ts.
auth-schema:
    pnpm auth:schema

# Wipes local build/type-check caches — reach for this when things behave oddly.
clean:
    rm -rf .svelte-kit build node_modules/.vite

# Clean slate: nuke caches and reinstall dependencies.
fresh: clean install
