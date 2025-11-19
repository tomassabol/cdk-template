module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // A list of paths to directories that Jest should use to search for files in
  roots: ["./test"],

  // The test environment that will be used for testing
  testEnvironment: "node",

  transform: {
    "^.+\\.tsx?$": "<rootDir>/jest.transform.js",
  },

  // Coverage...
  collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ["src/**/*.ts"],

  // The directory where Jest should output its coverage files
  coverageDirectory: ".coverage",

  // Ignore files in coverage
  coveragePathIgnorePatterns: ["/node_modules/"],
}
