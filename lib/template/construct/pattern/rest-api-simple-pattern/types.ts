import * as logs from "aws-cdk-lib/aws-logs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"

export type RestApiSimplePatternProps = apigateway.RestApiProps & {
  /** Enable default cors (allow all origins and methods) */
  useDefaultCors?: boolean
  /** Enable access log, default is true */
  enableAccessLog?: boolean
  /** Options for access log */
  accessLogOptions?: AccessLogOptions
  /** Overrides for default usage plan settings */
  usagePlanOptions?: apigateway.UsagePlanProps
}

/**
 * Options for creating access log
 */

export type AccessLogOptions = logs.LogGroupProps &
  Pick<apigateway.StageOptions, "accessLogFormat">

/**
 * Access method for S3 integration
 */

export type AccessMethod = "GET" | "PUT"

/**
 * Options for S3 integration
 */

export type S3IntegrationOptions = {
  /** Override default key e.g. "{key}.pdf". Ignored if pathOverride is specified */
  keyOverride?: string
  /** Override path default is "bucketName/{key}" or "{bucket}/{key}" depending on pathParamsMapping */
  pathOverride?: string
  /** Map request path parameters to pathOverride parameters, e.g. { key: "order-id" } */
  pathParamsMapping?: PathParamsMapping
  /** Access methods e.g. ["GET", "PUT"] */
  accessMethods?: AccessMethod[]
  /** Optional options for Api Gateway method */
  methodOptions?: Omit<
    apigateway.MethodOptions,
    "methodResponses" | "requestParameters"
  >
}

/**
 * Mapping of request path parameters to pathOverride parameters
 *
 * Example: { key: "order-id" }
 */

export type PathParamsMapping = Record<string, string>

/**
 * Structure for API keys
 */

export type ApiKeys = Record<string, string>
