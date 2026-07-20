import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,  // ES6 globals are part of es2022
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_",  varsIgnorePattern: "^_",caughtErrorsIgnorePattern: "^_",   }],
      "no-console": "off",
      "no-undef": "error",
    },
  },
];
