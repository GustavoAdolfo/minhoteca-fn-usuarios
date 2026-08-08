### VISÃO DE EMPRESTIMOS POR USUÁRIOS
variable "ddb_usuario_emprestimos_name" {
  type        = string
  description = "Nome da tabela DynamoDB para empréstimos de usuários"
}

variable "usuario_emprestimos_billing_type" {
  type        = string
  description = "Modo de cobrança para a tabela DynamoDB (PROVISIONED ou PAY_PER_REQUEST)"
}

variable "usuario_emprestimos_read_capacity" {
  type        = number
  description = "Capacidade de leitura provisionada para a tabela DynamoDB (aplicável apenas se billing_mode for PROVISIONED)"
}

variable "usuario_emprestimos_write_capacity" {
  type        = number
  description = "Capacidade de escrita provisionada para a tabela DynamoDB (aplicável apenas se billing_mode for PROVISIONED)"
}

variable "usuario_emprestimos_hash_key" {
  type        = string
  description = "Chave hash para a tabela DynamoDB"
}

variable "usuario_emprestimos_hash_type" {
  type        = string
  description = "Tipo da chave hash para a tabela DynamoDB"
}

variable "usuario_emprestimos_range_key" {
  type        = string
  description = "Chave de intervalo para a tabela DynamoDB"
}

variable "usuario_emprestimos_range_type" {
  type        = string
  description = "Tipo da chave de intervalo para a tabela DynamoDB"
}

### VISÃO DE EMPRESTIMOS POR LIVROS
variable "ddb_livro_emprestimos_name" {
  type        = string
  description = "Nome da tabela DynamoDB para empréstimos de livros"
}

variable "livro_emprestimos_billing_type" {
  type        = string
  description = "Modo de cobrança para a tabela DynamoDB (PROVISIONED ou PAY_PER_REQUEST)"
}

variable "livro_emprestimos_read_capacity" {
  type        = number
  description = "Capacidade de leitura provisionada para a tabela DynamoDB (aplicável apenas se billing_mode for PROVISIONED)"
}

variable "livro_emprestimos_write_capacity" {
  type        = number
  description = "Capacidade de escrita provisionada para a tabela DynamoDB (aplicável apenas se billing_mode for PROVISIONED)"
}

variable "livro_emprestimos_hash_key" {
  type        = string
  description = "Chave hash para a tabela DynamoDB"
}

variable "livro_emprestimos_hash_type" {
  type        = string
  description = "Tipo da chave hash para a tabela DynamoDB"
}

variable "livro_emprestimos_range_key" {
  type        = string
  description = "Chave de intervalo para a tabela DynamoDB"
}

variable "livro_emprestimos_range_type" {
  type        = string
  description = "Tipo da chave de intervalo para a tabela DynamoDB"
}

### TAGS

variable "application_tags" {
  type        = map(string)
  default     = {}
  description = "Tags adicionais para os recursos do módulo de banco de dados"
}
