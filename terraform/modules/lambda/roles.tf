resource "aws_iam_role" "role_usuarioFunction" {
  name               = "minhoteca-usuarioFunction"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_policy" "invoke_usuarioFunction" {
  name        = "minhoteca-usuarioFunction-invoke-policy"
  description = "IAM policy lambda usuarioFunction invoke"
  policy      = data.aws_iam_policy_document.lambda_invoke.json
  tags        = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_role_policy_attachment" "usuarioFunction_role_invoke" {
  role       = aws_iam_role.role_usuarioFunction.name
  policy_arn = aws_iam_policy.invoke_usuarioFunction.arn
}

##### S3

resource "aws_iam_policy" "s3_usuarioFunction" {
  name        = "minhoteca-lambda-usuarioFunction-s3"
  path        = "/"
  description = "IAM policy para lambda usuarioFunction s3"
  policy      = data.aws_iam_policy_document.lambda_s3.json
  tags        = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_role_policy_attachment" "usuarioFunction_role_s3" {
  role       = aws_iam_role.role_usuarioFunction.name
  policy_arn = aws_iam_policy.s3_usuarioFunction.arn
}

##### DynamoDB

resource "aws_iam_policy" "dynamodb_usuarioFunction" {
  name        = "minhoteca-lambda-usuarioFunction-dynamodb"
  path        = "/"
  description = "IAM policy para lambda usuarioFunction DynamoDB"
  policy      = data.aws_iam_policy_document.lambda_dynamodb.json
  tags        = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_role_policy_attachment" "usuarioFunction_role_dynamodb" {
  role       = aws_iam_role.role_usuarioFunction.name
  policy_arn = aws_iam_policy.dynamodb_usuarioFunction.arn
}

### Logging

resource "aws_iam_policy" "log_usuarioFunction" {
  name        = "minhoteca-lambda-usuarioFunction-logging"
  path        = "/"
  description = "IAM policy para lambda usuarioFunction logging"
  policy      = data.aws_iam_policy_document.lambda_logging.json
  tags        = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_role_policy_attachment" "usuarioFunction_role_logs" {
  role       = aws_iam_role.role_usuarioFunction.name
  policy_arn = aws_iam_policy.log_usuarioFunction.arn
}

resource "aws_cloudwatch_log_group" "log_usuarioFunction" {
  name              = "/aws/lambda/minhoteca-usuarioFunction"
  retention_in_days = var.lambda_geral_log_retention
  tags              = merge(var.application_tags, { Contexto = "Usuario" })
}

### mensageria

resource "aws_iam_policy" "lbd_mensageria_policy_usuarioFunction" {
  name        = "minhoteca-usuario-mensageria-policy"
  description = "IAM policy mensageria lambda usuarioFunction"
  policy      = data.aws_iam_policy_document.lambda_sqs.json
  tags        = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_role_policy_attachment" "lbd_mensageria_role_usuarioFunction" {
  role       = aws_iam_role.role_usuarioFunction.name
  policy_arn = aws_iam_policy.lbd_mensageria_policy_usuarioFunction.arn
}


### cognito

resource "aws_lambda_permission" "lbd_cognito_usuarioFunction_permission" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.usuarioFunction.arn
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.userpool_arn
}

resource "aws_iam_policy" "lbd_cognito_policy_usuarioFunction" {
  name        = "minhoteca-usuarioFunction-policy-cognito"
  description = "IAM policy Minhoteca usuarioFunction"
  policy      = data.aws_iam_policy_document.lambda_cognito.json
  tags        = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_iam_role_policy_attachment" "lbd_cognito_role_usuarioFunction" {
  role       = aws_iam_role.role_usuarioFunction.name
  policy_arn = aws_iam_policy.lbd_cognito_policy_usuarioFunction.arn
}
