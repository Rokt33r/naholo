# naholo AWS Infrastructure

This directory contains Terraform configuration to deploy the naholo application to AWS.

## Architecture

- **ECS Fargate**: Runs the Next.js application in containers
- **Application Load Balancer**: HTTPS termination and routing
- **RDS PostgreSQL**: Database with IAM authentication
- **ECR**: Docker image registry
- **Secrets Manager**: Secure storage for sensitive configuration
- **CloudWatch**: Logs and monitoring

## Prerequisites

1. **AWS CLI** configured with credentials

   ```bash
   aws configure
   ```

2. **Terraform** installed (v1.0+)

   ```bash
   brew install terraform
   ```

3. **ACM Certificate** created in AWS Certificate Manager (ap-northeast-1 region)

4. **Domain** ready to point to the load balancer

## Initial Setup

1. **Copy the example variables file:**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars` with your values:**

   ```hcl
   acm_certificate_arn = "arn:aws:acm:ap-northeast-1:YOUR_ACCOUNT:certificate/YOUR_CERT_ID"
   domain_name         = "your-domain.com"
   session_secret      = "$(openssl rand -base64 32)"
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

## Deployment

### First-Time Deployment

```bash
# Review the plan
terraform plan

# Apply the infrastructure
terraform apply

# Note the outputs, especially:
# - ecr_repository_url (for pushing Docker images)
# - alb_dns_name (for DNS configuration)
```

### Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <ECR_URL>

# Build the image
docker build -t naholo .

# Tag the image
docker tag naholo:latest <ECR_URL>:latest

# Push to ECR
docker push <ECR_URL>:latest
```

### Update ECS Service

After pushing a new image:

```bash
# Force ECS to deploy the new image
aws ecs update-service \
  --cluster naholo-cluster \
  --service naholo-service \
  --force-new-deployment \
  --region ap-northeast-1
```

## DNS Configuration

Point your domain to the ALB DNS name (from terraform output):

**CNAME Record:**

```
your-domain.com  →  naholo-alb-123456.ap-northeast-1.elb.amazonaws.com
```

## Database Access

### From Local (Development)

```bash
# Get the password from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id naholo-database-url \
  --region ap-northeast-1 \
  --query SecretString \
  --output text

# Or use the RDS endpoint directly
psql "postgresql://naholo:PASSWORD@ENDPOINT:5432/naholo?sslmode=require"
```

### Run Database Migrations

```bash
# SSH into a running ECS task or run locally with DATABASE_URL
pnpm db:push
```

## Monitoring

### View Application Logs

```bash
# Tail logs in real-time
aws logs tail /ecs/naholo --follow --region ap-northeast-1

# Filter for errors
aws logs tail /ecs/naholo --follow --filter-pattern ERROR
```

### Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster naholo-cluster \
  --services naholo-service \
  --region ap-northeast-1
```

## Troubleshooting

### ECS tasks failing to start

```bash
# Check task logs
aws ecs describe-tasks \
  --cluster naholo-cluster \
  --tasks <TASK_ID> \
  --region ap-northeast-1

# Check CloudWatch logs
aws logs tail /ecs/naholo --since 30m
```

### Can't pull Docker image

- Verify ECR repository exists
- Check IAM role has `AmazonECSTaskExecutionRolePolicy`
- Ensure image was pushed successfully

### Database connection issues

- Check security group allows ECS → RDS
- Verify DATABASE_URL in Secrets Manager is correct
- Check RDS is in "available" state

## Cleanup

To destroy all infrastructure:

```bash
# WARNING: This deletes everything including the database!
terraform destroy
```

## Files

- `main.tf` - Provider and data sources
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `vpc.tf` - Network configuration (using default VPC)
- `rds.tf` - PostgreSQL database
- `ecs.tf` - ECS cluster, service, and task definition
- `alb.tf` - Application Load Balancer
- `iam.tf` - IAM roles and policies
- `ecr.tf` - Container registry
- `secrets.tf` - Secrets Manager configuration

## Security Notes

- RDS uses IAM authentication for ECS tasks
- Master password stored in Secrets Manager
- All traffic encrypted (HTTPS, RDS SSL)
- Secrets stored in AWS Secrets Manager, not in environment variables
- Security groups restrict access appropriately
