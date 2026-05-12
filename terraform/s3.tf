# S3 bucket for server-side file storage (agent session transcripts, future blobs)

resource "aws_s3_bucket" "file_storage" {
  bucket = var.s3_naholo_file_storage_bucket

  tags = {
    Name = "${var.project_name}-file-storage"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "file_storage" {
  bucket = aws_s3_bucket.file_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "file_storage" {
  bucket = aws_s3_bucket.file_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
