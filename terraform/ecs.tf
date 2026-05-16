# ECS Fargate Cluster and Service

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7 # Adjust as needed for cost optimization

  tags = {
    Name = "${var.project_name}-ecs-logs"
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.project_name}-ecs-tasks-"
  description = "Security group for ECS tasks"
  vpc_id      = data.aws_vpc.default.id

  # Allow inbound from ALB only
  ingress {
    description     = "HTTP from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all outbound (for internet access, RDS, etc.)
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-tasks-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = var.project_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = var.project_name
      image = var.container_image != "" ? var.container_image : "${aws_ecr_repository.app.repository_url}:latest"

      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]

      environment = concat([
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = tostring(var.app_port)
        },
        {
          name  = "DB_HOST"
          value = split(":", aws_db_instance.main.endpoint)[0]
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "DB_USER"
          value = var.db_username
        },
        {
          name  = "DB_SSL"
          value = var.db_ssl
        },
        {
          name  = "BASE_URL"
          value = var.base_url
        },
        {
          name  = "NAHOLO_STORAGE_DRIVER"
          value = "s3"
        },
        {
          name  = "NAHOLO_STORAGE_S3_BUCKET"
          value = aws_s3_bucket.file_storage.id
        },
        {
          name  = "BILLING"
          value = "true"
        },
        {
          name  = "PADDLE_ENVIRONMENT"
          value = "production"
        }
        ],
        var.google_oauth_client_id != "" ? [
          {
            name  = "GOOGLE_OAUTH_CLIENT_ID"
            value = var.google_oauth_client_id
          }
        ] : [],
        var.google_oauth_redirect_uri != "" ? [
          {
            name  = "GOOGLE_OAUTH_REDIRECT_URI"
            value = var.google_oauth_redirect_uri
          }
        ] : []
      )

      secrets = concat([
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "SESSION_SECRET"
          valueFrom = aws_secretsmanager_secret.session_secret.arn
        },
        {
          name      = "GOOGLE_OAUTH_STATE_SECRET"
          valueFrom = aws_secretsmanager_secret.google_oauth_state_secret.arn
        },
        {
          name      = "PADDLE_API_KEY"
          valueFrom = aws_secretsmanager_secret.paddle_api_key.arn
        },
        {
          name      = "PADDLE_WEBHOOK_SECRET"
          valueFrom = aws_secretsmanager_secret.paddle_webhook_secret.arn
        },
        {
          name      = "PADDLE_PROJECT_TOKEN_SECRET"
          valueFrom = aws_secretsmanager_secret.paddle_project_token_secret.arn
        }
        ],
        var.google_oauth_client_secret != "" ? [
          {
            name      = "GOOGLE_OAUTH_CLIENT_SECRET"
            valueFrom = aws_secretsmanager_secret.google_oauth_client_secret[0].arn
          }
        ] : []
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://$(hostname -i):${var.app_port}/api/health', (r) => {console.log('Status:', r.statusCode); process.exit(r.statusCode === 200 ? 0 : 1)})\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task-def"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true # Required for pulling images from ECR
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.project_name
    container_port   = var.app_port
  }

  # Enable ECS Exec for debugging
  enable_execute_command = true

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_execution
  ]

  tags = {
    Name = "${var.project_name}-service"
  }
}
