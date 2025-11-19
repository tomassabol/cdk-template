import * as cdk from "aws-cdk-lib"
import { StackConfig } from "../../app-config"
import { AppContext } from "../../app-context"
import { AppConfigDeploymentPipelineSimplePattern } from "../../construct/pattern/app-config-pipeline"
import { BaseStack } from "../base/base-stack"

/**
 * Devops stack for creation of AppConfig application and deployment pipeline for configurations.
 * Repository configuration is loaded from stack configuration parameters.
 *
 * @example
 *
 * ```ts
 * const appContext = new AppContext()
 * const pipeline = DevopsConfigPipelineStack.fromAppContext(appContext, "devops-config-pipeline")
 * ```
 */

export class DevopsConfigPipelineStack extends BaseStack {
  constructor(
    appContext: AppContext,
    stackConfig: StackConfig,
    props?: cdk.StackProps
  ) {
    super(appContext, stackConfig, {
      description: `Config Deployment pipeline for ${appContext.projectName} - stage ${appContext.stageName}`,
      ...props,
    })

    /** AppConfig deployment pipeline */
    new AppConfigDeploymentPipelineSimplePattern(this, this.projectName)
  }
}
