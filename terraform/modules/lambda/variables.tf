variable "node_runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "compatible_architectures" {
  type    = list(string)
  default = ["x86_64"]
}

variable "lambda_geral_timeout" {
  type    = number
  default = 600
}

variable "lambda_geral_memory" {
  type    = number
  default = 256
}

variable "lambda_geral_reserved_concurrent_executions" {
  type    = number
  default = 5
}

variable "lambda_geral_log_retention" {
  type    = number
  default = 7
}

variable "coreLayer_arn" {
  type = string
}

variable "adapterLayer_arn" {
  type = string
}

variable "dynamodb_repository" {
  type    = bool
  default = false
}

variable "ddb_usuario_emprestimos_name" {
  type    = string
  default = "minhoteca-usuario-emprestimos"
}

variable "ddb_usuario_emprestimos_hash_name" {
  type    = string
  default = "idUsuario"
}

variable "ddb_usuario_emprestimos_range_name" {
  type    = string
  default = "idLivro"
}

variable "ddb_livro_emprestimos_name" {
  type    = string
  default = "minhoteca-livro-emprestimos"
}

variable "ddb_livro_emprestimos_hash_name" {
  type    = string
  default = "idLivro"
}

variable "ddb_livro_emprestimos_range_name" {
  type    = string
  default = "idUsuario"
}

variable "debug" {
  type    = bool
  default = true
}

variable "lambda_bundle_minify" {
  type    = bool
  default = true
}

variable "lambda_bundle_sourcemap" {
  type    = bool
  default = false
}

variable "application_tags" {
  type        = map(string)
  default     = {}
  description = "Tags adicionais para os recursos do módulo de lambda"
}

variable "region_name" {
  type    = string
  default = "us-east-1"
}

variable "account_id" {
  type = string
}

variable "environment" {
  type = string
}

variable "userpool_arn" {
  type = string
}

variable "userpool_id" {
  type = string
}

variable "userpool_client_id" {
  type = string
}
