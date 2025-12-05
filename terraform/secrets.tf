# AWS Secrets Manager for sensitive configuration

# Database URL secret
resource "aws_secretsmanager_secret" "database_url" {
  name_prefix             = "${var.project_name}-database-url-"
  description             = "Database connection string for ${var.project_name}"
  recovery_window_in_days = 7 # Can be recovered within 7 days after deletion

  tags = {
    Name = "${var.project_name}-database-url"
  }
}

# Store the database URL value
resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}?sslmode=require"
}

# Session secret
resource "aws_secretsmanager_secret" "session_secret" {
  name_prefix             = "${var.project_name}-session-secret-"
  description             = "Session secret for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-session-secret"
  }
}

# Store the session secret value
resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id     = aws_secretsmanager_secret.session_secret.id
  secret_string = var.session_secret
}

# Google OAuth Client Secret
resource "aws_secretsmanager_secret" "google_oauth_client_secret" {
  count                   = var.google_oauth_client_secret != "" ? 1 : 0
  name_prefix             = "${var.project_name}-google-oauth-client-secret-"
  description             = "Google OAuth client secret for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-google-oauth-client-secret"
  }
}

resource "aws_secretsmanager_secret_version" "google_oauth_client_secret" {
  count         = var.google_oauth_client_secret != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.google_oauth_client_secret[0].id
  secret_string = var.google_oauth_client_secret
}

# Google OAuth State Secret
resource "aws_secretsmanager_secret" "google_oauth_state_secret" {
  name_prefix             = "${var.project_name}-google-oauth-state-secret-"
  description             = "Google OAuth state secret for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-google-oauth-state-secret"
  }
}

resource "aws_secretsmanager_secret_version" "google_oauth_state_secret" {
  secret_id     = aws_secretsmanager_secret.google_oauth_state_secret.id
  secret_string = var.google_oauth_state_secret
}
