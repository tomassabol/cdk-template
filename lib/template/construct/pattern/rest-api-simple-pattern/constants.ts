import * as cdk from "aws-cdk-lib"
import * as logs from "aws-cdk-lib/aws-logs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import { AccessLogOptions, RestApiSimplePatternProps } from "./types"

/**
 * Default binary media types for API Gateway
 */

export const DEFAULT_BINARY_MEDIA_TYPES = ["application/pdf"]

/**
 * Default limit to start compression on API Gateway
 */

export const DEFAULT_MINIMUM_COMPRESSION_SIZE = cdk.Size.bytes(100)

/**
 * Default CORS options
 */

export const DEFAULT_CORS_OPTIONS = {
  allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"],
  allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
  allowCredentials: true,
  allowOrigins: ["*"],
}

/**
 * Default access log options
 */

export const DEFAULT_ACCESS_LOG_OPTIONS: AccessLogOptions = {
  retention: logs.RetentionDays.THREE_MONTHS,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
}

/**
 * Default stage deploy options
 */

export const DEFAULT_DEPLOY_OPTIONS = {
  loggingLevel: apigateway.MethodLoggingLevel.INFO,
  dataTraceEnabled: true, // Enables full logs
  metricsEnabled: true, // Enable Detailed CloudWatch Metrics
  tracingEnabled: false, // Enable X-Ray Tracing
}

/**
 * Default props for RestApiSimplePattern
 */

export const DEFAULT_REST_API_PROPS: RestApiSimplePatternProps = {
  enableAccessLog: true,
  minCompressionSize: DEFAULT_MINIMUM_COMPRESSION_SIZE,
  binaryMediaTypes: DEFAULT_BINARY_MEDIA_TYPES,
}

/**
 * Props for default usage plan
 */

export const DEFAULT_USAGE_PLAN_PROPS = {
  quota: {
    limit: 100000,
    period: apigateway.Period.DAY,
  },
  throttle: {
    rateLimit: 100,
    burstLimit: 50,
  },
}
