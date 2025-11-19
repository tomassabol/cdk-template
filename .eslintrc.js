/* eslint-disable */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    node: true,
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parserOptions: {
        project: "./tsconfig.json",
      },
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
      ],
      rules: {
        "@typescript-eslint/no-empty-interface": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-floating-promises": "error", // Prevents promises without await or proper handling
        "require-await": "warn", // Helps to prevent functions with useless async
        "no-useless-catch": "warn",
        "no-console": "warn",

        // Rules adopted from https://github.com/airbnb/javascript
        "no-new-object": "warn",
        "object-shorthand": ["warn", "always"],
        "quote-props": ["warn", "as-needed"],
        "prefer-object-spread": "warn",
        "prefer-destructuring": [
          "warn",
          {
            VariableDeclarator: {
              array: false,
              object: true,
            },
            AssignmentExpression: {
              array: false,
              object: false,
            },
          },
        ],
        "default-param-last": "warn",
        "no-param-reassign": [
          "warn",
          { props: true, ignorePropertyModificationsFor: ["acc"] },
        ],
        "prefer-arrow-callback": "warn",
        "no-duplicate-imports": "warn",
        "import/no-mutable-exports": "warn",
        "import/first": "warn",
        "no-iterator": "warn",
        "dot-notation": "warn",
        "one-var": ["warn", { initialized: "never" }],
        "no-multi-assign": "warn",
        "no-plusplus": ["warn", { allowForLoopAfterthoughts: true }],
        eqeqeq: "warn",
      },
    },
  ],
}
