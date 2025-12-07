# AWS Secrets Manager for sensitive configuration

# Database password secret
resource "aws_secretsmanager_secret" "db_password" {
  name_prefix             = "${var.project_name}-db-password-"
  description             = "Database password for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
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
