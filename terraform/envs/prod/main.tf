terraform {
  required_version = "~> 1"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Terraform = true
      Projeto   = "Minhoteca"
    }
  }
}

module "database" {
  source                       = "../../modules/database"
  application_tags             = data.aws_servicecatalogappregistry_application.minhoteca_application.application_tag
  ddb_usuario_emprestimos_name = "minhoteca-usuario-emprestimos"

  usuario_emprestimos_billing_type   = "PAY_PER_REQUEST"
  usuario_emprestimos_read_capacity  = 5
  usuario_emprestimos_write_capacity = 5
  usuario_emprestimos_hash_key       = "usuarioId"
  usuario_emprestimos_range_key      = "livroId"
  usuario_emprestimos_hash_type      = "S"
  usuario_emprestimos_range_type     = "S"

  ddb_livro_emprestimos_name       = "minhoteca-livro-emprestimos"
  livro_emprestimos_billing_type   = "PAY_PER_REQUEST"
  livro_emprestimos_read_capacity  = 5
  livro_emprestimos_write_capacity = 5
  livro_emprestimos_hash_key       = "livroId"
  livro_emprestimos_range_key      = "usuarioId"
  livro_emprestimos_hash_type      = "S"
  livro_emprestimos_range_type     = "S"
}

module "lambda" {
  source                             = "../../modules/lambda"
  account_id                         = local.account_id
  region_name                        = local.region
  application_tags                   = data.aws_servicecatalogappregistry_application.minhoteca_application.application_tag
  adapterLayer_arn                   = local.adapterLayer_arn
  coreLayer_arn                      = local.coreLayer_arn
  environment                        = var.environment
  userpool_arn                       = data.aws_cognito_user_pool.minhoteca_user_pool.arn
  userpool_id                        = data.aws_cognito_user_pool.minhoteca_user_pool.id
  userpool_client_id                 = var.userpool_client_id
  dynamodb_repository                = true
  ddb_usuario_emprestimos_name       = module.database.ddb_usuario_emprestimos_name
  ddb_livro_emprestimos_name         = module.database.ddb_livro_emprestimos_name
  ddb_usuario_emprestimos_hash_name  = module.database.ddb_usuario_emprestimos_hash_name
  ddb_usuario_emprestimos_range_name = module.database.ddb_usuario_emprestimos_range_name
  ddb_livro_emprestimos_hash_name    = module.database.ddb_livro_emprestimos_hash_name
  ddb_livro_emprestimos_range_name   = module.database.ddb_livro_emprestimos_range_name
  debug                              = true
}
