<div align="center">
<img src="./src/lib/assets/soo-logo.png" width="300">
</div>

Yearly survey for Omarchy Linux. Passwordless auth (email link or code), one response per
account, and a questionnaire driven entirely by `src/lib/surveys/<year>/survey.yml`.

## Setup

Clone the project and install dependencies with `pnpm install`, then copy `.env.example` to `.env` and fill in the values below.

```sh
pnpm install
cp .env.example .env   # then fill in the values below
```

| Variable                               | Purpose                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | Turso database (for dev: `file:local.db`)                                              |
| `ORIGIN`                               | App URL (`http://localhost:5173` in dev)                                               |
| `BETTER_AUTH_SECRET`                   | Auth secret (`openssl rand -base64 32`)                                                |
| `RESEND_API_KEY`                       | Resend key (leave empty in dev: magic links & OTP codes print in the terminal instead) |
| `RESEND_FROM`                          | Verified sender, needed for real delivery                                              |

Push the schema, then start developing:

```sh
pnpm db:push --force   # creates auth + survey tables (dev only; use generate+migrate in prod)
pnpm dev
```

## Survey Questions

Editing questions or options in `src/lib/surveys/<year>/survey.yml` needs no code changes:
renderers, validation, storage, and progress are all derived from the yml by type.

Run `pnpm survey:lint` after editing. It fails on duplicate ids, unknown types, and broken `showIf` references.

```sh
pnpm survey:lint  # validate survey.yml — run after ANY question/option edit
```

New edition = new `src/lib/surveys/<year>/` directory;

## Building

To create a production version of the app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.
