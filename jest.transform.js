const { createTransformer } = require("esbuild-jest")

module.exports = createTransformer({
  sourcemap: true,
})

