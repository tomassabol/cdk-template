import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"

/**
 * Grant access to AppConfig data to a lambda function.
 */

export function grantAppConfigAccess(lambdaFunction: lambda.IFunction) {
  lambdaFunction.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        "appconfig:GetLatestConfiguration",
        "appconfig:StartConfigurationSession",
      ],
      resources: ["*"],
    })
  )
}
