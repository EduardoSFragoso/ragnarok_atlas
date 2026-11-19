// Configuração do ESLint (formato flat, ESLint 9+)
// Regras voltadas ao site estático sem build: o app.js roda direto no browser.
export default [
  {
    files: ["app.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        console: "readonly",
        fetch: "readonly",
        Uint8Array: "readonly",
        TextEncoder: "readonly",
        setTimeout: "readonly",
        Promise: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "all", caughtErrorsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-redeclare": "error",
      "no-var": "error",
      "prefer-const": "warn",
      "eqeqeq": ["warn", "smart"],
      "no-throw-literal": "error",
      "no-cond-assign": ["error", "except-parens"],
      "no-async-promise-executor": "error",
      "require-atomic-updates": "warn",
    },
  },
];
