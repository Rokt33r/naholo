<p align="center">
  <img src="./src/app/icon.png" alt="Naholo" width="128" height="128" />
</p>

# Naholo

Coding ops, end to end — AI coding without the spiral.

Try it at [naholo.app](https://naholo.app).

## Why Naholo

I built Naholo for myself. I have a two-year-old and a newborn at home, so I almost never get a long stretch of uninterrupted time. I still wanted to use Claude Code at full speed, but without sliding into vibe coding. What worked for me was a loop with small, frequent review windows, so I stay in control while still moving steadily. Working in small steps like this also helps me avoid cognitive overload.

Each change starts with a short brief. I pin the architecture decisions, split the plan into single-commit-sized tasks, and then ship each task as a small chunk I can actually review. The plan lives in a durable document on disk, so a fresh session can catch up from it on its own and I don't have to be bothered with /compact. Both the agent and I can edit that plan together. Naholo also records token usage per ticket, so I can see what each piece of work cost and use that to work better on the next one. I have been running this loop alone, almost every day, for about four months.

## What is Naholo

Naholo is a military-style OP-cycle workspace for AI coding. Every change moves through one fixed loop — brief → plan → ship → debrief — scoped tight enough for a human to review and built to survive mid-session pivots.

Sessions don't live in chat history. Each operation carries a `TIMELINE` the next session reads cold, and token usage pins to the operation itself — every op has a receipt before the next splash.

The hosted app at [naholo.app](https://naholo.app) is the recommended way to use it.

## Usage

The Field Manual at [naholo.app/field-manual](https://naholo.app/field-manual) is the user-facing guide: quick start, primer on the OP cycle, the skill set (`/infil`, `/warno`, `/opord`, `/splash`, `/sitrep`, `/exfil`), and the glossary.

## Local development

Prerequisites: Node 22, [pnpm](https://pnpm.io/), and Docker.

```bash
git clone https://github.com/iLuvGimbap/naholo.git
cd naholo
cp .env.example .env.local
docker compose up -d postgres
pnpm install
pnpm db:push
pnpm dev
```

The dev server runs at `http://localhost:3000`. See [.env.example](./.env.example) for the full list of environment variables you'll need to fill in (Google OAuth credentials, session secrets, optional billing/storage settings).

## Self-hosting

[DEPLOYMENT.md](./DEPLOYMENT.md) is the source of truth for self-hosting — it walks through the AWS ECS Fargate + RDS PostgreSQL setup the production app runs on, including Terraform, ECR, OIDC-based GitHub Actions deploys, and the SES / Google OAuth prerequisites.

## Contributing

Naholo doesn't accept unsolicited pull requests. If you've spotted a bug or want to suggest a behavior change, please open an issue first to discuss it. If you want a customized variant, fork the repo and self-host — that's the supported path.

## License

MIT — see [LICENSE.md](./LICENSE.md).
