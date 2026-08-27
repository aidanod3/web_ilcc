import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'src/reference/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    /* The forked assembler/interpreter are upstream code — lint-light. */
    files: ['src/web_ilcc/**'],
    rules: { 'no-unused-vars': 'off', 'no-useless-escape': 'off', 'no-prototype-builtins': 'off', 'no-cond-assign': 'off', 'no-fallthrough': 'off', 'no-case-declarations': 'off', 'no-useless-assignment': 'off' },
  },
  {
    files: ['test/**', 'vitest.config.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, describe: 'readonly', it: 'readonly', expect: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' } },
  },
];
