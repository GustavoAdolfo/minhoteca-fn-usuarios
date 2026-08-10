resource "aws_lambda_function" "usuarioFunction" {
  function_name                  = "minhoteca-usuario"
  description                    = "Função de gerenciamento do usuario da Minhoteca"
  role                           = aws_iam_role.role_usuarioFunction.arn
  handler                        = "index.handler"
  runtime                        = var.node_runtime
  architectures                  = var.compatible_architectures
  timeout                        = var.lambda_geral_timeout
  memory_size                    = var.lambda_geral_memory
  reserved_concurrent_executions = var.lambda_geral_reserved_concurrent_executions
  publish                        = false
  filename                       = data.archive_file.usuarioFunction_file.output_path
  source_code_hash               = data.archive_file.usuarioFunction_file.output_base64sha256
  layers = [
    var.coreLayer_arn,
    var.adapterLayer_arn
  ]
  dead_letter_config {
    target_arn = aws_sqs_queue.usuarioFunctionDL.arn
  }
  environment {
    variables = {
      VERSION                           = data.external.usuarioFunction_version.result.version
      DYNAMODB_REPOSITORY               = tostring(var.dynamodb_repository)
      TB_USUARIO_EMPRESTIMOS_NAME       = var.ddb_usuario_emprestimos_name
      TB_USUARIO_EMPRESTIMOS_HASH_NAME  = var.ddb_usuario_emprestimos_hash_name
      TB_USUARIO_EMPRESTIMOS_RANGE_NAME = var.ddb_usuario_emprestimos_range_name
      TB_LIVRO_EMPRESTIMOS_NAME         = var.ddb_livro_emprestimos_name
      TB_LIVRO_EMPRESTIMOS_HASH_NAME    = var.ddb_livro_emprestimos_hash_name
      TB_LIVRO_EMPRESTIMOS_RANGE_NAME   = var.ddb_livro_emprestimos_range_name
      USER_POOL_ARN                     = var.userpool_arn
      USER_POOL_ID                      = var.userpool_id
      DEBUG                             = var.debug
      ENVIRONMENT                       = var.environment
    }
  }
  tracing_config {
    mode = "PassThrough"
  }
  tags = merge(var.application_tags, { Contexto = "Usuario" })
}

resource "aws_sqs_queue" "usuarioFunctionDL" {
  name = "minhoteca-usuario-dl"
  tags = merge(var.application_tags, { Contexto = "Usuario" })
}


data "external" "usuarioFunction_version" {
  program = ["node", "${path.module}/../../../version.mjs"]
}

resource "null_resource" "usuarioFunction_build" {
  triggers = {
    src_hash = sha256(join("", [for f in sort(fileset("${path.module}/../../src", "**/*")) : filesha256("${path.module}/../../minhoteca-functions/usuarios-function/${f}")]))
  }
  provisioner "local-exec" {
    command = "cd ${path.module}/../../.. && rm -rf lambda-package && npm ci --ignore-scripts && npm run build && mkdir -p lambda-package && cp -R dist/. lambda-package/ && cp package.json package-lock.json lambda-package/ && cd lambda-package && npm ci --omit=dev --ignore-scripts"
  }
}

data "archive_file" "usuarioFunction_file" {
  depends_on  = [null_resource.usuarioFunction_build]
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda-package/"
  output_path = "${path.module}/usuariosFunction.zip"
}

