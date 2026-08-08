resource "aws_dynamodb_table" "ddb_livro_emprestimos" {
  name         = var.ddb_livro_emprestimos_name
  billing_mode = var.livro_emprestimos_billing_type
  # read_capacity  = var.livro_emprestimos_read_capacity
  # write_capacity = var.livro_emprestimos_write_capacity
  hash_key  = var.livro_emprestimos_hash_key
  range_key = var.livro_emprestimos_range_key
  attribute {
    name = var.livro_emprestimos_hash_key
    type = var.livro_emprestimos_hash_type
  }
  attribute {
    name = var.livro_emprestimos_range_key
    type = var.livro_emprestimos_range_type
  }
  tags = merge(var.application_tags, { Contexto = "Emprestimos" })
}

output "ddb_livro_emprestimos_arn" {
  value       = aws_dynamodb_table.ddb_livro_emprestimos.arn
  description = "ARN da tabela DynamoDB para empréstimos"
}

output "ddb_livro_emprestimos_id" {
  value       = aws_dynamodb_table.ddb_livro_emprestimos.id
  description = "ID da tabela DynamoDB para empréstimos"
}

output "ddb_livro_emprestimos_name" {
  value       = aws_dynamodb_table.ddb_livro_emprestimos.name
  description = "Nome da tabela DynamoDB para empréstimos"
}

output "ddb_livro_emprestimos_hash_name" {
  value       = aws_dynamodb_table.ddb_livro_emprestimos.hash_key
  description = "Nome do atributo da chave hash para a tabela DynamoDB"
}
output "ddb_livro_emprestimos_range_name" {
  value       = aws_dynamodb_table.ddb_livro_emprestimos.range_key
  description = "Nome do atributo da chave de range para a tabela DynamoDB"
}
