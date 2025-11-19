import * as s3 from "aws-cdk-lib/aws-s3"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as ssm from "aws-cdk-lib/aws-ssm"
import * as customResource from "aws-cdk-lib/custom-resources"
import assert from "assert"
import {
  AccessLogOptions,
  AccessMethod,
  ApiKeys,
  PathParamsMapping,
  RestApiSimplePatternProps,
  S3IntegrationOptions,
} from "./types"
import {
  DEFAULT_CORS_OPTIONS,
  DEFAULT_DEPLOY_OPTIONS,
  DEFAULT_ACCESS_LOG_OPTIONS,
  DEFAULT_REST_API_PROPS,
  DEFAULT_USAGE_PLAN_PROPS,
} from "./constants"
import { defaultRestApiGatewayProps } from "./default-props"
import { Construct } from "constructs"
import { BaseStack } from "../../../stack/base"
import { resourceName } from "../../../common/common-utils"

/**
 * Simple pattern for REST API Gateway
 *
 * @example
 * ```ts
 * const { api } = new RestApiSimplePattern(this, "my-api")
 *
 * api.root.addResource("test").addProxy({
 *   defaultIntegration: new LambdaIntegration(someLambdaFunction),
 * })
 * ```
 *
 * Default props:
 *
 * - useDefaultCors: true
 * - enableAccessLog: true,
 * - defaultMethodOptions.apiKeyRequired: true
 */

export class RestApiSimplePattern extends Construct {
  /**
   * @deprecated Use api instead
   */
  public readonly apiGateway: apigateway.RestApi
  public readonly api: apigateway.RestApi
  public readonly root: apigateway.IResource

  /** Props for default usage plan */
  private readonly defaultUsagePlanProps: apigateway.UsagePlanProps

  constructor(
    scope: Construct,
    id: string,
    props: RestApiSimplePatternProps = {}
  ) {
    super(scope, id)

    this.defaultUsagePlanProps = {
      ...DEFAULT_USAGE_PLAN_PROPS,
      ...props.usagePlanOptions,
    }

    this.api = this.createApiGateway(
      defaultRestApiGatewayProps(this, id, props)
    )
    this.apiGateway = this.api
    this.root = this.api.root
  }

  /**
   * Getter for execute role
   */

  private _executeRole?: iam.Role

  public get executeRole(): iam.Role {
    this._executeRole =
      this._executeRole ||
      new iam.Role(this, "api-gateway-assume-role", {
        assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      })

    return this._executeRole
  }

  /**
   * Add integration method for an S3 bucket
   */

  public addS3Integration(
    resource: apigateway.IResource,
    bucket: s3.IBucket,
    options: S3IntegrationOptions = {}
  ) {
    const {
      keyOverride,
      pathParamsMapping = {
        key: "key",
      },
      accessMethods = ["GET", "PUT"],
      methodOptions,
    } = options

    const pathOverride =
      options.pathOverride ||
      this.getDefaultPathOverride({ bucket, keyOverride, pathParamsMapping })

    if (accessMethods.includes("GET")) {
      bucket.grantRead(this.executeRole)

      const s3Integration = this.createS3Integration({
        pathOverride,
        pathParamsMapping,
        accessMethod: "GET",
      })
      this.addS3IntegrationEndpoint({
        accessMethod: "GET",
        resource,
        s3Integration,
        pathParamsMapping,
        methodOptions,
      })
    }

    if (accessMethods.includes("PUT")) {
      bucket.grantWrite(this.executeRole)

      const s3Integration = this.createS3Integration({
        pathOverride,
        pathParamsMapping,
        accessMethod: "PUT",
      })

      this.addS3IntegrationEndpoint({
        accessMethod: "PUT",
        resource,
        s3Integration,
        pathParamsMapping,
        methodOptions,
      })
    }
  }

  /**
   * Get default value for pathOverride option of S3IntegrationOptions
   */

  private getDefaultPathOverride(params: {
    bucket: s3.IBucket
    keyOverride?: string
    pathParamsMapping: PathParamsMapping
  }) {
    const { bucket, keyOverride, pathParamsMapping } = params
    const path: string[] = []
    if (pathParamsMapping.bucket !== undefined) {
      path.push("{bucket}")
    } else {
      path.push(bucket.bucketName)
    }
    path.push(keyOverride || "{key}")

    return path.join("/")
  }

  /**
   * Create RestApi Api gateway
   */

  private createApiGateway(props: RestApiSimplePatternProps) {
    const {
      useDefaultCors,
      deployOptions,
      enableAccessLog,
      accessLogOptions,
      ...apiProps
    } = { ...DEFAULT_REST_API_PROPS, ...props }

    const accessLogDeployOptions = enableAccessLog
      ? this.createAccessLogDeployOptions(accessLogOptions)
      : {}

    const { projectName, stageName } = BaseStack.of(this)

    const restApiProps: apigateway.RestApiProps = {
      restApiName: `${projectName}-${stageName}`,
      description: `${projectName} API - stage ${stageName}`,
      deployOptions: {
        ...DEFAULT_DEPLOY_OPTIONS,
        ...accessLogDeployOptions,
        stageName,
        ...deployOptions,
      },
      ...(useDefaultCors && {
        defaultCorsPreflightOptions: DEFAULT_CORS_OPTIONS,
      }),
      ...apiProps,
    }

    return new apigateway.RestApi(this, "rest-api", restApiProps)
  }

  /**
   * Create Access Log group and deploy options
   *
   */
  private createAccessLogDeployOptions(options: AccessLogOptions = {}) {
    // eslint-disable-next-line no-param-reassign
    options = { ...DEFAULT_ACCESS_LOG_OPTIONS, ...options }

    const { accessLogFormat, ...logGroupOptions } = options

    const { projectName, stageName } = BaseStack.of(this)

    const accessLogGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs", {
      logGroupName: `/aws/apigateway/${projectName}-${stageName}/accesslog`,
      ...logGroupOptions,
    })

    return {
      accessLogDestination: new apigateway.LogGroupLogDestination(
        accessLogGroup
      ),
      accessLogFormat,
    }
  }

  /**
   * Create S3 Bucket integration
   */

  private createS3Integration(params: {
    accessMethod: AccessMethod
    pathOverride: string
    pathParamsMapping: PathParamsMapping
  }) {
    const { pathOverride, pathParamsMapping, accessMethod } = params
    return new apigateway.AwsIntegration({
      service: "s3",
      integrationHttpMethod: accessMethod,
      path: pathOverride,
      options: {
        credentialsRole: this.executeRole,
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
        integrationResponses: [
          {
            statusCode: "200",
            selectionPattern: "2\\d{2}",
            responseParameters: {
              "method.response.header.Content-Type":
                "integration.response.header.Content-Type",
            },
          },
          {
            statusCode: "403",
            selectionPattern: "403",
            responseParameters: {
              "method.response.header.Content-Type":
                "integration.response.header.Content-Type",
            },
          },
          {
            statusCode: "404",
            selectionPattern: "404",
            responseParameters: {
              "method.response.header.Content-Type":
                "integration.response.header.Content-Type",
            },
          },
        ],
        requestParameters: {
          ...Object.fromEntries(
            Object.entries(pathParamsMapping).map(([key, value]) => [
              `integration.request.path.${key}`,
              `method.request.path.${value}`,
            ])
          ),
        },
      },
    })
  }

  /**
   * Add endpoint for S3 integration
   */

  private addS3IntegrationEndpoint(params: {
    accessMethod: AccessMethod
    resource: apigateway.IResource
    s3Integration: apigateway.AwsIntegration
    pathParamsMapping: PathParamsMapping
    methodOptions?: apigateway.MethodOptions
  }) {
    const {
      accessMethod,
      resource,
      s3Integration,
      pathParamsMapping,
      methodOptions,
    } = params

    switch (accessMethod) {
      case "GET":
        resource.addMethod("GET", s3Integration, {
          ...methodOptions,
          methodResponses: [
            {
              statusCode: "200",
              responseParameters: {
                "method.response.header.Content-Type": true,
              },
            },
            {
              statusCode: "403",
              responseParameters: {
                "method.response.header.Content-Type": true,
              },
            },
            {
              statusCode: "404",
              responseParameters: {
                "method.response.header.Content-Type": true,
              },
            },
          ],
          // Define mandatory request parameters
          requestParameters: {
            ...Object.fromEntries(
              Object.values(pathParamsMapping).map((key) => [
                `method.request.path.${key}`,
                true,
              ])
            ),
            // "method.request.header.Content-Type": true, // TODO Check if it is really necessary
          },
        })
        break
      case "PUT":
        resource.addMethod("PUT", s3Integration, {
          ...methodOptions,
          methodResponses: [
            {
              statusCode: "200",
              responseParameters: {
                "method.response.header.Content-Type": true,
              },
            },
            {
              statusCode: "403",
              responseParameters: {
                "method.response.header.Content-Type": true,
              },
            },
            {
              statusCode: "404",
              responseParameters: {
                "method.response.header.Content-Type": true,
              },
            },
          ],
          // Define mandatory request parameters
          requestParameters: {
            ...Object.fromEntries(
              Object.values(pathParamsMapping).map((key) => [
                `method.request.path.${key}`,
                true,
              ])
            ),
            "method.request.header.Content-Type": true, // TODO Check if it is really necessary
          },
        })
        break
      default:
        throw new Error(`Invalid access method ${accessMethod}`)
    }
  }

  /**
   * Add api keys from configuration file
   */

  public addApiKeysFromConfig({
    usagePlan = this.defaultUsagePlan,
    parameterName,
  }: {
    usagePlan?: apigateway.UsagePlan
    parameterName: string
  }) {
    const apiKeys = BaseStack.of(this).getStackConfigParameter({
      name: parameterName,
      type: "any",
      required: true,
    })

    // Validate api keys to be like { keyName: "keyValue", ... }
    assert(isApiKeys(apiKeys), "invalid api keys definition")

    Object.entries(apiKeys).forEach(([apiKeyName, value]) => {
      usagePlan.addApiKey(
        this.api.addApiKey(`$this.projectName}-${apiKeyName}`, {
          apiKeyName,
          value,
        })
      )
    })
  }

  /**
   * Add api key to API Gateway and to usage plan
   *
   *
   * @example
   * ```typescript
   * const restApi = new RestApiSimplePattern(this, "my-api", {
   *   defaultMethodOptions: { apiKeyRequired: true }
   * })
   *
   * // Add default api key
   * restApi.addApiKey()
   *
   * // Full example
   * const usagePlan = restApi.addUsagePlan("plan1")
   * restApi.addApiKey("key", { usagePlan, value: randomUUID() })
   * ```
   */

  public addApiKey(
    id = "default-key",
    props: apigateway.ApiKeyOptions & {
      /**
       * Usage plan to which the key is attached
       *
       * @default defaultUsagePlan
       */
      usagePlan?: apigateway.UsagePlan
    } = {}
  ) {
    const { usagePlan = this.defaultUsagePlan } = props
    const description = `Api key for ${this.api.restApiName}`
    const apiKeyName = `${this.api.restApiName}-${id}`

    const apiKey = this.api.addApiKey(id, {
      apiKeyName,
      description,
      ...props,
    })
    usagePlan.addApiKey(apiKey)
    return apiKey
  }

  private _defaultUsagePlan?: apigateway.UsagePlan

  /**
   * Default usage plan.
   * Created when first time accessing defaultUsagePlan value
   */

  public get defaultUsagePlan() {
    this._defaultUsagePlan = this._defaultUsagePlan || this.addUsagePlan()
    return this._defaultUsagePlan
  }

  /**
   * Add a usage plan
   *
   * @example
   * ```typescript
   * const restApi = new RestApiSimplePattern(this, "my-api")
   * const usagePlane = restApi.addUsagePlan("client1")
   * ```
   */

  public addUsagePlan(id = "default", props: apigateway.UsagePlanProps = {}) {
    const description =
      id === "default" && props.name === undefined
        ? `Default usage plan for ${this.api.restApiName}`
        : `Usage plan ${id || props.name} for ${this.api.restApiName}`

    return this.api.addUsagePlan(id, {
      name: resourceName(this, id, "plan"),
      apiStages: [
        {
          api: this.api,
          stage: this.api.deploymentStage,
        },
      ],
      description,
      ...this.defaultUsagePlanProps,
      ...props,
    })
  }

  /**
   * Get API key value randomly generated by API Gateway
   *
   * See https://stackoverflow.com/a/71378581/18672955
   *
   * @example
   * ```typescript
   * const api = new RestApiSimplePattern(this, id)
   * const apiKey = api.addApiKey()
   * const apiKeyValue = api.getApiKeyValue(apiKey)
   * ```
   */

  public getApiKeyValue(apiKey: apigateway.IApiKey) {
    const apiKeyResource: customResource.AwsSdkCall = {
      service: "APIGateway",
      action: "getApiKey",
      parameters: {
        apiKey: apiKey.keyId,
        includeValue: true,
      },
      physicalResourceId: customResource.PhysicalResourceId.of(
        `APIKey:${apiKey.keyId}`
      ),
    }

    const apiKeyCr = new customResource.AwsCustomResource(
      this,
      "custom-resource",
      {
        policy: customResource.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [apiKey.keyArn],
            actions: ["apigateway:GET"],
          }),
        ]),
        logRetention: logs.RetentionDays.ONE_DAY,
        onCreate: apiKeyResource,
        onUpdate: apiKeyResource,
        installLatestAwsSdk: false,
      }
    )

    apiKeyCr.node.addDependency(apiKey)
    const apiKeyValue = apiKeyCr.getResponseField("value")
    return apiKeyValue
  }

  /**
   * Export API key and URL to SSM to facilitate testing, or for import into other projects
   *
   * API URL is set to `/{parameterNamePrefix}/api-url/{STAGE}`
   * and optionally API key to `/{parameterNamePrefix}/api-key/{STAGE}`
   *
   * @example
   * ```typescript
   * const api = new RestApiSimplePattern(this, id)
   * const apiKey = api.addApiKey()
   * api.saveToSSMParameters("my-project", { apiKey })
   * ```
   */

  public saveToSSMParameters(
    parameterNamePrefix?: string,
    options: {
      apiURL?: string
      apiKey?: apigateway.IApiKey
    } = {}
  ) {
    const { apiKey, apiURL = this.api.deploymentStage.urlForPath() } = options

    const { stageName } = BaseStack.of(this)

    new ssm.StringParameter(this, "ApiURLParameter", {
      parameterName: `/${parameterNamePrefix}/api-url/${stageName}`,
      stringValue: apiURL,
      description: `API Url for ${stageName} stage`,
    })

    if (apiKey) {
      const apiKeyValue = this.getApiKeyValue(apiKey)

      new ssm.StringParameter(this, "ApiKeyParameter", {
        parameterName: `/${parameterNamePrefix}/api-key/${stageName}`,
        stringValue: apiKeyValue,
        description: `Default API Key for ${stageName} stage`,
      })
    }
  }
}

function isApiKeys(apiKeys: unknown): apiKeys is ApiKeys {
  return (
    apiKeys !== null &&
    typeof apiKeys === "object" &&
    Object.values(apiKeys).every((value) => typeof value === "string")
  )
}
