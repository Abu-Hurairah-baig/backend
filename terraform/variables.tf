@'
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "key_name" {
  type = string
}

variable "my_ip" {
  type = string
}

variable "repo_url" {
  type = string
}

variable "app_port" {
  type    = number
  default = 3000
}
'@ | Set-Content -Encoding ascii variables.tf