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
- **RDS PostgreSQL**: Database with IAM authentication
- **ECR**: Docker image registry
- **Secrets Manager**: Secure secrets storage
- **CloudWatch**: Logs and monitoring

**Estimated Monthly Cost:** ~$36/month (Tokyo region)

---

## Prerequisites

### 1. AWS Account Setup

1. **Create AWS Account** (if you don't have one)
2. **Install AWS CLI:**

   ```bash
   # macOS
   brew install awscli

   # Verify installation
   aws --version
   ```

3. **Configure AWS CLI:**

   ```bash
   aws configure

   # Enter:
   # AWS Access Key ID: [your-access-key]
   # AWS Secret Access Key: [your-secret-key]
   # Default region name: ap-northeast-1
   # Default output format: json
   ```

### 2. Domain and SSL Certificate

1. **Request ACM Certificate** (in ap-northeast-1 region):

   ```bash
   aws acm request-certificate \
     --domain-name your-domain.com \
     --validation-method DNS \
     --region ap-northeast-1
   ```

2. **Validate the certificate** by adding DNS records (check email or Route 53)

3. **Get the certificate ARN:**
   ```bash
   aws acm list-certificates --region ap-northeast-1
   ```

### 3. Verify SES Email

1. **Verify sender email address:**

   ```bash
   aws ses verify-email-identity \
     --email-address noreply@your-domain.com \
     --region ap-northeast-1
   ```

2. **Check your email** and click the verification link

3. **(Optional) Request production access** to send emails to any address:
   - By default, SES is in sandbox mode (can only send to verified addresses)
   - Submit a request in AWS Console: SES → Account Dashboard → Request production access

### 4. Install Terraform

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

1. **Create Terraform variables file:**

   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`:**

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
   ```

3. **Generate session secret:**
   ```bash
   openssl rand -base64 32
   ```

### Step 2: Deploy Infrastructure

1. **Initialize Terraform:**

   ```bash
   cd terraform
   terraform init
   ```

2. **Review the plan:**

   ```bash
   terraform plan

   # Should show: Plan: ~30 to add, 0 to change, 0 to destroy
   ```

3. **Deploy:**

   ```bash
   terraform apply

   # Type 'yes' when prompted
   # Wait ~10-15 minutes for resources to be created
   ```

4. **Save important outputs:**

   ```bash
   terraform output -json > ../outputs.json

   # View specific outputs:
   terraform output ecr_repository_url
   terraform output alb_dns_name
   terraform output rds_endpoint
   ```

### Step 3: Build and Push Docker Image

1. **Login to ECR:**

   ```bash
   cd .. # Back to project root

   aws ecr get-login-password --region ap-northeast-1 | \
     docker login --username AWS --password-stdin $(terraform -chdir=terraform output -raw ecr_repository_url | cut -d/ -f1)
   ```

2. **Build Docker image:**

   ```bash
   docker build -t naholo .
   ```

3. **Tag and push:**

   ```bash
   ECR_URL=$(terraform -chdir=terraform output -raw ecr_repository_url)

   docker tag naholo:latest $ECR_URL:latest
   docker push $ECR_URL:latest
   ```

### Step 4: Initialize Database Schema

The database needs to be initialized with the schema. You have two options:

**Option A: From local machine (requires RDS to be publicly accessible)**

```bash
# Get database URL from Secrets Manager
DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id $(terraform -chdir=terraform output -raw rds_password_secret_arn) \
  --region ap-northeast-1 \
  --query SecretString \
  --output text)

# Export for drizzle-kit
export DATABASE_URL="$DB_URL"

# Push schema to database
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

1. **Get ALB DNS name:**

   ```bash
   terraform -chdir=terraform output alb_dns_name
   ```

2. **Create CNAME record** in your DNS provider:

   ```
   Type: CNAME
   Name: @ (or your-subdomain)
   Value: naholo-alb-123456.ap-northeast-1.elb.amazonaws.com
   TTL: 300
   ```

3. **Wait for DNS propagation** (~5-10 minutes):
   ```bash
   dig your-domain.com
   ```

### Step 7: Verify Deployment

1. **Check application health:**

   ```bash
   curl https://your-domain.com/api/health

   # Should return:
   # {"status":"healthy","timestamp":"...","database":"connected"}
   ```

2. **View application logs:**

   ```bash
   aws logs tail /ecs/naholo --follow --region ap-northeast-1
   ```

3. **Check ECS service status:**
   ```bash
   aws ecs describe-services \
     --cluster naholo-cluster \
     --services naholo-service \
     --region ap-northeast-1 \
     --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
   ```

---

## Setting Up CI/CD with GitHub Actions

### Step 1: Create IAM User or OIDC Role for GitHub Actions

**Option A: OIDC (Recommended - No long-lived credentials)**

1. Create OIDC provider in AWS Console:
   - IAM → Identity Providers → Add Provider
   - Provider type: OpenID Connect
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. Create IAM role for GitHub:
   ```bash
   # Use Terraform or AWS Console to create role
   # Trust policy should allow GitHub Actions from your repo
   ```

**Option B: IAM Access Keys (Simpler but less secure)**

1. Create IAM user with programmatic access
2. Attach policies:
   - `AmazonEC2ContainerRegistryPowerUser`
   - `AmazonECS_FullAccess` (or create custom policy with minimum permissions)

### Step 2: Configure GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:

```
AWS_ROLE_ARN (if using OIDC)
# OR
AWS_ACCESS_KEY_ID (if using access keys)
AWS_SECRET_ACCESS_KEY (if using access keys)
```

### Step 3: Push to Main Branch

GitHub Actions will automatically:

1. Build Docker image
2. Push to ECR
3. Update ECS task definition
4. Deploy new version
5. Wait for service stability

Monitor deployment: Repository → Actions tab

---

## Environment Variables

### Production (ECS)

Stored in AWS Secrets Manager:

- `DATABASE_URL` - Automatically constructed from RDS endpoint
- `SESSION_SECRET` - Provided via terraform.tfvars

Stored in Task Definition:

- `NODE_ENV=production`
- `PORT=3000`
- `AWS_REGION=ap-northeast-1` (from ECS metadata)
- `AWS_SES_FROM_EMAIL` - Add to Terraform if needed

### Local Development

Create `.env.local`:

```env
DATABASE_URL=postgresql://naholo:naholo@localhost:5432/naholo
SESSION_SECRET=your-dev-secret-key
NODE_ENV=development
AWS_SES_FROM_EMAIL=noreply@example.com
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
psql "$(aws secretsmanager get-secret-value --secret-id naholo-database-url --query SecretString --output text --region ap-northeast-1)"

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

---

## Cost Optimization

### Development/Staging

**Stop RDS when not in use:**

```bash
# Stop (can stay stopped for up to 7 days)
aws rds stop-db-instance --db-instance-identifier naholo-db

# Start when needed
aws rds start-db-instance --db-instance-identifier naholo-db
```

**Scale ECS to zero:**

```bash
aws ecs update-service \
  --cluster naholo-cluster \
  --service naholo-service \
  --desired-count 0
```

### Complete Teardown

```bash
cd terraform
terraform destroy

# Type 'yes' when prompted
# Deletes all resources (~5-10 minutes)
```

---

## Security Best Practices

✅ **Implemented:**

- HTTPS only (HTTP redirects to HTTPS)
- Secrets in AWS Secrets Manager (not environment variables)
- IAM authentication for RDS (production)
- Least privilege IAM roles
- RDS encryption at rest
- Security groups restrict access
- Container runs as non-root user

🔒 **Recommended Additions:**

- Enable WAF on ALB for DDoS protection
- Set up CloudWatch alarms for errors/high CPU
- Enable VPC Flow Logs
- Use AWS GuardDuty for threat detection
- Regular security updates for dependencies

---

## Support

For issues or questions:

- Check [Terraform README](terraform/README.md)
- View CloudWatch logs
- Review ECS service events

Good luck with your deployment! 🚀
