# CDK Template

This repository was forked from [AWS](https://github.com/aws-samples/aws-cdk-project-template-for-devops) and development has continued since the fork.

This repository provides best practices and template framework for crating AWS resources, developing AWS Cloud Development Kit (CDK) - based applications. Effectively, quickly and collaboratively.

## Release notes

### Release 2.18.0

Breaking changes:

- Configuration now supports attribute `regions` - a string array of AWS regions, allowing for multi-region deployments

### Release 2.9

Breaking changes:

- The default runtime for Lambda functions is changed to NODEJS_22_X. So the projects which were using older runtime must configure it using NodeJsFunctionSimplePattern props in order to maintain compatibility.
- Lambda powertools layer is set as default for NodeJs functions. If this layer is not needed then it should be turned of manually.

## Installation

Install dependencies

```sh
npm install -g aws-cdk
npm install --save-dev aws-cdk-lib constructs source-map-support esbuild # Note: esbuild is needed only if bundling lambda functions
```

Install template

```sh
npm install --save-dev @tomassabol/cdk-template
```

AWS CLI must be also installed and configured, see [Getting started with AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).

## Initialize

To bootstrap the CDK stacks run following command:

```sh
npx cdk-template-init
```

This creates following files:

- cdk.json - CDK configuration file
- infra/app-main.ts - Main CDK application
- infra/config/app-config-dev.json - Example of configuration file
- infra/stacks/example-stack.ts - Example stack

## Deployment

Here are few examples how to deploy CDK stacks

```sh
cdk deploy
cdk deploy --context STAGE=prod                         # Use configuration infra/config/app-config-prod.json
cdk deploy --context APP_CONFIG=some-app-config.json    # Use specific configuration file
env STAGE=prod cdk deploy                               # Use configuration infra/config/app-config-prod.json
cdk deploy --profile some-profile                       # Use specific AWS profile (access keys)
env AWS_PROFILE=some-profile cdk deploy                 # Use specific AWS profile (access keys)
```

To deploy all stacks use:

```
cdk deploy --all
```

To deploy specific stack use:

```sh
cdk deploy example-stack-prod
cdk deploy \*-prod                                     # Deploy all -prod stacks
```

To remove a stack use similar parameters as for deploy but with remove keyword:

```sh
cdk destroy
cdk destroy --all
cdk destroy example-stack-prod
```

# Usage

## Configuration files

Configuration files are usually in infra/config folder.

Example:

```jsonc
{
  // Project configuration (mandatory)
  "project": {
    "name": "my-lambda-api", // Project name (mandatory)
    "stage": "prod", // Deployment environment stage (mandatory)
    "version": "v1", // Application version (optional)
    "account": "556667778888", // AWS account number (mandatory)
    "regions": ["eu-central-1"] // AWS regions (mandattory)
  },

  // Stack configurations (mandatory)
  "stacks": {
    "app": {
      "name": "app", // Base stack name (mandatory)
      "customParam": "value" // Any custom stack parameters can be added
    },
    "db": {
      "name": "db", // Base stack name (mandatory)
      // Stack type (optional)
      // It defines naming scheme for resources:
      // - VERSIONED -> project-stack-version-stage-resource-type
      // - SHARED -> project-stack-stage-resource-type
      // - GLOBAL -> project-stack-resource-type
      //
      // Default is VERSIONED for configVersion 1 and SHARED for configVersion 2
      "stackType": "SHARED"
    }
  },

  // Global configuration for project (optional)
  "global": {
    "customParam": "value" // Any custom project parameters can be added to global section
  }
}
```

## Essential Classes

### AppContext

The purpose of AppContext is to manage an application context providing support to stacks:

- Managing configurations files for different deployment environments (like test/production).
- Tools to coerce resource name to a standard naming structure (like "project-stack-version-stage-name-type")
- Access to project attributes like project name, stage name and application version

### BaseStack

Base class for creating stacks. Provides access to application context and different helpers.
Provides access to application context and helpers to ease creation of resources.

Example of stack derived from BaseStack:

```ts
import * as cdk from "aws-cdk-lib"
import { BaseStack } from "@tomassabol/cdk-template"

type MyStackProps = cdk.StackProps & {
  myCustomProp?: string
}
class MyStack extends BaseStack {
  constructor (appContext: AppContext, stackConfig: StackConfig, props: MyStackProps = {}) {
    super(appContext, stackConfig, props)
    ...
  }
}
```

Example of stack initialization in main.ts:

```ts
import { AppContext } from "@tomassabol/cdk-template"
import { MyStack } from "./stacks/my-stack"

const appContext = new AppContext()
// Note myStack may be null if "MyStack" is not included in app configuration file
const myStack = MyStack.fromAppContext(appContext, "MyStack", {
  myCustomProp: "test",
})
```

### BaseConstruct

BaseConstruct is a base for deriving constructs in a project. It provides access to AppContext and various helpers.

Actually BaseConstruct it is not needed anymore and it should be deprecated.
Standard Construct can be used instead and application context or helpers can be received from BaseStack using BaseStack.of method.

## Utility Helpers

Following helpers are available as functions:

| Function     | Description                                           |
| ------------ | ----------------------------------------------------- |
| baseStackOf  | Get base stack of a construct. Same as BaseStack.of() |
| stageOf      | Get stage name                                        |
| appContextOf | Get application context                               |
| resourceName | Create standardized resource name                     |

> Note: these helpers allow access to AppContext features event for constructs which are not derived from BaseConstruct.

Example:

```ts
class MyConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id)
    const isProduction = stageOf(this) === "prod"
  }
}
```

## Construct Helpers

BaseStack and BaseConstruct provide a set of helpers:

| Method                           | Description                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- |
| getStackConfigParameter          | Get a parameter from stack configuration parameters                           |
| getGlobalConfigParameter         | Get a parameter from global configuration parameters                          |
| putParameter                     | Get a value from AWS SSM Parameter Store                                      |
| getParameter                     | Put a value to AWS SSM Parameter Store                                        |
| exportOutput                     | Export value as AWS CloudFormation output                                     |
| lambdaFromServerless             | Get reference to existing Lambda function (from serverless.com project)       |
| dynamoDbTableFromServerless      | Get reference to existing DynamoDb table (from serverless.com project)        |
| snsTopicFromServerless           | Get reference to existing SNS topic (from serverless.com project)             |
| sqsQueueFromServerless           | Get reference to existing SQS queue (from serverless.com project)             |
| sqsDeadLetterQueueFromServerless | Get reference to existing SQS dead letter queue (from serverless.com project) |
| s3BucketFromServerless           | Get reference to existing S3 Bucket (from serverless.com project)             |

## Construct Custom Attributes

BaseStack and BaseConstruct provide a set of attributes derived from AppContext:

| Attribute   | Description                                      |
| ----------- | ------------------------------------------------ |
| appConfig   | Application Configuration                        |
| appContext  | Application Context                              |
| appVersion  | Version of application                           |
| env         | App environment (AWS region and account)         |
| stack       | Parent base stack                                |
| stackConfig | Stack configuration data from th app config file |
| stackType   | Type of stack (VERSIONED, SHARED, GLOBAL)        |
| stageName   | Name of stage                                    |
| projectName | Name of project                                  |

## Patterns

### NodeJsFunctionSimplePattern

NodeJS Lambda function with default properties.
Handles creation of warmup handlers and adding powertools layer.

```ts
const lambdaFunction = new NodeJsFunctionSimplePattern(scope, "MyService", {
  entry: "src/functions/service.ts",
})
```

### RestApiSimplePattern

REST API Gateway with API keys and CORS.

```ts
const { api } = new RestApiSimplePattern(this, "my-api")
api.root.addResource("test").addProxy({
  defaultIntegration: new LambdaIntegration(someLambdaFunction),
})
```

### FeatureFlagsSimplePattern

Feature flags configuration profile for AWS AppConfig service. Creates AppConfig application,
environment and configuration profile. Can also deploy automatically the initial configuration
to the environment.

```ts
const featureFlags = new FeatureFlagsSimplePattern(this, "feature-flags", {
  features: {
    version: "1",
    flags: {
      feature1: { name: "Feature 1" },
      feature2: { name: "Feature 2" },
    },
  },
  deploy: "auto", // true, false or "auto" (default is auto)
})

featureFlags.grantAccess(myLambda)
featureFlags.addEnvironmentVars(myLambda)
```

### AppConfigDeploymentPipelineSimplePattern

Simple pipeline to deploy AWS AppConfig configurations from Bitbucket source.
Using stack parameters in application configuration files (infra/config/\*.json).

```ts
const pipeline = new AppConfigDeploymentPipelineSimplePattern(
  this,
  "app-config"
)
```

Example of configuration in app-config.json:

```json
"stacks": {
    "devops-config-pipeline": {
      "name": "devops-config-pipeline",
      "stackType": "SHARED",
      "configRepositoryName": "my-lambda-api",
      "configRepositoryBranch": "config/test",
      "configRepositoryRootFolder": "config",
      "configRepositoryOwner": "tomassabol",
      "configCodestarConnectionArn": "arn:aws:codestar-connections:eu-central-1:556667778888:connection/4d4e6e6d-287a-4ccf-ac39-81162cbba8f0"
    }
}
```

## Default props

Default props are provided for different AWS resources.

### Bucket

```ts
const bucket = new s3.Bucket(...withDefaultBucketProps(this, id))
```

### Function

| Note: NodeJsFunctionSimplePattern construct is preferred when creating Lambda function and it contains all defaults.

```ts
const function = new lambdaNJS.NodejsFunction(...withDefaultFunctionProps(this, id, { entry: ... }))
```

### Queue

```ts
const queue = new sqs.Queue(...withDefaultQueueProps(this, id))
```

### Table

```ts
const table = new dynamodb.Table(...withDefaultTableProps(this, id, { partitionKey: ... }))
```

### Topic

```ts
const topic = new sns.Topic(...withDefaultTopicProps(this, id))
```

## Ready to use stacks

### DevopsAppPipelineStack

This stacks creates complete deployment pipeline for an application

Example:

```ts
const appContext = new AppContext()
const pipeline = DevopsAppPipelineStack.from(appContext, "devops-app-pipeline")
```

Some configuration parameters have to be in the stack configuration:

```json
"devops-app-pipeline": {
  "name": "devops-app-pipeline",
  "stackType": "SHARED",
  "repositoryOwner": "tomassabol", // Name of Bitbucket owner/user (mandatory)
  "repositoryName": "my-lambda-api", // Name of repository in Bitbucket (mandatory)
  "repositoryBranch": "test", // Optional GIT branch, default is the stage name (e.g. "prod")
  "codestarConnectionArn": "arn:aws:codestar-connections:eu-central-1:556667778888:connection/75c47655-c802-41cc-a7ef-109b3aaee832"
  // ARN of CodeStar connection to Bitbucket (can be obtained using AWS Console -> CodePipeline)
}
```

### DevopsConfigPipelineStack

This stacks creates AWS AppConfig application and configuration deployment pipeline for it.

Example:

```ts
const appContext = new AppContext()
const pipeline = DevopsConfigPipelineStack.fromAppContext(
  appContext,
  "devops-config-pipeline"
)
```

Some configuration parameters have to be in the stack configuration:

```jsonc
{
  "devops-config-pipeline": {
    "name": "devops-config-pipeline",
    "stackType": "SHARED",
    "configRepositoryOwner": "tomassabol", // Name of Bitbucket owner/user (mandatory)
    "configRepositoryName": "my-lambda-api", // Name of repository in Bitbucket (mandatory)
    "configRepositoryBranch": "config/test", // Optional GIT branch, default is the stage name (e.g. "prod")
    "configRepositoryRootFolder": "config", // Optional root folder in GIT repository where are the configuration files (default is "/")
    "configCodestarConnectionArn": "arn:aws:codestar-connections:eu-central-1:556667778888:connection/4d4e6e6d-287a-4ccf-ac39-81162cbba8f0"
    // ARN of CodeStar connection to Bitbucket (can be obtained using AWS Console -> CodePipeline)
  }
}
```

# Resource Tagging

Since version 2.9.6 following tags are added to all resources created by the template:

- stage
- stack
- project
- project-stage
