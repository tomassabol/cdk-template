// This file was adopted from https://github.com/aws-samples/aws-cdk-project-template-for-devops
// TODO Revise and test

import * as cfn_inc from "aws-cdk-lib/cloudformation-include"

import * as base from "../base/base-stack"
import { AppContext } from "../../app-context"
import { StackConfig } from "../../app-config"

export interface CfnTemplateProps {
  templatePath: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters?: any
}

/**
 * @deprecated This stack is not used anywhere
 */

export abstract class CfnIncludeStack extends base.BaseStack {
  private cfnTemplate?: cfn_inc.CfnInclude

  abstract onLoadTemplateProps(): CfnTemplateProps | undefined
  abstract onPostConstructor(cfnTemplate?: cfn_inc.CfnInclude): void

  constructor(appContext: AppContext, stackConfig: StackConfig) {
    super(appContext, stackConfig)

    const props = this.onLoadTemplateProps()

    if (props !== undefined) {
      this.cfnTemplate = this.loadTemplate(props)
    } else {
      this.cfnTemplate = undefined
    }

    this.onPostConstructor(this.cfnTemplate)
  }

  private loadTemplate(props: CfnTemplateProps): cfn_inc.CfnInclude {
    const cfnTemplate = new cfn_inc.CfnInclude(this, "cfn-template", {
      templateFile: props.templatePath,
    })

    if (props.parameters !== undefined) {
      for (const param of props.parameters) {
        const paramEnv = cfnTemplate.getParameter(param.Key)
        paramEnv.default = param.Value
      }
    }

    return cfnTemplate
  }
}
