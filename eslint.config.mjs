import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/build", // legacy output directory
    "**/dist", // vite's output directory
    "**/.stryker-tmp/", // stryker mutation reports
    "**/coverage", // istanbul coverage reports
    "**/playwright-report/", // playwright test reports
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    extends: [
      eslint.configs.recommended,
      eslintPluginImport.flatConfigs.recommended,
      eslintPluginImport.flatConfigs.typescript,
    ],
    languageOptions: {
      // Obscure fix for a failure to import "eslint-plugin-react-refresh".
      // If this file passes the linter without this `languageOptions` in the
      // future, try removing this `languageOptions` section.
      ecmaVersion: "latest",
    },
    settings: {
      "import/resolver": { typescript: true },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      eqeqeq: "error",
      "import/no-amd": "error",
      "import/no-commonjs": "error",
      "import/no-empty-named-blocks": "error",
      "import/no-extraneous-dependencies": [
        "error",
        {
          // devDependencies can be imported in config and test files
          devDependencies: [
            "**/*.config.mjs",
            "**/*.{spec,test}.{ts,tsx}",
            "**/tests/**/*.{ts,tsx}",
          ],
          includeInternal: true,
        },
      ],
      "import/no-import-module-exports": "error",
      "import/no-named-as-default": "error",
      "import/no-named-as-default-member": "off", // warn -> off (produces some false positives)
      "no-console": "warn",
      "no-param-reassign": "error",
      "no-throw-literal": "error",
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "simple-import-sort/imports": "warn",
    },
  },
  {
    files: ["**/*.config.mjs"],
    languageOptions: { globals: { process: "readonly" } }, // config files are Node and can read the `process` global
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: tseslint.configs.recommendedTypeChecked,
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          // Variables are camelCase: `nimGameService`, `row`
          selector: ["variable"],
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          // Functions, methods, and members are too: `allGuessed`, `start`, `viewAs`, `isDone`
          selector: ["function", "method", "memberLike"],
          format: ["camelCase"],
        },
        {
          // Types and class names are PascalCase: `GameService`, `NimState`
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          // Usually we want to stick with camelCase for global variables, and
          // UPPER_CASE for global constants, but there are many exceptions
          selector: "variable",
          modifiers: ["global", "const"],
          types: ["boolean", "number", "string", "array"],
          format: ["UPPER_CASE", "PascalCase", "camelCase"],
        },
        {
          // Private methods and fields must have a leading underscore: this._count
          selector: ["memberLike", "method"],
          modifiers: ["private"],
          format: ["camelCase"],
          leadingUnderscore: "require",
        },
        {
          // No limits on things like 'Content-Type' in a fetch object
          selector: "objectLiteralProperty",
          modifiers: ["requiresQuotes"],
          format: null,
        },
        {
          // Usually we want to stick with camelCase for global variables, and
          // UPPER_CASE for global constants, but there are many exceptions
          selector: ["function", "variable"],
          modifiers: ["global"],
          format: ["camelCase", "PascalCase"],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          // these exceptions reduce unnecessary friction with React stuff
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/restrict-template-expressions": "off", // always allow `${x}` regardless of x's type
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }], // allow (x) => console.log(x), ban const x = console.log(x)
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unsafe-member-access": ["error", { allowOptionalChaining: true }], // optional chaining helps with tests
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error", // complements how strict works in typescript for chained promises
    },
  },
  {
    files: ["{client,frontend}/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.recommended],
  },
  {
    // Test files may need to make use of the `any` type in a way we want to
    // prevent in normal code.
    files: ["**/*.{spec,test}.{ts,tsx}", "**/tests/**"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    extends: [eslintPluginPrettierRecommended],
    rules: { "prettier/prettier": "warn" },
  },
]);
