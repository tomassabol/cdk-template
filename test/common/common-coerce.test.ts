import { CommonCoerce } from "../../lib/template/common/common-coerce"

describe("common-coerce", () => {
  test("coerceResourceName", () => {
    const commonCoerce = new CommonCoerce()

    expect(commonCoerce.coerceResourceName("abc-D_xyz 1")).toBe("abc-d-xyz-1")
    expect(() => commonCoerce.coerceResourceName("abc-D#ef_xyz")).toThrow(
      /Invalid resource name/
    )
  })

  test("composeStackName", () => {
    const commonCoerce = new CommonCoerce()

    expect(
      commonCoerce.composeStackName({
        projectPrefix: "project",
        stackName: "stack",
        stageName: "stage",
        appVersion: "version",
        stackType: "VERSIONED",
      })
    ).toBe("project-stack-version-stage")

    expect(
      commonCoerce.composeStackName({
        projectPrefix: "project",
        stackName: "stack",
        stageName: "stage",
        appVersion: "version",
        stackType: "SHARED",
      })
    ).toBe("project-stack-stage")

    expect(
      commonCoerce.composeStackName({
        projectPrefix: "project",
        stackName: "stack",
        stageName: "stage",
        appVersion: "version",
        stackType: "GLOBAL",
      })
    ).toBe("project-stack")
  })

  test("composeResourceName", () => {
    const commonCoerce = new CommonCoerce()

    expect(
      commonCoerce.composeResourceName({
        baseName: "name",
        resourceType: "type",
        stackName: "stack",
      })
    ).toBe("stack-name-type")
  })
})
