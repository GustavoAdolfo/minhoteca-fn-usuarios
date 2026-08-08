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
