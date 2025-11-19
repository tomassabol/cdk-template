import {
  findEnvVars,
  replaceEnvVar,
} from "../../lib/template/utils/env-var-substitution"

describe("env-var-substitution", () => {
  test("extractEnvVars should find single variable", () => {
    expect(findEnvVars("${STAGE}")).toEqual(["STAGE"])
  })

  test("extractEnvVars should find single variable in text", () => {
    expect(findEnvVars("abc${STAGE}def")).toEqual(["STAGE"])
  })

  test("extractEnvVars should find unique variable in text", () => {
    expect(findEnvVars("${STAGE} ${STAGE}")).toEqual(["STAGE"])
  })

  test("extractEnvVars should find all unique variable in text", () => {
    expect(findEnvVars("${STAGE} ${STAGE} ${VALUE}${VAR}")).toEqual([
      "STAGE",
      "VALUE",
      "VAR",
    ])
  })

  test("extractEnvVars should return undefined if there is no match", () => {
    expect(findEnvVars("abcd")).toBeUndefined()
  })

  test("replaceEnvVar should replace all occurencies", () => {
    expect(replaceEnvVar("123 ${STAGE} 456 ${STAGE}", "STAGE", "dev")).toBe(
      "123 dev 456 dev"
    )
  })
})
