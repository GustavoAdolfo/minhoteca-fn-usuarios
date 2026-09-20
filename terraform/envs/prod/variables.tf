variable "appregistry_id" {
  type        = string
  description = "ID da aplicação no Service Catalog App Registry"
}

variable "environment" {
  type    = string
  default = "cloud"
}

variable "userpool_id" {
  type        = string
  description = "ID do User Pool do Cognito"
}

variable "userpool_client_id" {
  type        = string
  description = "ID do Client do User Pool do Cognito"
}

variable "s3_bucket_recursos" {
  type = string
}

variable "s3_caminho_fotos_perfil" {
  type = string
}

variable "mongodb_username" {
  type      = string
  sensitive = true
}
variable "mongodb_password" {
  type      = string
  sensitive = true
}
variable "mongodb_database" {
  type = string
}
variable "mongodb_cluster" {
  type = string
}
variable "mongodb_appname" {
  type = string
}
