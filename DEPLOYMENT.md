# naholo Deployment Guide

Complete guide for deploying the naholo application to AWS ECS with RDS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │   ALB   │ (HTTPS on port 443)
                    │         │ (HTTP redirect to HTTPS)
                    └────┬────┘
                         │
          ┏━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┓
          ┃  ECS Cluster (Fargate)       ┃
          ┃  ┌──────────────────────┐    ┃
          ┃  │  ECS Service         │    ┃
          ┃  │  ┌────────────────┐  │    ┃
          ┃  │  │ Next.js App    │  │    ┃
          ┃  │  │ (Docker)       │  │    ┃
          ┃  │  │ Port 3000      │  │    ┃
          ┃  │  └────────────────┘  │    ┃
          ┃  └──────────┬───────────┘    ┃
          ┗━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━┛
                        │
                   ┌────▼────┐
                   │   RDS   │
                   │PostgreSQL│
                   │   16    │
                   └─────────┘
```

**Components:**

- **Application Load Balancer (ALB)**: HTTPS termination, routing
- **ECS Fargate**: Serverless container orchestration
- **RDS PostgreSQL**: Managed PostgreSQL database
- **ECR**: Docker image registry
- **Secrets Manager**: Secure secrets storage
- **CloudWatch**: Logs and monitoring

**Estimated Monthly Cost:** ~$36/month (Tokyo region)

---

## Prerequisites

### 1. AWS Account Setup

#### 1. Create AWS Account (if you don't have one)

#### 2. Install AWS CLI:

```bash
# macOS
brew install awscli

# Verify installation
aws --version
```

#### 3. Configure AWS CLI:

```bash
aws configure

# Enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: ap-northeast-1
# Default output format: json
```

### 2. Domain and SSL Certificate

#### 1. Request ACM Certificate (in ap-northeast-1 region):

```bash
aws acm request-certificate \
  --domain-name your-domain.com \
  --validation-method DNS \
  --region ap-northeast-1
```

#### 2. Validate the certificate by adding DNS records (check email or Route 53)

#### 3. Get the certificate ARN:

```bash
aws acm list-certificates --region ap-northeast-1
```

### 3. Verify SES Email (Optional - if not already done)

If you haven't already verified your domain for SES:

#### 1. Verify your domain:

```bash
aws ses verify-domain-identity \
  --domain naholo.app \
  --region ap-northeast-1
```

#### 2. Add the TXT record to your DNS with the verification token returned

#### 3. Verify the status:

```bash
aws ses get-identity-verification-attributes \
  --identities naholo.app \
  --region ap-northeast-1
```

#### 4. (Optional) Request production access to send emails to any address:

- By default, SES is in sandbox mode (can only send to verified addresses)
- Submit a request in AWS Console: SES → Account Dashboard → Request production access
- Usually approved within 24 hours

**Note:** If your domain is already verified, you can skip this step and proceed to the next section.

### 4. Setup Google OAuth (Required)

Google OAuth is used for user authentication in the application.

#### 1. Go to Google Cloud Console:

- Visit https://console.cloud.google.com
- Create a new project or select an existing one

#### 2. Create OAuth 2.0 Credentials:

- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth 2.0 Client ID"
- Configure consent screen if not already done:
  - User Type: External
  - App name: "naholo" (or your app name)
  - User support email: your email
  - Developer contact: your email
  - Add your email as a test user in "Test users"
- Application type: "Web application"
- Name: "naholo"
- Authorized redirect URIs: Add `https://your-domain.com/api/auth/google/callback`
- Click "Create"

#### 3. Save your credentials:

- Copy the **Client ID** (looks like: `123456789.apps.googleusercontent.com`)
- Copy the **Client Secret**
- You'll add these to `terraform.tfvars` in the next step

### 5. Install Terraform

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify
terraform --version
```

---

## Deployment Steps

### Step 1: Prepare Configuration

#### 1. Create Terraform variables file:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

#### 2. Edit `terraform.tfvars`:

```hcl
# AWS Configuration
aws_region   = "ap-northeast-1"
project_name = "naholo"
environment  = "production"

# Domain and SSL
acm_certificate_arn = "arn:aws:acm:ap-northeast-1:YOUR_ACCOUNT:certificate/YOUR_CERT_ID"
domain_name         = "your-domain.com"

# Application Secrets
session_secret = "GENERATE_THIS_WITH_COMMAND_BELOW"

# Google OAuth Configuration (from step 4)
google_oauth_client_id       = "YOUR_CLIENT_ID.apps.googleusercontent.com"
google_oauth_client_secret   = "YOUR_CLIENT_SECRET"
google_oauth_redirect_uri    = "https://your-domain.com/api/auth/google/callback"
google_oauth_state_secret    = "GENERATE_THIS_WITH_COMMAND_BELOW"
```

#### 3. Generate secrets:

```bash
openssl rand -base64 32
```

### Step 2: Deploy Infrastructure

#### 1. Initialize Terraform:

```bash
cd terraform
terraform init
```

#### 2. Review the plan:

```bash
terraform plan

# Should show: Plan: ~30 to add, 0 to change, 0 to destroy
```

#### 3. Deploy:

```bash
terraform apply

# Type 'yes' when prompted
# Wait ~10-15 minutes for resources to be created
```

#### 4. Retrieve outputs:

```bash
terraform output

# View specific outputs:
terraform output ecr_repository_url
terraform output alb_dns_name
terraform output rds_endpoint
```

### Step 3: Build and Push Docker Image

#### 1. Login to ECR:

```bash
cd .. # Back to project root

aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin $(terraform -chdir=terraform output -raw ecr_repository_url | cut -d/ -f1)
```

#### 2. Build Docker image:

```bash
docker build --platform linux/amd64 -t naholo .
```

#### 3. Tag and push:

```bash
ECR_URL=$(terraform -chdir=terraform output -raw ecr_repository_url)

docker tag naholo:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest
```

### Step 4: Initialize Database Schema

The database needs to be initialized with the schema. You have two options:

**Option A: From local machine (requires RDS to be publicly accessible)**

Configure .env.local or directly feed env vars and run the script below.

```bash
pnpm db:push
```

**Option B: Exec into running ECS task**

```bash
# List running tasks
aws ecs list-tasks \
  --cluster naholo-cluster \
  --region ap-northeast-1

# Execute command in task
aws ecs execute-command \
  --cluster naholo-cluster \
  --task <TASK_ID> \
  --container naholo \
  --interactive \
  --command "pnpm db:push" \
  --region ap-northeast-1
```

### Step 5: Update ECS Service

After pushing the Docker image, update ECS to use it:

```bash
aws ecs update-service \
  --cluster naholo-cluster \
  --service naholo-service \
  --force-new-deployment \
  --region ap-northeast-1
```

Wait for the service to stabilize (~3-5 minutes):

```bash
aws ecs wait services-stable \
  --cluster naholo-cluster \
  --services naholo-service \
  --region ap-northeast-1
```

### Step 6: Configure DNS

Point your domain to the load balancer:

#### 1. Get ALB DNS name:

```bash
terraform -chdir=terraform output alb_dns_name
```

#### 2. Create CNAME record in your DNS provider:

Configure in Route53

#### 3. Wait for DNS propagation (~5-10 minutes):

```bash
dig your-domain.com
```

### Step 7: Verify Deployment

#### 1. Check application health:

```bash
curl https://naholo.app/api/health

# Should return:
# {"status":"healthy","timestamp":"..."}
```

#### 2. View application logs:

```bash
aws logs tail /ecs/naholo --follow --region ap-northeast-1
```

#### 3. Check ECS service status:

```bash
aws ecs describe-services \
   --cluster naholo-cluster \
   --services naholo-service \
   --region ap-northeast-1 \
   --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

---

## Setting Up CI/CD with GitHub Actions

### Overview

The application uses GitHub Actions with OIDC (OpenID Connect) for secure, keyless authentication to AWS. Deployments are triggered by pushing version tags (e.g., `v1.0.0`), not by pushing to the main branch.

### Step 1: Deploy OIDC Infrastructure with Terraform

The Terraform configuration automatically creates:

- GitHub OIDC provider in AWS
- IAM role for GitHub Actions (restricted to your repository only)
- Required permissions for ECR and ECS

**Simply run:**

```bash
cd terraform
terraform apply
```

**Note:** The OIDC provider and IAM role are already defined in [terraform/github-actions.tf](terraform/github-actions.tf). No manual AWS Console setup is needed.

### Step 2: Get the GitHub Actions Role ARN

After Terraform completes, get the role ARN:

```bash
terraform output github_actions_role_arn
```

Copy this ARN - you'll need it in the next step.

### Step 3: Configure GitHub Repository Secret

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add a repository secret like below:

| Name           | Value                                              | Description           |
| -------------- | -------------------------------------------------- | --------------------- |
| `AWS_ROLE_ARN` | `arn:aws:iam::...:role/naholo-github-actions-role` | From terraform output |

### Step 4: Deploy by Creating a Version Tag

Deployments are triggered by pushing version tags:

```bash
# Bump version and tag
#pnpm version major
#pnpm version minor
pnpm version patch

# Push commits and tags
git push && git push --tags
```

GitHub Actions will automatically:

1. Build Docker image
2. Tag image with version (e.g., `v1.0.0`) and `latest`
3. Push to ECR
4. Update ECS task definition
5. Deploy new version
6. Wait for service stability

**Monitor deployment:** Repository → Actions tab

**Important:** Only version tags matching `v*.*.*` trigger deployments (e.g., `v1.0.0`, `v2.1.3`). Pushing to the main branch does NOT trigger automatic deployment.

---

## Manual Deployment (Emergency)

Use manual deployment when:

- Testing changes locally before creating a version tag
- Emergency hotfixes needed immediately
- GitHub Actions is unavailable or problematic
- You want to deploy without creating a version tag

### Complete Manual Deployment Process

#### 1. Build Docker image for correct platform:

```bash
# IMPORTANT: Build for linux/amd64 (ECS Fargate requires x86_64)
docker build --platform linux/amd64 -t naholo .
```

#### 2. Login to ECR:

```bash
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin $(terraform -chdir=terraform output -raw ecr_repository_url | cut -d/ -f1)
```

#### 3. Tag and push image:

```bash
# Get ECR repository URL
ECR_URL=$(terraform -chdir=terraform output -raw ecr_repository_url)

# Tag with latest
docker tag naholo:latest ${ECR_URL}:latest

# Push to ECR
docker push ${ECR_URL}:latest
```

#### 4. Force new deployment:

```bash
# Trigger ECS to pull the new image and restart tasks
aws ecs update-service \
  --cluster naholo-cluster \
  --service naholo-service \
  --force-new-deployment \
  --region ap-northeast-1

# Wait for deployment to complete (optional)
aws ecs wait services-stable \
  --cluster naholo-cluster \
  --services naholo-service \
  --region ap-northeast-1
```

#### 5. Monitor deployment:

```bash
# Watch service status
aws ecs describe-services \
  --cluster naholo-cluster \
  --services naholo-service \
  --region ap-northeast-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Events:events[:3]}'

# Tail logs in real-time
aws logs tail /ecs/naholo --follow --region ap-northeast-1
```

**Note:** This manual process is the same as what GitHub Actions does automatically when you push a version tag. Use version tags for regular deployments to maintain consistency and audit trail.

---

## Environment Variables

### Production (ECS)

Stored in AWS Secrets Manager:

- `DB_PASSWORD` - Database password (from RDS)
- `SESSION_SECRET` - Provided via terraform.tfvars
- `GOOGLE_OAUTH_CLIENT_SECRET` - Google OAuth client secret (optional)
- `GOOGLE_OAUTH_STATE_SECRET` - OAuth state parameter secret (required)

Stored in Task Definition (Environment Variables):

- `NODE_ENV=production`
- `PORT=3000`
- `DB_HOST` - RDS endpoint hostname
- `DB_PORT=5432` - Database port
- `DB_NAME=naholo` - Database name
- `DB_USER=naholo` - Database username
- `AWS_REGION=ap-northeast-1` - AWS region for SES and other services
- `AWS_SES_FROM_EMAIL` - Email address for sending emails (e.g., noreply@naholo.app)
- `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_OAUTH_REDIRECT_URI` - OAuth callback URL (optional)

### Local Development

Create `.env.local`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=naholo
DB_USER=naholo
DB_PASSWORD=naholo

# Authentication
SESSION_SECRET=your-dev-secret-key

# Environment
NODE_ENV=development

# AWS SES (Email) - Optional for local development
AWS_REGION=ap-northeast-1
AWS_SES_FROM_EMAIL=noreply@example.com

# Google OAuth (get from Google Cloud Console)
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_OAUTH_STATE_SECRET=your-state-secret
```

---

## Monitoring and Maintenance

### View Logs

```bash
# Tail logs in real-time
aws logs tail /ecs/naholo --follow

# Filter for errors
aws logs tail /ecs/naholo --filter-pattern ERROR --follow

# Specific time range
aws logs tail /ecs/naholo --since 1h
```

### Check Resource Usage

```bash
# ECS service metrics (via CloudWatch)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=naholo-service Name=ClusterName,Value=naholo-cluster \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region ap-northeast-1
```

### Database Backups

RDS automatically backs up your database daily (retention: 7 days).

**Manual snapshot:**

```bash
aws rds create-db-snapshot \
  --db-instance-identifier naholo-db \
  --db-snapshot-identifier naholo-manual-$(date +%Y%m%d) \
  --region ap-northeast-1
```

### Updating Task Definitions After Terraform Changes

**Important:** ECS does NOT automatically use the latest task definition version. When you run `terraform apply` and it creates a new task definition (e.g., after changing environment variables, secrets, or container settings), you must manually trigger a deployment.

**When to use this:**

- After `terraform apply` creates a new task definition version
- When you've updated infrastructure configuration (not code/images)
- After adding new environment variables or secrets

**How to deploy the new task definition:**

```bash
# This command forces a new deployment using the latest task definition
aws ecs update-service \
  --cluster naholo-cluster \
  --service naholo-service \
  --force-new-deployment \
  --region ap-northeast-1

# Wait for deployment to complete (optional)
aws ecs wait services-stable \
  --cluster naholo-cluster \
  --services naholo-service \
  --region ap-northeast-1
```

**Note:** GitHub Actions automatically handles task definition updates when you push code changes. This manual step is only needed for infrastructure changes made via Terraform.

### Scaling

**Scale ECS tasks:**

```bash
aws ecs update-service \
  --cluster naholo-cluster \
  --service naholo-service \
  --desired-count 2 \
  --region ap-northeast-1
```

**Scale RDS (change instance class):**

```bash
# Update terraform/variables.tf or terraform.tfvars
db_instance_class = "db.t4g.small"

# Apply changes
terraform apply
```

---

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster naholo-cluster \
  --tasks $(aws ecs list-tasks --cluster naholo-cluster --query 'taskArns[0]' --output text) \
  --region ap-northeast-1 \
  --query 'tasks[0].stoppedReason'

# Common issues:
# - Image pull failed: Check ECR permissions
# - Health check failing: Check /api/health endpoint
# - Secrets access denied: Check IAM execution role
```

### Database Connection Issues

```bash
# Test database connectivity from local
# Get DB password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id naholo-db-password --query SecretString --output text --region ap-northeast-1)
DB_HOST=$(terraform -chdir=terraform output -raw rds_endpoint)

# Connect using psql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U naholo -d naholo

# Or test connection with a simple query
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U naholo -d naholo -c "SELECT version();"

# Check security groups allow ECS → RDS
aws ec2 describe-security-groups \
  --group-ids $(terraform -chdir=terraform output -raw rds_security_group_id)
```

### Application Errors

```bash
# Check application logs
aws logs tail /ecs/naholo --since 30m

# Check for deployment events
aws ecs describe-services \
  --cluster naholo-cluster \
  --services naholo-service \
  --region ap-northeast-1 \
  --query 'services[0].events[:5]'
```
