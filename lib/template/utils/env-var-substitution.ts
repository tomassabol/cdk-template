import assert from "assert"

const envVarRegex = /\$\{([^{}$]+)\}/
const envVarRegexGlobal = /\$\{([^{}$]+)\}/g

export function findEnvVars(str: string): string[] | undefined {
  const match = str.match(envVarRegexGlobal)
  if (match) {
    const unique = [...new Set(match)]
    const names = unique.map((envVar) => {
      const match = envVar.match(envVarRegex)
      assert(match, "Internal error")
      return match[1]
    })
    return names
  }
}

export function replaceEnvVar(
  str: string,
  name: string,
  value: string
): string {
  const regex = new RegExp(`\\$\\{${name}\\}`, "g")
  return str.replace(regex, value)
}
