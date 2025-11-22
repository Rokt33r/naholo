# Amazon ECR (Elastic Container Registry) for Docker images

resource "aws_ecr_repository" "app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE" # Allow overwriting tags like "latest"

  image_scanning_configuration {
    scan_on_push = true # Scan images for vulnerabilities
  }

  encryption_configuration {
    encryption_type = "AES256" # Server-side encryption
  }

  tags = {
    Name = "${var.project_name}-ecr"
  }
}

# Lifecycle policy to clean up old images (cost optimization)
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
