alias c := check
alias d := dev
alias b := build

check:
    pnpm check
    pnpm format
    pnpm lint

dev:
    pnpm dev

build:
    pnpm build
