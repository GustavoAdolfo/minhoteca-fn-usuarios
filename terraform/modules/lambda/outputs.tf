output "lambda_usuarios_arn" {
  value = aws_lambda_function.usuarioFunction.arn
}

output "lambda_usuarios_invoke_arn" {
  value = aws_lambda_function.usuarioFunction.invoke_arn
}

output "lambda_usuarios_name" {
  value = aws_lambda_function.usuarioFunction.function_name
}
