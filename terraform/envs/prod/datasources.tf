data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_canonical_user_id" "current" {}

data "aws_servicecatalogappregistry_application" "minhoteca_application" {
  id = var.appregistry_id
}

data "aws_lambda_layer_version" "adapterLayer" {
  layer_name = "minhoteca-adapter-layer"
}

data "aws_lambda_layer_version" "coreLayer" {
  layer_name = "minhoteca-core-layer"
}

data "aws_cognito_user_pool" "minhoteca_user_pool" {
  user_pool_id = var.userpool_id
}

locals {
  account_id       = data.aws_caller_identity.current.account_id
  region           = data.aws_region.current.name
  user_id          = data.aws_canonical_user_id.current.id
  adapterLayer_arn = data.aws_lambda_layer_version.adapterLayer.arn
  coreLayer_arn    = data.aws_lambda_layer_version.coreLayer.arn
}
