data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_invoke" {
  statement {
    effect  = "Allow"
    actions = ["lambda:InvokeFunction"]
    resources = [
      "arn:aws:lambda:${var.region_name}:${var.account_id}:*",
    ]
  }
}

data "aws_iam_policy_document" "lambda_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:GetRecords"
    ]
    resources = [
      "arn:aws:dynamodb:${var.region_name}:${var.account_id}:table/${var.ddb_usuario_emprestimos_name}",
    ]
  }
}

data "aws_iam_policy_document" "lambda_logging" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${var.region_name}:${var.account_id}:*"]
  }
}

data "aws_iam_policy_document" "lambda_sqs" {
  statement {
    effect  = "Allow"
    actions = ["sqs:*", "sns:*"]
    resources = [
      "arn:aws:sqs:${var.region_name}:${var.account_id}:*"
    ]
  }
}

data "aws_iam_policy_document" "lambda_cognito" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:ListUsers",
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminEnableUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminResetUserPassword",
      "cognito-idp:AdminSetUserPassword",
      "cognito-idp:GetUser",
      "cognito-idp:ListUserPools",
      "cognito-idp:AdminInitiateAuth",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:AdminRespondToAuthChallenge",
      "cognito-idp:AdminUserGlobalSignOut",
    ]
    resources = [var.userpool_arn]
  }
}
