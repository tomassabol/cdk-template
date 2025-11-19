import { Construct } from "constructs"
import { RestApiSimplePatternProps } from "."

/**
 * Default props for RestApiSimplePattern
 *
 * @example
 * ```ts
 * const { api } = new RestApiSimplePatternProps(
 *   scope,
 *   "api",
 *   defaultRestApiGatewayProps()
 * )
 * ```
 *
 */

export const defaultRestApiGatewayProps = (
  scope: Construct,
  id: string,
  props: Partial<RestApiSimplePatternProps> = {}
): RestApiSimplePatternProps => {
  return {
    useDefaultCors: true,
    enableAccessLog: true,
    defaultMethodOptions: {
      apiKeyRequired: true,
    },
    ...props,
  }
}
