# Input variables for Naholo infrastructure

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-1" # Tokyo
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "naholo"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 3000
}

# ECS Configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 1
}

# RDS Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro" # ~$13/month, 1 vCPU, 1GB RAM
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "naholo"
}

variable "db_username" {
  description = "Master username for RDS (used with IAM authentication)"
  type        = string
  default     = "naholo"
}

# Application Configuration
variable "session_secret" {
  description = "Session secret for application (set via terraform.tfvars or environment)"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "Docker image URL from ECR"
  type        = string
  default     = "" # Will be populated after first build
}

# Domain and SSL Configuration
variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS (e.g., arn:aws:acm:ap-northeast-1:123456789012:certificate/abc-123)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application (optional, for documentation)"
  type        = string
  default     = ""
}

# Google OAuth Configuration
variable "google_oauth_client_id" {
  description = "Google OAuth Client ID (from Google Cloud Console)"
  type        = string
  default     = ""
}

variable "google_oauth_client_secret" {
  description = "Google OAuth Client Secret (from Google Cloud Console)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_oauth_redirect_uri" {
  description = "Google OAuth Redirect URI (e.g., https://your-domain.com/api/auth/google/callback)"
  type        = string
  default     = ""
}

variable "google_oauth_state_secret" {
  description = "Secret for OAuth state parameter (generate with: openssl rand -base64 32)"
  type        = string
  sensitive   = true
}

# GitHub Actions Configuration
variable "github_repository" {
  description = "GitHub repository in format 'owner/repo-name' for OIDC authentication. Each repository should have its own IAM role for security isolation."
  type        = string
  default     = "iLuvGimbap/naholo"
}
