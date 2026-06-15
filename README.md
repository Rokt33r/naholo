<p align="center">
  <img src="./src/app/icon.png" alt="Naholo" width="128" height="128" />
</p>

# Naholo

Coding ops, end to end — AI coding without the spiral.

Try it at [naholo.app](https://naholo.app).

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
