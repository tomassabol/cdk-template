/* eslint-disable @typescript-eslint/no-explicit-any */

import { StackConfig } from "../../app-config"
import { AppContext } from "../../app-context"

/**
 * Declare constructor type to provide polymorphism of the static method BaseStack.fromAppContext
 *
 * See https://github.com/Microsoft/TypeScript/issues/5863
 */

export type Constructor = new (...args: any[]) => any

/**
 * Utility type to extract props of a stack constructor to provide polymorphism of the static method BaseStack.fromAppContext
 *
 * See https://stackoverflow.com/a/67605309/18672955
 */

export type ExtractStackConstructorProps<
  T extends abstract new (...args: any) => any
> = T extends abstract new (
  appContext: AppContext,
  stackConfig: StackConfig,
  ...props: infer P
) => any
  ? P
  : never
