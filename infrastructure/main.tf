provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "health-intelligence-db"
  engine             = "aurora-postgresql"
  master_username    = "admin"
  master_password    = "yourpassword"
  backup_retention_period = 5
  preferred_backup_window = "07:00-09:00"
}

resource "rabbitmq_vhost" "health" {
  name = "/health_intelligence"
}
#