#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const templates = [
  {
    file: "cdk.json",
    content: JSON.stringify(
      {
        app: "npx ts-node --prefer-ts-exts infra/app-main",
        versionReporting: false,
        watch: {
          include: ["infra/**"],
          exclude: [
            "README.md",
            "cdk*.json",
            "**/*.d.ts",
            "**/*.js",
            "tsconfig.json",
            "package*.json",
            "yarn.lock",
            "node_modules",
            "test",
          ],
        },
        context: {
          "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
          "@aws-cdk/core:stackRelativeExports": true,
          "@aws-cdk/aws-rds:lowercaseDbIdentifier": true,
          "@aws-cdk/aws-lambda:recognizeVersionProps": true,
          "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
          "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true,
          "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
          "@aws-cdk/aws-ec2:uniqueImdsv2TemplateName": true,
          "@aws-cdk/core:checkSecretUsage": true,
          "@aws-cdk/aws-iam:minimizePolicies": true,
          "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true,
          "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
          "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
          "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
          "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
          "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
          "@aws-cdk/core:enablePartitionLiterals": true,
          "@aws-cdk/core:target-partitions": ["aws", "aws-cn"],
        },
      },
      null,
      2
    ),
  },
  {
    file: "infra/app-main.ts",
    content: `#!/usr/bin/env node
/* eslint-disable no-console */
import "source-map-support/register"
import { AppContext, AppContextError } from "@tomassabol/cdk-template"
import { ExampleStack } from "./stacks/example-stack"
import { DeploymentStack } from "./stacks/deployment-stack"

/**
 * Main file for CDK deployment
 */

try {
  const appContext = new AppContext()

  DeploymentStack.fromAppContext(appContext, "deployment")
  ExampleStack.fromAppContext(appContext, "example")
} catch (error) {
  console.error("\\n");
  if (error instanceof AppContextError) {
    console.error("[AppContextError]:", error.message)
  } else {
    console.error(error)
  }
  process.exit(1)
}
`,
  },
  {
    file: "infra/config/app-config-dev.json",
    content: JSON.stringify(
      {
        project: {
          name: "example-project",
          stage: "dev",
          version: "v1",
          account: "AWS-ACCOUNT-NUMBER",
          regions: ["eu-central-1"],
        },

        stacks: {
          example: {
            name: "example",
          },
        },
      },
      null,
      2
    ),
  },
  {
    file: "infra/config/deployment-config-dev.json",
    content: JSON.stringify(
      {
        project: {
          name: "example-project",
          stage: "dev",
          version: "v1",
          account: "AWS-ACCOUNT-NUMBER",
          regions: ["eu-central-1"],
        },

        stacks: {
          deployment: {
            name: "deployment",
            stackType: "SHARED",
            repositoryOwner: "tomassaboldev",
            repositoryName: "REPOSITORY",
            codestarConnectionArn: "CODESTAR_CONNECTION-ARN",
          },
        },
      },
      null,
      2
    ),
  },
  {
    file: "infra/stacks/deployment-stack.ts",
    content: ` import {
    AppContext,
    BaseStack,
    StackConfig,
    ActionKind,
    PipelineSimplePattern,
  } from "@tomassabol/cdk-template"
  
  // Get npm token from SSM parameter /npm/token
  const GET_NPM_TOKEN =
    "export NPM_TOKEN=\`aws ssm get-parameter --name /npm/token --query Parameter.Value --output text --with-decryption\`"
  
  export class DeploymentStack extends BaseStack {
    constructor(appContext: AppContext, stackConfig: StackConfig) {
      super(appContext, stackConfig, {
        description: \`Deployment pipeline for \${appContext.projectName} - stage \${appContext.stageName}\`,
      })
  
      const stackParams = {
        connectionArn: this.getStackConfigParameter({
          name: "codestarConnectionArn",
          type: "string",
          required: true,
        }),
        repositoryOwner: this.getStackConfigParameter({
          name: "repositoryOwner",
          type: "string",
          required: true,
        }),
        repositoryName: this.getStackConfigParameter({
          name: "repositoryName",
          type: "string",
          required: true,
        }),
        repositoryBranch: this.getStackConfigParameter({
          name: "repositoryBranch",
          type: "string",
          defaultValue: this.stageName,
        }),
      }
  
      const flow = {
        source: {
          stage: "Source",
          kind: ActionKind.SourceCodeStarConnection,
          name: "Source",
          detail: {
            repositoryName: stackParams.repositoryName,
            repositoryOwner: stackParams.repositoryOwner,
            repositoryBranch: stackParams.repositoryBranch,
            connectionArn: stackParams.connectionArn,
          },
        },
        unitTest: {
          stage: "Unit-Test",
          kind: ActionKind.BuildCodeBuild,
          name: "Unit-Test",
          detail: {
            appConfigFile: \`infra/config/app-config-\${this.stageName}.json\`, // App config file to be used when deploying
            buildCommands: [
              GET_NPM_TOKEN,
              "npm install -g npm",
              "npm ci",
              "npm run test",
            ],
            description: "Run unit tests",
          },
        },
        deploy: {
          stage: "Deploy",
          kind: ActionKind.BuildCodeBuild,
          name: "Deploy-To-Aws",
          detail: {
            appConfigFile: \`infra/config/app-config-\${this.stageName}.json\`, // App config file to be used when deploying
            buildCommands: [
              GET_NPM_TOKEN,
              "npm install -g aws-cdk npm",
              "npm ci",
              "# npm ci --prefix src/layers/some-layer/nodejs",
              "cdk deploy --all --require-approval=never",
            ],
            description: "Deploy AWS resources",
          },
        },
        integrationTest: {
          stage: "Integration-Test",
          kind: ActionKind.BuildCodeBuild,
          name: "Integration-Test",
          detail: {
            appConfigFile: \`infra/config/app-config-\${this.stageName}.json\`, // App config file to be used when deploying
            buildCommands: [
              GET_NPM_TOKEN,
              "npm install -g npm",
              "npm ci",
              "npm run integration-test",
            ],
            description: "Run integration test",
          },
        },
      }
  
      new PipelineSimplePattern(this, "test-pipeline", {
        actionFlow:
          this.stageName === "prod"
            ? [flow.source, flow.deploy]
            : [flow.source, flow.unitTest, flow.deploy, flow.integrationTest],
      })
    }
  }
`,
  },
  {
    file: "infra/stacks/example-stack.ts",
    content: `import { AppContext, BaseStack, StackConfig } from "@tomassabol/cdk-template";

export class ExampleStack extends BaseStack {
  constructor(appContext: AppContext, stackConfig: StackConfig) {
    super(appContext, stackConfig, {
      description: \`Example Stack - stage \${appContext.stageName}\`,
    })

    // Add some resources here
  }
}
`,
  },
  {
    file: "scripts/deployment-stack",
    content: `
    #!/bin/bash

    print_usage () {
        echo "Deploy or remove deployment pipeline"
        echo "Usage"
        echo "deployment-stack deploy | remove"
        echo 
        echo "  deploy         deploy all stacks"
        echo "  destroy        destroy all stacks"
        echo "  remove         alias to destroy"
        echo "  -p, --profile   set AWS CLI profile"
        echo "  -s, --stage     set deployment stage"
        echo
    }
    
    
    HOMEDIR=\`dirname $0\`
    ROOTDIR="$HOMEDIR/.."
    
    if [[ -z $STAGE ]] 
    then
        STAGE="$DEFAULT_STAGE"
    fi
    
    if [[ -z $STAGE ]] 
    then
        STAGE="$tomassabol_DEV_STAGE"
    fi
    
    
    
    while [ "$#" -gt 0 ]
    do
        case "$1"
        in
            --profile|-p)
                SERVERLESS_PROFILE="--aws-profile $2"; 
                CDK_PROFILE="--profile $2"; 
                shift;
                shift;;
            --stage|-s)
                SERVERLESS_STAGE="--stage $2";
                CDK_STAGE="--context STAGE=$2";
                STAGE=$2
                shift;
                shift;;
            deploy)
                SERVERLESS_CMD="deploy"; 
                CDK_CMD="deploy"; 
                shift;;
            destroy|remove)
                SERVERLESS_CMD="remove"; 
                CDK_CMD="destroy"; 
                shift;;
            *)
                echo "Invalid param: $1"
                print_usage
                exit 2
        esac
    done
    
    if [[ -z $CDK_CMD ]] 
    then
        print_usage
        exit 2
    fi
    
    
    
    if [ "$STAGE" == "" ] 
    then
        echo "Stage is not defined"
        print_usage
        exit 2
    fi
    
    
    cd "$ROOTDIR"
    
    echo cdk $CDK_CMD --context "APP_CONFIG=infra/config/deployment-config-\${STAGE}.json"
    cdk $CDK_CMD --context "APP_CONFIG=infra/config/deployment-config-\${STAGE}.json"
`,
  },
]

const options = processArgs()

templates.forEach((template) => {
  const dir = path.dirname(template.file)
  mkdirp(dir)
  createFile(template.file, template.content, options.overwrite)
})

function processArgs() {
  let overwrite = false

  for (let i = 2; i < process.argv.length; ++i) {
    const arg = process.argv[i]

    switch (arg) {
      case "-o":
      case "--overwrite":
        overwrite = true
        break

      case "--help":
        printUsage()
        process.exit(0)

      default:
        console.error(`Invalid parameter ${arg}\n`)
        printUsage()
        process.exit(1)
    }
  }

  return { overwrite }
}

function printUsage() {
  console.log("Initialize CDK template environment")
  console.log()
  console.log("Usage:")
  console.log("cdk-template-init [--overwrite]")
}

function mkdirp(dir) {
  const parsed = path.parse(dir)

  if (parsed.dir && parsed.dir !== "/") {
    mkdirp(parsed.dir)
  }

  if (fs.existsSync(dir)) {
    if (fs.lstatSync(dir).isDirectory() !== true) {
      console.error(`Path "${dir} "is expected to be a directory`)
      process.exit(1)
    }
    return
  }

  fs.mkdirSync(dir)
}

function createFile(fileName, content, overwrite) {
  if (!overwrite && fs.existsSync(fileName)) {
    console.error(
      `File "${fileName}" already exists. Use --overwrite to force replacing file.`
    )
    process.exit(1)
  }

  fs.writeFileSync(fileName, content)
  console.log(`created file ${fileName}`)
}
