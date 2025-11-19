import { Construct } from "constructs"
import { NodeJsFunctionSimplePatternProps } from "./nodejs-function-simple-pattern"
import { stageOf } from "../../../common/common-utils"
import { defaultFunctionProps } from "../../../defaults"

/**
 * Default props for NodeJsFunctionSimplePattern
 */

export const defaultNodeJsFunctionSimplePatternProps = (
  scope: Construct,
  id: string,
  props: NodeJsFunctionSimplePatternProps
): NodeJsFunctionSimplePatternProps => {
  const isProduction = stageOf(scope) === "prod"

  const { warmUp = isProduction, powertoolsLayer = true, ...funcProps } = props

  const { bundling = {}, ...restProps } = defaultFunctionProps(
    scope,
    id,
    funcProps
  )

  const { externalModules = [], ...restBundling } = bundling

  if (powertoolsLayer) {
    externalModules.push("@aws-lambda-powertools")
  }

  return {
    warmUp,

    powertoolsLayer,

    bundling: {
      sourceMap: true,
      externalModules: [...new Set(externalModules)],
      ...restBundling,
    },

    ...restProps,
  }
}
