output "lambda_acervoes_arn" {
  value = aws_lambda_function.acervoFunction.arn
}

output "lambda_acervoes_invoke_arn" {
  value = aws_lambda_function.acervoFunction.invoke_arn
}

output "lambda_acervoes_name" {
  value = aws_lambda_function.acervoFunction.function_name
}
