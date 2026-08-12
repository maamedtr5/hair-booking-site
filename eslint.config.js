// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Codebase convention: an underscore prefix marks a param/var as
      // deliberately unused (e.g. `(_error) => {}`, `(_next) => {}`), and
      // `const { password, ...safe } = user` deliberately discards
      // `password` via a rest sibling to strip it before sending a user
      // object to the client. Without these, every one of those
      // legitimate, deliberate patterns fails lint.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
];