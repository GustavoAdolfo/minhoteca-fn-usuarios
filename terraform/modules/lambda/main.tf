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
    var.adapterLayer_arn,
    var.casosDeUsoLayer_arn
  ]
  dead_letter_config {
    target_arn = aws_sqs_queue.usuarioFunctionDL.arn
  }
  environment {
    variables = {
      VERSION                           = data.external.usuarioFunction_version.result.version
      DYNAMODB_REPOSITORY               = tostring(var.dynamodb_repository)
      TABELA_EMPRESTIMO_USUARIO         = var.ddb_usuario_emprestimos_name
      TB_USUARIO_EMPRESTIMOS_HASH_NAME  = var.ddb_usuario_emprestimos_hash_name
      TB_USUARIO_EMPRESTIMOS_RANGE_NAME = var.ddb_usuario_emprestimos_range_name
      TABELA_EMPRESTIMO_LIVROS          = var.ddb_livro_emprestimos_name
      TB_LIVRO_EMPRESTIMOS_HASH_NAME    = var.ddb_livro_emprestimos_hash_name
      TB_LIVRO_EMPRESTIMOS_RANGE_NAME   = var.ddb_livro_emprestimos_range_name
      TABELA_LIVROS                     = var.tabela_livros
      USER_POOL_ARN                     = var.userpool_arn
      USER_POOL_ID                      = var.userpool_id
      CLIENT_ID_TOKEN                   = var.userpool_client_id
      DEBUG                             = var.debug
      ENVIRONMENT                       = var.environment
      S3_BUCKET_RECURSOS                = var.s3_bucket_recursos
      S3_CAMINHO_FOTOS_PERFIL           = var.s3_caminho_fotos_perfil
      MONGODB_USERNAME                  = var.mongodb_username
      MONGODB_PASSWORD                  = var.mongodb_password
      MONGODB_DATABASE                  = var.mongodb_database
      MONGODB_CLUSTER                   = var.mongodb_cluster
      MONGODB_APPNAME                   = var.mongodb_appname
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
    src_hash = sha256(join("", [for f in sort(fileset("${path.module}/../../../src", "**/*")) : filesha256("${path.module}/../../../src/${f}")]))
    deps_hash = sha256(join("", [
      filesha256("${path.module}/../../../package.json"),
      filesha256("${path.module}/../../../package-lock.json"),
      filesha256("${path.module}/../../../tsconfig.json"),
    ]))
  }
  provisioner "local-exec" {
    command = <<EOT
      cd ${path.module}/../../.. && \
      rm -rf lambda-package && \
      npm ci --ignore-scripts && \
      if [ "${var.environment}" = "local" ]; then \
        npm install @gustavoadolfo/minhoteca-core-layer @gustavoadolfo/minhoteca-adapter-layer @gustavoadolfo/minhoteca-casos-de-uso-layer; \
      fi && \
      mkdir -p lambda-package && \
      npx esbuild src/index.ts --bundle --platform=node --target=node22 --format=cjs --outfile=lambda-package/index.js ${var.lambda_bundle_minify ? "--minify" : ""} ${var.lambda_bundle_sourcemap ? "--sourcemap" : ""} --external:@gustavoadolfo/minhoteca-core-layer --external:@gustavoadolfo/minhoteca-adapter-layer --external:@gustavoadolfo/minhoteca-casos-de-uso-layer && \
      if [ "${var.environment}" = "local" ]; then \
        rm -rf .layer_deps lambda-package/node_modules && \
        mkdir -p .layer_deps && \
        if [ -f .npmrc ]; then cp .npmrc .layer_deps/; fi && \
        cd .layer_deps && \
        echo '{"name":"layer-deps","version":"1.0.0","private":true}' > package.json && \
        npm install --omit=dev @gustavoadolfo/minhoteca-core-layer @gustavoadolfo/minhoteca-adapter-layer @gustavoadolfo/minhoteca-casos-de-uso-layer && \
        cd .. && \
        cp -r .layer_deps/node_modules lambda-package/node_modules && \
        rm -rf .layer_deps; \
      fi
    EOT
  }
}

data "archive_file" "usuarioFunction_file" {
  depends_on  = [null_resource.usuarioFunction_build]
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda-package/"
  output_path = "${path.module}/usuariosFunction.zip"
}

