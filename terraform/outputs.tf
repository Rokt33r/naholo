# Terraform Outputs - Important information after deployment

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "URL to access your application"
  value       = "https://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = aws_ecr_repository.app.repository_url
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = var.db_username
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "github_actions_role_arn" {
  description = "IAM Role ARN for GitHub Actions OIDC authentication - Add this to GitHub repository secrets as AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}

output "domain_name" {
  description = "Custom domain name (if configured)"
  value       = var.domain_name != "" ? var.domain_name : "Not configured"
}

output "next_steps" {
  description = "Instructions for next steps"
  value = <<-EOT
    Deployment complete! Next steps:

    1. Point your domain (${var.domain_name != "" ? var.domain_name : "your-domain.com"}) to:
       ${aws_lb.main.dns_name}

    2. Push your Docker image:
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}
       docker build -t ${var.project_name} .
       docker tag ${var.project_name}:latest ${aws_ecr_repository.app.repository_url}:latest
       docker push ${aws_ecr_repository.app.repository_url}:latest

    3. Update ECS service to use the new image (or wait for GitHub Actions)

    4. View logs:
       aws logs tail ${aws_cloudwatch_log_group.ecs.name} --follow

    5. Access your app at:
       https://${var.domain_name != "" ? var.domain_name : aws_lb.main.dns_name}
  EOT
}
