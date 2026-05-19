# Env Vars

Adding or removing an env var is never just an `.env` edit — the build pipeline and IaC have to know about it too. Branch on whether the var is read in the browser bundle (frontend) or only on the server (backend).

## Frontend (`NEXT_PUBLIC_*`)

Any var that's read by client code must be prefixed `NEXT_PUBLIC_` so Next.js inlines it at build time. For every add/remove:

1. Edit `Dockerfile` — add a matching `ARG NEXT_PUBLIC_FOO` + `ENV NEXT_PUBLIC_FOO=$NEXT_PUBLIC_FOO` line in the builder stage (alongside the existing `NEXT_PUBLIC_*` block). Without the `ARG`, the build-arg never reaches `next build` and the value inlines as empty.
2. Edit `.github/workflows/deploy.yml` — add a `--build-arg NEXT_PUBLIC_FOO=${{ secrets.NEXT_PUBLIC_FOO }} \` line on the Docker build step.
3. Edit `.env.example` — add the var with a placeholder so local dev contributors discover it.
4. `Manual:` add the secret in GitHub Actions repo settings before the next tag-driven deploy — agents cannot do this. Always list this as a `Manual:` COA step.

## Backend (server-only)

Server-only vars (no `NEXT_PUBLIC_` prefix) are injected into the ECS task at runtime via Terraform. For every add/remove:

1. Edit `terraform/ecs.ts` — add the var to the task definition's environment block (or `secrets` block if it carries credentials).
2. Edit `terraform/terraform.tfvars.example` — keep the example file in sync so other engineers know the var exists.
3. If the var holds a **credential** (API key, secret, password, token): edit `terraform/secrets.tf` so the value is pulled from AWS Secrets Manager instead of being plaintext in `terraform.tfvars`.
4. Edit `.env.example` — add the var (with a placeholder) so local dev contributors discover it.
5. `Manual:` add the value to `terraform/terraform.tfvars` (or to AWS Secrets Manager for credentials) and run `cd terraform && terraform apply`. Agents cannot run `terraform apply`. Always list this as a `Manual:` COA step.

## Quick checklist when planning an env var change

- [ ] Frontend → Dockerfile + deploy.yml + .env.example + Manual GitHub secret
- [ ] Backend → terraform/ecs.ts + terraform.tfvars.example + .env.example + Manual tfvars edit + Manual `terraform apply`
- [ ] Backend credential → also terraform/secrets.tf
