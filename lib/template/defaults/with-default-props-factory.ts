import { Construct } from "constructs"

/**
 * Function defining default props for a construct
 */

type PropsFunction<C extends Construct, P1, P2 extends P1> = (
  scope: C,
  id: string,
  props: P1
) => P2

/**
 * Create syntactic sugar for calling default props function
 *
 * @example
 *
 * ```ts
 * function defaultProps(scope: Constructor, id: string, props: Partial<MyConstructProps>) {
 *   // Some code
 *   return { ... }
 * }
 *
 * const withDefaultProps = withDefaultPropsFactory(defaultProps)
 *
 * new MyConstruct(...withDefaultProps(scope, "id", { attr: "value" }))
 * ```
 */

export const withDefaultPropsFactory =
  <C extends Construct, P1, P2 extends P1>(func: PropsFunction<C, P1, P2>) =>
  (scope: C, id: string, props: P1): [C, string, P2] =>
    [scope, id, func(scope, id, props)]

/**
 * Function defining default props for a construct where props argument is optional
 */

type OptionalPropsFunction<C extends Construct, P1, P2 extends P1> = (
  scope: C,
  id: string,
  props?: P1
) => P2

/**
 * Create syntactic sugar for calling default props function with optional props argument.
 *
 * @example
 *
 * ```ts
 * function defaultProps(scope: Constructor, id: string, props?: Partial<MyConstructProps>) {
 *   // Some code
 *   return { ... }
 * }
 *
 * const withDefaultProps = withDefaultOptionalPropsFactory(defaultProps)
 *
 * new MyConstruct(...withDefaultProps(scope, "id"))
 * ```
 * ```
 */

export const withDefaultOptionalPropsFactory =
  <C extends Construct, P1, P2 extends P1>(
    func: OptionalPropsFunction<C, P1, P2>
  ) =>
  (scope: C, id: string, props?: P1): [C, string, P2] =>
    [scope, id, func(scope, id, props)]
