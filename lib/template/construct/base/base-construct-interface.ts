import { ICommonHelper } from "../../common/common-helper"
import { ICommonGuardian } from "../../common/common-guardian"
import { IServerlessImport } from "../../common/serverless-import"
import { StackConfig, StackType } from "../../app-config"
import { IAppContext } from "../../app-context"
import { IBaseStack } from "../../stack/base/base-stack-interface"
import { Construct } from "constructs"

/**
 * Construct base for deriving other constructs
 */

export interface IBaseConstruct
  extends Construct,
    IAppContext,
    ICommonHelper,
    ICommonGuardian,
    IServerlessImport {
  /** Reference to self */
  readonly stack: IBaseStack
  /** Stack configuration data from th app config file */
  readonly stackConfig: StackConfig
  /** Stack name */
  readonly stackName: string
  /** Stage name */
  readonly stageName: string
  /** Type of stack */
  readonly stackType: StackType
  /** Get stack configuration parameter from app configuration */
  getStackConfigParameter: GetConfigParameter
  getGlobalConfigParameter: GetConfigParameter
}

/**
 * Type for getStackConfigParameter method
 */

export type GetConfigParameter = <
  T extends keyof ParamType,
  R extends boolean,
  D extends R extends true ? undefined : ParamType[T]
>(param: {
  name: string
  type: T
  required?: R
  defaultValue?: D
}) => R extends true
  ? ParamType[T]
  : D extends ParamType[T]
  ? ParamType[T]
  : ParamType[T] | undefined

/*
 * Stack configuration parameter type
 */

type ParamType = {
  number: number
  boolean: boolean
  string: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any: any
}
